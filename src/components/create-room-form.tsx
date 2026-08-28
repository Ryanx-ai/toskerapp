"use client";

import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { prototypeStore } from "@/lib/prototype-store";

export function CreateRoomForm() {
  const router = useRouter();
  const [name, setName] = useState("");
  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!name.trim()) return;
    const room = prototypeStore.createRoom(name);
    router.push(`/room/${room.slug}`);
  };

  return <main className="create-room-page"><Link href="/" className="create-brand"><Image src="/brand/toskerlogo-full-white.svg" alt="Tosker" width={156} height={72} priority /></Link><section className="create-room-card"><div className="create-room-intro"><p className="eyebrow">Make somewhere</p><h1>Name it. You’re inside.</h1><p>A Room starts with a name. Bring people and everything else later</p></div><form onSubmit={submit}><label><span>Room name</span><input autoFocus name="room-name" value={name} onChange={(event) => setName(event.target.value)} placeholder="e.g. Sunday Dinner" autoComplete="off" required /></label><div className="create-actions"><Link href="/" className="text-button">Cancel</Link><button type="submit" className="button button-primary" disabled={!name.trim()}>Create Room <span>→</span></button></div></form></section><aside className="create-room-aside" aria-hidden="true"><span>✦</span><strong>name<br />the<br />place</strong><span>⌁</span></aside></main>;
}
