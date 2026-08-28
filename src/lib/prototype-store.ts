"use client";

import type { Message } from "@/data/messaging-data";

export type PrototypeRoom = {
  slug: string;
  name: string;
  createdAt: string;
  messages: Message[];
};

export type PrototypeState = {
  version: 1;
  mode: "new" | "demo";
  myRoomMessages: Message[];
  rooms: PrototypeRoom[];
};

const STORAGE_KEY = "tosker.prototype.v1";
const listeners = new Set<() => void>();
const freshState: PrototypeState = { version: 1, mode: "new", myRoomMessages: [], rooms: [] };
const demoState: PrototypeState = { version: 1, mode: "demo", myRoomMessages: [], rooms: [] };

let memoryState: PrototypeState = freshState;
let loaded = false;

function read(): PrototypeState {
  if (typeof window === "undefined") return freshState;
  if (loaded) return memoryState;
  loaded = true;
  try {
    const saved = window.localStorage.getItem(STORAGE_KEY);
    if (!saved) return memoryState;
    const parsed = JSON.parse(saved) as PrototypeState;
    memoryState = parsed.version === 1 ? parsed : freshState;
    return memoryState;
  } catch {
    return freshState;
  }
}

function write(next: PrototypeState) {
  memoryState = next;
  window.localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  listeners.forEach((listener) => listener());
}

export const prototypeStore = {
  subscribe(listener: () => void) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },
  getSnapshot: read,
  getServerSnapshot: () => freshState,
  setMode(mode: PrototypeState["mode"]) {
    write(mode === "new" ? freshState : demoState);
  },
  addMyRoomMessage(message: Message) {
    const current = read();
    write({ ...current, myRoomMessages: [...current.myRoomMessages, message] });
  },
  createRoom(name: string) {
    const current = read();
    const base = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "") || "new-room";
    const slug = current.rooms.some((room) => room.slug === base) ? `${base}-${Date.now()}` : base;
    const room: PrototypeRoom = { slug, name: name.trim(), createdAt: "Now", messages: [] };
    write({ ...current, rooms: [...current.rooms, room] });
    return room;
  },
  addRoomMessage(slug: string, message: Message) {
    const current = read();
    write({ ...current, rooms: current.rooms.map((room) => room.slug === slug ? { ...room, messages: [...room.messages, message] } : room) });
  },
};
