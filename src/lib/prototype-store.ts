"use client";

import type { Message } from "@/data/messaging-data";

export type PrototypeRoom = { slug: string; name: string; createdAt: string; messages: Message[]; tags: string[]; people: string[]; things: string[] };
export type PrototypeChat = { slug: string; name: string; initials: string; color: string; tid: string; messages: Message[] };
export type PrototypeState = { version: 3; mode: "new" | "demo" | "returning"; sandboxMessages: Message[]; rooms: PrototypeRoom[]; chats: PrototypeChat[]; pinned: string[]; archived: string[]; order: string[] };
type V2State = Omit<PrototypeState, "version" | "order"> & { version: 2 };

const STORAGE_KEY = "tosker.prototype.v3";
const V2_KEY = "tosker.prototype.v2";
const V1_KEY = "tosker.prototype.v1";
const DEFAULT_ORDER = ["mika-tan", "jordan-lee", "anika-rai", "tokyo-2027", "design-hack-night", "friday-pokemon"];
const listeners = new Set<() => void>();
const blank = (mode: PrototypeState["mode"]): PrototypeState => ({ version: 3, mode, sandboxMessages: [], rooms: [], chats: [], pinned: [], archived: [], order: [] });
const serverState = blank("demo");
let memoryState = blank("demo");
let loaded = false;

function fromV2(state: V2State): PrototypeState { return { ...state, version: 3, order: [] }; }
function read(): PrototypeState {
  if (typeof window === "undefined") return serverState;
  if (loaded) return memoryState;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) { const parsed = JSON.parse(saved) as PrototypeState; if (parsed.version === 3) memoryState = { ...parsed, mode: parsed.mode === "returning" ? "returning" : "demo" }; return memoryState; }
    const v2 = window.localStorage.getItem(V2_KEY);
    if (v2) { memoryState = fromV2(JSON.parse(v2) as V2State); return memoryState; }
    const v1 = window.localStorage.getItem(V1_KEY);
    if (v1) {
      const parsed = JSON.parse(v1) as { mode?: "new" | "demo"; myRoomMessages?: Message[]; rooms?: Array<{ slug: string; name: string; createdAt: string; messages: Message[] }> };
      memoryState = { ...blank(parsed.mode === "new" ? "new" : "demo"), sandboxMessages: parsed.myRoomMessages ?? [], rooms: (parsed.rooms ?? []).map((room) => ({ ...room, tags: ["ROOM"], people: [], things: [] })) };
    }
  } catch { memoryState = blank("demo"); }
  return memoryState;
}

function write(next: PrototypeState) { memoryState = next; window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); listeners.forEach((listener) => listener()); }
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "new-room";

export const prototypeStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
  getSnapshot: read,
  getServerSnapshot: () => serverState,
  setMode(mode: PrototypeState["mode"]) {
    const current = read();
    write(mode === "returning" ? { ...current, mode } : blank(mode));
  },
  addSandboxMessage(message: Message) { const state = read(); write({ ...state, sandboxMessages: [...state.sandboxMessages, message] }); },
  createRoom(input: { name: string; tags?: string[]; people?: string[]; things?: string[] }) { const state = read(); const base = slugify(input.name); const slug = state.rooms.some((room) => room.slug === base) ? `${base}-${Date.now()}` : base; const room: PrototypeRoom = { slug, name: input.name.trim(), createdAt: "Now", messages: [], tags: input.tags?.length ? input.tags : ["ROOM"], people: input.people ?? [], things: input.things ?? [] }; write({ ...state, rooms: [...state.rooms, room], order: [...state.order, slug] }); return room; },
  createChat(input: { name: string; initials: string; color: string; tid: string }) { const state = read(); const existing = state.chats.find((chat) => chat.tid === input.tid); if (existing) return existing; const chat: PrototypeChat = { slug: slugify(input.name), ...input, messages: [] }; write({ ...state, chats: [...state.chats, chat], order: [...state.order, chat.slug] }); return chat; },
  addRoomMessage(slug: string, message: Message) { const state = read(); write({ ...state, rooms: state.rooms.map((room) => room.slug === slug ? { ...room, messages: [...room.messages, message] } : room) }); },
  addChatMessage(slug: string, message: Message) { const state = read(); write({ ...state, chats: state.chats.map((chat) => chat.slug === slug ? { ...chat, messages: [...chat.messages, message] } : chat) }); },
  togglePinned(slug: string) { const state = read(); write({ ...state, pinned: state.pinned.includes(slug) ? state.pinned.filter((item) => item !== slug) : [...state.pinned, slug] }); },
  reorder(source: string, target: string) { const state = read(); if (source === "my-room" || source === target) return; const known = [...new Set([...state.order, ...DEFAULT_ORDER, ...state.chats.map((item) => item.slug), ...state.rooms.map((item) => item.slug)])]; if (!known.includes(source) || !known.includes(target)) return; const next = known.filter((slug) => slug !== source); const index = Math.max(0, next.indexOf(target)); next.splice(index, 0, source); write({ ...state, order: next }); },
  archive(slug: string) { const state = read(); write({ ...state, archived: [...new Set([...state.archived, slug])] }); },
  nuke(slug: string) { const state = read(); write({ ...state, rooms: state.rooms.filter((room) => room.slug !== slug), chats: state.chats.filter((chat) => chat.slug !== slug), archived: state.archived.filter((item) => item !== slug), pinned: state.pinned.filter((item) => item !== slug), order: state.order.filter((item) => item !== slug) }); },
};
