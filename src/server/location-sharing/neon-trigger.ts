/** Neon edge attestation, not an ordinary public HTTP credential. Never deploy
 * this handler behind a proxy that preserves client-supplied X-Neon-* headers.
 * Hosted spoof-negative acceptance is required before enabling any deletion. */
export function neonCleanupHandler(run: () => Promise<void>, ready: () => boolean) {
  return async (request: Request): Promise<Response> => {
    const response = (status: number) => new Response(null, { status, headers: { "cache-control": "no-store" } });
    if (request.method !== "POST" || new URL(request.url).pathname !== "/") return response(404);
    const attestation = request.headers.get("x-neon-trigger-invocation-id");
    if (!attestation || attestation.length > 128 || !ready()) return response(403);
    if (!request.headers.get("content-type")?.startsWith("application/json")) return response(400);
    // Bound actual bytes, not just the untrusted Content-Length header.
    const reader = request.body?.getReader();
    if (!reader) return response(400);
    const chunks: Uint8Array[] = []; let size = 0;
    try {
      while (true) {
        const { done, value } = await reader.read(); if (done) break;
        size += value.byteLength;
        if (size > 2048) { await reader.cancel(); return response(413); }
        chunks.push(value);
      }
      const bytes = new Uint8Array(size); let offset = 0;
      for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
      const body = JSON.parse(new TextDecoder().decode(bytes));
      if (body.version !== 1 || body.invocation_id !== attestation || body.trigger?.type !== "schedule"
        || body.trigger?.name !== "tosker-fp3-rescue" || typeof body.data?.scheduled_at !== "string"
        || !Number.isFinite(Date.parse(body.data.scheduled_at))) return response(400);
      // No caller fields reach SQL, logs, or returned data. DB time owns expiry.
      await run();
      return response(204);
    } catch { return response(503); }
    finally { reader.releaseLock(); }
  };
}
