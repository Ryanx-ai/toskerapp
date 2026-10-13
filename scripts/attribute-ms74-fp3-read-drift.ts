/** Read-only qualification, never replaces or overrides the strict audit. */
import assert from "node:assert/strict";
import { readFileSync, writeFileSync } from "node:fs";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
const db=getDatabase();
async function main(){
  const actors=await resolveQaActors(db),old=JSON.parse(readFileSync(".git/ms74-fp3/protected-baseline.json","utf8"));
  const current=(await db.execute(sql`select to_jsonb(t) as row from conversation_reads t`)).rows.map(r=>r.row as Record<string,unknown>);
  const differences=old.data.conversation_reads.flatMap((row:Record<string,unknown>)=>{
    const next=current.find(r=>r.user_id===row.user_id&&r.conversation_id===row.conversation_id);assert(next);
    const fields=Object.keys(row).filter(k=>JSON.stringify(row[k])!==JSON.stringify(next[k]));
    return fields.length?[{row,next,fields}]:[];
  });
  assert.equal(differences.length,1);const changed=differences[0];
  assert.equal(changed.row.user_id,actors.founder.userId);assert.deepEqual(changed.fields,["last_read_at"]);
  const context=await db.execute(sql`select kind,owner_id from conversations where id=${String(changed.row.conversation_id)}::uuid`);
  assert.equal(context.rows[0].kind,"sandbox");assert.equal(context.rows[0].owner_id,actors.founder.userId);
  const receipt={qualified:true,strictAuditPass:false,changedRows:1,owner:"exact founder TID 8V3X7P1",context:"own Sandbox",fields:changed.fields,before:changed.row.last_read_at,after:changed.next.last_read_at,baselineRewritten:false,dataRestored:false,at:new Date().toISOString()};
  writeFileSync(".git/ms74-fp3/read-drift.json",JSON.stringify(receipt,null,2),{mode:0o600});console.log(JSON.stringify(receipt));
}
main().catch(error=>{console.error({pass:false,kind:error?.name,detail:"Read-drift attribution failed; private data suppressed"});process.exitCode=1;}).finally(()=>db.$client.end());
