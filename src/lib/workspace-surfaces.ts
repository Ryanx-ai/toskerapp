/** Keep `hall` as the storage/URL key; Board is the product name. */
export type WorkspaceSurface = "chat" | "hall" | "map" | "live";

export function hasRoomMap(context: { kind: string; tag?: string; slug: string; mapAvailable?: boolean }) {
  return context.kind === "my-room" || context.kind === "room" || (context.kind === "personal" && context.mapAvailable === true);
}

/** The URL owns the single primary surface. Desktop Room Chat may accompany Map/Board. */
export function resolveWorkspaceSurface(requested: WorkspaceSurface, context?: { kind: string; tag?: string; slug: string; mapAvailable?: boolean }): WorkspaceSurface {
  return (requested === "map" || requested === "live") && (!context || !hasRoomMap(context) || (requested === "live" && context.kind === "my-room")) ? "chat" : requested;
}
