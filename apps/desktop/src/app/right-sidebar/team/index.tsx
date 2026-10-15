/**
 * TeamPane — Hebri local team chat (desktop right zone).
 *
 * Same local rooms/presence as the dashboard Team tab: name + status
 * ("what I'm working on"), rooms, message tail with 3s polling, bounded
 * history. Zero impact on the agent session path.
 */

import { useCallback, useEffect, useRef, useState } from 'react'

import {
  createTeamRoom,
  getTeamPresence,
  listTeamMessages,
  listTeamRooms,
  sendTeamMessage,
  updateTeamPresence,
  type TeamMessage,
  type TeamPresence,
  type TeamRoom
} from '@/api/team'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'

import { RightSidebarSectionHeader } from '../index'

const POLL_MS = 3000
const NAME_KEY = 'hebri.team.name'
const STATUS_KEY = 'hebri.team.status'
const ROOM_KEY = 'hebri.team.room'

function fmtTime(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  } catch {
    return ''
  }
}

export function TeamPane() {
  const [name, setName] = useState<string>(() => {
    try {
      return localStorage.getItem(NAME_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [status, setStatus] = useState<string>(() => {
    try {
      return localStorage.getItem(STATUS_KEY) ?? ''
    } catch {
      return ''
    }
  })
  const [rooms, setRooms] = useState<TeamRoom[]>([])
  const [roomId, setRoomId] = useState<string>(() => {
    try {
      return localStorage.getItem(ROOM_KEY) ?? 'general'
    } catch {
      return 'general'
    }
  })
  const [messages, setMessages] = useState<TeamMessage[]>([])
  const [online, setOnline] = useState<TeamPresence[]>([])
  const [draft, setDraft] = useState('')
  const [error, setError] = useState('')
  const sinceSeq = useRef(0)
  const scrollRef = useRef<HTMLDivElement>(null)

  const persistName = (value: string) => {
    const clean = value.trim().slice(0, 32)
    setName(clean)
    try {
      localStorage.setItem(NAME_KEY, clean)
    } catch {
      /* private mode */
    }
  }

  const persistStatus = (value: string) => {
    const clean = value.trim().slice(0, 120)
    setStatus(clean)
    try {
      localStorage.setItem(STATUS_KEY, clean)
    } catch {
      /* private mode */
    }
  }

  const loadRooms = useCallback(async () => {
    try {
      const data = await listTeamRooms()
      setRooms(data.rooms ?? [])
      setRoomId(current => {
        if (data.rooms?.some(r => r.id === current)) return current
        const fallback = data.rooms?.[0]?.id ?? 'general'
        try {
          localStorage.setItem(ROOM_KEY, fallback)
        } catch {
          /* ignore */
        }
        return fallback
      })
    } catch {
      setError('Team chat unavailable (is the dashboard backend running?)')
    }
  }, [])

  const loadMessages = useCallback(async () => {
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
  }, [roomId])

  const loadPresence = useCallback(async () => {
    try {
      const data = await getTeamPresence()
      setOnline(data.online ?? [])
    } catch {
      setOnline([])
    }
  }, [])

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
  }, [roomId])

  // Presence heartbeat: who I am + what I'm working on.
  useEffect(() => {
    if (!name.trim()) return
    const beat = () => {
      updateTeamPresence(name.trim(), status.trim()).catch(() => {
        /* fail-open */
      })
    }
    beat()
    const id = window.setInterval(beat, 10_000)
    return () => window.clearInterval(id)
  }, [name, status])

  useEffect(() => {
    const el = scrollRef.current
    if (!el) return
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120
    if (nearBottom) el.scrollTop = el.scrollHeight
  }, [messages])

  const send = async () => {
    const text = draft.trim()
    if (!text || !name.trim()) return
    setDraft('')
    setError('')
    try {
      await sendTeamMessage(roomId, name.trim(), text)
      await loadMessages()
    } catch (e) {
      setDraft(text)
      setError(e instanceof Error ? e.message : 'Send failed')
    }
  }

  return (
    <aside aria-label="Team chat" className="flex h-full w-full min-w-0 flex-col gap-3 overflow-hidden p-3 text-xs">
      {/* Identity */}
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

      {/* Online now */}
      <div className="flex shrink-0 flex-col gap-1">
        <RightSidebarSectionHeader>Online now</RightSidebarSectionHeader>
        <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
          {online.length === 0 && (
            <div className="text-muted-foreground">
              {name.trim() ? 'just you (for now)' : 'add your name above'}
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

      {/* Rooms */}
      <div className="flex shrink-0 flex-col gap-1">
        <RightSidebarSectionHeader>Rooms</RightSidebarSectionHeader>
        <div className="flex flex-wrap gap-1">
          {rooms.map(r => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setRoomId(r.id)
                try {
                  localStorage.setItem(ROOM_KEY, r.id)
                } catch {
                  /* ignore */
                }
              }}
              className={cn(
                'rounded border px-1.5 py-0.5',
                r.id === roomId
                  ? 'border-primary/60 bg-primary/10 font-semibold'
                  : 'border-border text-muted-foreground hover:border-foreground/40'
              )}
            >
              {r.name}
            </button>
          ))}
          <AddRoom
            onCreated={id => {
              setRoomId(id)
              try {
                localStorage.setItem(ROOM_KEY, id)
              } catch {
                /* ignore */
              }
            }}
            onRename={() => void loadRooms()}
          />
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded border border-border bg-muted/20 p-2"
      >
        {messages.length === 0 && (
          <div className="px-1 py-4 text-center text-muted-foreground">
            No messages yet.
            <br />
            Say hello — this is local to your machine.
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
          placeholder={name.trim() ? 'Message the team…' : 'Add your name first'}
          maxLength={4000}
          className="min-h-0 flex-1 resize-none rounded border border-border bg-background p-2 placeholder:text-muted-foreground focus:border-primary/60 focus:outline-none"
        />
        <Button size="icon" className="size-8 shrink-0" onClick={() => void send()} disabled={!draft.trim() || !name.trim()}>
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
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="rounded border border-dashed border-border px-1.5 py-0.5 text-muted-foreground hover:border-foreground/40"
        title="New room"
      >
        +
      </button>
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
