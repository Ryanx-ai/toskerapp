import assert from 'node:assert/strict';
import {run,ev,until,button} from './browser-fp2.mjs';
const a=process.env.FP4_A??'fp2-fresh',o=process.env.FP4_ORIGIN??'http://localhost:3000';
await run(a,'set','viewport','1440','900');await run(a,'open',o+'/app');await until(a,"!!document.querySelector('.fp3-shell')",'workspace');
if(process.env.FP4_EXISTING_ROOM){assert.match(process.env.FP4_EXISTING_ROOM,/^\/room\/fp4-review-[a-f0-9]{6}$/);await run(a,'open',o+process.env.FP4_EXISTING_ROOM);}else{
await button(a,'Start a chat or create a Room');await run(a,'click','.creation-choices button:last-child');
await run(a,'fill','input[aria-label="Room name"]','FP4 Review');await button(a,'Next');
await run(a,'fill','input[aria-describedby="trip-label-help"]','JB Supper Run');await button(a,'Create Room');
await until(a,"document.querySelector('.room-ready h2')?.textContent===\"Room's ready\"",'durable Room',45000);await button(a,'Open Room');
}
await until(a,"!!document.querySelector('.composer textarea')",'new Room');
await until(a,"/^\\/room\\/fp4-review-[a-f0-9]{6}$/.test(location.pathname)",'settled Room route');
const path=await ev(a,'location.pathname');assert.match(path,/^\/room\/fp4-review-[a-f0-9]{6}$/);console.log('FP4 QA ROOM',path);
await button(a,'Conversation options');await button(a,'Room Settings');await until(a,"!!document.querySelector('input[aria-describedby=room-tags-help]')",'trip settings');
assert.equal(await ev(a,"document.querySelector('input[aria-describedby=room-tags-help]').value"),'JB Supper Run');
await run(a,'fill','input[aria-describedby=room-tags-help]','Malacca Weekend');await button(a,'Save Room');
await until(a,"document.querySelector('.scoped-settings-footer')?.textContent.includes('Room saved.')",'metadata saved',45000);
await button(a,'Close Room Settings');await run(a,'open',o+path);
await until(a,"document.querySelector('.messenger-sidebar')?.textContent.includes('TRIP · Malacca Weekend')",'persisted sidebar label',45000);
console.log('PASS real Create Room / owner label edit / reload / sidebar summary',path);
