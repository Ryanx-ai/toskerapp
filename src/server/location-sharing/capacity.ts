import "server-only";
import { sql } from "drizzle-orm";
import type { ToskerDatabase } from "../db/client";
import { CleanupPolicyError } from "./cleanup-policy";

export const LOCATION_DAILY_READS = 2000;
export const LOCATION_SESSION_CHECKS_PER_WINDOW = 30;
const CAPACITY_REVIEW_MS = 7 * 24 * 60 * 60 * 1000;

/** Operator attestation after actual account headroom checks, not a permanent
 * entitlement. Never auto-renewed by a deploy, retry, browser or cleanup job. */
export function locationCapacityVerified(now=Date.now(), value=process.env.TOSKER_LOCATION_CAPACITY_VERIFIED_AT) {
  if(!value || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value))return false;
  const at=Date.parse(value);
  return Number.isFinite(at)&&at<=now&&now-at<CAPACITY_REVIEW_MS;
}

/** Two anonymous global counters reuse the existing distributed budget store.
 * No actor/context/location fields and no per-read history. These exact scope
 * names never touch Geoapify's counters. Charge outside the read transaction:
 * an auth/provider failure must not refund spent capacity. Partial admission
 * charges are deliberately conservative. Stop/expiry never call this function. */
export async function reserveLocationRead(db:Pick<ToskerDatabase,"execute">,sessionChecks:number){
  if(!Number.isInteger(sessionChecks)||sessionChecks<1||sessionChecks>LOCATION_SESSION_CHECKS_PER_WINDOW)throw new CleanupPolicyError();
  const r=await db.execute(sql`with clock as materialized(select clock_timestamp() t),
    buckets as (
      select 'location:reads:day'::text scope,to_char(t at time zone 'UTC','YYYY-MM-DD') bucket_window,1 cost,t from clock
      union all
      select 'location:session-checks:10s',floor(extract(epoch from t)/10)::bigint::text,${sessionChecks},t from clock
    ), admitted as (
      insert into map_provider_usage(scope,"window",used,last_at)
      select scope,bucket_window,cost,t from buckets order by scope
      on conflict(scope) do update set "window"=excluded."window",
        used=case when map_provider_usage."window"=excluded."window" then map_provider_usage.used+excluded.used else excluded.used end,
        last_at=excluded.last_at
      where (case when map_provider_usage."window"=excluded."window" then map_provider_usage.used+excluded.used else excluded.used end)
        <=case when excluded.scope='location:reads:day' then ${LOCATION_DAILY_READS}::integer else ${LOCATION_SESSION_CHECKS_PER_WINDOW}::integer end
      returning 1
    ) select count(*)::int n from admitted`);
  if(Number(r.rows[0]?.n)!==2)throw new CleanupPolicyError();
}
