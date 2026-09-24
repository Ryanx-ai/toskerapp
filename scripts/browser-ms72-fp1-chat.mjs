import assert from "node:assert/strict";
import {run,ev,until,button} from "./browser-fp2.mjs";
const a=process.env.MS72_A??"fp1-a",b=process.env.MS72_B??"fp1-b",origin=process.env.MS72_ORIGIN??"http://localhost:3000";
const routes=["/personal/chat-be192eac-38c6-4d46-a6d2-bea19fa324fa","/room/ms722-frame-qa","/room/ms722-frame-qa/subroom/f7220000-2026-4000-8000-000000000003"];
for(const [index,path] of routes.entries()) {
  const body=`MS7.2 FP1 scoped smoke 20260925 ${index}`;
  for(const s of [a,b]) { await run(s,"set","viewport","1440","900");await run(s,"open",origin+path);await until(s,"!!document.querySelector('.composer textarea')","Chat"); }
  assert(!await ev(a,`[...document.querySelectorAll('.message-bubble p')].some(e=>e.textContent===${JSON.stringify(body)})`),"Inspect preexisting smoke before retry");
  await run(a,"fill",".composer textarea",body);await button(a,"Send message");
  await until(b,`[...document.querySelectorAll('.message-bubble p')].some(e=>e.textContent===${JSON.stringify(body)})`,"A to B realtime message",45000);
  const id=await ev(a,`[...document.querySelectorAll('.message-row')].find(e=>[...e.querySelectorAll('.message-bubble p')].some(p=>p.textContent===${JSON.stringify(body)})).id`);
  console.log("SCOPED QA RECEIPT",id,path);
  await run(b,"open",origin+path);await until(b,`!!document.getElementById(${JSON.stringify(id)})`,"durable reload");
  if(index===1) {
    await run(a,"click",`#${id} [aria-label='More message actions']`);await button(a,"Pin to Hall");
    await run(b,"open",origin+path+"/hall");await until(b,`document.querySelector('.hall-surface')?.textContent.includes(${JSON.stringify(body)})`,"Hall retained reference",45000);
  }
  await run(a,"click",`#${id} [aria-label='More message actions']`);await button(a,"Nuke message");await button(a,"Nuke message");
  await until(a,`!document.getElementById(${JSON.stringify(id)})`,"author Nuke");
  if(index===1) await until(b,`!document.querySelector('.hall-surface')?.textContent.includes(${JSON.stringify(body)})`,"Hall reference retracted",45000);
  await run(b,"open",origin+path);await until(b,"!!document.querySelector('.composer textarea')","Chat after Nuke");
  assert(!await ev(b,`!!document.getElementById(${JSON.stringify(id)})`));
  console.log("PASS A/B delivery, reload, author Nuke and peer reload",path,index===1?"including Hall pin/retraction":"");
}
