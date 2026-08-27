import { MessagingApp } from "@/components/messaging-app";
import { getConversation } from "@/data/messaging-data";
export default async function RoomPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; return <MessagingApp selected={getConversation(slug)} />; }
