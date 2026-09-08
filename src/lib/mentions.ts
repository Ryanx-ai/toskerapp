export type MentionSpan = { userId: string; start: number; length: number; label: string };
export type MentionCandidate = { userId: string; name: string; username: string | null };

/** Plain-text edits retain only intact explicit targets, never infer users by name. */
export function adjustMentions(before: string, after: string, spans: MentionSpan[] = []): MentionSpan[] {
  if (before === after) return spans;
  let prefix = 0, suffix = 0;
  while (prefix < before.length && prefix < after.length && before[prefix] === after[prefix]) prefix++;
  while (suffix < before.length - prefix && suffix < after.length - prefix && before[before.length - 1 - suffix] === after[after.length - 1 - suffix]) suffix++;
  const removedEnd = before.length - suffix, delta = after.length - before.length;
  return spans.flatMap((span) => {
    const end = span.start + span.length;
    const next = end <= prefix ? span : span.start >= removedEnd ? { ...span, start: span.start + delta } : null;
    return next && after.slice(next.start, next.start + next.length) === next.label ? [next] : [];
  });
}

export function validMentionSpans(body: string, spans: unknown): spans is MentionSpan[] {
  if (!Array.isArray(spans) || spans.length > 10) return false;
  let end = 0;
  for (const span of [...spans].sort((a, b) => (a?.start ?? -1) - (b?.start ?? -1))) {
    if (!span || typeof span.userId !== "string" || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(span.userId) || !Number.isSafeInteger(span.start) || !Number.isSafeInteger(span.length) || span.start < end || span.length < 2 || span.length > 201 || typeof span.label !== "string" || !span.label.startsWith("@") || span.start + span.length > body.length || body.slice(span.start, span.start + span.length) !== span.label) return false;
    end = span.start + span.length;
  }
  return true;
}
