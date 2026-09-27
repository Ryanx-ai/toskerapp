import { messageTextParts } from "./message-links";
import { validMentionSpans, type MentionSpan } from "./mentions";

export type MessageInline = { kind: "text" | "mention"; text: string } | { kind: "link"; text: string; href: string } | { kind: "strong" | "em"; children: MessageInline[] };

/** Small inline grammar, not HTML/Markdown execution. Original offsets and storage stay intact.
 * URLs and validated mentions are atomic: underscores in either never become emphasis.
 * Unmatched delimiters remain literal; nesting is bounded. */
export function messageInline(body: string, mentions: MentionSpan[] = []): MessageInline[] {
  const atoms = new Map<number, { end: number; node: MessageInline }>();
  if (validMentionSpans(body, mentions)) for (const span of mentions) atoms.set(span.start, { end: span.start + span.length, node: { kind: "mention", text: span.label } });
  let offset = 0;
  for (const part of messageTextParts(body)) {
    if (part.href && ![...atoms].some(([start, atom]) => offset < atom.end && offset + part.text.length > start)) {
      // A trailing formatting delimiter is not part of the URL. Internal URL stars/underscores stay literal.
      let text = part.text;
      for (const delimiter of ["**", "*", "_"]) if (body.slice(0, offset).endsWith(delimiter) && text.endsWith(delimiter)) { text = text.slice(0, -delimiter.length); break; }
      try { atoms.set(offset, { end: offset + text.length, node: { kind: "link", text, href: new URL(text).href } }); }
      catch { /* Malformed delimiter-adjacent URL remains escaped text. */ }
    }
    offset += part.text.length;
  }
  const parse = (start: number, end: number, depth: number): MessageInline[] => {
    const nodes: MessageInline[] = [];
    const literal = (text: string) => { const last = nodes.at(-1); if (last?.kind === "text") last.text += text; else nodes.push({ kind: "text", text }); };
    for (let i = start; i < end;) {
      const atom = atoms.get(i);
      if (atom && atom.end <= end) { nodes.push(atom.node); i = atom.end; continue; }
      if (body[i] === "\\" && /[*_\\]/.test(body[i + 1] ?? "")) { literal(body[i + 1]); i += 2; continue; }
      const delimiter = body.startsWith("**", i) ? "**" : /[*_]/.test(body[i]) ? body[i] : "";
      const wordUnderscore = delimiter === "_" && /[\p{L}\p{N}]/u.test(body[i - 1] ?? "");
      if (delimiter && !wordUnderscore && depth < 4 && i + delimiter.length < end && !/\s/.test(body[i + delimiter.length])) {
        let close = i + delimiter.length;
        for (; close < end; close++) {
          const protectedAtom = atoms.get(close);
          if (protectedAtom) { close = protectedAtom.end - 1; continue; }
          if (body[close] === "\\") { close++; continue; }
          if (body.startsWith(delimiter, close) && close > i + delimiter.length && !/\s/.test(body[close - 1]) && !(delimiter === "_" && /[\p{L}\p{N}]/u.test(body[close + 1] ?? ""))) break;
        }
        if (close + delimiter.length <= end) {
          nodes.push({ kind: delimiter === "**" ? "strong" : "em", children: parse(i + delimiter.length, close, depth + 1) });
          i = close + delimiter.length; continue;
        }
      }
      literal(body[i]); i++;
    }
    return nodes;
  };
  return parse(0, body.length, 0);
}

export function messagePlainPreview(body: string): string {
  const flatten = (nodes: MessageInline[]): string => nodes.map(node => "children" in node ? flatten(node.children) : node.text).join("");
  return flatten(messageInline(body));
}
