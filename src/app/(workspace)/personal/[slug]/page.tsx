import { MessagingApp } from "@/components/messaging-app";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
import { canAccessPersonalConversation } from "@/server/auth/routes";

export default async function PersonalConversationPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const { userId } = await auth();
  if (userId && !(await canAccessPersonalConversation(userId, slug))) notFound();
  return <MessagingApp selectedSlug={slug} />;
}
