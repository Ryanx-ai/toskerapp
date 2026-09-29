import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { MessagingApp } from "@/components/messaging-app";
import { canAccessRoom } from "@/server/auth/routes";

export default async function RoomMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { userId } = await auth();
  // No demo Map and no inherited Subroom access: this belongs to a current Room member.
  if (!userId || !(await canAccessRoom(userId, slug))) notFound();
  return <MessagingApp selectedSlug={slug} surface="map" />;
}
