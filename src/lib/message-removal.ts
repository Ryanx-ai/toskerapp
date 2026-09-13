/** Content-free, tab-local invalidation knowledge. Neon authorizes every removal read. */
export const MESSAGES_REMOVED = "tosker:messages-removed";
const removedByConversation = new Map<string, Set<string>>();
export function removedMessageIds(conversationId: string): ReadonlySet<string> {
  return removedByConversation.get(conversationId) ?? new Set<string>();
}
export function recordMessageRemovals(conversationId: string, ids: string[]) {
  if (!ids.length) return;
  const known = removedByConversation.get(conversationId) ?? new Set<string>();
  const added = ids.filter((id) => !known.has(id));
  ids.forEach((id) => known.add(id));
  removedByConversation.set(conversationId, known);
  if (added.length && typeof window !== "undefined") window.dispatchEvent(new CustomEvent(MESSAGES_REMOVED, { detail: { conversationId, ids: added } }));
}
export function withoutRemovedMessages<T extends { id: string; replyToId?: string | null; replyTo?: string | null; replyAuthor?: string | null }>(rows: T[], removed: ReadonlySet<string>): T[] {
  return rows.filter((row) => !removed.has(row.id)).map((row) => row.replyToId && removed.has(row.replyToId) ? { ...row, replyToId: null, replyTo: undefined, replyAuthor: null } : row);
}
