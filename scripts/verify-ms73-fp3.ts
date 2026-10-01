import { getDatabase } from "../src/server/db/client";
import { verifyFp3Lifecycle } from "./lib/ms73-fp3-lifecycle";
const db=getDatabase();
verifyFp3Lifecycle(db,true).catch(()=>{console.error("FP3 lifecycle failure; inspect the exact emitted fixture receipt. Sensitive details suppressed.");process.exitCode=1;}).finally(()=>db.$client.end());
