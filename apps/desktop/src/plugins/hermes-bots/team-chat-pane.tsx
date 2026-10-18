/**
 * Team Chat pane — human-to-human encrypted messaging.
 * Separate pane from Bots (AI agents). Uses crypto.ts for E2E encryption.
 */

import {
  Button,
  cn,
  Codicon,
  SearchField,
  Tip
} from '@hermes/plugin-sdk'
import React, { useCallback, useEffect, useMemo, useState } from 'react'

import {
  encryptMessage,
  decryptMessage,
  generateTeamIdentity,
  generateRoomKey,
  exportRoomKey,
  keyFingerprint,
  type TeamIdentity,
  type EncryptedMessage
} from './crypto'
import type { TeamRoom, TeamMessage, TeamMember } from './types'

// ── Local state ──────────────────────────────────────────────────────────

interface TeamState {
  identity: TeamIdentity | null
  rooms: TeamRoom[]
  /** RoomKey CryptoKey objects indexed by room id */
  roomKeys: Record<string, CryptoKey>
  activeRoomId: string | null
  messages: TeamMessage[]
  composeText: string
}

function useTeamState() {
  const [state, setState] = useState<TeamState>({
    identity: null,
    rooms: [],
    roomKeys: {},
    activeRoomId: null,
    messages: [],
    composeText: ''
  })

  // Generate identity on mount
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      const id = await generateTeamIdentity('You')
      if (!cancelled) setState(s => ({ ...s, identity: id }))
    })()
    return () => { cancelled = true }
  }, [])

  return [state, setState] as const
}

// ── Room list panel ──────────────────────────────────────────────────────

function TeamRoomList({
  state,
  setState
}: {
  state: TeamState
  setState: React.Dispatch<React.SetStateAction<TeamState>>
}) {
  const [query, setQuery] = useState('')
  const [showCreate, setShowCreate] = useState(false)
  const [newName, setNewName] = useState('')

  const filtered = useMemo(() => {
    if (!query) return state.rooms
    return state.rooms.filter(r =>
      r.name.toLowerCase().includes(query.toLowerCase())
    )
  }, [query, state.rooms])

  const createRoom = useCallback(async () => {
    if (!state.identity || !newName.trim()) return
    const roomKey = await generateRoomKey()
    const raw = await exportRoomKey(roomKey)
    const ab2b64 = (buf: ArrayBuffer) => {
      const bytes = new Uint8Array(buf)
      return btoa(Array.from(bytes, b => String.fromCharCode(b)).join(''))
    }
    const room: TeamRoom = {
      id: `room-${Date.now()}`,
      name: newName.trim(),
      members: [state.identity.name],
      encrypted: true,
      createdAt: Date.now()
    }
    setState(s => ({
      ...s,
      rooms: [...s.rooms, room],
      roomKeys: { ...s.roomKeys, [room.id]: roomKey },
      activeRoomId: room.id,
      composeText: ''
    }))
    setNewName('')
    setShowCreate(false)
  }, [state.identity, newName, setState])

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between gap-2 px-2.5 pt-2.5 pb-1.5">
        <span className="text-[0.6875rem] font-semibold uppercase tracking-wider text-(--ui-text-quaternary)">
          Team Chat
        </span>
        <Tip label="New room">
          <Button
            className="rounded-md text-(--ui-text-tertiary) hover:text-foreground"
            onClick={() => setShowCreate(true)}
            size="icon-xs"
            variant="ghost"
          >
            <Codicon name="add" />
          </Button>
        </Tip>
      </div>

      <div className="px-2.5 pb-1.5">
        <SearchField
          aria-label="Search rooms"
          containerClassName="min-w-0 flex-1 opacity-50 focus-within:opacity-100"
          inputClassName="w-full text-[0.75rem] placeholder:text-(--ui-text-tertiary)"
          onChange={setQuery}
          placeholder="Search rooms…"
          value={query}
        />
      </div>

      {showCreate ? (
        <div className="px-2.5 pb-2">
          <div className="flex gap-1">
            <input
              autoFocus
              className="flex-1 rounded border border-(--ui-border) bg-(--ui-bg) px-2 py-1 text-[0.75rem]"
              onChange={e => setNewName(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && createRoom()}
              placeholder="Room name…"
              value={newName}
            />
            <Button onClick={createRoom} size="xs" variant="primary">
              Create
            </Button>
            <Button onClick={() => setShowCreate(false)} size="xs" variant="ghost">
              <Codicon name="close" />
            </Button>
          </div>
        </div>
      ) : null}

      <div className="flex-1 overflow-y-auto">
        {filtered.length === 0 ? (
          <div className="px-3 py-4 text-center text-[0.75rem] text-(--ui-text-quaternary)">
            {query ? 'No rooms match' : 'No team rooms yet — click +'}
          </div>
        ) : (
          filtered.map(room => (
            <button
              key={room.id}
              className={cn(
                'w-full text-left px-2.5 py-2 text-[0.8125rem] hover:bg-(--ui-hover)',
                state.activeRoomId === room.id && 'bg-(--ui-active)'
              )}
              onClick={() => setState(s => ({ ...s, activeRoomId: room.id }))}
            >
              <div className="font-medium"># {room.name}</div>
              <div className="text-[0.6875rem] text-(--ui-text-quaternary)">
                {room.members.length} member{room.members.length !== 1 ? 's' : ''}
                {room.encrypted ? ' · encrypted' : ''}
              </div>
            </button>
          ))
        )}
      </div>

      {state.identity ? (
        <div className="px-2.5 py-2 border-t border-(--ui-border) text-[0.6875rem] text-(--ui-text-quaternary)">
          You · {state.identity.name} · encrypted identity ready
        </div>
      ) : null}
    </div>
  )
}

// ── Chat view ──────────────────────────────────────────────────────────

function TeamChatView({
  state,
  setState
}: {
  state: TeamState
  setState: React.Dispatch<React.SetStateAction<TeamState>>
}) {
  const room = state.rooms.find(r => r.id === state.activeRoomId)

  const sendMessage = useCallback(async () => {
    if (!state.identity || !room || !state.composeText.trim()) return
    const roomKey = state.roomKeys[room.id]
    if (!roomKey) return

    const plaintext = state.composeText.trim()
    const encrypted = await encryptMessage(plaintext, roomKey)
    const msg: TeamMessage = {
      id: `msg-${Date.now()}`,
      roomId: room.id,
      senderId: state.identity.name,
      senderName: state.identity.name,
      ciphertext: encrypted.c,
      iv: encrypted.iv,
      timestamp: Date.now()
    }
    setState(s => ({
      ...s,
      messages: [...s.messages, msg],
      composeText: ''
    }))
  }, [state.identity, room, state.composeText, state.roomKeys, setState])

  if (!room) {
    return (
      <div className="flex-1 flex items-center justify-center text-(--ui-text-quaternary) text-[0.8125rem]">
        Select a room to start chatting
      </div>
    )
  }

  return (
    <div className="flex flex-col flex-1">
      <div className="px-3 py-2 border-b border-(--ui-border) text-[0.8125rem] font-medium">
        # {room.name}
        <span className="ml-2 text-[0.6875rem] text-(--ui-text-quaternary) font-normal">
          {room.members.length} member{room.members.length !== 1 ? 's' : ''}
          {room.encrypted ? ' · E2E encrypted' : ''}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto px-3 py-2 space-y-2">
        {state.messages.length === 0 ? (
          <div className="text-center text-[0.75rem] text-(--ui-text-quaternary) py-4">
            No messages yet. Say something!
          </div>
        ) : (
          state.messages.map(msg => (
            <TeamMessageBubble key={msg.id} msg={msg} room={room} state={state} />
          ))
        )}
      </div>

      <div className="px-3 py-2 border-t border-(--ui-border) flex gap-2">
        <input
          className="flex-1 rounded border border-(--ui-border) bg-(--ui-bg) px-3 py-1.5 text-[0.8125rem]"
          onChange={e => setState(s => ({ ...s, composeText: e.target.value }))}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && sendMessage()}
          placeholder="Type a message… (E2E encrypted)"
          value={state.composeText}
        />
        <Button
          onClick={sendMessage}
          size="sm"
          variant="primary"
          disabled={!state.composeText.trim()}
        >
          Send
        </Button>
      </div>
    </div>
  )
}

function TeamMessageBubble({
  msg,
  room,
  state
}: {
  msg: TeamMessage
  room: TeamRoom
  state: TeamState
}) {
  const [decrypted, setDecrypted] = useState<string | null>(null)
  const [decrypting, setDecrypting] = useState(false)

  useEffect(() => {
    if (decrypted || decrypting) return
    setDecrypting(true)
    const roomKey = state.roomKeys[room.id]
    if (!roomKey) {
      setDecrypted('[no room key]')
      return
    }
    decryptMessage({ c: msg.ciphertext, iv: msg.iv }, roomKey)
      .then(plain => setDecrypted(plain))
      .catch(() => setDecrypted('[decrypt failed]'))
  }, [msg, room.id, state.roomKeys, decrypted, decrypting])

  return (
    <div
      className={cn(
        'max-w-[80%] rounded-lg px-3 py-1.5 text-[0.8125rem]',
        msg.senderId === state.identity?.name
          ? 'ml-auto bg-(--ui-accent) text-white'
          : 'bg-(--ui-bg-secondary)'
      )}
    >
      <div className="text-[0.625rem] opacity-70 mb-0.5">{msg.senderName}</div>
      <div>{decrypted ?? '…'}</div>
      <div className="text-[0.5625rem] opacity-50 mt-0.5 text-right">
        {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
      </div>
    </div>
  )
}

// ── Exported pane ───────────────────────────────────────────────────────

export function TeamChatPane() {
  const [state, setState] = useTeamState()

  return (
    <div className="flex h-full">
      <div className="w-[240px] border-r border-(--ui-border) shrink-0">
        <TeamRoomList state={state as TeamState} setState={setState} />
      </div>
      <TeamChatView state={state as TeamState} setState={setState} />
    </div>
  )
}
