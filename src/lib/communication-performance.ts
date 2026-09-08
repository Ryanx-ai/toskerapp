/** Content-free, bounded local timings. Never records messages, identities or tokens. */
export type DeliveryTrace = { id: string; committedAt: number; publishedAt: number };
export function communicationTiming(stage: string, detail: Record<string, string | number> = {}) {
  if (typeof performance === "undefined") return;
  const name = `tosker:${stage}`;
  performance.mark(name, { detail: { ...detail, at: Date.now() } });
  const entries = performance.getEntriesByType("mark").filter((entry) => entry.name.startsWith("tosker:"));
  // Clear old names in batches; timings are diagnostics, never application state.
  if (entries.length > 200) for (const entry of entries.slice(0, 100)) performance.clearMarks(entry.name);
}
export function deliveryTrace(value: unknown): DeliveryTrace | undefined {
  if (!value || typeof value !== "object") return;
  const trace = value as DeliveryTrace;
  if (/^[0-9a-f-]{36}$/i.test(trace.id) && Number.isFinite(trace.committedAt) && Number.isFinite(trace.publishedAt)) return trace;
}
