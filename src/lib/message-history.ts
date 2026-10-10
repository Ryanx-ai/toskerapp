import type { HistoryOptions, HistoryPage } from "@/server/conversations/history";
import { communicationTiming } from "./communication-performance";
import { CONVERSATION_ACCESS_LOST } from "./realtime-contract";
import { recordMessageRemovals, removedMessageIds, withoutRemovedMessages } from "./message-removal";

export async function fetchMessageHistory(conversationId: string, options: HistoryOptions = {}): Promise<HistoryPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) if (value !== undefined) query.set(key, Array.isArray(value) ? value.join(",") : value);
  const started = performance.now();
  const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages?${query}`, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) });
  // An expired session JWT during recovery is not evidence of membership loss.
  // Return no data on401; the auth gate owns sign-out/session recovery. Only a
  // current authenticated context denial may remove the selected workspace.
  if (response.status === 403) window.dispatchEvent(new CustomEvent(CONVERSATION_ACCESS_LOST, { detail: conversationId }));
  if (!response.ok) throw new Error("Messages couldn't be loaded.");
  const page = await response.json() as HistoryPage;
  recordMessageRemovals(conversationId, page.removedIds ?? []);
  page.messages = withoutRemovedMessages(page.messages, removedMessageIds(conversationId));
  communicationTiming("history-fetch", { durationMs: performance.now() - started, ...page.timing, rows: page.messages.length });
  return page;
}
