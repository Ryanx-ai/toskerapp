import { MessagingApp } from "@/components/messaging-app";
import { requirePersonalMapRoute } from "@/server/trips/personal-route";
export default async function PersonalLivePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requirePersonalMapRoute(slug);
  return <MessagingApp selectedSlug={slug} surface="live" />;
}
