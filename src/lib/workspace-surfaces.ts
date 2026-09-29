/** Keep `hall` as the storage/URL key; Board is the product name. */
export type WorkspaceSurface = "chat" | "hall" | "map";

export function hasRoomMap(context: { kind: string; tag?: string; slug: string }) {
  return context.kind === "room" && context.tag !== "SUBROOM" && !context.slug.includes("--");
}

/** The URL owns the single primary surface. Live and companion Chat are not enabled yet. */
export function resolveWorkspaceSurface(requested: WorkspaceSurface, context?: { kind: string; tag?: string; slug: string }): WorkspaceSurface {
  return requested === "map" && (!context || !hasRoomMap(context)) ? "chat" : requested;
}
