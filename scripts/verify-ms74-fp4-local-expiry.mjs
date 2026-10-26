/** Exercise the real private-expiry effect with an offline deterministic clock.
 * No React state, GPS, provider, database or browser session is fabricated as
 * integration evidence. This narrowly verifies timer scheduling/cleanup. */
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import vm from "node:vm";

const source=readFileSync("src/components/use-local-map-location.ts","utf8");
const effect=source.match(/useEffect\(\(\) => \{\n    if \(!expiresAt\) return;([\s\S]*?)\n  \}, \[expiresAt, clear\]\);/);
assert(effect,"Locate the actual expiry effect; never silently test copied behavior");
function clock(){
 let now=0,id=0,clears=0,statuses=0;
 const timers=new Map(),listeners=new Set();
 const cleanup=vm.runInNewContext(`(() => {${effect[1]}\n})()`,{
  expiresAt:300000,Date:{now:()=>now},clear:()=>clears++,setStatus:()=>statuses++,
  setTimeout:(fn,delay)=>{assert(delay>=0);const key=++id;timers.set(key,{fn,at:now+delay});return key;},
  clearTimeout:key=>timers.delete(key),
  document:{addEventListener:(name,fn)=>{assert.equal(name,"visibilitychange");listeners.add(fn);},removeEventListener:(_name,fn)=>listeners.delete(fn)},
 });
 return {timers,listeners,cleanup,get clears(){return clears;},get statuses(){return statuses;},
  setNow:n=>now=n,visibility:()=>{for(const fn of [...listeners])fn();},
  fire:n=>{now=n;const [key,timer]=timers.entries().next().value??[];assert(timer,"Expiry must still have a scheduled wakeup");timers.delete(key);timer.fn();}};
}
const cases=[];
function test(name,run){try{run();cases.push({name,pass:true});}catch(e){cases.push({name,pass:false,error:e.name});}}
test("exact five-minute deadline expires once",()=>{const c=clock();c.fire(300000);assert.equal(c.clears,1);assert.equal(c.statuses,1);assert.equal(c.timers.size,0);c.cleanup();});
test("early timer does not strand private coordinates",()=>{const c=clock();c.fire(299999);assert.equal(c.clears,0);assert.equal(c.timers.size,1);c.fire(300000);assert.equal(c.clears,1);c.cleanup();});
test("early visibility retains exactly one deadline",()=>{const c=clock();c.setNow(120000);c.visibility();c.visibility();assert.equal(c.clears,0);assert.equal(c.timers.size,1);assert.equal([...c.timers.values()][0].at,300000);c.fire(300000);assert.equal(c.clears,1);c.cleanup();});
test("late wake clears and leaves no timer",()=>{const c=clock();c.fire(360000);assert.equal(c.clears,1);assert.equal(c.timers.size,0);c.cleanup();});
test("visibility after deadline expires only once",()=>{const c=clock();c.setNow(300001);c.visibility();c.visibility();assert.equal(c.clears,1);assert.equal(c.timers.size,0);c.cleanup();});
test("unmount cancels timer and listener",()=>{const c=clock();c.cleanup();assert.equal(c.timers.size,0);assert.equal(c.listeners.size,0);assert.equal(c.clears,0);});
const pass=cases.every(c=>c.pass);
console.log(JSON.stringify({pass,cases,networkRequests:0,scope:"actual expiry effect scheduling only; not browser/server acceptance"}));
if(!pass)process.exitCode=1;
