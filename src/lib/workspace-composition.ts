import type { WorkspaceSurface } from "./workspace-surfaces";

/** Layout only: no participation intent, credentials, drafts or coordinates. */
export type WorkspaceComposition = (
  | { primary: "map" | "hall"; companion: "chat" | "hall" | "live" | null }
  | { primary: "live"; companion: "chat" | null }
  | { primary: "chat"; companion: null }) & { mapCanvas?: boolean };
export type SurfaceCapabilities = { map: boolean; live: boolean; mapFirst?: boolean };
export type CompositionAction = { type: "choose" | "alone" | "compact"; surface: WorkspaceSurface };
export const surfaceNames = { map: "Map", hall: "Board", live: "Live", chat: "Chat" } as const;
export const workspaceSurfaces: readonly WorkspaceSurface[] = ["map", "hall", "live", "chat"];
export function isWorkspaceSurface(value: unknown): value is WorkspaceSurface {
  return workspaceSurfaces.some(surface => surface === value);
}
export function surfaceAvailable(surface: WorkspaceSurface, capabilities: SurfaceCapabilities) {
  return surface === "map" ? capabilities.map : surface === "live" ? capabilities.live : true;
}
export function normalizeComposition(primary: unknown, companion: unknown, capabilities: SurfaceCapabilities): WorkspaceComposition {
  if (capabilities.mapFirst) {
    const main = primary === "chat" || primary === "hall" ? primary : capabilities.map ? "map" : "chat";
    return main === "map"
      ? { primary: "map", companion: companion === "chat" || companion === "hall" ? companion : null, mapCanvas: true }
      : { primary: main, companion: null, mapCanvas: capabilities.map };
  }
  const main = isWorkspaceSurface(primary) && surfaceAvailable(primary, capabilities) ? primary : "chat";
  if (main === "chat") return { primary: main, companion: null };
  if (main === "live") return { primary: main, companion: companion === "chat" ? "chat" : null };
  return { primary: main, companion: companion === "chat" ? "chat" : companion === "live" && capabilities.live ? "live" : null };
}
export function composeWorkspace(state: WorkspaceComposition, action: CompositionAction, capabilities: SurfaceCapabilities): WorkspaceComposition {
  const current = normalizeComposition(state.primary, state.companion, capabilities);
  const target = action.surface;
  if (capabilities.mapFirst) {
    // Old Live deep links never activate the deferred feature.
    if (target === "live" || !surfaceAvailable(target, capabilities)) return current;
    if (!capabilities.map || action.type === "alone") return normalizeComposition(target, null, capabilities);
    if (target === "map") return normalizeComposition("map", null, capabilities);
    if (action.type === "compact") return normalizeComposition("map", target, capabilities);
    if (target === current.primary || target === current.companion) return normalizeComposition("map", null, capabilities);
    return normalizeComposition("map", target, capabilities);
  }
  if (!surfaceAvailable(target, capabilities)) return current;
  if (action.type === "alone") return normalizeComposition(target, null, capabilities);
  if (target === current.primary) return current;
  if (target === "map" || target === "hall") {
    return { primary: target, companion: current.primary === "map" || current.primary === "hall" ? current.companion : current.primary };
  }
  if (current.primary === "map" || current.primary === "hall") {
    return { primary: current.primary, companion: current.companion === target ? null : target };
  }
  return current.primary === "live"
    ? { primary: "live", companion: current.companion ? null : "chat" }
    : { primary: "live", companion: "chat" };
}
export function surfaceIsVisible(composition: WorkspaceComposition, surface: WorkspaceSurface, wide: boolean, foreground: WorkspaceSurface) {
  // Keeping the canvas mounted preserves camera, origin and consent effects.
  // The panel layer controls occlusion/focus, never authorization or sharing.
  if (surface === "map" && composition.mapCanvas) return true;
  return (surface === composition.primary || surface === composition.companion) && (wide || surface === foreground);
}
