/** Eight capped provider calls; public landmark queries only, no device position. */
import assert from "node:assert/strict";
import { writeFileSync } from "node:fs";
import { getDatabase } from "../src/server/db/client";
import { resolveQaActors } from "./lib/ms73-fixtures";
import { getPlaceProvider, reservePlaceRequest } from "../src/server/maps/provider";
const db=getDatabase(),out:{query:string;count?:number;names?:string[];label?:string|null;provenance?:boolean}[]=[];let calls=0;
async function main(){
  const {a}=await resolveQaActors(db),provider=getPlaceProvider();
  for(const query of ["Marina Bay Sands Singapore","Petronas Twin Towers Kuala Lumpur","Tokyo Tower Japan","British Museum London","Central Park New York","Sydney Opera House Australia"]){
    await new Promise(resolve=>setTimeout(resolve,1200));await reservePlaceRequest(db,a.userId);calls++;
    const result=await provider.search(query,AbortSignal.timeout(10000));
    assert(result.length>0,"No worldwide candidates");assert(result.every(c=>c.providerId&&c.attribution&&c.license));
    out.push({query,count:result.length,names:result.slice(0,3).map(c=>c.title),provenance:true});
  }
  for(const [query,latitude,longitude] of [["Tokyo public landmark broad label",35.6586,139.7454],["Johor Bahru public landmark broad label",1.462,103.763]] as const){
    await new Promise(resolve=>setTimeout(resolve,1200));await reservePlaceRequest(db,a.userId);calls++;
    const label=await provider.area(latitude,longitude,AbortSignal.timeout(10000));
    out.push({query,label});assert(label&&label.length<=100,"Broad area unavailable");
  }
  const receipt={pass:true,at:new Date().toISOString(),calls,results:out,automaticSelection:false,retainedPlaceWrites:0,credentialsPrinted:false};
  writeFileSync(".git/ms74-fp3/world-provider.json",JSON.stringify(receipt,null,2),{mode:0o600});console.log(JSON.stringify(receipt));
}
main().catch(error=>{writeFileSync(".git/ms74-fp3/world-provider.json",JSON.stringify({pass:false,calls,results:out,kind:error?.name}),{mode:0o600});console.error(JSON.stringify({pass:false,calls,kind:error?.name,detail:"Provider smoke stopped; private request details suppressed"}));process.exitCode=1;}).finally(()=>db.$client.end());
