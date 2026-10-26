import assert from "node:assert/strict";
import { boundedMapInsets } from "../src/lib/maps/viewport-insets";
let checks=0;
for(const width of [320,390,430,768,1440,1728])for(const height of [320,390,844,1000])for(const input of [
  {top:88,left:8,right:8,bottom:300}, {top:88,left:298,right:412,bottom:400},
  {top:900,left:900,right:900,bottom:900}, {top:NaN,left:-1,right:Infinity,bottom:-10},
]){
  const result=boundedMapInsets(width,height,input);
  assert(Object.values(result).every(n=>Number.isFinite(n)&&n>=0));
  assert(width-result.left-result.right>=79.99);assert(height-result.top-result.bottom>=79.99);checks++;
}
assert.deepEqual(boundedMapInsets(1440,1000,{top:100,left:300,right:400,bottom:300}),{top:100,left:300,right:400,bottom:300});
console.log(JSON.stringify({viewportInsets:"PASS",checks:checks+1,browserVerified:false}));
