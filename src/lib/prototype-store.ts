"use client";

import type { Message } from "@/data/messaging-data";

export type PrototypeRoom = { slug: string; name: string; createdAt: string; messages: Message[]; tags: string[]; people: string[]; things: string[] };
export type PrototypeChat = { slug: string; name: string; initials: string; color: string; tid: string; messages: Message[] };
export type PrototypeState = { version: 2; mode: "new" | "demo"; sandboxMessages: Message[]; rooms: PrototypeRoom[]; chats: PrototypeChat[]; pinned: string[]; archived: string[] };

const STORAGE_KEY = "tosker.prototype.v2";
const LEGACY_KEY = "tosker.prototype.v1";
const listeners = new Set<() => void>();
const blank = (mode: PrototypeState["mode"]): PrototypeState => ({ version: 2, mode, sandboxMessages: [], rooms: [], chats: [], pinned: [], archived: [] });
const serverState = blank("new");
let memoryState = blank("new");
let loaded = false;

function read(): PrototypeState {
  if (typeof window === "undefined") return blank("new");
  if (loaded) return memoryState;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved) as PrototypeState;
      if (parsed.version === 2) memoryState = parsed;
    } else {
      const legacy = window.localStorage.getItem(LEGACY_KEY);
      if (legacy) {
        const parsed = JSON.parse(legacy) as { mode?: "new" | "demo"; myRoomMessages?: Message[]; rooms?: Array<{ slug: string; name: string; createdAt: string; messages: Message[] }> };
        memoryState = { ...blank(parsed.mode === "demo" ? "demo" : "new"), sandboxMessages: parsed.myRoomMessages ?? [], rooms: (parsed.rooms ?? []).map((room) => ({ ...room, tags: ["ROOM"], people: [], things: [] })) };
      }
    }
  } catch { memoryState = blank("new"); }
  return memoryState;
}

function write(next: PrototypeState) { memoryState = next; window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next)); listeners.forEach((listener) => listener()); }
const slugify = (value: string) => value.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "new-room";

export const prototypeStore = {
  subscribe(listener: () => void) { listeners.add(listener); return () => listeners.delete(listener); },
  getSnapshot: read,
  getServerSnapshot: () => serverState,
  setMode(mode: PrototypeState["mode"]) { write(blank(mode)); },
  addSandboxMessage(message: Message) { const current = read(); write({ ...current, sandboxMessages: [...current.sandboxMessages, message] }); },
  createRoom(input: { name: string; tags?: string[]; people?: string[]; things?: string[] }) {
    const current = read(); const base = slugify(input.name); const slug = current.rooms.some((room) => room.slug === base) ? `${base}-${Date.now()}` : base;
    const room: PrototypeRoom = { slug, name: input.name.trim(), createdAt: "Now", messages: [], tags: input.tags?.length ? input.tags : ["ROOM"], people: input.people ?? [], things: input.things ?? [] };
    write({ ...current, rooms: [...current.rooms, room] }); return room;
  },
  createChat(input: { name: string; initials: string; color: string; tid: string }) {
    const current = read(); const existing = current.chats.find((chat) => chat.tid === input.tid); if (existing) return existing;
    const chat: PrototypeChat = { slug: slugify(input.name), ...input, messages: [] }; write({ ...current, chats: [...current.chats, chat] }); return chat;
  },
  addRoomMessage(slug: string, message: Message) { const current = read(); write({ ...current, rooms: current.rooms.map((room) => room.slug === slug ? { ...room, messages: [...room.messages, message] } : room) }); },
  addChatMessage(slug: string, message: Message) { const current = read(); write({ ...current, chats: current.chats.map((chat) => chat.slug === slug ? { ...chat, messages: [...chat.messages, message] } : chat) }); },
  togglePinned(slug: string) { const current = read(); const pinned = current.pinned.includes(slug) ? current.pinned.filter((item) => item !== slug) : [...current.pinned, slug]; write({ ...current, pinned }); },
  archive(slug: string) { const current = read(); write({ ...current, archived: [...new Set([...current.archived, slug])] }); },
  nuke(slug: string) { const current = read(); write({ ...current, rooms: current.rooms.filter((room) => room.slug !== slug), chats: current.chats.filter((chat) => chat.slug !== slug), archived: current.archived.filter((item) => item !== slug), pinned: current.pinned.filter((item) => item !== slug) }); },
};
