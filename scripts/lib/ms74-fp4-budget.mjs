/** Read-only preflight; runtime services own all actual atomic admission. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {execFileSync} from "node:child_process";
import {neon} from "@neondatabase/serverless";
import {reviewEnvironment} from "../ms74-fp3-review-runtime.mjs";
export async function fp4Budget({reads=0,consents=0,minutes=0}={}){
 assert([reads,consents,minutes].every(v=>Number.isInteger(v)&&v>=0));
 const hold=JSON.parse(readFileSync(".git/ms74-fp4/qa-budget-hold.json","utf8"));
 assert.equal(hold.day,"2026-10-26");assert.equal(hold.status,"held");
 const approval=JSON.parse(readFileSync(".git/ms74-fp4/capacity-approval.json","utf8"));
 assert.equal(approval.approvedAt,"2026-10-26T12:05:21.406Z");
 assert.equal(approval.expiresAt,"2026-11-02T12:05:21.406Z");
 assert.equal(approval.isolatedQaReadsPerDay,800);assert.equal(approval.isolatedQaConsentsPerDay,20);
 execFileSync("git",["merge-base","--is-ancestor","db3018e0a87bd9bdb5aac6b87d5d761dbe0101b8","HEAD"]);
 const proof=JSON.parse(readFileSync(".git/ms74-fp4/accounting-1793032455589.json","utf8"));
 assert(proof.pass&&proof.publicUnchanged&&proof.cleaned);
 const q=neon(reviewEnvironment().DATABASE_URL);
 const [clock,counter,admissions]=await q.transaction([
  q`select clock_timestamp() as now,to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD') as day`,
  q`select "window",used from map_provider_usage where scope='location:reads:day'`,
  q`select day,reserved from location_cleanup_budget where day=to_char(clock_timestamp() at time zone 'UTC','YYYY-MM-DD')`,
 ],{readOnly:true,isolationLevel:"RepeatableRead"});
 const now=Date.parse(clock[0].now),day=clock[0].day;
 assert(day>hold.day,"Unknown historical UTC window remains held");
 assert(now>=Date.parse(approval.approvedAt)&&now+minutes*60000<Date.parse(approval.expiresAt),"Fixed approval expired or insufficient lifetime");
 assert(counter.length<=1&&admissions.length<=1);
 assert(!counter[0]||counter[0].window<=day,"Future counter cannot be reset");
 const used={current:counter[0]?.window===day?Number(counter[0].used):0,begin:Number(admissions[0]?.reserved??0)};
 assert(Object.values(used).every(v=>Number.isInteger(v)&&v>=0));
 assert(used.current+reads<=800&&used.begin+consents<=20,"Insufficient authoritative remaining QA allowance");
 return {day,used,remaining:{current:800-used.current,begin:20-used.begin},approvalExpiresAt:approval.expiresAt,historicalHoldPreserved:true};
}
