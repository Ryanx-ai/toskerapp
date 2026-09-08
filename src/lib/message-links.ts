export type MessageTextPart = { text: string; href?: string };

/** Plain text stays plain text. No HTML, fetching or non-web URL schemes. */
export function messageTextParts(body: string): MessageTextPart[] {
  const parts: MessageTextPart[] = [];
  let cursor = 0;
  for (const match of body.matchAll(/https?:\/\/[^\s<>"`]+/giu)) {
    const start = match.index;
    if (start > 0 && /[\p{L}\p{N}_:/]/u.test(body[start - 1])) continue;
    let text = match[0].replace(/[.,!?;:]+$/u, "");
    for (const [open, close] of [["(", ")"], ["[", "]"], ["{", "}"]]) {
      while (text.endsWith(close) && text.split(close).length > text.split(open).length) text = text.slice(0, -1);
    }
    let url: URL;
    try { url = new URL(text); } catch { continue; }
    if (!['http:', 'https:'].includes(url.protocol) || !url.hostname || url.username || url.password) continue;
    if (start > cursor) parts.push({ text: body.slice(cursor, start) });
    parts.push({ text, href: url.href });
    cursor = start + text.length;
  }
  if (cursor < body.length) parts.push({ text: body.slice(cursor) });
  return parts;
}
