/**
 * TeamPane — Hebri local team chat (desktop right zone) + cross-machine relay.
 *
 * Same local rooms/presence as the dashboard Team tab: name + status
 * ("what I'm working on"), rooms, message tail with 3s polling, bounded
 * history. Zero impact on the agent session path.
 *
 * Cross-machine mode: one machine hosts a shared room (mints a high-entropy invite);
 * peers on other machines join with host URL + invite and receive an
 * HMAC-signed peer grant. When a relay join is active this pane talks ONLY
 * to the relay endpoints; "Leave" restores the local view.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createTeamRoom,
  createTeamWork,
  getTeamPresence,
  listTeamMessages,
  listTeamRooms,
  listTeamWork,
  normalizeRelayBase,
  relayCreateWork,
  relayGetPresence,
  relayListMessages,
  relayListWork,
  relayRegister,
  relaySendMessage,
  relayUpdatePresence,
  relayUpdateWork,
  sendTeamMessage,
  shareTeamRoom,
  type TeamMessage,
  type TeamPresence,
  type TeamRelay,
  type TeamRoom,
  type TeamWorkItem,
  type TeamWorkStatus,
  updateTeamPresence,
  updateTeamWork
} from '@/api/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Tip } from '@/components/ui/tooltip'
import { cn } from '@/lib/utils'

import { RightSidebarSectionHeader } from '../index'

const POLL_MS = 3000
const NAME_KEY = 'hebri.team.name'
const STATUS_KEY = 'hebri.team.status'
const ROOM_KEY = 'hebri.team.room'

const RELAY_KEYS = {
  base: 'hebri.relay.base',
  peer: 'hebri.relay.peer',
  grant: 'hebri.relay.grant',
  room: 'hebri.relay.room',
  roomId: 'hebri.relay.room-id'
} as const

function readLocal(key: string): string | null {
  try {
    return localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeLocal(key: string, value: string): void {
  try {
    localStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

function removeLocal(key: string): void {
  try {
    localStorage.removeItem(key)
  } catch {
    /* ignore */
  }
}

function readSession(key: string): string | null {
  try {
    return sessionStorage.getItem(key)
  } catch {
    return null
  }
}

function writeSession(key: string, value: string): void {
  try {
    sessionStorage.setItem(key, value)
  } catch {
    /* private mode */
  }
}

function loadRelay(): TeamRelay | null {
  const base = readLocal(RELAY_KEYS.base)
  const peer = readLocal(RELAY_KEYS.peer)
  const grant = readSession(RELAY_KEYS.grant)
  const roomId = readLocal(RELAY_KEYS.roomId)

  if (!base || !peer || !grant || !roomId) {return null}

  try {
    return {
      base: normalizeRelayBase(base),
      peer,
      grant,
      roomId,
      roomName: readLocal(RELAY_KEYS.room) ?? 'Team room'
    }
  } catch {
    return null
  }
}

function saveRelay(r: TeamRelay): void {
  writeLocal(RELAY_KEYS.base, r.base)
  writeLocal(RELAY_KEYS.peer, r.peer)
  writeSession(RELAY_KEYS.grant, r.grant)
  writeLocal(RELAY_KEYS.room, r.roomName)
  writeLocal(RELAY_KEYS.roomId, r.roomId)
}

function clearRelay(): void {
  for (const k of Object.values(RELAY_KEYS)) {removeLocal(k)}
  removeLocal('hebri.relay.code') // remove invite persisted by pre-hardening builds

  try {
    sessionStorage.removeItem(RELAY_KEYS.grant)
  } catch {
    /* ignore */
  }
}

function fmtTime(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function TeamPane() {
  const [name, setName] = useState<string>(() => readLocal(NAME_KEY) ?? '')
  const [status, setStatus] = useState<string>(() => readLocal(STATUS_KEY) ?? '')
  const [rooms, setRooms] = useState<TeamRoom[]>([])
  const [roomId, setRoomId] = useState<string>(() => readLocal(ROOM_KEY) ?? 'general')
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [online, setOnline] = useState<TeamPresence[]>([])
  const [work, setWork] = useState<TeamWorkItem[]>([])
  const [newWork, setNewWork] = useState('')
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [shared, setShared] = useState<{ roomId: string; code: string } | null>(null)

  // Cross-machine relay state.
  const [relay, setRelay] = useState<TeamRelay | null>(() => loadRelay())
  const [relayOpen, setRelayOpen] = useState(false)
  const [joinBase, setJoinBase] = useState('https://')
  const [joinCode, setJoinCode] = useState('')
  const [joinPeer, setJoinPeer] = useState<string>(() => readLocal(NAME_KEY) ?? '')
  const [joining, setJoining] = useState(false)

  const messageStreamKey = relay ? `relay:${relay.base}:${relay.roomId}` : `local:${roomId}`
  const activeMessageStream = useRef(messageStreamKey)
  const sinceSeq = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const persistName = (value: string) => {
    const clean = value.trim().slice(0, 32)
    setName(clean)
    writeLocal(NAME_KEY, clean)
  }

  const persistStatus = (value: string) => {
    const clean = value.trim().slice(0, 120)
    setStatus(clean)
    writeLocal(STATUS_KEY, clean)
  }

  const loadRooms = useCallback(async () => {
    if (relay) {return}

    try {
      const data = await listTeamRooms()
      setRooms(data.rooms ?? [])
      setRoomId(current => {
        if (data.rooms?.some(r => r.id === current)) {return current}
        const fallback = data.rooms?.[0]?.id ?? 'general'
        writeLocal(ROOM_KEY, fallback)

        return fallback
      })
    } catch {
      setError('Team chat unavailable (is the dashboard backend running?)')
    }
  }, [relay])

  const loadMessages = useCallback(async () => {
    if (activeMessageStream.current !== messageStreamKey) {
      activeMessageStream.current = messageStreamKey
      sinceSeq.current = 0
      setMessages([])
      setError('')
    }

    if (relay) {
      try {
        const data = await relayListMessages(relay, sinceSeq.current)
        const rows = data.messages ?? []

        if (rows.length) {
          setMessages(prev => {
            const merged = [...prev, ...rows]

            return merged.length > 500 ? merged.slice(-500) : merged
          })
          sinceSeq.current = Math.max(sinceSeq.current, data.latest_seq ?? 0)
        }
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Relay unavailable')
      }

      return
    }

    if (!roomId) {return}

    try {
      const data = await listTeamMessages(roomId, sinceSeq.current)
      const rows = data.messages ?? []

      if (rows.length) {
        setMessages(prev => {
          const merged = [...prev, ...rows]

          return merged.length > 500 ? merged.slice(-500) : merged
        })
        sinceSeq.current = Math.max(sinceSeq.current, data.latest_seq ?? 0)
      }
    } catch {
      /* transient; next tick retries */
    }
  }, [messageStreamKey, relay, roomId])

  const loadPresence = useCallback(async () => {
    try {
      const data = relay
        ? await relayGetPresence(relay)
        : await getTeamPresence()

      setOnline(data.online ?? [])
    } catch {
      setOnline([])
    }
  }, [relay])

  const loadWork = useCallback(async () => {
    try {
      const data = relay ? await relayListWork(relay) : await listTeamWork()
      setWork(data.items ?? [])
    } catch {
      /* transient; next tick retries */
    }
  }, [relay])

  useEffect(() => {
    let cancelled = false

    const tick = async () => {
      if (cancelled) {return}
      await Promise.all([loadRooms(), loadMessages(), loadPresence(), loadWork()])
    }

    void tick()
    const id = window.setInterval(() => void tick(), POLL_MS)

    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [loadRooms, loadMessages, loadPresence, loadWork])

  // Presence heartbeat: who I am + what I'm working on.
  useEffect(() => {
    if (relay) {
      const beat = () => {
        relayUpdatePresence(relay, status.trim()).catch(() => {
          /* fail-open */
        })
      }

      beat()
      const id = window.setInterval(beat, 10_000)

      return () => window.clearInterval(id)
    }

    if (!name.trim()) {return}

    const beat = () => {
      updateTeamPresence(name.trim(), status.trim()).catch(() => {
        /* fail-open */
      })
    }

    beat()
    const id = window.setInterval(beat, 10_000)

    return () => window.clearInterval(id)
  }, [relay, name, status])

  useEffect(() => {
    const el = scrollRef.current

    if (!el) {return}
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120

    if (nearBottom) {el.scrollTop = el.scrollHeight}
  }, [messages])

  const send = async () => {
    const text = draft.trim()

    if (!text) {return}
    const identity = relay ? relay.peer : name.trim()

    if (!identity) {return}
    setDraft('')
    setError('')

    try {
      if (relay) {
        await relaySendMessage(relay, text)
      } else {
        await sendTeamMessage(roomId, name.trim(), text)
      }

      await loadMessages()
    } catch (e) {
      setDraft(text)
      setError(e instanceof Error ? e.message : 'Send failed')
    }
  }

  const shareRoom = async (r: TeamRoom) => {
    setError('')

    try {
      const data = await shareTeamRoom(r.id)
      setShared({ roomId: r.id, code: data.room.code })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Share failed')
    }
  }

  const copyCode = async () => {
    if (!shared) {return}

    try {
      await navigator.clipboard.writeText(shared.code)
    } catch {
      /* clipboard blocked; code is visible to copy manually */
    }
  }

  const joinRelay = async () => {
    let base = ''

    try {
      base = normalizeRelayBase(joinBase)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Invalid host URL')

      return
    }

    const code = joinCode.trim()
    const peer = joinPeer.trim().slice(0, 32)

    if (!base || code.length < 20 || !peer) {
      setError('Need an HTTPS host URL, the complete room invite, and your name.')

      return
    }

    setJoining(true)
    setError('')

    try {
      const data = await relayRegister(base, code, peer)

      const info: TeamRelay = {
        base,
        peer,
        grant: data.grant,
        roomId: data.room.id,
        roomName: data.room?.name ?? code
      }

      saveRelay(info)
      setRelay(info)
      setRelayOpen(false)
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Join failed')
    } finally {
      setJoining(false)
    }
  }

  const leaveRelay = () => {
    clearRelay()
    setRelay(null)
    setError('')
  }

  const addWork = async () => {
    const title = newWork.trim()

    if (!title) {return}
    setError('')

    try {
      if (relay) {
        await relayCreateWork(relay, title)
      } else {
        await createTeamWork(title, name.trim())
      }

      setNewWork('')
      await loadWork()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not add work item')
    }
  }

  const setWorkStatus = async (item: TeamWorkItem, status: TeamWorkStatus) => {
    setWork(rows => rows.map(row => row.id === item.id ? { ...row, status } : row))

    try {
      if (relay) {
        await relayUpdateWork(relay, item.id, { status })
      } else {
        await updateTeamWork(item.id, { status })
      }

      await loadWork()
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Could not update work item')
      await loadWork()
    }
  }

  return (
    <aside
      aria-label="Team chat"
      className="flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden p-3 text-xs"
    >
      {/* Relay status banner (cross-machine join active) */}
      {relay ? (
        <div className="flex shrink-0 items-center justify-between gap-2 rounded border border-border bg-muted/20 px-2 py-1.5">
          <div className="flex min-w-0 items-center gap-1.5">
            <span className="shrink-0 font-semibold">{relay.roomName}</span>
            <span className="truncate text-muted-foreground">
              via {relay.base.replace(/^https?:\/\//, '')}
            </span>
          </div>
          <Tip label="Leave cross-machine room (back to local)">
            <Button
              aria-label="Leave cross-machine room"
              className="size-6 shrink-0"
              onClick={leaveRelay}
              size="icon"
              variant="ghost"
            >
              ×
            </Button>
          </Tip>
        </div>
      ) : (
        /* Identity */
        <div className="flex shrink-0 flex-col gap-1.5">
          <RightSidebarSectionHeader>You</RightSidebarSectionHeader>
          <Input
            maxLength={32}
            onChange={e => persistName(e.target.value)}
            placeholder="Your name"
            value={name}
          />
          <Input
            maxLength={120}
            onChange={e => persistStatus(e.target.value)}
            placeholder="Working on… (optional)"
            value={status}
          />
        </div>
      )}

      {/* Online now */}
      <div className="flex shrink-0 flex-col gap-1">
        <RightSidebarSectionHeader>{relay ? 'Online in this room' : 'Online now'}</RightSidebarSectionHeader>
        <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
          {online.length === 0 && (
            <div className="text-muted-foreground">
              {relay
                ? 'waiting for teammates…'
                : name.trim()
                  ? 'just you (for now)'
                  : 'add your name above'}
            </div>
          )}
          {online.map(p => (
            <div className="flex items-baseline gap-2" key={p.name}>
              <span className="shrink-0 font-semibold">{p.name}</span>
              <span className="truncate text-muted-foreground">{p.status || 'online'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Shared human work board. Bots can read this feed through their
          gated team_context tool, but cannot silently edit it. */}
      <div className="flex shrink-0 flex-col gap-1.5">
          <RightSidebarSectionHeader>Current work</RightSidebarSectionHeader>
          <div className="flex max-h-36 flex-col gap-1 overflow-y-auto">
            {work.length === 0 && <div className="text-muted-foreground">No work items yet.</div>}
            {work.map(item => (
              <div className="flex items-center gap-1.5 rounded border border-border px-1.5 py-1" key={item.id}>
                <select
                  aria-label={`Status for ${item.title}`}
                  className="max-w-24 rounded border border-border bg-background px-1 py-0.5 text-[0.65rem]"
                  onChange={event => void setWorkStatus(item, event.target.value as TeamWorkStatus)}
                  value={item.status}
                >
                  <option value="backlog">Backlog</option>
                  <option value="in_progress">Doing</option>
                  <option value="blocked">Blocked</option>
                  <option value="done">Done</option>
                </select>
                <span className={cn('min-w-0 flex-1 truncate', item.status === 'done' && 'text-muted-foreground line-through')}>
                  {item.title}
                </span>
                {item.owner && <span className="max-w-20 truncate text-[0.65rem] text-muted-foreground">{item.owner}</span>}
              </div>
            ))}
          </div>
          <div className="flex gap-1.5">
            <Input
              maxLength={160}
              onChange={event => setNewWork(event.target.value)}
              onKeyDown={event => {
                if (event.key === 'Enter') {void addWork()}
              }}
              placeholder="Add team work…"
              value={newWork}
            />
            <Button disabled={!newWork.trim()} onClick={() => void addWork()} size="sm">
              Add
            </Button>
          </div>
      </div>

      {/* Rooms (local mode only) */}
      {!relay && (
        <div className="flex shrink-0 flex-col gap-1">
          <RightSidebarSectionHeader>Rooms</RightSidebarSectionHeader>
          <div className="flex flex-wrap gap-1">
            {rooms.map(r => (
              <span className="inline-flex items-center gap-0.5" key={r.id}>
                <button
                  className={cn(
                    'rounded-l border px-1.5 py-0.5',
                    r.id === roomId
                      ? 'border-primary/60 bg-primary/10 font-semibold'
                      : 'border-border text-muted-foreground hover:border-foreground/40'
                  )}
                  onClick={() => {
                    setRoomId(r.id)
                    writeLocal(ROOM_KEY, r.id)
                  }}
                  type="button"
                >
                  {r.name}
                </button>
                <Tip label={`Share "${r.name}" across machines`}>
                  <button
                    aria-label={`Share room ${r.name}`}
                    className={cn(
                      'rounded-r border border-l-0 px-1 py-0.5',
                      shared?.roomId === r.id
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border text-muted-foreground hover:border-foreground/40'
                    )}
                    onClick={() => void shareRoom(r)}
                    type="button"
                  >
                    ⧉
                  </button>
                </Tip>
              </span>
            ))}
            <AddRoom
              onCreated={id => {
                setRoomId(id)
                writeLocal(ROOM_KEY, id)
              }}
              onRename={() => void loadRooms()}
            />
          </div>
          {shared && (
            <div className="flex items-center gap-1.5 rounded border border-border bg-muted/20 px-2 py-1">
              <span className="text-muted-foreground">
                “{rooms.find(r => r.id === shared.roomId)?.name ?? shared.roomId}” code:
              </span>
              <span className="font-mono font-semibold tracking-widest">{shared.code}</span>
              <button
                className="ml-auto text-muted-foreground hover:text-foreground"
                onClick={() => void copyCode()}
                type="button"
              >
                copy
              </button>
              <button
                aria-label="Dismiss share code"
                className="text-muted-foreground hover:text-foreground"
                onClick={() => setShared(null)}
                type="button"
              >
                ×
              </button>
            </div>
          )}
        </div>
      )}

      {/* Cross-machine join (local mode only) */}
      {!relay && (
        <div className="flex shrink-0 flex-col gap-1.5">
          <button
            className="self-start text-muted-foreground hover:text-foreground"
            onClick={() => setRelayOpen(v => !v)}
            type="button"
          >
            Cross-machine room {relayOpen ? '▾' : '▸'}
          </button>
          {relayOpen && (
            <div className="flex flex-col gap-1.5 rounded border border-border bg-muted/10 p-2">
              <Input
                onChange={e => setJoinBase(e.target.value)}
                placeholder="HTTPS host URL"
                value={joinBase}
              />
              <div className="flex gap-1.5">
                <Input
                  className="flex-1 font-mono"
                  maxLength={128}
                  onChange={e => setJoinCode(e.target.value.trim().slice(0, 128))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') {void joinRelay()}
                  }}
                  placeholder="room invite"
                  value={joinCode}
                />
                <Input
                  className="flex-1"
                  maxLength={32}
                  onChange={e => setJoinPeer(e.target.value)}
                  placeholder="your name"
                  value={joinPeer}
                />
              </div>
              <Button disabled={joining} onClick={() => void joinRelay()} size="sm">
                {joining ? 'Joining…' : 'Join room'}
              </Button>
              <p className="text-[0.65rem] leading-snug text-muted-foreground">
                Ask the host to share a room code. The host dashboard must be
                reachable from your machine (bound past loopback). You get a
                short-lived signed grant. Remote connections require HTTPS;
                messages are protected in transit but stored on the host.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded border border-border bg-muted/20 p-2"
        ref={scrollRef}
      >
        {messages.length === 0 && (
          <div className="px-1 py-4 text-center text-muted-foreground">
            No messages yet.
            <br />
            {relay ? 'Say hello to the team.' : 'Say hello — this is local to your machine.'}
          </div>
        )}
        {messages.map(m => (
          <div className="break-words leading-relaxed" key={m.seq}>
            <span className="font-semibold">{m.author}</span>
            <span className="ml-2 text-[0.65rem] text-muted-foreground/70">{fmtTime(m.ts)}</span>
            <div className="whitespace-pre-wrap">{m.text}</div>
          </div>
        ))}
      </div>

      {error && <div className="shrink-0 rounded border border-amber-500/40 bg-amber-500/10 px-2 py-1 text-amber-600 dark:text-amber-400">{error}</div>}

      {/* Composer */}
      <div className="flex shrink-0 items-end gap-1.5">
        <textarea
          className="min-h-0 flex-1 resize-none rounded border border-border bg-background p-2 placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
          maxLength={4000}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          placeholder={relay ? 'Message the room…' : name.trim() ? 'Message the team…' : 'Add your name first'}
          rows={2}
          value={draft}
        />
        <Button
          className="size-8 shrink-0"
          disabled={!draft.trim() || !(relay ? true : name.trim())}
          onClick={() => void send()}
          size="icon"
        >
          Send
        </Button>
      </div>
    </aside>
  )
}

function AddRoom({ onCreated, onRename }: { onCreated: (id: string) => void; onRename: () => void }) {
  const [open, setOpen] = useState(false)
  const [value, setValue] = useState('')
  const [busy, setBusy] = useState(false)

  const create = async () => {
    const clean = value.trim()

    if (!clean || busy) {return}
    setBusy(true)

    try {
      const data = await createTeamRoom(clean)
      setValue('')
      setOpen(false)
      onCreated(data.room.id)
      onRename()
    } catch (e) {
      window.alert(e instanceof Error ? e.message : 'Create failed')
    } finally {
      setBusy(false)
    }
  }

  if (!open) {
    return (
      <Tip label="New room">
        <button
          aria-label="New room"
          className="rounded border border-dashed border-border px-1.5 py-0.5 text-muted-foreground hover:border-foreground/40"
          onClick={() => setOpen(true)}
          type="button"
        >
          +
        </button>
      </Tip>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        autoFocus
        className="h-6 w-24"
        maxLength={40}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') {void create()}

          if (e.key === 'Escape') {setOpen(false)}
        }}
        placeholder="room name"
        value={value}
      />
      <Button className="h-6 px-1.5" disabled={busy} onClick={() => void create()} size="sm">
        Add
      </Button>
    </span>
  )
}
