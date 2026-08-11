import { randomUUID } from "crypto";
import type { ClientProfile, Job, Suggestion } from "./types";
import { getClient, listPages, saveJob, savePage } from "./db";
import { generatePage, type GenerateContext } from "./engine";

// In-process background job runner. Good for a single persistent Node server
// (Render / Railway / Fly / a VM), which is what "set it and leave it, come
// back later" requires — serverless can't run long background work.
// For multiple servers or heavy volume, move this to a real queue (BullMQ +
// Redis); the Job row schema stays the same.

// Rolling estimate of seconds per page, seeded conservatively and refined as
// pages complete, so the progress bar's ETA gets more accurate over time.
let secondsPerPageEstimate = 45;

export function startGenerationJob(
  clientId: string,
  targets: Suggestion[],
): Job {
  const job: Job = {
    id: randomUUID(),
    clientId,
    status: "queued",
    total: targets.length,
    completed: 0,
    failed: 0,
    currentLabel: "Starting...",
    startedAt: null,
    finishedAt: null,
    etaSeconds: Math.round(targets.length * secondsPerPageEstimate),
    error: null,
    createdAt: Date.now(),
  };
  saveJob(job);

  // Fire and forget. The route returns immediately; the dashboard polls the job.
  void runJob(job.id, targets).catch((err) => {
    const j = { ...job, status: "error" as const, error: String(err), finishedAt: Date.now() };
    saveJob(j);
  });

  return job;
}

async function runJob(jobId: string, targets: Suggestion[]): Promise<void> {
  const jobRow = loadJob(jobId);
  if (!jobRow) return;

  const profile = getClient(jobRow.clientId);
  if (!profile) {
    saveJob({ ...jobRow, status: "error", error: "Client not found", finishedAt: Date.now() });
    return;
  }

  let job: Job = { ...jobRow, status: "running", startedAt: Date.now() };
  saveJob(job);

  // Seed sibling context from any pages already generated for this client.
  const ctx: GenerateContext = { siblingOpenings: [], siblingBodies: [] };
  for (const p of listPages(profile.id)) {
    ctx.siblingOpenings.push(p.openingFingerprint);
    ctx.siblingBodies.push(p.html);
  }

  const durations: number[] = [];

  for (let i = 0; i < targets.length; i++) {
    const t = targets[i];
    job = {
      ...job,
      currentLabel: `${t.service} in ${t.city}`,
      etaSeconds: estimateRemaining(targets.length - i, durations),
    };
    saveJob(job);

    const started = Date.now();
    try {
      const page = await generatePage(profile as ClientProfile, t.service, t.city, ctx);
      savePage(page);
      // Add to sibling context so the next page is checked against this one.
      ctx.siblingOpenings.push(page.openingFingerprint);
      ctx.siblingBodies.push(page.html);
      if (page.status === "failed") job = { ...job, failed: job.failed + 1 };
    } catch (err) {
      job = { ...job, failed: job.failed + 1, error: String(err) };
    }

    const elapsed = (Date.now() - started) / 1000;
    durations.push(elapsed);
    if (durations.length) {
      secondsPerPageEstimate = durations.reduce((a, b) => a + b, 0) / durations.length;
    }

    job = { ...job, completed: i + 1 };
    saveJob(job);
  }

  job = {
    ...job,
    status: "done",
    currentLabel: "Complete",
    etaSeconds: 0,
    finishedAt: Date.now(),
  };
  saveJob(job);
}

function estimateRemaining(pagesLeft: number, durations: number[]): number {
  const rate = durations.length
    ? durations.reduce((a, b) => a + b, 0) / durations.length
    : secondsPerPageEstimate;
  return Math.round(pagesLeft * rate);
}

function loadJob(id: string): Job | null {
  // Local import to avoid a cycle at module load.
  const { getJob } = require("./db") as typeof import("./db");
  return getJob(id);
}
