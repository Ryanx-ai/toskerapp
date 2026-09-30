import type { TripPlace } from "../trip-contract";
import { roadKey, type RoadGeometry, type RoadMode } from "./road-contract";
/** Pure presentation policy: no provider calls, no shared selection state. */
export function routeLegPresentation(places: TripPlace[], index: number, selectedId: string | null, ghost: boolean, roadEnabled: boolean, mode: RoadMode, road?: RoadGeometry) {
  const previous = places[index], next = places[index+1];
  if (!previous || !next) return null;
  const current = road?.key === roadKey(places, mode);
  if (roadEnabled && (!current || !road.segments[index])) return null;
  const selectedIndex = places.findIndex(p => p.id === selectedId);
  const emphasized = !ghost && (selectedIndex < 0 || index <= selectedIndex);
  return { coordinates: roadEnabled && current ? road.segments[index] : [[previous.longitude,previous.latitude],[next.longitude,next.latitude]], opacity: ghost ? .3 : emphasized ? .95 : .25, width: emphasized ? 4 : 2 };
}
