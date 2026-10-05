import { MessagingApp } from "@/components/messaging-app";
import { requirePersonalMapRoute } from "@/server/trips/personal-route";
import { requireCurrentActor } from "@/server/auth/clerk";
import { auth } from "@clerk/nextjs/server";
import { notFound } from "next/navigation";
export default async function PersonalMapPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  if (slug === "my-room") {
    if (!(await auth()).userId) notFound();
    await requireCurrentActor();
  }
  else await requirePersonalMapRoute(slug);
  return <MessagingApp selectedSlug={slug} surface="map" />;
}
