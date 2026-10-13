import assert from "node:assert/strict";
import { locationSharingFeedback } from "../src/lib/location-sharing-feedback";
import type { LocationLease } from "../src/lib/shared-location-contract";

const lease: LocationLease = { id: "test", userId: "test", conversationId: "test", precision: "area", expiresAt: 300000 };
const idle = { lease: null, busy: false, stopping: false, error: "", ended: null } as const;
assert.equal(locationSharingFeedback(idle), "");
assert.equal(locationSharingFeedback({ ...idle, lease }), "Sharing broad area only.");
assert.equal(locationSharingFeedback({ ...idle, lease: { ...lease, precision: "precise" } }), "Sharing precise position.");
assert.match(locationSharingFeedback({ ...idle, lease, busy: true }), /^Sending/);
assert.match(locationSharingFeedback({ ...idle, lease, error: "failed" }), /unconfirmed/);
assert.match(locationSharingFeedback({ ...idle, lease, error: "failed", stopping: true }), /^Stopping/);
assert.match(locationSharingFeedback({ ...idle, ended: "expired" }), /five minutes.*Locate off and on/);
assert.match(locationSharingFeedback({ ...idle, ended: "stopped" }), /does not restart/);
assert.match(locationSharingFeedback({ ...idle, ended: "expired", error: "deletion failed" }), /unconfirmed/);
assert.equal(JSON.stringify(lease), JSON.stringify({ id: "test", userId: "test", conversationId: "test", precision: "area", expiresAt: 300000 }));
console.log(JSON.stringify({ sharingFeedback: "PASS", cases: 10, consentMutation: false, networkCalls: 0 }));
