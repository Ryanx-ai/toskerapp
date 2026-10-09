import { roadKey, type RoadGeometry, type RoadMode, type RoadPoint } from "./road-contract";

type TraceLeg = { coordinates: number[][]; lengths: number[]; length: number; start: number };
export type RouteTrace = { legs: TraceLeg[]; length: number };

/** Only current, ordered provider legs. Never bridge gaps or infer road geometry. */
export function prepareRouteTrace(road: RoadGeometry | undefined, points: RoadPoint[], mode: RoadMode, hidden: string[] = []): RouteTrace | null {
  if (!road || road.mode !== mode || road.key !== roadKey(points, mode) || !road.estimate?.legs || road.segments.length !== points.length - 1 || road.estimate.legs.length !== road.segments.length) return null;
  const trace: RouteTrace = { legs: [], length: 0 };
  for (let i = 0; i < road.segments.length; i++) {
    const metric = road.estimate.legs[i], coordinates = road.segments[i];
    if (metric.fromId !== points[i].id || metric.toId !== points[i + 1].id || coordinates.length < 2 || coordinates.some(p => p.length !== 2 || !p.every(Number.isFinite))) return null;
    if (hidden.includes(metric.fromId) || hidden.includes(metric.toId)) continue;
    const lengths = coordinates.slice(1).map((p, n) => Math.hypot((p[0] - coordinates[n][0]) * Math.cos(p[1] * Math.PI / 180), p[1] - coordinates[n][1]));
    const length = lengths.reduce((sum, length) => sum + length, 0);
    if (!(length > 0)) continue;
    trace.legs.push({ coordinates, lengths, length, start: trace.length }); trace.length += length;
  }
  return trace.length > 0 ? trace : null;
}

/** A finite progressing stroke; each segment stays on its own real provider leg. */
export function traceAt(trace: RouteTrace, progress: number): number[][][] {
  const distance = Math.min(1, Math.max(0, progress)) * trace.length, result: number[][][] = [];
  for (const leg of trace.legs) {
    let left = distance - leg.start;
    if (left <= 0) break;
    if (left >= leg.length) { result.push(leg.coordinates); continue; }
    const partial = [leg.coordinates[0]];
    for (let i = 0; i < leg.lengths.length; i++) {
      const length = leg.lengths[i], a = leg.coordinates[i], b = leg.coordinates[i + 1];
      if (left >= length) { partial.push(b); left -= length; continue; }
      const t = length ? left / length : 0;
      partial.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t]); break;
    }
    if (partial.length >= 2) result.push(partial);
    break;
  }
  return result;
}
