/** Exact isolated disposable Room only. Default rollback rehearsal; no general
 * Room deletion or founder-account mutation. Original ownership receipt stays. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {Pool,neonConfig} from '@neondatabase/serverless';
import ws from 'ws';
import {reviewEnvironment,REVIEW_PROJECT} from './ms74-fp3-review-runtime.mjs';
import {acquireFp4QaActors} from './lib/ms74-fp4-browser-lock.mjs';
const receiptPath=process.argv[2],apply=process.argv[3]==='--apply';
assert(/^\.git\/ms74-fp4\/disposable-room-[0-9a-f-]{36}\.json$/.test(receiptPath??''));assert(process.argv[3]===undefined||apply);
const owned=JSON.parse(readFileSync(receiptPath));assert.equal(owned.project,REVIEW_PROJECT);assert.equal(owned.status,'accepted-disposable');assert(owned.disposable);
assert.equal(owned.name,`FP4 disposable lifecycle ${owned.run.slice(0,8)}`);
const base=JSON.parse(readFileSync('.git/ms74-fp4/review-fixture.json'));assert.notEqual(owned.roomId,base.roomId);
const proofPath=receiptPath.replace('.json','-cleanup-proof.json'),result={pass:false,apply,at:new Date().toISOString(),deleted:{},founderPreserved:false};
acquireFp4QaActors();neonConfig.webSocketConstructor=ws;
const pool=new Pool({connectionString:reviewEnvironment().DATABASE_URL,connectionTimeoutMillis:15000}),c=await pool.connect();let open=false,step='begin';
const hash=x=>createHash('sha256').update(JSON.stringify(x)).digest('hex');
try{
 await c.query('BEGIN');open=true;await c.query("SET LOCAL lock_timeout='5s'");await c.query("SET LOCAL statement_timeout='30s'");
 const names=(await c.query("select tablename from pg_tables where schemaname='public' order by tablename")).rows.map(r=>r.tablename);assert(names.every(n=>/^[a-z_]+$/.test(n)));
 step='lock owned isolated audit';await c.query(`LOCK TABLE ${names.map(n=>`public.${n}`).join(',')} IN SHARE ROW EXCLUSIVE MODE`);
 assert.equal((await c.query('select count(*)::int n from location_latest')).rows[0].n,0);
 const tables=names.filter(n=>n!=='location_latest');
 const snapshot=async()=>Object.fromEntries((await c.query(tables.map(n=>`select '${n}' name,coalesce(jsonb_agg(to_jsonb(t) order by to_jsonb(t)::text),'[]'::jsonb) rows from public.${n} t`).join(' UNION ALL '))).rows.map(r=>[r.name,r.rows]));
 step='snapshot';const before=await snapshot();
 const founder=before.users.filter(u=>u.tid==='8V3X7P1');assert.equal(founder.length,1);assert.equal(founder[0].id,owned.founderId);
 const a=before.profiles.find(p=>p.username==='tosker-user-a-clerk-test');const b=before.profiles.find(p=>p.username==='tosker-user-b-clerk-test');assert(a&&b);assert.equal(a.user_id,owned.ownerId);assert.deepEqual([a.user_id,b.user_id].sort(),[...owned.qaUserIds].sort());
 const room=before.rooms.find(r=>r.id===owned.roomId);assert(room);assert.equal(room.name,owned.name);assert.equal(room.owner_id,owned.ownerId);
 assert.equal((await c.query('select 1 from rooms where id=$1::uuid and created_at=$2::timestamptz',[owned.roomId,owned.createdAt])).rowCount,1);
 assert.deepEqual(before.room_memberships.filter(r=>r.room_id===owned.roomId).map(r=>r.user_id).sort(),[a.user_id,b.user_id,founder[0].id].sort());
 const conversations=before.conversations.filter(r=>r.room_id===owned.roomId);assert.equal(conversations.length,1);assert.equal(conversations[0].id,owned.conversationId);
 const messages=before.messages.filter(r=>r.conversation_id===owned.conversationId);assert.equal(messages.length,1);assert.equal(messages[0].author_id,a.user_id);assert.equal(messages[0].body,`Synthetic lifecycle check ${owned.run.slice(0,8)}`);assert(!messages[0].edited_at&&!messages[0].deleted_at);
 for(const name of ['subrooms','hall_items','trip_plans'])assert.equal(before[name].filter(r=>r.room_id===owned.roomId).length,0);
 assert.equal(before.map_pins.filter(r=>r.conversation_id===owned.conversationId).length,0);
 const invitations=before.invites.filter(r=>r.room_id===owned.roomId);assert.equal(invitations.length,1);
 assert(invitations.every(r=>r.status==='revoked'&&r.encrypted_token===null),'All test invitations must already be revoked');
 assert.equal(before.conversation_reads.filter(r=>r.conversation_id===owned.conversationId&&r.user_id===founder[0].id).length,0,'Founder Walk activity: preserve Room');
 const scopeHash=hash({room,messages,members:before.room_memberships.filter(r=>r.room_id===owned.roomId),conversations});
 if(apply){const proof=JSON.parse(readFileSync(proofPath));assert(proof.pass&&!proof.apply);assert.equal(proof.scopeHash,scopeHash);}
 step='exact cascade';assert.equal((await c.query('delete from rooms where id=$1::uuid and owner_id=$2::uuid and name=$3 returning id',[owned.roomId,owned.ownerId,owned.name])).rowCount,1);
 const after=await snapshot(),removed={};
 const permitted=new Set(['rooms','room_tags','room_capabilities','room_memberships','conversations','conversation_participants','conversation_reads','invites','messages','notifications']);
 for(const name of tables){
  const earlier=new Set(before[name].map(hash)),remaining=new Set(after[name].map(hash));
  assert(after[name].every(r=>earlier.has(hash(r))),`Unexpected changed/added ${name}: rollback`);
  const deleted=before[name].filter(r=>!remaining.has(hash(r)));if(!deleted.length)continue;
  assert(permitted.has(name),`Unexpected cascade ${name}: rollback`);
  for(const row of deleted){
   assert(row.id===owned.roomId||row.room_id===owned.roomId||row.conversation_id===owned.conversationId,'Unrelated cascade: rollback');
   if(row.user_id===founder[0].id)assert(['room_memberships','conversation_participants','notifications'].includes(name),'Unexpected founder activity: rollback');
   if(row.author_id)assert.equal(row.author_id,a.user_id);
  }
  removed[name]=deleted;result.deleted[name]=deleted.length;
 }
 assert.deepEqual(after.users,before.users);assert.deepEqual(after.profiles,before.profiles);result.founderPreserved=true;result.scopeHash=scopeHash;
 if(apply){
  const backup=receiptPath.replace('.json',`-backup-${Date.now()}.json`);writeFileSync(backup,JSON.stringify({owned,removed}),{flag:'wx',mode:0o600});assert.deepEqual(JSON.parse(readFileSync(backup)),{owned,removed});result.backup=backup;
  await c.query('COMMIT');open=false;
 }else{await c.query('ROLLBACK');open=false;assert.equal((await c.query('select 1 from rooms where id=$1::uuid',[owned.roomId])).rowCount,1);}
 result.pass=true;if(!apply)writeFileSync(proofPath,JSON.stringify(result,null,2),{mode:0o600});
}catch(e){if(open)await c.query('ROLLBACK').catch(()=>{});result.failureType=e.name;result.failedStep=step;result.code=e.code??null;result.failureLine=e.stack?.match(/cleanup-ms74-fp4-disposable\.mjs:(\d+)/)?.[1];process.exitCode=1;}
finally{c.release();await pool.end();const output=receiptPath.replace('.json',`-cleanup-${Date.now()}.json`);writeFileSync(output,JSON.stringify(result,null,2),{flag:'wx',mode:0o600});console.log(JSON.stringify({...result,receipt:output}));}
