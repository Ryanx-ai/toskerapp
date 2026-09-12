export type BurstEvent = { id: string; type: string; actorId: string | null; conversationId: string | null; roomId: string | null; subroomId: string | null; isMention: boolean; createdAt: string };
export type NotificationBurst<T> = { id: string; events: T[]; latest: T };

/** Presentation only. Call once for one recipient's authorized event stream. */
export function notificationBursts<T extends BurstEvent>(events: readonly T[], recipientId: string): NotificationBurst<T>[] {
  const result: NotificationBurst<T>[] = [];
  const chronological = [...events].sort((a, b) => a.createdAt.localeCompare(b.createdAt) || a.id.localeCompare(b.id));
  const eligible = (event: T) => event.type === "message" && !event.isMention && Boolean(event.actorId && event.conversationId);
  for (const event of chronological) {
    const previous = result.at(-1), last = previous?.latest;
    const gap = last ? Date.parse(event.createdAt) - Date.parse(last.createdAt) : Infinity;
    if (previous && last && eligible(event) && eligible(last) && gap >= 0 && gap <= 120000 && event.actorId === last.actorId && event.conversationId === last.conversationId && event.roomId === last.roomId && event.subroomId === last.subroomId) {
      previous.events.push(event); previous.latest = event;
    } else result.push({ id: `${recipientId}:${event.id}`, events: [event], latest: event });
  }
  return result.reverse();
}
