type DatedMessage = { createdAt?: string; authorId?: string; deletedAt?: string | null; replyToId?: string | null };

export function messageDay(value?: string) {
  const date = value ? new Date(value) : null;
  return date && Number.isFinite(date.getTime()) ? `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}` : null;
}

export function messageDayLabel(value?: string, now = new Date()) {
  if (!messageDay(value)) return "Conversation";
  if (messageDay(value) === messageDay(now.toISOString())) return "Today";
  const yesterday = new Date(now); yesterday.setDate(yesterday.getDate() - 1);
  if (messageDay(value) === messageDay(yesterday.toISOString())) return "Yesterday";
  return new Date(value!).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" });
}

export function groupMessages(previous: DatedMessage | undefined, message: DatedMessage) {
  if (previous?.deletedAt || message.deletedAt || previous?.replyToId || message.replyToId) return false;
  if (!previous?.authorId || previous.authorId !== message.authorId || !previous.createdAt || !message.createdAt || messageDay(previous.createdAt) !== messageDay(message.createdAt)) return false;
  const elapsed = Date.parse(message.createdAt) - Date.parse(previous.createdAt);
  return elapsed >= 0 && elapsed <= 60_000;
}
