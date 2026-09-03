"use client";

import Image from "next/image";
import Link from "next/link";
import { useSyncExternalStore } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, UsersRound } from "lucide-react";
import { FakeQr } from "@/components/fake-qr";
import { prototypeStore } from "@/lib/prototype-store";

export function JoinRoom({
  slug,
  name,
  tag,
  owner,
}: {
  slug: string;
  name: string;
  tag: string;
  owner: string;
}) {
  const router = useRouter();
  const state = useSyncExternalStore(
    prototypeStore.subscribe,
    prototypeStore.getSnapshot,
    prototypeStore.getServerSnapshot,
  );
  const joined = state.rooms.some((room) => room.slug === slug);
  const join = () => {
    prototypeStore.joinRoom({ slug, name, tag, owner });
    router.push(`/room/${slug}`);
  };
  return (
    <main className="join-page">
      <Link href="/" className="join-brand" aria-label="Tosker home">
        <Image
          src="/brand/toskerlogo-full-white.svg"
          alt="Tosker"
          width={150}
          height={72}
          priority
        />
      </Link>
      <section className="join-card">
        <div className="join-room-mark" aria-hidden="true">
          {name.slice(0, 2).toUpperCase()}
        </div>
        <p className="eyebrow">Room invitation</p>
        <h1>{name}</h1>
        <p className="join-context">
          <UsersRound size={16} /> {owner} invited you · {tag}
        </p>
        <p>
          A Tosker Room is one place to talk, keep plans, and bring useful
          things together.
        </p>
        <FakeQr value={slug} />
        {joined ? (
          <div className="join-complete" role="status">
            <strong>Already joined.</strong>
            <Link href={`/room/${slug}`}>
              Open Room <ArrowRight size={16} />
            </Link>
          </div>
        ) : (
          <button className="primary-action" onClick={join}>
            Join Room
          </button>
        )}
        <small>Prototype invitation · No account required for this preview</small>
      </section>
    </main>
  );
}
