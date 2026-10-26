/** Read-only budget evidence. This never clears the historical hold or enables QA. */
import assert from "node:assert/strict";
import {readFileSync,writeFileSync} from "node:fs";
import {neon} from "@neondatabase/serverless";
import {reviewEnvironment} from "./ms74-fp3-review-runtime.mjs";
const hold=JSON.parse(readFileSync(".git/ms74-fp4/qa-budget-hold.json","utf8"));
const approval=JSON.parse(readFileSync(".git/ms74-fp4/capacity-approval.json","utf8"));
const q=neon(reviewEnvironment().DATABASE_URL);
const [clock,reads,consents,state]=await q.transaction([
 q`select clock_timestamp() as now,to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD') as day`,
 q`select "window",used from map_provider_usage where scope='location:reads:day'`,
 q`select day,reserved from location_cleanup_budget where day=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD')`,
 q`select (select count(*)::int from location_latest) payloads,(select count(*)::int from location_shares where expires_at>clock_timestamp()) active,(select count(*)::int from location_cleanup_workers) workers`,
],{readOnly:true,isolationLevel:"RepeatableRead"});
assert.equal(clock.length,1);assert(reads.length<=1&&consents.length<=1);
const historicalHold=clock[0].day<="2026-10-26";
const result={at:new Date().toISOString(),readOnly:true,databaseClock:clock[0],readCounter:reads[0]??null,
 consentCounter:consents[0]??null,state:state[0],historicalHold,
 unknownHistoricalUsagePreserved:true,remainingAllowance:historicalHold?"UNVERIFIABLE": "NOT CERTIFIED BY THIS READ-ONLY AUDIT",
 approvalFilePresent:Boolean(approval),holdFilePresent:Boolean(hold),qaEnabled:false};
const path=`.git/ms74-fp4/budget-audit-${Date.now()}.json`;
writeFileSync(path,JSON.stringify(result,null,2),{flag:"wx",mode:0o600});console.log(JSON.stringify({...result,path}));
