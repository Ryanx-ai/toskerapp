import { JoinRoom } from "@/components/join-room";
import Link from "next/link";
import { getInviteDetails } from "@/server/rooms/actions";

export default async function JoinRoomPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const invitation = await getInviteDetails(slug);
  if (!invitation)
    return (
      <main className="join-page">
        <section className="join-card invite-unavailable">
          <p className="eyebrow">Room invitation</p>
          <h1>Invite unavailable</h1>
          <p>This Room link is incomplete or no longer available.</p>
          <Link href="/">Open Tosker</Link>
        </section>
      </main>
    );
  return (
    <JoinRoom
      slug={slug}
      roomSlug={invitation.roomSlug}
      name={invitation.roomName}
      tag={invitation.tag}
      owner={invitation.ownerName}
    />
  );
}
