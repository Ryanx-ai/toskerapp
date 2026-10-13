/** Owns only its bounded local worker processes and synthetic A/B leases. */
import assert from "node:assert/strict";
import { spawn, type ChildProcess } from "node:child_process";
import { randomUUID } from "node:crypto";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { createClerkClient } from "@clerk/backend";
import { eq, inArray } from "drizzle-orm";
import { getDatabase } from "../src/server/db/client";
import { locationCleanupWorkers, locationLatest, locationShares } from "../src/server/db/schema";
import { latestLocationService } from "../src/server/location-sharing/latest-service";
import { LOCAL_LOCATION_WORKER_FILE, WORKER_HEALTH_MS, localLocationWorker, lockHealthyLocationWorker } from "../src/server/location-sharing/local-qa";
import { AuthenticationRequiredError } from "../src/server/auth/actor";
import { resolveQaActors } from "./lib/ms73-fixtures";

const db = getDatabase(), clerk = createClerkClient({ secretKey: process.env.CLERK_SECRET_KEY });
const sessions: string[] = [], leases: string[] = [];
let child: ChildProcess | undefined, childExit: Promise<void> | undefined, stage = "preflight";
const wait = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));
async function startWorker() {
  child = spawn(process.execPath, ["--import", "tsx", "scripts/ms74-fp3-location-worker.ts", "10"], { stdio: ["ignore", "pipe", "pipe"], env: process.env });
  const current = child;
  childExit = new Promise(resolve => current.once("exit", () => resolve()));
  // Readiness is an explicit completed-setup receipt, never a guessed sleep.
  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error("Worker readiness deadline")), 20000);
    let pending = "", settled = false;
    const finish = (error?: Error) => { if (settled) return; settled = true; clearTimeout(timer); if (error) reject(error); else resolve(); };
    current.once("error", () => finish(new Error("Worker spawn failed")));
    current.once("exit", () => finish(new Error("Worker exited before readiness")));
    current.stderr?.on("data", () => { /* Never forward diagnostic payloads. */ });
    current.stdout?.on("data", chunk => {
      pending += String(chunk);
      for (;;) {
        const end = pending.indexOf("\n"); if (end < 0) break;
        const line = pending.slice(0, end); pending = pending.slice(end + 1);
        try { const record = JSON.parse(line); if (record.worker === "ready") finish(); if (record.worker === "failed") finish(new Error("Worker failed")); } catch { /* Not a readiness record. */ }
      }
    });
  });
}
async function endWorker(signal: NodeJS.Signals) {
  if (!child || child.exitCode !== null || child.signalCode !== null) return;
  child.kill(signal);
  let timer: ReturnType<typeof setTimeout> | undefined;
  try { await Promise.race([childExit, new Promise<never>((_, reject) => { timer = setTimeout(() => reject(new Error("Worker exit deadline")), 15000); })]); }
  finally { clearTimeout(timer); }
}
async function main() {
  assert(!process.env.VERCEL && !existsSync(LOCAL_LOCATION_WORKER_FILE));
  assert.equal((await db.select().from(locationCleanupWorkers)).length, 0);
  assert.equal((await db.select({ id: locationLatest.leaseId }).from(locationLatest)).length, 0);
  const actors = await resolveQaActors(db), fixture = JSON.parse(readFileSync(".git/ms74-recovery/fixture.json", "utf8"));
  assert.equal((await db.select().from(locationShares).where(inArray(locationShares.userId, [actors.a.userId, actors.b.userId]))).length, 0);
  for (const actor of [actors.a, actors.b]) sessions.push((await clerk.sessions.createSession({ userId: actor.authSubject })).id);
  const service = latestLocationService(db, { notify: async () => {}, session: async (actor, id) => {
    const value = await clerk.sessions.getSession(id);
    if (value.userId !== actor.authSubject || value.status !== "active" || value.expireAt <= Date.now()) throw new AuthenticationRequiredError();
  } });
  stage = "first worker readiness"; await startWorker();
  const config = await localLocationWorker(actors.a.userId, fixture.conversationId);
  stage = "synthetic active samples";
  for (const [index, actor] of [actors.a, actors.b].entries()) {
    const consent = await service.begin(actor, sessions[index], fixture.conversationId, index ? "precise" : "area"); leases.push(consent.id);
    await service.send(actor, sessions[index], consent.id, { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, 0, randomUUID(), new AbortController().signal);
  }
  stage = "abrupt worker loss"; await endWorker("SIGKILL");
  const [stale] = await db.select().from(locationCleanupWorkers).where(eq(locationCleanupWorkers.runId, config.runId)); assert(stale);
  // Wait only for the measured heartbeat deadline, not connection readiness.
  await wait(Math.max(0, stale.lastSweepAt.getTime() + WORKER_HEALTH_MS + 100 - Date.now()));
  await assert.rejects(() => service.read(actors.b, sessions[1], fixture.conversationId));
  await assert.rejects(() => service.begin(actors.a, sessions[0], fixture.conversationId, "area"));
  await assert.rejects(() => service.send(actors.b, sessions[1], leases[1], { latitude: 1.2834, longitude: 103.8607, accuracy: 50 }, 1, randomUUID(), new AbortController().signal));
  assert.equal((await db.select({ id: locationLatest.leaseId }).from(locationLatest)).length, 2);
  stage = "Stop remains available without worker";
  await service.stop(actors.a, sessions[0], leases[0]);
  assert.equal((await db.select().from(locationLatest).where(eq(locationLatest.leaseId, leases[0]))).length, 0);
  stage = "restart replaces exact generation and clears stale payload"; await startWorker();
  const replacement = await localLocationWorker(actors.a.userId, fixture.conversationId); assert.notEqual(replacement.runId, config.runId);
  assert.equal((await db.select({ id: locationLatest.leaseId }).from(locationLatest)).length, 0);
  await assert.rejects(() => db.transaction(tx => lockHealthyLocationWorker(tx, config)));
  assert.equal((await service.read(actors.a, sessions[0], fixture.conversationId)).peers.length, 0);
  stage = "deployed admission is unconditionally denied";
  const oldVercel = process.env.VERCEL; process.env.VERCEL = "1";
  try { await assert.rejects(() => localLocationWorker(actors.a.userId, fixture.conversationId)); }
  finally { if (oldVercel === undefined) delete process.env.VERCEL; else process.env.VERCEL = oldVercel; }
  await service.stop(actors.b, sessions[1], leases[1]);
  stage = "graceful final worker close"; await endWorker("SIGINT");
  assert(!existsSync(LOCAL_LOCATION_WORKER_FILE));
  assert.equal((await db.select().from(locationCleanupWorkers)).length, 0);
  assert.equal((await db.select({ id: locationLatest.leaseId }).from(locationLatest)).length, 0);
  const result = { passed: true, abruptLossDeniesReadWriteBegin: true, stopWithoutWorker: true, restartClearsOldPayloads: true, oldGenerationDenied: true, deployedAdmissionDenied: true, activeWorkers: 0, activePayloads: 0, providerLookups: 0 };
  writeFileSync(".git/ms74-fp3/latest-worker-recovery.json", JSON.stringify(result), { mode: 0o600 }); console.log(JSON.stringify(result));
}
main().catch(() => { console.error(JSON.stringify({ passed: false, stage, privateDetailsSuppressed: true })); process.exitCode = 1; }).finally(async () => {
  try { await endWorker("SIGINT"); if (leases.length) await db.delete(locationShares).where(inArray(locationShares.id, leases)); }
  finally { await Promise.allSettled(sessions.map(id => clerk.sessions.revokeSession(id))); await db.$client.end(); }
});
