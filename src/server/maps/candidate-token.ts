import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";
import type { PlaceCandidate } from "@/lib/trip-contract";
import { TripError, validateCandidate } from "@/server/trips/service";

function mac(payload: string) {
  const secret = process.env.ROOM_INVITE_ENCRYPTION_KEY;
  if (!secret) throw new TripError("unavailable", "Place confirmation is unavailable in this environment.");
  return createHmac("sha256", secret).update("tosker-map-candidate-v1\0").update(payload).digest();
}
export function signCandidate(candidate: PlaceCandidate, userId: string, roomSlug: string) {
  const payload = Buffer.from(JSON.stringify({ candidate: validateCandidate(candidate), userId, roomSlug, expires: Date.now() + 30 * 60 * 1000 })).toString("base64url");
  return `${payload}.${mac(payload).toString("base64url")}`;
}
export function verifyCandidate(token: string, userId: string, roomSlug: string): PlaceCandidate {
  try {
    if (typeof token !== "string" || token.length > 8000) throw new Error();
    const [payload, signature, extra] = token.split(".");
    if (!payload || !signature || extra) throw new Error();
    const supplied = Buffer.from(signature, "base64url"), expected = mac(payload);
    if (supplied.length !== expected.length || !timingSafeEqual(supplied, expected)) throw new Error();
    const data = JSON.parse(Buffer.from(payload, "base64url").toString());
    if (data.userId !== userId || data.roomSlug !== roomSlug || !Number.isFinite(data.expires) || data.expires < Date.now()) throw new Error();
    return validateCandidate(data.candidate);
  } catch { throw new TripError("invalid", "This place preview expired or changed. Select or pin it again before confirming."); }
}
