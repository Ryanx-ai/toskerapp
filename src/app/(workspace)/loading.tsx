"use client";
import { useSyncExternalStore } from "react";
import { collapseStore } from "@/lib/sidebar-state";
/** No identity or conversation data is shown before the authorized page resolves. */
export default function WorkspaceLoading() {
  const collapsed=useSyncExternalStore(collapseStore.subscribe,collapseStore.getSnapshot,collapseStore.getServerSnapshot);
  return <main className={`workspace-opening workspace-loading-frame${collapsed ? " is-collapsed" : ""}`} aria-busy="true"><aside aria-hidden="true"><span /><span /><span /></aside><div><header aria-hidden="true" /><section><p role="status">Opening your space…</p></section></div></main>;
}
