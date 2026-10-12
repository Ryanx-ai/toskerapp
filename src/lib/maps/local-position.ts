export type LocalMapLocation = { latitude: number; longitude: number; accuracy: number };
export type PrivatePosition = { origin: LocalMapLocation; current: LocalMapLocation; expiresAt: number };
export const LOCAL_POSITION_LIFETIME = 5 * 60 * 1000;
export function validLocalFix(fix: LocalMapLocation) {
  return [fix.latitude, fix.longitude, fix.accuracy].every(Number.isFinite) && Math.abs(fix.latitude) <= 90 && Math.abs(fix.longitude) <= 180 && fix.accuracy >= 0;
}
/** A refresh moves only the marker. Neither the origin nor its expiry slides. */
export function acceptLocalFix(previous: PrivatePosition | null, fix: LocalMapLocation, now: number): PrivatePosition | null {
  if (!validLocalFix(fix)) return previous;
  return previous && previous.expiresAt > now
    ? { ...previous, current: fix }
    : { origin: fix, current: fix, expiresAt: now + LOCAL_POSITION_LIFETIME };
}
