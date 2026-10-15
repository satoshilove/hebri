/**
 * Hebri team chat — local team rooms (dashboard REST).
 *
 * Human teammates chat next to their agent work. Backend state is local to
 * the machine ($HERMES_HOME/team_chat); the routes inherit dashboard auth.
 * The pane polls briefly; there is no WS state to wedge.
 */

import { hermesApi, profileScoped } from './client'

export interface TeamRoom {
  created_at: number
  id: string
  last_ts: number
  msg_count: number
  name: string
}

export interface TeamMessage {
  author: string
  room: string
  seq: number
  text: string
  ts: number
}

export interface TeamPresence {
  name: string
  seen: number
  status: string
}

export function listTeamRooms(profile?: null | string): Promise<{ rooms: TeamRoom[] }> {
  return hermesApi<{ rooms: TeamRoom[] }>({
    ...profileScoped(profile),
    path: '/api/team/rooms'
  })
}

export function createTeamRoom(
  name: string,
  profile?: null | string
): Promise<{ room: { id: string; name: string } }> {
  return hermesApi<{ room: { id: string; name: string } }>({
    ...profileScoped(profile),
    method: 'POST',
    path: '/api/team/rooms',
    body: { name }
  })
}

export function listTeamMessages(
  roomId: string,
  sinceSeq: number,
  profile?: null | string
): Promise<{ latest_seq: number; messages: TeamMessage[] }> {
  return hermesApi<{ latest_seq: number; messages: TeamMessage[] }>({
    ...profileScoped(profile),
    path: `/api/team/rooms/${encodeURIComponent(roomId)}/messages?since_seq=${sinceSeq}&limit=300`
  })
}

export function sendTeamMessage(
  roomId: string,
  author: string,
  text: string,
  profile?: null | string
): Promise<{ message: TeamMessage }> {
  return hermesApi<{ message: TeamMessage }>({
    ...profileScoped(profile),
    method: 'POST',
    path: `/api/team/rooms/${encodeURIComponent(roomId)}/messages`,
    body: { author, text }
  })
}

export function shareTeamRoom(
  roomId: string,
  profile?: null | string
): Promise<{ room: { code: string; id: string; name: string } }> {
  return hermesApi<{ room: { code: string; id: string; name: string } }>({
    ...profileScoped(profile),
    method: 'POST',
    path: `/api/team/rooms/${encodeURIComponent(roomId)}/share`
  })
}

export function getTeamPresence(profile?: null | string): Promise<{ online: TeamPresence[] }> {
  return hermesApi<{ online: TeamPresence[] }>({
    ...profileScoped(profile),
    path: '/api/team/presence'
  })
}

/**
 * Cross-machine relay: peers on other machines join a shared room on a host
 * dashboard. The HMAC peer grant (not a dashboard token) is the credential;
 * the host answers these routes CORS-open, so plain cross-origin fetch is
 * used here (hermesApi targets the local dashboard only).
 */
export interface TeamRelay {
  base: string
  code: string
  peer: string
  grant: string
  roomName: string
}

export function normalizeRelayBase(raw: string): string {
  return raw.trim().replace(/\/+$/, '')
}

export function relayRegister(
  base: string,
  code: string,
  peer: string
): Promise<{ expires_in: number; grant: string; room: { id: string; name: string } }> {
  const url = `${normalizeRelayBase(base)}/api/team/relay/register`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ code: code.toUpperCase(), peer })
  }).then(async (res) => {
    if (!res.ok) {
      let detail = `relay join failed (${res.status})`
      try {
        const data = (await res.json()) as { detail?: string }
        if (data && typeof data.detail === 'string') detail = data.detail
      } catch {
        /* keep default */
      }
      throw new Error(detail)
    }
    return (await res.json()) as { expires_in: number; grant: string; room: { id: string; name: string } }
  })
}

export function relayListMessages(
  relay: TeamRelay,
  sinceSeq: number
): Promise<{ latest_seq: number; messages: TeamMessage[] }> {
  const url = `${normalizeRelayBase(relay.base)}/api/team/relay/${relay.code}/messages?since_seq=${sinceSeq}&limit=300&grant=${encodeURIComponent(relay.grant)}`
  return fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`relay ${res.status}`)
    return (await res.json()) as { latest_seq: number; messages: TeamMessage[] }
  })
}

export function relaySendMessage(
  relay: TeamRelay,
  text: string
): Promise<{ message: TeamMessage }> {
  const url = `${normalizeRelayBase(relay.base)}/api/team/relay/${relay.code}/messages`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ author: relay.peer, text, grant: relay.grant })
  }).then(async (res) => {
    if (!res.ok) {
      let detail = `relay send failed (${res.status})`
      try {
        const data = (await res.json()) as { detail?: string }
        if (data && typeof data.detail === 'string') detail = data.detail
      } catch {
        /* keep default */
      }
      throw new Error(detail)
    }
    return (await res.json()) as { message: TeamMessage }
  })
}

export function relayGetPresence(relay: TeamRelay): Promise<{ online: TeamPresence[] }> {
  const url = `${normalizeRelayBase(relay.base)}/api/team/relay/${relay.code}/presence?grant=${encodeURIComponent(relay.grant)}`
  return fetch(url).then(async (res) => {
    if (!res.ok) throw new Error(`relay ${res.status}`)
    return (await res.json()) as { online: TeamPresence[] }
  })
}

export function relayUpdatePresence(
  relay: TeamRelay,
  status: string
): Promise<{ ok: boolean }> {
  const url = `${normalizeRelayBase(relay.base)}/api/team/relay/${relay.code}/presence`
  return fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: relay.peer, status, grant: relay.grant })
  }).then(async (res) => {
    if (!res.ok) throw new Error(`relay ${res.status}`)
    return (await res.json()) as { ok: boolean }
  })
}

export function updateTeamPresence(
  name: string,
  status: string,
  profile?: null | string
): Promise<{ ok: boolean }> {
  return hermesApi<{ ok: boolean }>({
    ...profileScoped(profile),
    method: 'POST',
    path: '/api/team/presence',
    body: { name, status }
  })
}
