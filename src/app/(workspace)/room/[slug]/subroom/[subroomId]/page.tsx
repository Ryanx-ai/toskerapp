import { MessagingApp } from "@/components/messaging-app";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { canAccessSubroom } from "@/server/auth/routes";

export default async function SubroomPage({ params, searchParams }: { params: Promise<{ slug: string; subroomId: string }>; searchParams: Promise<{ surface?: string; message?: string }> }) {
  const { slug, subroomId } = await params;
  const { userId } = await auth();
  if (userId && !(await canAccessSubroom(userId, slug, subroomId))) notFound();
  const query = await searchParams;
  return <MessagingApp selectedSlug={`${slug}--${subroomId}`} surface={userId && query.surface !== "chat" && !query.message ? "map" : "chat"} />;
}
