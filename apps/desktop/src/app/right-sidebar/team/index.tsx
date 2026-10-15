/**
 * TeamPane — Hebri local team chat (desktop right zone) + cross-machine relay.
 *
 * Same local rooms/presence as the dashboard Team tab: name + status
 * ("what I'm working on"), rooms, message tail with 3s polling, bounded
 * history. Zero impact on the agent session path.
 *
 * Cross-machine mode: one machine hosts a shared room (mints a 6-char code);
 * peers on other machines join with host URL + code and receive an
 * HMAC-signed peer grant. When a relay join is active this pane talks ONLY
 * to the relay endpoints; "Leave" restores the local view.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createTeamRoom,
  getTeamPresence,
  listTeamMessages,
  listTeamRooms,
  normalizeRelayBase,
  relayGetPresence,
  relayListMessages,
  relayRegister,
  relaySendMessage,
  relayUpdatePresence,
  sendTeamMessage,
  shareTeamRoom,
  updateTeamPresence,
  type TeamMessage,
  type TeamPresence,
  type TeamRelay,
  type TeamRoom
} from '@/api/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { Tip } from '@/components/ui/tooltip'

import { RightSidebarSectionHeader } from '../index'

const POLL_MS = 3000
const NAME_KEY = 'hebri.team.name'
const STATUS_KEY = 'hebri.team.status'
const ROOM_KEY = 'hebri.team.room'
const RELAY_KEYS = {
  base: 'hebri.relay.base',
  code: 'hebri.relay.code',
  peer: 'hebri.relay.peer',
  grant: 'hebri.relay.grant',
  room: 'hebri.relay.room'
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

function loadRelay(): TeamRelay | null {
  const base = readLocal(RELAY_KEYS.base)
  const code = readLocal(RELAY_KEYS.code)
  const peer = readLocal(RELAY_KEYS.peer)
  const grant = readLocal(RELAY_KEYS.grant)
  if (!base || !code || !peer || !grant) return null
  return {
    base: normalizeRelayBase(base),
    code: code.toUpperCase(),
    peer,
    grant,
    roomName: readLocal(RELAY_KEYS.room) ?? code
  }
}

function saveRelay(r: TeamRelay): void {
  writeLocal(RELAY_KEYS.base, r.base)
  writeLocal(RELAY_KEYS.code, r.code)
  writeLocal(RELAY_KEYS.peer, r.peer)
  writeLocal(RELAY_KEYS.grant, r.grant)
  writeLocal(RELAY_KEYS.room, r.roomName)
}

function clearRelay(): void {
  for (const k of Object.values(RELAY_KEYS)) removeLocal(k)
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
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const [shared, setShared] = useState<{ roomId: string; code: string } | null>(null)

  // Cross-machine relay state.
  const [relay, setRelay] = useState<TeamRelay | null>(() => loadRelay())
  const [relayOpen, setRelayOpen] = useState(false)
  const [joinBase, setJoinBase] = useState('http://')
  const [joinCode, setJoinCode] = useState('')
  const [joinPeer, setJoinPeer] = useState<string>(() => readLocal(NAME_KEY) ?? '')
  const [joining, setJoining] = useState(false)

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
    if (relay) return
    try {
      const data = await listTeamRooms()
      setRooms(data.rooms ?? [])
      setRoomId(current => {
        if (data.rooms?.some(r => r.id === current)) return current
        const fallback = data.rooms?.[0]?.id ?? 'general'
        writeLocal(ROOM_KEY, fallback)
        return fallback
      })
    } catch {
      setError('Team chat unavailable (is the dashboard backend running?)')
    }
  }, [relay])

  const loadMessages = useCallback(async () => {
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
    if (!roomId) return
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
  }, [relay, roomId])

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

  useEffect(() => {
    let cancelled = false
    const tick = async () => {
      if (cancelled) return
      await Promise.all([loadRooms(), loadMessages(), loadPresence()])
    }
    void tick()
    const id = window.setInterval(() => void tick(), POLL_MS)
    return () => {
      cancelled = true
      window.clearInterval(id)
    }
  }, [loadRooms, loadMessages, loadPresence])

  useEffect(() => {
    sinceSeq.current = 0
    setMessages([])
    setError('')
    void loadMessages()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [relay ? 'relay' : roomId])

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
    if (!name.trim()) return
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
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text) return
    const identity = relay ? relay.peer : name.trim()
    if (!identity) return
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
    if (!shared) return
    try {
      await navigator.clipboard.writeText(shared.code)
    } catch {
      /* clipboard blocked; code is visible to copy manually */
    }
  }

  const joinRelay = async () => {
    const base = normalizeRelayBase(joinBase)
    const code = joinCode.trim().toUpperCase()
    const peer = joinPeer.trim().slice(0, 32)
    if (!base || code.length !== 6 || !peer) {
      setError('Need a host URL, a 6-character room code, and your name.')
      return
    }
    setJoining(true)
    setError('')
    try {
      const data = await relayRegister(base, code, peer)
      const info: TeamRelay = {
        base,
        code,
        peer,
        grant: data.grant,
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
              variant="ghost"
              size="icon"
              className="size-6 shrink-0"
              onClick={leaveRelay}
              aria-label="Leave cross-machine room"
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
            value={name}
            onChange={e => persistName(e.target.value)}
            placeholder="Your name"
            maxLength={32}
          />
          <Input
            value={status}
            onChange={e => persistStatus(e.target.value)}
            placeholder="Working on… (optional)"
            maxLength={120}
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
            <div key={p.name} className="flex items-baseline gap-2">
              <span className="shrink-0 font-semibold">{p.name}</span>
              <span className="truncate text-muted-foreground">{p.status || 'online'}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Rooms (local mode only) */}
      {!relay && (
        <div className="flex shrink-0 flex-col gap-1">
          <RightSidebarSectionHeader>Rooms</RightSidebarSectionHeader>
          <div className="flex flex-wrap gap-1">
            {rooms.map(r => (
              <span key={r.id} className="inline-flex items-center gap-0.5">
                <button
                  type="button"
                  onClick={() => {
                    setRoomId(r.id)
                    writeLocal(ROOM_KEY, r.id)
                  }}
                  className={cn(
                    'rounded-l border px-1.5 py-0.5',
                    r.id === roomId
                      ? 'border-primary/60 bg-primary/10 font-semibold'
                      : 'border-border text-muted-foreground hover:border-foreground/40'
                  )}
                >
                  {r.name}
                </button>
                <Tip label={`Share "${r.name}" across machines`}>
                  <button
                    type="button"
                    onClick={() => void shareRoom(r)}
                    aria-label={`Share room ${r.name}`}
                    className={cn(
                      'rounded-r border border-l-0 px-1 py-0.5',
                      shared?.roomId === r.id
                        ? 'border-primary/60 bg-primary/10'
                        : 'border-border text-muted-foreground hover:border-foreground/40'
                    )}
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
                type="button"
                onClick={() => void copyCode()}
                className="ml-auto text-muted-foreground hover:text-foreground"
              >
                copy
              </button>
              <button
                type="button"
                onClick={() => setShared(null)}
                aria-label="Dismiss share code"
                className="text-muted-foreground hover:text-foreground"
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
            type="button"
            onClick={() => setRelayOpen(v => !v)}
            className="self-start text-muted-foreground hover:text-foreground"
          >
            Cross-machine room {relayOpen ? '▾' : '▸'}
          </button>
          {relayOpen && (
            <div className="flex flex-col gap-1.5 rounded border border-border bg-muted/10 p-2">
              <Input
                value={joinBase}
                onChange={e => setJoinBase(e.target.value)}
                placeholder="Host URL, e.g. http://192.168.1.20:9119"
              />
              <div className="flex gap-1.5">
                <Input
                  value={joinCode}
                  onChange={e => setJoinCode(e.target.value.toUpperCase().slice(0, 6))}
                  onKeyDown={e => {
                    if (e.key === 'Enter') void joinRelay()
                  }}
                  placeholder="room code"
                  maxLength={6}
                  className="flex-1 font-mono uppercase tracking-widest"
                />
                <Input
                  value={joinPeer}
                  onChange={e => setJoinPeer(e.target.value)}
                  placeholder="your name"
                  maxLength={32}
                  className="flex-1"
                />
              </div>
              <Button size="sm" onClick={() => void joinRelay()} disabled={joining}>
                {joining ? 'Joining…' : 'Join room'}
              </Button>
              <p className="text-[0.65rem] leading-snug text-muted-foreground">
                Ask the host to share a room code. The host dashboard must be
                reachable from your machine (bound past loopback). You get a
                signed peer grant — no shared dashboard password.
              </p>
            </div>
          )}
        </div>
      )}

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded border border-border bg-muted/20 p-2"
      >
        {messages.length === 0 && (
          <div className="px-1 py-4 text-center text-muted-foreground">
            No messages yet.
            <br />
            {relay ? 'Say hello to the team.' : 'Say hello — this is local to your machine.'}
          </div>
        )}
        {messages.map(m => (
          <div key={m.seq} className="break-words leading-relaxed">
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
          value={draft}
          onChange={e => setDraft(e.target.value)}
          onKeyDown={e => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault()
              void send()
            }
          }}
          rows={2}
          placeholder={relay ? 'Message the room…' : name.trim() ? 'Message the team…' : 'Add your name first'}
          maxLength={4000}
          className="min-h-0 flex-1 resize-none rounded border border-border bg-background p-2 placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
        />
        <Button
          size="icon"
          className="size-8 shrink-0"
          onClick={() => void send()}
          disabled={!draft.trim() || !(relay ? true : name.trim())}
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
    if (!clean || busy) return
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
          type="button"
          onClick={() => setOpen(true)}
          className="rounded border border-dashed border-border px-1.5 py-0.5 text-muted-foreground hover:border-foreground/40"
          aria-label="New room"
        >
          +
        </button>
      </Tip>
    )
  }

  return (
    <span className="inline-flex items-center gap-1">
      <Input
        value={value}
        onChange={e => setValue(e.target.value)}
        onKeyDown={e => {
          if (e.key === 'Enter') void create()
          if (e.key === 'Escape') setOpen(false)
        }}
        placeholder="room name"
        maxLength={40}
        className="h-6 w-24"
        autoFocus
      />
      <Button size="sm" className="h-6 px-1.5" onClick={() => void create()} disabled={busy}>
        Add
      </Button>
    </span>
  )
}
