/** Exact-owned shadow fixture only. Founder membership is stable throughout. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {eq,sql} from "drizzle-orm";
import {getDatabase} from "../src/server/db/client";
import {rooms} from "../src/server/db/schema";
import {cleanupQaFixture,resolveQaActors} from "./lib/ms73-fixtures";
import {grantRoomMembership,withdrawRoomMember} from "../src/server/rooms/lifecycle";
import {publishUserActivity} from "../src/server/realtime/provider";
const db=getDatabase();
async function main(){
 const {schema}=JSON.parse(readFileSync(".git/fp5-recovery/browser-schema.json","utf8"));assert(/^fp5_rehearsal_[a-f0-9]{32}$/.test(schema));assert.equal((await db.execute(sql`select current_schema() as name`)).rows[0].name,schema);
 const {fixture}=JSON.parse(readFileSync(".git/fp5-recovery/browser-fixture.json","utf8"));await cleanupQaFixture(db,fixture,false);
 const {a,b}=await resolveQaActors(db),mode=process.argv[2];assert(mode==="--remove-b"||mode==="--restore-b");
 if(mode==="--remove-b")await withdrawRoomMember(db,a,fixture.id,b.userId);
 else await db.transaction(async tx=>{const [room]=await tx.select().from(rooms).where(eq(rooms.id,fixture.id)).for("update");assert(room?.slug===fixture.slug&&room.ownerId===a.userId);await grantRoomMembership(tx,b,room);});
 await publishUserActivity(b.userId);console.log(JSON.stringify({mode,room:fixture.slug,namespace:"owned FP5 shadow",founderUntouched:true}));
}
main().catch(()=>{console.error("STOP FP5 exact-owned access check failed; no permission acceptance claimed");process.exitCode=1;}).finally(()=>db.$client.end());
