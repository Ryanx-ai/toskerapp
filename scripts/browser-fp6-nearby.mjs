import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {chromium} from "/Users/ryanc/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/playwright/index.mjs";
const {fixture}=JSON.parse(readFileSync(".git/fp6-recovery/fixture.json","utf8"));assert(!fixture.retained);
const browser=await chromium.connectOverCDP(process.env.FP6_CDP),page=browser.contexts()[0].pages()[0];
try{
  for(const [label,latitude,longitude] of [["MBS vicinity",1.2837,103.8607],["Haji Lane dense streets",1.30085,103.8590]]){
    const data=await page.evaluate(async({slug,latitude,longitude})=>{
      const r=await fetch(`/api/trips/${slug}/places`,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({kind:"pin",latitude,longitude})});
      const d=await r.json();return {status:r.status,candidate:d.candidates?.[0]?.candidate,signed:!!d.candidates?.[0]?.token,notice:d.notice};
    },{slug:fixture.slug,latitude,longitude});
    assert.equal(data.status,200);assert(data.signed);assert.equal(data.candidate.latitude,latitude);assert.equal(data.candidate.longitude,longitude);assert.equal(data.candidate.source,"pin");assert.equal(data.candidate.providerId,null);
    console.log({case:label,exactCoordinatesPreserved:true,manualIdentityPreserved:true,signedPreviewOnly:true,address:data.candidate.address,notice:data.notice});
    await page.waitForTimeout(1800);
  }
}catch(e){console.error({failure:"FP6 nearby browser",message:String(e.message).slice(0,400)});process.exitCode=1;}
finally{await browser.close();}
