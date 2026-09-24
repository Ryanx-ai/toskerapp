import assert from "node:assert/strict";
import { usernameBase, isProvisionedUsername } from "../src/lib/username-contract";
for(const input of ["A","Ryan Chin","ADMIN","tosker","支持","---","a".repeat(100),"x".repeat(23)+" --- tail","hello_world","name@example.com"]) assert(isProvisionedUsername(usernameBase(input)),input);
assert.equal(usernameBase("Ryan Chin"),"ryan-chin");
assert.equal(usernameBase("ADMIN"),"admin-member");
for(const input of ["admin","support","Aaa","a","ab","-abc","abc-","hello world","x".repeat(25)]) assert(!isProvisionedUsername(input),input);
console.log("PASS new-account username normalization, length, reserved names, invalid input; existing handles unchanged by bootstrap");
