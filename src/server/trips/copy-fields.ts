import "server-only";
import type { tripPlaces } from "@/server/db/schema";

/** Explicit transferable content, never ownership, history, comments or viewer state. */
export function copyPlaceFields(p: typeof tripPlaces.$inferSelect) {
  return { title:p.title, latitude:p.latitude, longitude:p.longitude, source:p.source,
    provider:p.provider, providerId:p.providerId, address:p.address, attribution:p.attribution,
    license:p.license, icon:p.icon, starred:p.starred, note:p.note };
}
