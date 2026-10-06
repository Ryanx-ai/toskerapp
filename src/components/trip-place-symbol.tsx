import { MapPin, Flag, House, BriefcaseBusiness, Utensils, BedDouble, Compass, Heart, Users } from "lucide-react";
import { PLACE_ICONS, PLACE_ICON_LABELS, type PlaceIcon } from "@/lib/trip-contract";

const symbols = { destination: MapPin, checkpoint: Flag, home: House, work: BriefcaseBusiness, food: Utensils, stay: BedDouble, activity: Compass, favourite: Heart, meetup: Users };

/** A small shared vocabulary, not a new visual system. Numbering stays independent. */
export function TripPlaceSymbol({ icon = "destination", size = 20 }: { icon?: PlaceIcon; size?: number }) {
  const Symbol = symbols[icon] ?? MapPin;
  return <Symbol size={size} strokeWidth={1.75} aria-hidden="true" />;
}

export function TripPlaceIconOptions() {
  return PLACE_ICONS.map(icon => <option key={icon} value={icon}>{PLACE_ICON_LABELS[icon]}</option>);
}
