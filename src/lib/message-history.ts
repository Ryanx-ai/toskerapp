import type { HistoryOptions, HistoryPage } from "@/server/conversations/history";
import { communicationTiming } from "./communication-performance";
import { CONVERSATION_ACCESS_LOST } from "./realtime-contract";

export async function fetchMessageHistory(conversationId: string, options: HistoryOptions = {}): Promise<HistoryPage> {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(options)) if (value !== undefined) query.set(key, Array.isArray(value) ? value.join(",") : value);
  const started = performance.now();
  const response = await fetch(`/api/conversations/${encodeURIComponent(conversationId)}/messages?${query}`, { credentials: "same-origin", cache: "no-store", signal: AbortSignal.timeout(15000) });
  if (response.status === 401 || response.status === 403) window.dispatchEvent(new CustomEvent(CONVERSATION_ACCESS_LOST, { detail: conversationId }));
  if (!response.ok) throw new Error("Messages couldn't be loaded.");
  const page = await response.json() as HistoryPage;
  communicationTiming("history-fetch", { durationMs: performance.now() - started, ...page.timing, rows: page.messages.length });
  return page;
}
