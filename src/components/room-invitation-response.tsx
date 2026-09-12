"use client";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { respondToInvitationAction } from "@/server/rooms/invitation-actions";
import { ACTIVITY_REFRESH } from "@/lib/realtime-contract";

export function RoomInvitationResponse({ id, status, roomSlug }: { id: string; status: string | null; roomSlug: string | null }) {
  const router = useRouter();
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [resolved, setResolved] = useState<string | null>(null);
  const current = resolved ?? status;
  const respond = async (accept: boolean) => {
    if (busy) return;
    setBusy(true); setError("");
    try {
      const result = await respondToInvitationAction(id, accept);
      setResolved(accept ? "accepted" : "declined");
      window.dispatchEvent(new Event(ACTIVITY_REFRESH));
      if (accept) { router.push(`/room/${result.roomSlug}`); router.refresh(); }
    } catch { setError("Invitation unavailable or response unconfirmed. Refresh and retry."); window.dispatchEvent(new Event(ACTIVITY_REFRESH)); }
    finally { setBusy(false); }
  };
  return <div className="fp2-invite-response" id={`invitation-${id}`}>
    {current === "pending" ? <div className="fp2-action-row"><button className="quiet-action" disabled={busy} onClick={() => void respond(true)}>{busy ? "Saving…" : "Accept invite"}</button><button disabled={busy} onClick={() => void respond(false)}>Decline</button></div> : current === "accepted" && roomSlug ? <Link href={`/room/${roomSlug}`}>Open Room</Link> : <small>{current === "declined" ? "Declined" : current === "revoked" ? "Cancelled" : "Invitation unavailable"}</small>}
    {error ? <p role="alert" className="composer-error">{error}</p> : null}
  </div>;
}
