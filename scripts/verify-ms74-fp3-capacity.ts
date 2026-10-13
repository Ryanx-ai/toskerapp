import assert from "node:assert/strict";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationCapacityVerified,reserveLocationRead } from "../src/server/location-sharing/capacity";
const db=getDatabase();let phase="attestation";
async function main(){
  const now=Date.parse("2026-10-14T00:00:00.000Z");
  assert(locationCapacityVerified(now,"2026-10-13T00:00:00.000Z"));
  for(const value of[undefined,"","garbage","2026-10-15T00:00:00.000Z","2026-10-07T00:00:00.000Z"])
    assert(!locationCapacityVerified(now,value));
  const rollback=new Error("Expected rollback");
  try{await db.transaction(async tx=>{
    await tx.execute(sql`set local lock_timeout='2s'`);
    const scopes=sql`('location:reads:day','location:session-checks:10s')`;
    // Only our two anonymous rows, inside a transaction always rolled back.
    await tx.execute(sql`delete from map_provider_usage where scope in ${scopes}`);
    phase="first-admission";await reserveLocationRead(tx,2);
    let rows=(await tx.execute(sql`select scope,used,"window" from map_provider_usage where scope in ${scopes}`)).rows;
    assert.equal(rows.find(r=>r.scope==='location:reads:day')?.used,1);
    assert.equal(rows.find(r=>r.scope==='location:session-checks:10s')?.used,2);
    const firstWindow=rows.find(r=>r.scope==='location:session-checks:10s')?.window;
    phase="invalid-cost";await assert.rejects(reserveLocationRead(tx,31));
    await tx.execute(sql`update map_provider_usage set used=2000 where scope='location:reads:day'`);
    phase="daily-cap";await assert.rejects(reserveLocationRead(tx,2));
    rows=(await tx.execute(sql`select scope,used,"window" from map_provider_usage where scope in ${scopes}`)).rows;
    assert.equal(rows.find(r=>r.scope==='location:reads:day')?.used,2000);
    const checks=rows.find(r=>r.scope==='location:session-checks:10s');
    assert.equal(checks?.used,checks?.window===firstWindow?4:2); // charge even across real bucket rollover
    await tx.execute(sql`update map_provider_usage set used=1 where scope='location:reads:day'`);
    phase="rate-cap";
    let denied=false;
    for(let attempt=0;attempt<3&&!denied;attempt++){
      // Pin to the actual current bucket, not the bucket used several queries
      // earlier. A genuine ten-second rollover is valid, not a failed gate.
      const [before]=(await tx.execute(sql`update map_provider_usage set used=30,
        "window"=floor(extract(epoch from clock_timestamp())/10)::bigint::text
        where scope='location:session-checks:10s' returning "window"`)).rows;
      try{await reserveLocationRead(tx,1);}catch{denied=true;}
      if(!denied){const [after]=(await tx.execute(sql`select "window" from map_provider_usage where scope='location:session-checks:10s'`)).rows;
        assert.notEqual(after.window,before.window,"Only a real bucket rollover permits another check");}
    }
    assert(denied);
    throw rollback;
  });}catch(error){if(error!==rollback)throw error;}
  console.log(JSON.stringify({capacityPolicy:"PASS",missingFutureStaleAttestationDenied:true,dailyReadCap:2000,sessionChecksPerTenSeconds:30,
    noRefundAfterPartialAdmission:true,realCountersReset:false,rollbackOnly:true}));
}
main().catch(e=>{console.error(JSON.stringify({capacityPolicy:false,phase,code:e?.cause?.code??e?.code??null,detailsSuppressed:true}));process.exitCode=1;}).finally(()=>db.$client.end());
