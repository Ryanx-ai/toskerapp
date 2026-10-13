import type { LocationLease } from "./shared-location-contract";

export type SharingEndReason = "stopped" | "expired" | null;

/** Presentation only: never renew consent or infer a successful server deletion. */
export function locationSharingFeedback({ lease, busy, stopping, error, ended }: {
  lease: LocationLease | null;
  busy: boolean;
  stopping: boolean;
  error: string;
  ended: SharingEndReason;
}) {
  if (stopping) return "Stopping sharing…";
  if (error) return "Sharing unconfirmed. Your location will not be sent again automatically.";
  if (busy) return "Sending this snapshot…";
  if (lease) return lease.precision === "area" ? "Sharing broad area only." : "Sharing precise position.";
  if (ended === "expired") return "Sharing ended after five minutes. Turn Locate off and on to choose sharing again.";
  if (ended === "stopped") return "Sharing ended. Locate does not restart sharing automatically.";
  return "";
}
