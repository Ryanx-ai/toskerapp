"use client";

import { useId, useState } from "react";
import { Search, X } from "lucide-react";
import { ConversationSearch } from "./conversation-search";
import { ModalLayer } from "./modal-layer";

/** One entry point. Only the authorized current Chat history is searchable. */
export function ContextSearch({ context }: { context?: { id: string; name: string; href: string; kind: "personal" | "room" | "my-room"; subroom?: boolean } }) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const label = !context ? "Find in a chat" : context.subroom ? "Find in this Subroom" : context.kind === "room" ? "Find in this Room" : context.kind === "my-room" ? "Find in your Sandbox" : "Find in this chat";
  return <>
    <button className="context-search-trigger has-tip" aria-label={label} data-tip={label} aria-haspopup="dialog" aria-expanded={open} onClick={() => setOpen(true)}>
      <Search size={18} aria-hidden="true" /><span>{label}</span>
    </button>
    {open && context ? <ConversationSearch key={context.id} conversationId={context.id} name={context.name} href={context.href} scopeLabel={label} onClose={() => setOpen(false)} /> : null}
    {open && !context ? <ModalLayer onClose={() => setOpen(false)}><section className="creation-panel context-search-help" aria-labelledby={id}>
      <button className="overlay-close" aria-label="Close search" onClick={() => setOpen(false)}><X size={18} /></button>
      <h2 id={id}>Choose a chat first</h2>
      <p>Open a chat, Room or Sandbox to find messages in its Chat history. Sidebar search finds chats and Rooms by name, not message text.</p>
      <p>Searching across conversations isn’t available yet.</p>
      <button className="primary-action" onClick={() => setOpen(false)}>Got it</button>
    </section></ModalLayer> : null}
  </>;
}
