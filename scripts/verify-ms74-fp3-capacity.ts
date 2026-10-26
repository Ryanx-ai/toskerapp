/** Compatibility entrypoint: never clear real counters, even in a rollback.
 * FP4 uses owned shadow tables and requires the isolated review environment. */
import assert from "node:assert/strict";
import {locationCapacityVerified} from "../src/server/location-sharing/capacity";
const now=Date.parse("2026-10-14T00:00:00.000Z");
assert(locationCapacityVerified(now,"2026-10-13T00:00:00.000Z"));
for(const value of[undefined,"","garbage","2026-10-15T00:00:00.000Z","2026-10-07T00:00:00.000Z"])
  assert(!locationCapacityVerified(now,value));
void import("./verify-ms74-fp4-accounting");
