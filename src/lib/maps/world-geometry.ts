/** Web Mercator's display limit, not a restriction on saved geographic coordinates. */
export const MERCATOR_LATITUDE = 85.0511287798066;
export const mapCoordinate = (longitude: number, latitude: number): [number, number] => [longitude, Math.max(-MERCATOR_LATITUDE, Math.min(MERCATOR_LATITUDE, latitude))];

/** Split an Order connector at the date line instead of drawing across the whole world. */
export function planningSegments(from: [number, number], to: [number, number]): [number, number][][] {
  const a = mapCoordinate(...from), b = mapCoordinate(...to), delta = b[0] - a[0];
  if (Math.abs(delta) <= 180) return [[a, b]];
  const unwrapped = b[0] + (delta > 180 ? -360 : 360);
  const edge = unwrapped > a[0] ? 180 : -180;
  const latitude = a[1] + (b[1] - a[1]) * (edge - a[0]) / (unwrapped - a[0]);
  return [[a, [edge, latitude]], [[-edge, latitude], b]];
}
