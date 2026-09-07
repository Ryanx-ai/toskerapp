import { MessagingApp } from "@/components/messaging-app";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { canAccessRoom } from "@/server/auth/routes";

export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { userId } = await auth();
  if (userId) {
    if (!(await canAccessRoom(userId, slug))) notFound();
  }
  return <MessagingApp selectedSlug={slug} />;
}
