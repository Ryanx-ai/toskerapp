/** Keep `hall` as the storage/URL key; Board is the product name. */
export type WorkspaceSurface = "chat" | "hall" | "map" | "live";

export function hasRoomMap(context: { kind: string; tag?: string; slug: string }) {
  return context.kind === "room";
}

/** The URL owns the single primary surface. Desktop Room Chat may accompany Map/Board. */
export function resolveWorkspaceSurface(requested: WorkspaceSurface, context?: { kind: string; tag?: string; slug: string }): WorkspaceSurface {
  return (requested === "map" || requested === "live") && (!context || !hasRoomMap(context)) ? "chat" : requested;
}
