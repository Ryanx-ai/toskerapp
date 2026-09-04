import { MessagingApp } from "@/components/messaging-app";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { canAccessSubroom } from "@/server/auth/routes";

export default async function SubroomPage({ params }: { params: Promise<{ slug: string; subroomId: string }> }) {
  const { slug, subroomId } = await params;
  const { userId } = await auth();
  if (userId && !(await canAccessSubroom(userId, slug, subroomId))) notFound();
  return <MessagingApp selectedSlug={`${slug}--${subroomId}`} />;
}
