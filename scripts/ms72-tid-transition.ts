/** Founder-authorized Development-only TID reset. Inspect first; apply is explicit.
 * No deletion, schema/metadata mutation, aliases, or provider operations.
 */
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { sql } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { generateTid } from "../src/server/accounts/tid";
import { isCanonicalTid } from "../src/lib/tid-contract";
const db = getDatabase();
const quote = (value: string) => '"' + value.replaceAll('"', '""') + '"';
const retained = ["0ee1e5a5-6d7a-4541-a6ca-ca69788997ef", "d7a58753-9877-45b2-9fc7-cca188559fed"];
const inventoried = [...retained,"0a1033a7-7ebc-4088-9791-d0fea5cfab78","8a0fa073-f1ff-40bb-a9fc-ac3a3c0ce3f3","e3c3af92-be8a-450f-bdaa-aa1e8b3b44fd","e4b92a7f-4246-4824-9bd8-844d58317f72"];
async function main() {
  const apply = process.argv[2] === "apply-development-reset";
  assert([undefined,"inspect","apply-development-reset"].includes(process.argv[2]));
  await db.transaction(async tx => {
    // Excludes concurrent old/new bootstrap writers during this bounded reset.
    if (apply) await tx.execute(sql`LOCK TABLE users IN EXCLUSIVE MODE`);
    const {rows: tables} = await tx.execute<{tablename:string}>(sql`SELECT tablename FROM pg_tables WHERE schemaname='public' ORDER BY tablename`);
    const {rows: columns} = await tx.execute<{table_name:string;column_name:string}>(sql`SELECT table_name,column_name FROM information_schema.columns WHERE table_schema='public' AND column_name ILIKE '%tid%'`);
    assert.deepEqual(columns.map(x=>`${x.table_name}.${x.column_name}`).sort(), ["users.tid"]);
    const {rows: fks} = await tx.execute<{table_name:string;column_name:string;target_column:string}>(sql`SELECT c.conrelid::regclass::text AS table_name, a.attname AS column_name, b.attname AS target_column FROM pg_constraint c JOIN pg_attribute a ON a.attrelid=c.conrelid AND a.attnum=c.conkey[1] JOIN pg_attribute b ON b.attrelid=c.confrelid AND b.attnum=c.confkey[1] WHERE c.contype='f' AND c.confrelid='users'::regclass`);
    assert(fks.every(x=>x.target_column==="id"));
    const {rows: accounts} = await tx.execute<{id:string;tid:string;name:string}>(sql`SELECT u.id,u.tid,p.display_name AS name FROM users u JOIN profiles p ON p.user_id=u.id ORDER BY u.id`);
    assert(retained.every(id=>accounts.some(x=>x.id===id)), "Retained A/B missing");
    assert.equal(new Set(accounts.map(x=>x.tid)).size,accounts.length);
    if(apply) assert(accounts.every(x=>inventoried.includes(x.id)),"New account requires dependency review before reset");
    const {rows: counts} = await tx.execute<{dependency:string;user_id:string;n:number}>(sql.join(fks.map(fk=>sql`SELECT ${`${fk.table_name}.${fk.column_name}`}::text AS dependency, ${sql.raw(quote(fk.column_name))}::text AS user_id, count(*)::int AS n FROM ${sql.raw(quote(fk.table_name))} GROUP BY ${sql.raw(quote(fk.column_name))}`),sql` UNION ALL `));
    for (const account of accounts) {
      const dependencies: Record<string,number> = {};
      for (const row of counts.filter(x=>x.user_id===account.id)) dependencies[row.dependency]=row.n;
      console.log({user:account.id,name:account.name,retainedAB:retained.includes(account.id),canonical:isCanonicalTid(account.tid),dependencies});
    }
    // Snapshot every public row, excluding ONLY the approved identifier field.
    const fingerprint = async () => {
      const hashes: Record<string,string> = {};
      for (const {tablename} of tables) {
        const expression=tablename==="users" ? "to_jsonb(t)-'tid'" : "to_jsonb(t)";
        const {rows} = await tx.execute(sql.raw(`SELECT ${expression} AS row FROM ${quote(tablename)} t ORDER BY (${expression})::text`));
        hashes[tablename]=createHash("sha256").update(JSON.stringify(rows)).digest("hex");
      }
      return hashes;
    };
    const before=await fingerprint();
    let changed=0,collisions=0;
    if(apply) {
      const used=new Set(accounts.map(x=>x.tid));
      for(const account of accounts.filter(x=>!isCanonicalTid(x.tid))) {
        let next=generateTid(), attempts=0;
        while(used.has(next) && attempts++<100) { collisions++; next=generateTid(); }
        assert(!used.has(next),"Collision budget exhausted; rollback");used.add(next);
        const result=await tx.execute(sql`UPDATE users SET tid=${next} WHERE id=${account.id}::uuid AND tid=${account.tid} RETURNING id`);
        assert.equal(result.rows.length,1);changed++;
        console.log({user:account.id,oldFormat:"legacy",newCanonicalTid:next});
      }
      assert.deepEqual(await fingerprint(),before,"Non-TID data changed; rollback");
      const {rows:[result]}=await tx.execute<{total:number;canonical:number;unique_count:number}>(sql`SELECT count(*)::int AS total,count(*) FILTER(WHERE tid ~ '^[A-Z0-9]{7}$')::int AS canonical,count(DISTINCT tid)::int AS unique_count FROM users`);
      assert.equal(result.total,result.canonical);assert.equal(result.total,result.unique_count);
      console.log({mode:"development-reset",...result,changed,collisions,allOtherPublicDataUnchanged:true});
    } else console.log({mode:"read-only",users:accounts.length,foreignKeysToUserId:fks.length,tablesFingerprinted:tables.length});
  }, {isolationLevel:"repeatable read"});
}
main().catch(error=>{console.error(error instanceof Error ? error.message : "TID transition failed");process.exitCode=1;}).finally(()=>db.$client.end());
