import { messageInline, type MessageInline } from "@/lib/message-format";
import { Fragment } from "react";
import type { MentionSpan } from "@/lib/mentions";

/** React escapes every leaf. No raw HTML, embeds, images or executable schemes. */
export function MessageText({ body, mentions = [], links = true, highlightQuery }: { body: string; mentions?: MentionSpan[]; links?: boolean; highlightQuery?: string }) {
  const highlight = (text: string) => {
    if (!highlightQuery?.trim()) return text;
    const start = text.toLocaleLowerCase().indexOf(highlightQuery.toLocaleLowerCase());
    return start < 0 ? text : <>{text.slice(0,start)}<mark className="message-search-match">{text.slice(start,start+highlightQuery.length)}</mark>{text.slice(start+highlightQuery.length)}</>;
  };
  const render = (nodes: MessageInline[]): React.ReactNode => nodes.map((node, index) => {
    if (node.kind === "strong") return <strong key={index}>{render(node.children)}</strong>;
    if (node.kind === "em") return <em key={index}>{render(node.children)}</em>;
    if (node.kind === "mention") return <span key={index} className="message-mention" title="Mentioned member">{node.text}</span>;
    if (node.kind === "link" && links) return <a key={index} className="message-link" href={node.href} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">{node.text}</a>;
    return "text" in node ? <Fragment key={index}>{highlight(node.text)}</Fragment> : null;
  });
  return <>{render(messageInline(body, mentions))}</>;
}
