/** Bounded, browser-local timing only. Never attach coordinates, names, IDs or URLs. */
export function markMapPhase(phase: "geolocation-start" | "geolocation-ready" | "origin-consent" | "origin-dispatch" | "origin-response" | "origin-render" | "origin-fit" | "map-start" | "map-ready") {
  if (typeof performance === "undefined") return;
  const name = `tosker-map:${phase}`;
  performance.clearMarks(name); performance.mark(name);
}
