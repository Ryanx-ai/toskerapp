import { MessagingApp } from "@/components/messaging-app";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { canAccessRoom } from "@/server/auth/routes";

export default async function RoomPage({ params, searchParams }: { params: Promise<{ slug: string }>; searchParams: Promise<{ surface?: string; message?: string }> }) {
  const { slug } = await params;
  const { userId } = await auth();
  if (userId) {
    if (!(await canAccessRoom(userId, slug))) notFound();
  }
  const query = await searchParams;
  return <MessagingApp selectedSlug={slug} surface={userId && query.surface !== "chat" && !query.message ? "map" : "chat"} />;
}
