/** QA users are shared fixtures. Logout intentionally revokes their other
 * realtime/location sessions, so actor-bearing suites must never overlap. */
import assert from "node:assert/strict";
import {randomUUID} from "node:crypto";
import {readFileSync,writeFileSync,unlinkSync} from "node:fs";
let acquired=false;
const path=".git/ms74-fp4/browser/actor-suite.lock",owner=JSON.stringify({pid:process.pid,run:randomUUID()});
export function acquireFp4QaActors(){
 if(acquired)return;
 try{writeFileSync(path,owner,{flag:"wx",mode:0o600});}catch{throw Error("Another QA actor suite owns the lock. Recover its exact process before cleanup; do not overlap or bypass.");}
 acquired=true;
 process.once("exit",()=>{assert.equal(readFileSync(path,"utf8"),owner);unlinkSync(path);});
}
