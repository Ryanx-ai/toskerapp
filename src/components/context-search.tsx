"use client";
import { ConversationSearch } from "./conversation-search";

/** Navigation search, Chat history search and geographic search stay separate. */
export function ContextSearch({ context, compact = false }: { context?: { id: string; name: string; href: string; kind: "personal" | "room" | "my-room"; subroom?: boolean }; compact?: boolean }) {
  const label = !context ? "Find in a chat" : context.subroom ? "Find in this Subroom" : context.kind === "room" ? "Find in this Room" : context.kind === "my-room" ? "Find in your Sandbox" : "Find in this chat";
  return <ConversationSearch key={context?.id ?? "no-conversation"} conversationId={context?.id} name={context?.name} href={context?.href} scopeLabel={label} compact={compact} />;
}
