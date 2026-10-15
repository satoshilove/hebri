/**
 * TeamPanel — Hebri local team chat (side panel).
 *
 * Human teammates chat next to their agent work: rooms, messages, and a
 * lightweight "online now" presence with a free-form status line (what you
 * are working on). All state is local to the machine (dashboard REST API,
 * short polling) and never touches the agent session loop.
 */

import { Button } from "@nous-research/ui/ui/components/button";
import { Input } from "@nous-research/ui/ui/components/input";
import { Hash, Plus, Send, Users, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";

import { authedFetch } from "@/lib/api";
import { cn } from "@/lib/utils";

const POLL_MS = 3000;
const NAME_KEY = "hebri-team-name";
const STATUS_KEY = "hebri-team-status";
const ROOM_KEY = "hebri-team-room";

type TeamRoom = {
  id: string;
  name: string;
  msg_count: number;
  last_ts: number;
};

type TeamMessage = {
  seq: number;
  room: string;
  author: string;
  text: string;
  ts: number;
};

type Presence = {
  name: string;
  status: string;
  seen: number;
};

async function apiGet<T>(path: string): Promise<T> {
  const res = await authedFetch(path);
  if (!res.ok) throw new Error(`team chat ${res.status}`);
  return (await res.json()) as T;
}

async function apiPost<T>(path: string, body: unknown): Promise<T> {
  const res = await authedFetch(path, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    let detail = `team chat ${res.status}`;
    try {
      const data = await res.json();
      if (data && typeof data.detail === "string") detail = data.detail;
    } catch {
      /* keep default */
    }
    throw new Error(detail);
  }
  return (await res.json()) as T;
}

function fmtTime(ts: number): string {
  try {
    return new Date(ts * 1000).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return "";
  }
}

export function TeamPanel({ active = true }: { active?: boolean }) {
  const [name, setName] = useState<string>(
    () => localStorage.getItem(NAME_KEY) ?? "",
  );
  const [status, setStatus] = useState<string>(
    () => localStorage.getItem(STATUS_KEY) ?? "",
  );
  const [rooms, setRooms] = useState<TeamRoom[]>([]);
  const [roomId, setRoomId] = useState<string>(
    () => localStorage.getItem(ROOM_KEY) ?? "general",
  );
  const [messages, setMessages] = useState<TeamMessage[]>([]);
  const [online, setOnline] = useState<Presence[]>([]);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [creating, setCreating] = useState(false);
  const [newRoomName, setNewRoomName] = useState("");
  const sinceSeq = useRef(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  const persistName = useCallback((value: string) => {
    const clean = value.trim().slice(0, 32);
    setName(clean);
    if (clean) localStorage.setItem(NAME_KEY, clean);
  }, []);

  const persistStatus = useCallback((value: string) => {
    const clean = value.trim().slice(0, 120);
    setStatus(clean);
    localStorage.setItem(STATUS_KEY, clean);
  }, []);

  const loadRooms = useCallback(async () => {
    try {
      const data = await apiGet<{ rooms: TeamRoom[] }>("/api/team/rooms");
      setRooms(data.rooms ?? []);
      setRoomId((current) => {
        if (data.rooms?.some((r) => r.id === current)) return current;
        localStorage.setItem(ROOM_KEY, data.rooms?.[0]?.id ?? "general");
        return data.rooms?.[0]?.id ?? "general";
      });
    } catch (e) {
      setError(e instanceof Error ? e.message : "team chat unavailable");
    }
  }, []);

  const loadMessages = useCallback(async () => {
    if (!roomId) return;
    try {
      const data = await apiGet<{ messages: TeamMessage[]; latest_seq: number }>(
        `/api/team/rooms/${encodeURIComponent(roomId)}/messages?since_seq=${sinceSeq.current}&limit=300`,
      );
      const rows = data.messages ?? [];
      if (rows.length) {
        setMessages((prev) => {
          const merged = [...prev, ...rows];
          return merged.length > 500 ? merged.slice(-500) : merged;
        });
        sinceSeq.current = Math.max(sinceSeq.current, data.latest_seq ?? 0);
      }
    } catch {
      /* transient; retry on next tick */
    }
  }, [roomId]);

  const loadPresence = useCallback(async () => {
    try {
      const data = await apiGet<{ online: Presence[] }>("/api/team/presence");
      setOnline(data.online ?? []);
    } catch {
      setOnline([]);
    }
  }, []);

  // Initial + polling loop (only while visible).
  useEffect(() => {
    if (!active) return;
    let cancelled = false;
    const tick = async () => {
      if (cancelled) return;
      await Promise.all([loadRooms(), loadMessages(), loadPresence()]);
    };
    void tick();
    const id = window.setInterval(() => void tick(), POLL_MS);
    return () => {
      cancelled = true;
      window.clearInterval(id);
    };
  }, [active, loadRooms, loadMessages, loadPresence]);

  // Reset cursor when switching rooms.
  useEffect(() => {
    sinceSeq.current = 0;
    setMessages([]);
    setError("");
    const id = window.setTimeout(() => void loadMessages(), 0);
    return () => window.clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [roomId]);

  // Presence heartbeat: who I am + what I'm working on.
  useEffect(() => {
    if (!active || !name.trim()) return;
    const beat = () => {
      apiPost("/api/team/presence", {
        name: name.trim(),
        status: status.trim(),
      }).catch(() => {
        /* fail-open */
      });
    };
    beat();
    const id = window.setInterval(beat, 10_000);
    return () => window.clearInterval(id);
  }, [active, name, status]);

  // Follow the tail when new messages land and we're near the bottom.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const nearBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 120;
    if (nearBottom) el.scrollTop = el.scrollHeight;
  }, [messages]);

  const send = async () => {
    const text = draft.trim();
    if (!text || !name.trim()) return;
    setDraft("");
    setError("");
    try {
      await apiPost(`/api/team/rooms/${encodeURIComponent(roomId)}/messages`, {
        author: name.trim(),
        text,
      });
      await loadMessages();
    } catch (e) {
      setDraft(text);
      setError(e instanceof Error ? e.message : "send failed");
    }
  };

  const createRoom = async () => {
    const rn = newRoomName.trim();
    if (!rn) return;
    setError("");
    try {
      const data = await apiPost<{ room: { id: string; name: string } }>(
        "/api/team/rooms",
        { name: rn },
      );
      setNewRoomName("");
      setCreating(false);
      setRoomId(data.room.id);
      localStorage.setItem(ROOM_KEY, data.room.id);
      await loadRooms();
    } catch (e) {
      setError(e instanceof Error ? e.message : "create failed");
    }
  };

  return (
    <div className="flex h-full min-h-0 flex-col gap-3">
      {/* Identity */}
      <div className="flex flex-col gap-1.5">
        <label className="text-[0.65rem] uppercase tracking-wider text-text-secondary">
          You
        </label>
        <Input
          value={name}
          onChange={(e: { target: { value: string } }) => persistName(e.target.value)}
          placeholder="Your name"
          maxLength={32}
          className="h-8 text-sm"
        />
        <Input
          value={status}
          onChange={(e: { target: { value: string } }) => persistStatus(e.target.value)}
          placeholder="Working on… (optional)"
          maxLength={120}
          className="h-8 text-xs"
        />
      </div>

      {/* Online now */}
      <div className="flex min-h-0 flex-col gap-1">
        <div className="flex items-center gap-1.5 text-[0.65rem] uppercase tracking-wider text-text-secondary">
          <Users className="h-3 w-3" />
          Online now
        </div>
        <div className="flex max-h-28 flex-col gap-1 overflow-y-auto">
          {online.length === 0 && (
            <div className="text-xs text-text-secondary/70">
              {name.trim() ? "just you (for now)" : "say hi with a name above"}
            </div>
          )}
          {online.map((p) => (
            <div key={p.name} className="flex items-baseline gap-2 text-xs">
              <span className="shrink-0 font-semibold text-midground">
                {p.name}
              </span>
              <span className="truncate text-text-secondary">
                {p.status || "online"}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Rooms */}
      <div className="flex min-h-0 flex-col gap-1">
        <div className="flex items-center justify-between">
          <div className="text-[0.65rem] uppercase tracking-wider text-text-secondary">
            Rooms
          </div>
          {creating ? (
            <div className="flex items-center gap-1">
              <Input
                value={newRoomName}
                onChange={(e: { target: { value: string } }) =>
                  setNewRoomName(e.target.value)
                }
                onKeyDown={(e: { key: string; preventDefault: () => void }) => {
                  if (e.key === "Enter") void createRoom();
                  if (e.key === "Escape") setCreating(false);
                }}
                placeholder="room name"
                maxLength={40}
                className="h-6 w-24 text-xs"
                autoFocus
              />
              <Button
                ghost
                size="icon"
                className="h-6 w-6"
                onClick={() => void createRoom()}
                aria-label="Create room"
              >
                <Plus className="h-3 w-3" />
              </Button>
              <Button
                ghost
                size="icon"
                className="h-6 w-6"
                onClick={() => setCreating(false)}
                aria-label="Cancel"
              >
                <X className="h-3 w-3" />
              </Button>
            </div>
          ) : (
            <Button
              ghost
              size="icon"
              className="h-6 w-6"
              onClick={() => setCreating(true)}
              title="New room"
              aria-label="New room"
            >
              <Plus className="h-3 w-3" />
            </Button>
          )}
        </div>
        <div className="flex flex-wrap gap-1">
          {rooms.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setRoomId(r.id);
                localStorage.setItem(ROOM_KEY, r.id);
              }}
              className={cn(
                "inline-flex items-center gap-1 rounded border px-1.5 py-0.5 text-xs",
                r.id === roomId
                  ? "border-current/40 bg-background-raised font-semibold text-midground"
                  : "border-current/10 text-text-secondary hover:border-current/30",
              )}
            >
              <Hash className="h-3 w-3" />
              {r.name}
            </button>
          ))}
        </div>
      </div>

      {/* Messages */}
      <div
        ref={scrollRef}
        className="min-h-0 flex-1 space-y-2 overflow-y-auto rounded border border-current/10 p-2"
      >
        {messages.length === 0 && (
          <div className="px-1 py-4 text-center text-xs text-text-secondary/70">
            No messages yet.
            <br />
            Say hello — this is local to your machine.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.seq} className="break-words text-xs leading-relaxed">
            <span className="font-semibold text-midground">{m.author}</span>
            <span className="ml-2 text-[0.65rem] text-text-secondary/60">
              {fmtTime(m.ts)}
            </span>
            <div className="whitespace-pre-wrap text-text-primary/90">
              {m.text}
            </div>
          </div>
        ))}
      </div>

      {error && (
        <div className="shrink-0 rounded border border-warning/40 bg-warning/10 px-2 py-1 text-[0.7rem] text-warning">
          {error}
        </div>
      )}

      {/* Composer */}
      <div className="flex shrink-0 items-end gap-1.5">
        <textarea
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={2}
          placeholder={name.trim() ? "Message the team…" : "Add your name first"}
          maxLength={4000}
          className={cn(
            "min-h-0 flex-1 resize-none rounded border border-current/20 bg-background-raised/60 p-2 text-xs",
            "placeholder:text-text-secondary/60 focus:border-current/40 focus:outline-none",
          )}
        />
        <Button
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => void send()}
          disabled={!draft.trim() || !name.trim()}
          aria-label="Send message"
        >
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
}
