/** Exact retained database, function-only 0033. Rehearse rolls back; apply is
 * separate and requires the existing isolated behavior/concurrency evidence.
 * No snapshot payload is ever backed up, no migration history is rewritten. */
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {readFileSync,writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {parse} from 'dotenv';
import {Pool,neonConfig} from '@neondatabase/serverless';
import ws from 'ws';
import {readMigrationFiles} from 'drizzle-orm/migrator';
const mode=process.argv[2];assert(['--rehearse','--apply','--verify'].includes(mode));
const env={...parse(readFileSync('.env.local')),...parse(readFileSync('.env.development.local'))};
assert.equal(env.NEON_PROJECT_ID,'lucky-queen-41711352');
assert.equal(new URL(env.DATABASE_URL).hostname,'ep-odd-glade-au6iboa7-pooler.c-10.us-east-1.aws.neon.tech');
const directory='.git/ms74-fp4/migration',migrations=readMigrationFiles({migrationsFolder:'drizzle'}),migration=migrations.at(-1);
assert.equal(migrations.length,34);
const hash=value=>createHash('sha256').update(value).digest('hex');
const implementationHash=hash(Buffer.concat([readFileSync('src/server/trips/service.ts'),readFileSync('scripts/migrate-ms74-fp4-move.ts')]));
const proof=JSON.parse(readFileSync(`${directory}/rehearsal-pass.json`));
assert(proof.pass);assert.equal(proof.migrationHash,migration.hash);assert.equal(proof.implementationHash,implementationHash);
const concurrency=JSON.parse(readFileSync(`${directory}/concurrency-1793013354959.json`));assert(concurrency.pass);
const tables=['trip_plans','trip_routes','trip_places','trip_route_places','trip_comments','trip_mutation_receipts'];
const result={pass:false,mode,at:new Date().toISOString(),sha:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),migrationHash:migration.hash,implementationHash,checks:[]};
const receipt=`${directory}/main-${mode.slice(2)}-${Date.now()}.json`;
neonConfig.webSocketConstructor=ws;
const pool=new Pool({connectionString:env.DATABASE_URL,connectionTimeoutMillis:15000}),client=await pool.connect();
async function history(){const r=(await client.query('select hash,created_at from drizzle.__drizzle_migrations order by created_at')).rows;r.forEach((v,i)=>{assert.equal(v.hash,migrations[i]?.hash);assert.equal(Number(v.created_at),migrations[i]?.folderMillis);});return r;}
async function definition(){return(await client.query("select pg_get_functiondef('public.tosker_fp3_card_projection()'::regprocedure) definition")).rows[0].definition;}
async function snapshot(){const data={};for(const table of tables)data[table]=(await client.query(`select coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from public.${table} t`)).rows[0].rows;return data;}
let open=false;
try{
 await client.query('BEGIN ISOLATION LEVEL REPEATABLE READ');open=true;
 await client.query("SET LOCAL lock_timeout='5s'");await client.query("SET LOCAL statement_timeout='45s'");await client.query('SET LOCAL search_path=public');
 assert((await client.query("select pg_try_advisory_xact_lock(hashtextextended('tosker:fp4:0033',0)) acquired")).rows[0].acquired);
 const beforeHistory=await history();assert.equal(beforeHistory.length,mode==='--verify'?34:33,'Recover already-applied state; never replay');
 assert.equal((await client.query('select count(*)::int n from location_latest')).rows[0].n,0,'Active payload: stop backup gate');
 assert.equal((await client.query("select count(*)::int n from users where tid='8V3X7P1'")).rows[0].n,1);
 const oldDefinition=await definition();
 if(mode==='--verify'){
  assert(oldDefinition.includes('tosker.trip_move'));result.checks.push('34 exact migration hashes/timestamps; guarded transfer function; zero payloads; exact founder');
  await client.query('ROLLBACK');open=false;
 }else{
  if(mode==='--apply'){
   const rehearsal=JSON.parse(readFileSync(`${directory}/main-rehearsal-pass.json`));
   assert(rehearsal.pass);assert.equal(rehearsal.migrationHash,migration.hash);assert.equal(rehearsal.implementationHash,implementationHash);assert.equal(rehearsal.functionBeforeHash,hash(oldDefinition));
  }
  // Prevent concurrent trip writes across the complete preservation snapshot.
  await client.query(`LOCK TABLE ${tables.map(t=>`public.${t}`).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
  const before=await snapshot();
  const backup={at:new Date().toISOString(),migrationHash:migration.hash,definition:oldDefinition,history:beforeHistory,data:before};
  const backupPath=`${directory}/main-before-${mode.slice(2)}-${Date.now()}.json`;
  writeFileSync(backupPath,JSON.stringify(backup),{flag:'wx',mode:0o600});assert.deepEqual(JSON.parse(readFileSync(backupPath)),backup);
  result.backup=backupPath;result.backupHash=hash(readFileSync(backupPath));result.functionBeforeHash=hash(oldDefinition);
  for(const statement of migration.sql)await client.query(statement);
  const next=await definition();assert(next.includes('tosker.trip_move'));assert(next.includes('context or identity'));
  assert.deepEqual(await snapshot(),before,'Every retained trip row must remain byte-for-byte unchanged');
  result.checks.push('Private read-back-verified trip/function/history backup; zero location payload backup','Function-only DDL preserves all retained trip rows and existing protocol-4 guards');
  if(mode==='--rehearse'){
   await client.query('ROLLBACK');open=false;assert.equal(await definition(),oldDefinition);assert.deepEqual(await history(),beforeHistory);
   result.checks.push('Rehearsal rollback restores exact previous function and 33-row migration journal');
  }else{
   await client.query('insert into drizzle.__drizzle_migrations(hash,created_at) values($1,$2)',[migration.hash,migration.folderMillis]);
   assert.equal((await history()).length,34);await client.query('COMMIT');open=false;
   result.checks.push('Only exact 0033 journal entry appended atomically; no data/history rewrite');
  }
 }
 result.pass=true;
 if(mode==='--rehearse')writeFileSync(`${directory}/main-rehearsal-pass.json`,JSON.stringify(result,null,2),{mode:0o600});
}catch(e){if(open)await client.query('ROLLBACK').catch(()=>{});result.failureType=e.name;result.code=e.code??null;process.exitCode=1;}
finally{client.release();await pool.end();writeFileSync(receipt,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});console.log(JSON.stringify({...result,receipt}));}
