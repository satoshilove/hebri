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

export function getTeamPresence(profile?: null | string): Promise<{ online: TeamPresence[] }> {
  return hermesApi<{ online: TeamPresence[] }>({
    ...profileScoped(profile),
    path: '/api/team/presence'
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
