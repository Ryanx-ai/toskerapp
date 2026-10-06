import { PLACE_ICONS, PLACE_ICON_LABELS, type PlaceIcon } from "@/lib/trip-contract";
import { PLACE_SYMBOL_PATHS } from "@/lib/maps/place-symbols";

/** A small shared vocabulary, not a new visual system. Numbering stays independent. */
export function TripPlaceSymbol({ icon = "destination", size = 20 }: { icon?: PlaceIcon; size?: number }) {
  return <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.75} strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{PLACE_SYMBOL_PATHS[icon].map((path, i) => <path key={i} d={path} />)}</svg>;
}

export function TripPlaceIconOptions() {
  return PLACE_ICONS.map(icon => <option key={icon} value={icon}>{PLACE_ICON_LABELS[icon]}</option>);
}
