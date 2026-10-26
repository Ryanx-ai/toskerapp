"use client";

import { Activity, useEffect, useRef, useState, useSyncExternalStore, type ReactNode } from "react";
import { ArrowLeft, LayoutDashboard, Map as MapIcon, Maximize2, Minimize2, MessageCircle, Radio, X } from "lucide-react";
import { LIVE_BETA_ENABLED } from "@/lib/beta-features";
import type { LiveSession } from "@/lib/live-session";
import type { WorkspaceSurface } from "@/lib/workspace-surfaces";
import { surfaceAvailable, surfaceIsVisible, surfaceNames, workspaceSurfaces, type CompositionAction, type SurfaceCapabilities, type WorkspaceComposition } from "@/lib/workspace-composition";
import { AttentionMark } from "./attention-mark";
import { MapWorkspaceActions } from "./map-workspace-actions";

const icons = { map: MapIcon, hall: LayoutDashboard, live: Radio, chat: MessageCircle };
export function CompositionNavigation({ composition, capabilities, choose, chatUnread, hallUnread }: {
  composition: WorkspaceComposition; capabilities: SurfaceCapabilities; choose(action: CompositionAction): void; chatUnread: number; hallUnread: number;
}) {
  const navigation: readonly WorkspaceSurface[] = capabilities.mapFirst ? ["chat", "hall"] : workspaceSurfaces;
  return navigation.filter(surface => surfaceAvailable(surface, capabilities)).map(surface => {
    const Icon = icons[surface], active = composition.primary === surface || composition.companion === surface;
    return <button key={surface} type="button" data-surface-trigger={surface} className={active ? "active" : ""} aria-pressed={active} onClick={() => choose({ type: "choose", surface })}>
      <Icon size={16} aria-hidden="true" />{surfaceNames[surface]}
      {surface === "chat" ? <AttentionMark count={chatUnread} label="new messages" /> : surface === "hall" ? <AttentionMark count={hallUnread} label="new Board activities" /> : null}
    </button>;
  });
}

/** Always outside Activity boundaries. Layout changes never retire a joined lease. */
export function useLiveParticipation(live: LiveSession, userId: string | undefined, panelVisible: boolean) {
  const state = useSyncExternalStore(live.subscribe, live.getSnapshot, live.getServerSnapshot);
  const joined = state.phase === "connected" || state.phase === "joining" || state.phase === "reconnecting";
  const observing = LIVE_BETA_ENABLED && (panelVisible || joined);
  useEffect(() => observing && userId ? live.activate() : undefined, [live, userId, observing]);
  return { joined: LIVE_BETA_ENABLED && joined, phase: state.phase };
}

export function WorkspacePanels({ composition, foreground, wide, choose, focusSurface, children }: {
  composition: WorkspaceComposition; foreground: WorkspaceSurface; wide: boolean;
  choose(action: CompositionAction): void; focusSurface(surface: WorkspaceSurface): void;
  children: Record<WorkspaceSurface, ReactNode>;
}) {
  // A maximum of four visited surfaces in ONE context. A context/user key on
  // this owner discards everything when authority changes. Hidden effects stop.
  const visible = workspaceSurfaces.filter(surface => surfaceIsVisible(composition, surface, wide, foreground));
  const [visited, setVisited] = useState<WorkspaceSurface[]>(visible);
  if (visible.some(surface => !visited.includes(surface))) setVisited([...new Set([...visited, ...visible])]);
  const root = useRef<HTMLDivElement>(null);
  const [mapCompanion, setMapCompanion] = useState<"chat" | "hall" | "live" | null>(null);
  const mapActions = composition.primary === "map" && (composition.companion || mapCompanion) ? {
    expanded: !composition.companion,
    toggle: () => {
      if (composition.companion) { setMapCompanion(composition.companion); choose({ type: "alone", surface: "map" }); }
      else if (mapCompanion) choose({ type: "choose", surface: mapCompanion });
    },
  } : null;
  const mapCovered = !!composition.mapCanvas && (composition.primary !== "map" || (!wide && !!composition.companion && foreground === composition.companion));
  return <div ref={root} className={`workspace-composition ${wide && composition.companion ? "has-companion" : ""} ${composition.mapCanvas ? "has-map-canvas" : ""}`} data-map-covered={mapCovered || undefined} data-layout={`${composition.primary}:${composition.companion ?? "none"}`}>
    {!composition.mapCanvas && !wide && composition.companion && <div className="workspace-foreground" role="group" aria-label="Visible workspace pane">
      {[composition.primary, composition.companion].map(surface => <button type="button" key={surface} aria-pressed={foreground === surface} onClick={() => focusSurface(surface)}>{surface === composition.primary && <ArrowLeft size={15} aria-hidden="true" />}{surfaceNames[surface]}</button>)}
    </div>}
    {workspaceSurfaces.map(surface => visited.includes(surface) && <Activity key={surface} mode={visible.includes(surface) ? "visible" : "hidden"}>
      <section className={`workspace-pane ${surface === composition.companion ? "is-companion" : "is-primary"}`} data-workspace-pane={surface} aria-label={`${surfaceNames[surface]} workspace`} tabIndex={-1} inert={surface === "map" && mapCovered} aria-hidden={surface === "map" && mapCovered || undefined}>
        {surface !== "map" && <div className="workspace-pane-actions">
          <span>{surfaceNames[surface]}</span>
          {composition.companion && <button type="button" className="action-icon" aria-label={`Open ${surfaceNames[surface]} alone`} title={`Open ${surfaceNames[surface]} alone`} onClick={() => choose({ type: "alone", surface })}><Maximize2 size={16} aria-hidden="true" /></button>}
          {composition.mapCanvas && composition.primary === surface && <button type="button" className="action-icon" aria-label={`Minimize ${surfaceNames[surface]}`} title={`Minimize ${surfaceNames[surface]}`} onClick={() => choose({ type: "compact", surface })}><Minimize2 size={16} aria-hidden="true" /></button>}
          {(surface === composition.companion || composition.mapCanvas) && <button type="button" className="action-icon" aria-label={`Close ${surfaceNames[surface]} companion`} title={`Close ${surfaceNames[surface]} companion`} onClick={() => choose({ type: "choose", surface })}><X size={16} aria-hidden="true" /></button>}
        </div>}
        {surface === "map" ? <MapWorkspaceActions.Provider value={mapActions}>{children[surface]}</MapWorkspaceActions.Provider> : children[surface]}
      </section>
    </Activity>)}
  </div>;
}
