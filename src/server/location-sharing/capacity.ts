import "server-only";
import { sql } from "drizzle-orm";
import type { ToskerDatabase } from "../db/client";
import { CleanupPolicyError } from "./cleanup-policy";
import { isIsolatedReview } from "../accounts/isolated-review";

export const LOCATION_DAILY_READS = 2000;
export const LOCATION_SESSION_CHECKS_PER_WINDOW = 30;
export const LOCATION_REVIEW_DAILY_READS = 800;
export const LOCATION_REVIEW_DAILY_CONSENTS = 20;
const CAPACITY_REVIEW_MS = 7 * 24 * 60 * 60 * 1000;

/** Operator attestation after actual account headroom checks, not a permanent
 * entitlement. Never auto-renewed by a deploy, retry, browser or cleanup job. */
export function locationCapacityVerified(now=Date.now(), value=process.env.TOSKER_LOCATION_CAPACITY_VERIFIED_AT) {
  if(!value || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(value))return false;
  const at=Date.parse(value);
  return Number.isFinite(at)&&at<=now&&now-at<CAPACITY_REVIEW_MS;
}

/** Autocommit reservation, before service work. Call with the root DB, never
 * the request's transaction: later errors/rollbacks must not refund it.
 * Same rows as FP3, so rolling deployment cannot open a second allowance. */
export async function reserveLocationRequest(db:Pick<ToskerDatabase,"execute">,action:"current"|"begin") {
  const review=isIsolatedReview();
  const eligible=sql`(${!review} or to_char(t at time zone 'UTC','YYYY-MM-DD')>'2026-10-26')`;
  // Unknown historical review traffic is held, NOT invented as zero usage.
  if(action==="begin") {
    const r=await db.execute(sql`with clock as materialized(select clock_timestamp() t)
      insert into location_cleanup_budget(day,reserved)
      select to_char(t at time zone 'UTC','YYYY-MM-DD'),1 from clock where ${eligible}
      on conflict(day) do update set reserved=location_cleanup_budget.reserved+1
      where location_cleanup_budget.reserved<${review?LOCATION_REVIEW_DAILY_CONSENTS:100}
      returning reserved`);
    if(r.rows.length!==1)throw new CleanupPolicyError();
    return;
  }
  const r=await db.execute(sql`with clock as materialized(select clock_timestamp() t), admitted as (
      insert into map_provider_usage(scope,"window",used,last_at)
      select 'location:reads:day',to_char(t at time zone 'UTC','YYYY-MM-DD'),1,t from clock where ${eligible}
      on conflict(scope) do update set "window"=excluded."window",
        used=case when map_provider_usage."window"=excluded."window" then map_provider_usage.used+excluded.used else excluded.used end,
        last_at=excluded.last_at
      where map_provider_usage."window"<=excluded."window" and
        (case when map_provider_usage."window"=excluded."window" then map_provider_usage.used+1 else 1 end)<=${review?LOCATION_REVIEW_DAILY_READS:LOCATION_DAILY_READS}
      returning 1
    ) select count(*)::int n from admitted`);
  if(Number(r.rows[0]?.n)!==1)throw new CleanupPolicyError();
}

/** Charge immediately before external session validation. Safety-only Stop
 * remains exempt so a capacity outage cannot trap a shared snapshot. */
export async function reserveLocationSessionChecks(db:Pick<ToskerDatabase,"execute">,cost=1) {
  if(!Number.isInteger(cost)||cost<1||cost>LOCATION_SESSION_CHECKS_PER_WINDOW)throw new CleanupPolicyError();
  const r=await db.execute(sql`with clock as materialized(select clock_timestamp() t)
    insert into map_provider_usage(scope,"window",used,last_at)
    select 'location:session-checks:10s',floor(extract(epoch from t)/10)::bigint::text,${cost},t from clock
    on conflict(scope) do update set "window"=excluded."window",
      used=case when map_provider_usage."window"=excluded."window" then map_provider_usage.used+excluded.used else excluded.used end,last_at=excluded.last_at
    where map_provider_usage."window"::bigint<=excluded."window"::bigint and
      (case when map_provider_usage."window"=excluded."window" then map_provider_usage.used+excluded.used else excluded.used end)<=${LOCATION_SESSION_CHECKS_PER_WINDOW}
    returning used`);
  if(r.rows.length!==1)throw new CleanupPolicyError();
}
