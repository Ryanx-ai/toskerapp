"use client";

import Image from "next/image";
import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { ArrowRight, UsersRound } from "lucide-react";
import { FakeQr } from "@/components/fake-qr";
import { acceptRoomInviteAction } from "@/server/rooms/actions";
import { useToskerIdentity } from "@/components/tosker-identity";

export function JoinRoom({
  slug,
  roomSlug,
  name,
  tag,
  owner,
}: {
  slug: string;
  roomSlug: string;
  name: string;
  tag: string;
  owner: string;
}) {
  const router = useRouter();
  const { isLoaded, isSignedIn } = useAuth();
  const identity = useToskerIdentity();
  const joined = identity?.rooms.some((room) => room.slug === roomSlug) ?? false;
  const [joining, setJoining] = useState(false);
  const [error, setError] = useState("");
  const join = async () => {
    setJoining(true);
    setError("");
    try {
      const result = await acceptRoomInviteAction(slug);
      router.push(`/room/${result.roomSlug}`);
      router.refresh();
    } catch {
      setError("This invitation could not be accepted.");
      setJoining(false);
    }
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
            <Link href={`/room/${roomSlug}`}>
              Open Room <ArrowRight size={16} />
            </Link>
          </div>
        ) : !isLoaded ? null : isSignedIn ? (
          <button className="primary-action" onClick={() => void join()} disabled={joining}>
            {joining ? "Joining…" : "Join Room"}
          </button>
        ) : (
          <SignInButton mode="modal" forceRedirectUrl={`/join/${slug}`}>
            <button className="primary-action">Sign in to join</button>
          </SignInButton>
        )}
        {error ? <p role="alert">{error}</p> : null}
        <small>Secure invitation · Authentication required to join</small>
      </section>
    </main>
  );
}
