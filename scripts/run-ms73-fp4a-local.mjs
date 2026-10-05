import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {spawn} from "node:child_process";
import {Pool,neonConfig} from "@neondatabase/serverless";
import ws from "ws";
const receipt=JSON.parse(readFileSync(".git/fp4a-recovery/browser-schema.json","utf8"));
assert(/^fp4a_rehearsal_[a-f0-9]{32}$/.test(receipt.schema));
const url=new URL(process.env.DATABASE_URL);
assert(url.hostname.endsWith(".neon.tech"),"Existing Neon endpoint required");
// PgBouncer rejects startup search_path. Same existing compute, direct connection; no provisioning.
url.hostname=url.hostname.replace("-pooler.",".");
url.searchParams.set("options",`-c search_path=${receipt.schema},public`);
neonConfig.webSocketConstructor=ws;
const pool=new Pool({connectionString:url.toString()});
try{const r=await pool.query("select current_schema() as schema");assert.equal(r.rows[0].schema,receipt.schema);console.log("PASS local DB namespace is exact-owned FP4A shadow schema");}finally{await pool.end();}
const args=process.argv.slice(2);assert(args.length,"Specify an existing local command; no secret output");
const child=spawn(args[0],args.slice(1),{stdio:"inherit",env:{...process.env,DATABASE_URL:url.toString()}});
for(const signal of ["SIGINT","SIGTERM"])process.on(signal,()=>child.kill(signal));
child.on("exit",code=>{process.exitCode=code??1;});
