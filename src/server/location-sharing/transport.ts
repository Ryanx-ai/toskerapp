import "server-only";
import { Rest } from "ably";

let client: Rest | undefined;
/** Same credentials and authorization, explicit wire format for transient data. */
export function getSnapshotTransport() {
  const key=process.env.ABLY_API_KEY;
  if(!key)throw new Error("Realtime is not configured.");
  return client ??= new Rest({key,logLevel:0,httpRequestTimeout:5000,useBinaryProtocol:false});
}
