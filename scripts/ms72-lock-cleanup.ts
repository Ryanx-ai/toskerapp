/** Only the already-nuked Sandbox receipt created by this lock-patch smoke. */
import assert from 'node:assert/strict';
import {eq} from 'drizzle-orm';
import {getDatabase} from '../src/server/db/client';
import {conversations,messages,hallItems} from '../src/server/db/schema';
const db=getDatabase(),id='e03829e4-2b26-4ed2-99b7-1a30a3b39a7b',owner='0ee1e5a5-6d7a-4541-a6ca-ca69788997ef';
async function main(){
 const mode=process.argv[2];assert(['inspect','cleanup'].includes(mode));
 await db.transaction(async tx=>{
  const [m]=await tx.select().from(messages).where(eq(messages.id,id)).for('update');assert(m&&m.authorId===owner&&m.body===''&&m.deletedAt&&m.createdAt>=new Date('2026-09-28T00:00:00+08:00'));
  const [c]=await tx.select().from(conversations).where(eq(conversations.id,m.conversationId));assert(c.kind==='sandbox'&&c.ownerId===owner);
  assert.equal((await tx.select().from(hallItems).where(eq(hallItems.sourceMessageId,id))).length,0);
  assert.equal((await tx.select().from(hallItems).where(eq(hallItems.id,'411ffda8-e6a9-483f-b823-5eb00c70aa15'))).length,0);
  console.log({mode,exactNukedSandboxReceipt:id,ownQaNoteAlreadyRemoved:true});
  if(mode==='cleanup')await tx.delete(messages).where(eq(messages.id,id));
 });
}
main().catch(e=>{console.error(e);process.exitCode=1;}).finally(()=>db.$client.end());
