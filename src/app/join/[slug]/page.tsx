import { JoinRoom } from "@/components/join-room";
import Link from "next/link";

export default async function JoinRoomPage({
  params,
  searchParams,
}: {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { slug } = await params;
  const query = await searchParams;
  const value = (key: string, fallback: string) => {
    const item = query[key];
    return typeof item === "string" && item.trim() ? item.trim() : fallback;
  };
  const invitationName = value("name", "");
  const valid = /^[a-z0-9][a-z0-9-]{0,79}$/.test(slug) && invitationName.length > 0;
  if (!valid)
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
      name={invitationName}
      tag={value("tag", "ROOM")}
      owner={value("owner", "Ryan")}
    />
  );
}
