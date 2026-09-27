import { messageInline, type MessageInline } from "@/lib/message-format";
import type { MentionSpan } from "@/lib/mentions";

/** React escapes every leaf. No raw HTML, embeds, images or executable schemes. */
export function MessageText({ body, mentions = [], links = true }: { body: string; mentions?: MentionSpan[]; links?: boolean }) {
  const render = (nodes: MessageInline[]): React.ReactNode => nodes.map((node, index) => {
    if (node.kind === "strong") return <strong key={index}>{render(node.children)}</strong>;
    if (node.kind === "em") return <em key={index}>{render(node.children)}</em>;
    if (node.kind === "mention") return <span key={index} className="message-mention" title="Mentioned member">{node.text}</span>;
    if (node.kind === "link" && links) return <a key={index} className="message-link" href={node.href} target="_blank" rel="noopener noreferrer" title="Opens in a new tab">{node.text}</a>;
    return "text" in node ? node.text : null;
  });
  return <>{render(messageInline(body, mentions))}</>;
}
