import { MessagingApp } from "@/components/messaging-app";
export default async function RoomHallPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <MessagingApp selectedSlug={slug} surface="hall" />; }
