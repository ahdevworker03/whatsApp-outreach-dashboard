import cron from "node-cron";
import { processDueFollowups } from "../services/followup.service";

// node-cron scheduler (M5 Step 3), in-process per
// docs/architecture/02-technology-decisions.md — no Redis, no external
// queue. Every 15 minutes is a proposed default (this milestone's Step 3
// scope note), not a hard requirement anywhere in the docs — reasonable for
// a delay-based, non-time-critical follow-up system at this scale
// (~150 messages/day).
const FOLLOWUP_CHECK_CRON = "*/15 * * * *";

// noOverlap is the idempotency guard this milestone's Step 3 verification
// requires ("confirm scheduler does not double-send if run twice against
// the same due lead") for the case a run takes longer than the interval —
// node-cron skips a fire entirely if the previous one is still executing,
// rather than starting a second one concurrently. Once a lead's send
// succeeds, its status also moves out of the query's own eligibility window
// (CONTACTED/FOLLOWUP_1_SENT), so a later, non-overlapping run naturally
// excludes it too.
export function startFollowupScheduler() {
  const task = cron.schedule(FOLLOWUP_CHECK_CRON, () => processDueFollowups(), {
    noOverlap: true,
    name: "followup-scheduler",
  });

  // Per docs/architecture/03-backend-architecture.md section 8: "Scheduler
  // job failures are logged per job and do not stop the scheduler." Each
  // lead's own send failure is already caught and handled inside
  // followup.service.ts; this only catches something unexpected escaping
  // the whole run (e.g. the initial due-leads query itself failing).
  task.on("execution:failed", (ctx) => {
    console.error("[followup-scheduler] run failed", ctx.execution?.error);
  });
  task.on("execution:overlap", () => {
    console.warn("[followup-scheduler] previous run still in progress, skipping this tick");
  });

  return task;
}
