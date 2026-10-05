import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {Pool,neonConfig} from "@neondatabase/serverless";
import ws from "ws";
neonConfig.webSocketConstructor=ws;
const receipt=JSON.parse(readFileSync(".git/fp4a-recovery/browser-schema.json","utf8"));
assert(/^fp4a_rehearsal_[a-f0-9]{32}$/.test(receipt.schema));
assert.equal(receipt.purpose,"FP4A isolated local browser verification; public migration unapplied");
const pool=new Pool({connectionString:process.env.DATABASE_URL}),client=await pool.connect();
try{
 await client.query("begin");
 const existing=await client.query("select nspname from pg_namespace where nspname=$1",[receipt.schema]);assert.equal(existing.rowCount,1,"Exact-owned schema must exist; no blind replay");
 const external=await client.query("select count(*)::int as n from pg_constraint k join pg_class target on target.oid=k.confrelid join pg_namespace tn on tn.oid=target.relnamespace join pg_class source on source.oid=k.conrelid join pg_namespace sn on sn.oid=source.relnamespace where tn.nspname=$1 and sn.nspname<>$1",[receipt.schema]);assert.equal(external.rows[0].n,0,"No outside FK may depend on the scratch schema");
 const tables=await client.query("select tablename from pg_tables where schemaname=$1 order by tablename",[receipt.schema]);assert.deepEqual(tables.rows.map(r=>r.tablename),["trip_comments","trip_mutation_receipts","trip_places","trip_plans","trip_route_places","trip_routes"]);
 assert(process.argv[2]==="--apply"||process.argv[2]==="--inspect");
 if(process.argv[2]==="--apply")await client.query(`drop schema "${receipt.schema}" cascade`);
 await client.query("commit");console.log(JSON.stringify({exactOwnedSchema:receipt.schema,action:process.argv[2],publicUntouched:true}));
}catch{await client.query("rollback");console.error("Shadow cleanup stopped; exact ownership/dependency assertion failed");process.exitCode=1;}finally{client.release();await pool.end();}
