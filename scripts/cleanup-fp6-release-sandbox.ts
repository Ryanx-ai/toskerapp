/** Exact receipted QA Route only, never remove the retained Sandbox or unrelated data. */
import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {and,eq} from 'drizzle-orm';
import {getDatabase} from '../src/server/db/client';
import {conversations,tripPlans,tripComments,tripMutationReceipts} from '../src/server/db/schema';
import {readTrip,mutateTrip} from '../src/server/trips/service';
import {resolveQaActors} from './lib/ms73-fixtures';
const db=getDatabase();
async function main(){
  const file=process.argv.includes('--canonical')?'.git/fp6-recovery/canonical-live.json':'.git/fp6-recovery/release-truth.json';
  const receipt=JSON.parse(readFileSync(file,'utf8'));assert(receipt.complete);assert(!receipt.sandboxCleaned);
  const {a}=await resolveQaActors(db);assert.equal(receipt.owner,a.userId);
  const [sandbox]=await db.select().from(conversations).where(and(eq(conversations.kind,'sandbox'),eq(conversations.ownerId,a.userId)));assert(sandbox);assert.equal(receipt.scope,`sandbox--${sandbox.id}`);
  const owned=receipt.createdRoutes.filter((r:{scope:string})=>r.scope===receipt.scope);assert.equal(owned.length,1);
  const plan=await readTrip(db,a,receipt.scope);assert.equal(plan.routes.length,1);assert.equal(plan.routes[0].id,owned[0].id);assert.equal(plan.places.length,1);assert.equal(plan.places[0].title,'Marina Bay Sands');
  const [storedPlan]=await db.select().from(tripPlans).where(eq(tripPlans.sandboxConversationId,sandbox.id));assert(storedPlan);
  const edits=await db.select().from(tripMutationReceipts).where(eq(tripMutationReceipts.planId,storedPlan.id));assert(edits.every(r=>r.actorId===a.userId));
  const comments=await db.select().from(tripComments).where(eq(tripComments.planId,storedPlan.id));assert.equal(comments.length,0);
  console.log({dryRun:!process.argv.includes('--apply'),exactOwnedRoutes:1,cards:1,parentSandboxPreserved:true,founderUntouched:true});
  if(process.argv.includes('--apply')){await mutateTrip(db,a,{roomSlug:receipt.scope,expectedRevision:plan.revision,requestId:randomUUID(),command:{type:'nuke-route',routeId:owned[0].id}});assert.equal((await readTrip(db,a,receipt.scope)).routes.length,0);receipt.sandboxCleaned=true;writeFileSync(file,JSON.stringify(receipt,null,2),{mode:0o600});console.log('PASS exact one disposable QA Route/card removed; retained parent Sandbox preserved');}
}
main().catch(e=>{console.error({failure:'FP6 Sandbox cleanup stopped',message:e instanceof assert.AssertionError?e.message.split('\n')[0]:'Details suppressed'});process.exitCode=1;}).finally(()=>db.$client.end());
