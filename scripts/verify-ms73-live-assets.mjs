import assert from "node:assert/strict";
import {execFileSync} from "node:child_process";
const bin=process.env.AGENT_BROWSER_BIN,session=process.env.MS73_LIVE_SESSION;
assert(bin&&session,"Explicit browser/session required");
const keys=["DATABASE_URL","CLERK_SECRET_KEY","ABLY_API_KEY","ROOM_INVITE_ENCRYPTION_KEY","GEOAPIFY_SEARCH_KEY"];
const secrets=keys.map(k=>{assert(process.env[k]?.length>=12,`Missing ${k}`);return process.env[k];});
const raw=execFileSync(bin,["--session",session,"--json","eval","[...new Set(performance.getEntriesByType('resource').map(r=>r.name).filter(u=>u.startsWith('https://toskerapp.vercel.app/_next/static/')&&/\\.js(?:\\?|$)/.test(u)))]"],{encoding:"utf8"});
const result=JSON.parse(raw);assert(result.success);const urls=result.data.result;assert(Array.isArray(urls)&&urls.length>=10&&urls.length<100);
for(const url of urls){assert(url.startsWith("https://toskerapp.vercel.app/_next/static/"));const response=await fetch(url,{signal:AbortSignal.timeout(15000)});assert(response.ok);const body=await response.text();assert(!secrets.some(s=>[s,JSON.stringify(s).slice(1,-1),encodeURIComponent(s)].some(v=>body.includes(v))),"Server credential found in a canonical client asset; values suppressed");}
console.log(JSON.stringify({canonicalClientAssets:urls.length,serverSecretScan:"PASS",credentialsSentToBrowser:false,credentialsPrinted:false}));
