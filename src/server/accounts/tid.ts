import "server-only";
import { randomInt } from "node:crypto";
import { and, eq } from "drizzle-orm";
import type { ToskerTransaction } from "@/server/db/client";
import { users } from "@/server/db/schema";
import { TID_ALPHABET, isCanonicalTid } from "@/lib/tid-contract";

export function generateTid() {
  return Array.from({length:7},()=>TID_ALPHABET[randomInt(TID_ALPHABET.length)]).join("");
}
/** Same bootstrap identity boundary. DB unique indexes—not randomness—arbitrate
 * both TID collisions and concurrent creation of the same provider identity.
 * Existing IDs are returned untouched pending the separate migration decision.
 * Candidate injection is server/test-only; never a Server Action parameter.
 */
export async function establishToskerUser(db: Pick<ToskerTransaction,"select"|"insert">, identity: {provider:string;subject:string}, candidate=generateTid) {
  const find=()=>db.select({id:users.id,tid:users.tid}).from(users).where(and(eq(users.authProvider,identity.provider),eq(users.authSubject,identity.subject))).limit(1);
  let [user]=await find();
  for(let attempt=0;!user && attempt<5;attempt++) {
    const tid=candidate();
    if(!isCanonicalTid(tid)) throw new Error("Invalid generated Tosker ID.");
    [user]=await db.insert(users).values({authProvider:identity.provider,authSubject:identity.subject,tid}).onConflictDoNothing().returning({id:users.id,tid:users.tid});
    if(!user) [user]=await find();
  }
  if(!user) throw new Error("Unable to establish a unique Tosker identity.");
  return user;
}
