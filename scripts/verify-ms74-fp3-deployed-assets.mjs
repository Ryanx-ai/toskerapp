import assert from 'node:assert/strict';
import {readFileSync,writeFileSync} from 'node:fs';
const paths=[...new Set(JSON.parse(readFileSync('.git/ms74-fp3/client-assets.json','utf8')))];
assert(paths.length>=20&&paths.length<100);
const secrets=['DATABASE_URL','CLERK_SECRET_KEY','ABLY_API_KEY','ROOM_INVITE_ENCRYPTION_KEY','GEOAPIFY_SEARCH_KEY'].map(k=>{assert(process.env[k]?.length>=12);return process.env[k];});
for(const path of paths){
  assert(/^\/_next\/static\/[a-zA-Z0-9_./-]+\.js$/.test(path)&&!path.includes('..'));
  const response=await fetch('https://toskerapp.vercel.app'+path,{signal:AbortSignal.timeout(20000)});assert(response.ok);
  const body=await response.text();assert(!secrets.some(s=>[s,JSON.stringify(s).slice(1,-1),encodeURIComponent(s)].some(v=>body.includes(v))),'Server secret found; values suppressed');
}
const receipt={pass:true,canonicalAssets:paths.length,at:new Date().toISOString(),credentialsPrinted:false};
writeFileSync('.git/ms74-fp3/asset-scan-'+(process.argv.includes('--old')?'old':'replacement')+'.json',JSON.stringify(receipt),{mode:0o600});console.log(JSON.stringify(receipt));
