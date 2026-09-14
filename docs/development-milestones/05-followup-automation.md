# M5 — Follow-up Automation

Goal (per `docs/planning/01-mvp-plan.md`): automatically send follow-ups and stop on real replies.

Acceptance criteria for the milestone as a whole (from `01-mvp-plan.md`):
- Follow-up #1 and #2 send after their configured delays when no reply is received.
- A detected auto-reply does not stop the sequence.
- A human reply stops all remaining follow-ups for that lead.

**Review mode: per-step, not batch.** Per `docs/planning/02-agent-workflow.md` and the project's own risk flag, M5 is reviewed step-by-step, not run autonomously end-to-end like M4. Each step should be sent to Claude Code individually; do not hand it the whole file at once.

---

## What already exists from M1-M4 that this milestone builds on

- `backend/src/lib/metaClient.ts`'s `sendTemplateMessage()` — proven live in M1 and M4.
- `backend/src/services/messages.service.ts`'s `sendInitialTemplate()` — the only existing send path. Sends the *initial* template, sets `followup1_due_at`. No follow-up-sending logic exists yet.
- `backend/src/repositories/messages.repository.ts`'s `countTodaysOutboundMessages()` — the daily-limit guard, reusable as-is for follow-up sends.
- `backend/src/webhooks/` — receives incoming Meta webhook events and persists them per `docs/architecture/03-backend-architecture.md` section 5, established in M2. Current behavior needs inspection before this milestone assumes what it does or doesn't already do with incoming messages (see Step 0).
- `campaigns` table: `followup1_template_id`, `followup1_delay_hours`, `followup2_template_id`, `followup2_delay_hours` — schema exists, unused until now.
- `leads` table: `followup1_due_at`, `followup2_due_at` — `followup1_due_at` is set by M4's `sendInitialTemplate()`; `followup2_due_at` is not set anywhere yet.
- `conversations` table and `ConversationStatus`/`automation_stopped` — schema exists per M2's migration. **Not confirmed that any row is ever created here** — see Step 0.
- `settings.auto_reply_patterns` (`string[]`) — schema field exists, unused.
- No `node-cron` (or any scheduler) is installed. No scheduler file exists in `backend/src/jobs/` despite that folder being named in `03-backend-architecture.md`'s structure — needs confirming, not assuming.

## Confirmed missing at the start of this milestone (to be verified by direct repo inspection in Step 0, not assumed from docs alone)

- No scheduler (`node-cron` or otherwise) installed or running.
- No follow-up send logic (`sendFollowup1`, `sendFollowup2`, or equivalent).
- No auto-reply detection logic anywhere — `auto_reply_patterns` is never read.
- No code path sets `conversations.automation_stopped`, or creates a `conversations` row at all, on an incoming reply.
- No code path sets `leads.followup2_due_at`.
- No transition to `LeadStatus.COMPLETED` exists anywhere (end-of-sequence-with-no-reply state).

---

## Step 0 — Inspect Current Webhook and Conversation State (no code changes)

**Objective**
Before writing any automation logic, confirm exactly what the existing webhook handler (built in M2) currently does with an incoming message, and confirm whether any `conversations` row is ever created. This milestone's correctness depends on this being accurate, not assumed from the M2 milestone doc.

**Scope**
Read-only inspection: `backend/src/webhooks/`, `backend/src/repositories/webhook.repository.ts`, the M2 milestone file's relevant steps. No code changes in this step.

**Questions this step must answer**
1. When an inbound WhatsApp message arrives, is a `messages` row created with `direction: INBOUND`? (Expected yes, per M2.)
2. Is a `conversations` row ever created or updated on incoming message? If yes, where and when. If no, confirm this gap explicitly.
3. Does anything currently set `is_auto_reply` on an inbound message, or is it always `false` (default) today?
4. Is there an existing `LeadStatus` transition on incoming message, or does a reply currently leave the lead's status untouched?

**Acceptance Criteria**
A clear, evidence-based answer to all four questions above, citing the actual code read — not inferred from architecture docs.

**Result**
Complete. Read `backend/src/webhooks/whatsapp.controller.ts`, `backend/src/services/webhook.service.ts`, and `backend/src/repositories/webhook.repository.ts` directly, plus repo-wide `grep` for `automationStopped`/`isAutoReply`/`REPLIED`/`autoReplyPatterns`/`node-cron`/`src/jobs`. No code was changed.

**1. Is a `messages` row created with `direction: INBOUND`?** Yes. `whatsapp.controller.ts`'s `receiveWebhookEvent` calls `webhook.service.ts`'s `handleIncomingMessage(message)` for every entry in the payload's `messages` array. `handleIncomingMessage` (after a `findMessageByMetaId` dedup check for Meta's at-least-once delivery) calls `webhook.repository.ts`'s `createInboundMessage()`, which does `prisma.message.create({ direction: "INBOUND", type: "TEXT", status: "RECEIVED", content: message.text?.body ?? "", metaMessageId: data.metaMessageId, ... })`. Confirmed, not just per M2's doc claim — the actual `create()` call.

**2. Is a `conversations` row ever created or updated on incoming message?** Yes, but only `status`/`last_message_at` — `automation_stopped` is never touched. `handleIncomingMessage` calls `repo.upsertConversationForLead(lead.id)`, which is a single `prisma.conversation.upsert()`: on create, `{ leadId, status: "ACTIVE", lastMessageAt: new Date() }`; on update (row already exists for that lead), only `{ lastMessageAt: new Date() }` — `status` is left as whatever it already was, and `automationStopped` is not part of either branch at all. A repo-wide `grep -rn "automationStopped|automation_stopped" src/` returns zero matches anywhere in the codebase — confirming Step 0's "Not confirmed that any row is ever created here" concern is actually the milder case (a row *is* created/updated), but the `automation_stopped` gap named in this milestone's intro is real and total: nothing sets it, anywhere, today.

**3. Does anything set `is_auto_reply`, or is it always `false`?** Always `false` (schema default), never set anywhere. `createInboundMessage()`'s `prisma.message.create()` call does not include `isAutoReply` in its data object at all, so it falls through to `schema.prisma`'s `isAutoReply Boolean @default(false)`. A repo-wide `grep -rn "isAutoReply" src/` matches nothing — no file anywhere reads or writes this field. `auto_reply_patterns`/`autoReplyPatterns` is equally untouched (same `grep`, zero matches) — the `settings` row's array is never read by any code path today.

**4. Is there an existing `LeadStatus` transition on incoming message, or does status stay untouched?** Untouched. `upsertLeadByPhone(phone)` (called by `handleIncomingMessage` immediately before the conversation upsert) is `prisma.lead.upsert({ where: { phone }, create: { phone, status: "NEW" }, update: {} })` — the `update` branch is a literal empty object, so an existing lead's `status` (or any other field) is never modified by an incoming message today. A repo-wide `grep -rn "REPLIED" src/` matches nothing — the `REPLIED` status is not written anywhere in the codebase yet, confirming a reply currently leaves the lead's status exactly where it was (e.g. still `CONTACTED` after a human reply, with no signal anywhere that a reply happened).

**Also confirmed while here (from the milestone intro's "needs confirming, not assuming" list):** `grep -n "node-cron" package.json` → no match (not installed); `ls backend/src/jobs` → directory does not exist. Both confirmed absent, not assumed.

---

## Step 1 — Conversation Creation and Auto-Reply Detection

**Objective**
On an incoming WhatsApp message (webhook), ensure a `conversations` row exists for that lead (create if missing, matching `lead_id`), and run auto-reply detection against `settings.auto_reply_patterns` to set `is_auto_reply` on the inbound `messages` row correctly.

**Scope**
- Conversation find-or-create tied to incoming message handling.
- Simple pattern-matching auto-reply detection (configurable string/keyword patterns from `settings.auto_reply_patterns`, case-insensitive substring or similar simple match) — per the contract's explicit instruction: "prefer simple configurable rules/patterns rather than AI classification," and "do not promise 100% accurate detection."
- Setting `is_auto_reply` on the `messages` row per the detection result.

**Explicit exclusions**
- Does not yet stop/continue the follow-up sequence — that's Step 2.
- No AI/ML classification of any kind.
- No UI for managing `auto_reply_patterns` — that's Settings page work, in M7. This step only needs to *read* the array from the `settings` row; if it's empty, no message should ever be classified as auto-reply (fail toward treating everything as human, since a false "auto-reply" classification silently breaks the stop-on-reply guarantee, which is worse than an occasional un-stopped auto-reply follow-up).

**Dependencies**
Step 0's findings — if a `conversations` row is already created somewhere, this step adapts to extend that path rather than duplicating it.

**Acceptance Criteria**
- An incoming message from a lead with no prior `conversations` row creates one.
- An incoming message from a lead with an existing `conversations` row updates it (`last_message_at`, `status`).
- A message matching a configured pattern is marked `is_auto_reply: true`; a message matching none is `is_auto_reply: false`.
- Empty `auto_reply_patterns` never produces a `true` classification.

**Verification required**
Direct webhook-simulated tests (same style as M2's webhook persistence tests) against the real dev DB — not just unit tests in isolation. Confirm via direct DB query, not just code inspection.

**Result**
Complete. Per Step 0's finding, `webhook.repository.ts`'s `upsertConversationForLead()` already did find-or-create — extended rather than duplicated:

- Added `src/lib/autoReplyDetector.ts` (`detectAutoReply(text, patterns)`): case-insensitive substring match against a plain string array, no AI/ML. An empty pattern list (or an empty/whitespace-only individual pattern) never returns `true` — the fail-safe direction Step 1's Scope requires. 7 `vitest` cases in `autoReplyDetector.test.ts`, all passing.
- Added `src/repositories/settings.repository.ts`'s `getSettings()` (`prisma.setting.findFirst()`) — the first code in the repo to read the `settings` table at all. Returns `null` if no row exists, which is the actual current dev-DB state (confirmed in Step 0: 0 rows) — callers treat `null` the same as an empty pattern array, not as an error.
- `webhook.repository.ts`: `createInboundMessage()` now accepts and persists `isAutoReply`; `upsertConversationForLead()`'s update branch now also resets `status: "ACTIVE"` (previously only touched `lastMessageAt`) — a new incoming message reactivates a `CLOSED` conversation, matching `ConversationStatus.ACTIVE`'s own definition ("has unread or recent messages requiring attention"), and this step's acceptance criteria ("updates it (`last_message_at`, `status`)").
- `webhook.service.ts`'s `handleIncomingMessage()`: fetches settings, runs `detectAutoReply()` against the inbound text, passes the result into `createInboundMessage()`.

**Verification (webhook-simulated against the real dev DB, same style as M2's, all confirmed via direct `psql` query afterward, all test data cleaned up):**
1. New lead, no `settings` row at all (the actual current DB state) → `messages.is_auto_reply = false`, a new `conversations` row created `ACTIVE`, lead `status` untouched (`NEW`) — confirms the "no `conversations` row" case works and confirms Step 0's finding that lead status isn't touched here (that's Step 2).
2. Same lead's conversation manually set to `CLOSED`, then a second incoming message → conversation `status` flips back to `ACTIVE` and `last_message_at` advances — confirms the existing-conversation update path, including the reactivation behavior added in this step.
3. Seeded a real `settings` row with `auto_reply_patterns: ['out of office', 'on vacation']`: a message containing "I am currently OUT OF OFFICE, back Monday" → `is_auto_reply = true` (case-insensitive substring match confirmed); a message with no matching text → `is_auto_reply = false`.
4. `auto_reply_patterns` set to `{}` (empty array) on that same settings row: a message containing "I am currently out of office" (which *would* have matched in check 3) → `is_auto_reply = false` — confirms the fail-safe-to-human direction holds even when the row exists but the array is empty.

All test rows (`messages`, `conversations`, `leads`, the seeded `settings` row) deleted afterward — `settings` count confirmed back to 0, matching the pre-test state.

`rm -rf dist && npm run build` — 0 errors. `rm -rf dist && npm test` — 30/30 passing (23 pre-existing + 7 new).

---

## Step 2 — Stop-on-Human-Reply Logic

**Objective**
When a message is classified as a genuine human reply (not auto-reply), set `conversations.automation_stopped = true` and update the lead's status to `REPLIED`.

**Scope**
- Wire Step 1's auto-reply classification into the stop condition.
- Update `LeadStatus` → `REPLIED` on human reply, at any stage in the sequence (per `04-database-design.md` section 4: "At any stage: human reply received → REPLIED").
- Update `conversations.automation_stopped`.

**Explicit exclusions**
- Does not touch the scheduler itself (Step 3) — this step only sets the flag the scheduler will later check.
- No partial/soft-stop concept — a human reply stops the *remaining* sequence entirely, per the contract. No "pause and resume" behavior.

**Dependencies**
Step 1.

**Acceptance Criteria**
- A human (non-auto-reply) incoming message sets `automation_stopped: true` and lead status `REPLIED`, regardless of what stage the lead was at (`CONTACTED`, `FOLLOWUP_1_SENT`, `FOLLOWUP_2_SENT`).
- A detected auto-reply does NOT set `automation_stopped` and does NOT change lead status.

**Verification required**
Direct DB checks for both branches (human reply vs. detected auto-reply) against real seeded leads at different stages.

**Result**
Complete.

- `webhook.repository.ts`'s `upsertConversationForLead()` now takes a `{ stopAutomation: boolean }` option: on `true` (a human reply), `automationStopped: true` is written on both the create and update branch; on `false` (an auto-reply), the create branch writes `false` explicitly (nothing to preserve yet) but the **update** branch omits the field entirely, leaving any existing `true` value untouched — an auto-reply must not *resume* a sequence a prior human reply already stopped, not just "not newly stop" one.
- Added `markLeadReplied(id)` to `webhook.repository.ts` (`status: "REPLIED"`, unconditional — no stage check, matching `04-database-design.md` section 4's "At any stage").
- `webhook.service.ts`'s `handleIncomingMessage()`: computes `isAutoReply` (Step 1) before touching the conversation, then calls `upsertConversationForLead(lead.id, { stopAutomation: !isAutoReply })`, and calls `markLeadReplied(lead.id)` only when `!isAutoReply`. Reordered slightly from Step 1 (auto-reply detection now happens before the conversation upsert, since the upsert needs the result) — no other logic changed.

**Verification (webhook-simulated against the real dev DB, direct `psql` re-query afterward, all test data cleaned up):** seeded 4 leads at different stages, one (`Lead D`) with a conversation already `automation_stopped: true` from a prior (simulated) human reply:

| Lead | Starting stage | Incoming message | Result |
|---|---|---|---|
| A | `CONTACTED`, no conversation yet | human reply | `status: REPLIED`, conversation created `automation_stopped: true` |
| B | `FOLLOWUP_1_SENT`, existing conversation | human reply | `status: REPLIED`, `automation_stopped: true` — confirms "at any stage," not just from `CONTACTED` |
| C | `FOLLOWUP_2_SENT`, existing conversation | detected auto-reply (matched `"out of office"`) | `status` **untouched** (`FOLLOWUP_2_SENT`), `automation_stopped` **untouched** (`false`) |
| D | `CONTACTED`, conversation already `automation_stopped: true` | detected auto-reply | `status` **untouched** (`CONTACTED`, no accidental `REPLIED`), `automation_stopped` **stays `true`** — the auto-reply's update branch did not reset it to `false` |

All four confirmed in one query joining `leads`/`conversations`/`messages`, matching the acceptance criteria exactly (including the D case, which isn't explicitly named in the acceptance criteria but validates the "does NOT set" wording means "does not write `false` over an existing `true`" rather than merely "does not write `true`"). All seeded rows (`leads`, `conversations`, `messages`, the `settings` row) deleted afterward — dev DB confirmed back to 0 rows in both `settings` and the test leads' phone range.

`rm -rf dist && npm run build` — 0 errors. `rm -rf dist && npm test` — 30/30 passing, unchanged (this step has no new pure-logic function; the behavior is Prisma-touching orchestration, verified per `docs/rules/testing.md` via the webhook-simulated DB checks above, not a new `vitest` file).

---

## Step 3 — Scheduler and Follow-up Send Logic

**Objective**
Install `node-cron`. Implement a job that runs on a regular interval, finds leads due for Follow-up #1 or Follow-up #2, and sends them — respecting the daily limit and `automation_stopped`.

**Scope**
- Install `node-cron` per `docs/architecture/02-technology-decisions.md` (in-process, no Redis/queue).
- A repository query: leads where `status = CONTACTED` and `followup1_due_at <= now` and the lead's conversation (if any) is not `automation_stopped` → eligible for Follow-up #1. Equivalent query for Follow-up #2 from `FOLLOWUP_1_SENT`.
- Sending logic reusing `metaClient.ts` and the daily-limit guard from `messages.repository.ts` — same pattern as `sendInitialTemplate()`, adapted for follow-up templates.
- On successful Follow-up #1 send: lead status → `FOLLOWUP_1_SENT`, set `followup2_due_at` from `campaign.followup2_delay_hours`.
- On successful Follow-up #2 send: lead status → `FOLLOWUP_2_SENT`.
- After Follow-up #2's send with still no reply — this milestone must decide when `COMPLETED` is set. Proposed: immediately after Follow-up #2 sends successfully, since there's no further scheduled action after it (per the contract's workflow: "If there is still no real reply, send Follow-up #2... " — nothing after that). Flag this as an interpretive decision, not an invented requirement, since neither the contract nor `04-database-design.md` explicitly states the trigger moment for `COMPLETED`.
- Scheduler interval: propose checking every 15 minutes (not real-time) — reasonable for a delay-based, non-time-critical follow-up system at this scale (~150 messages/day). Flag as a proposed default, not a hard requirement anywhere in the docs.

**Explicit exclusions**
- No retry logic on failed follow-up sends beyond what `metaClient.ts` already does — a failed send sets `MessageStatus.FAILED` and `LeadStatus.FAILED`, it does not reschedule itself. (Matches `04-database-design.md` section 4: "At any stage: delivery failure → FAILED.")
- No manual "trigger follow-up now" endpoint — out of documented scope for M5.
- No scheduler monitoring/alerting UI — out of MVP scope entirely.

**Dependencies**
Steps 1 and 2 (the scheduler must check `automation_stopped` before every send).

**Acceptance Criteria**
- A lead past its `followup1_due_at` with no human reply receives Follow-up #1, moves to `FOLLOWUP_1_SENT`, gets `followup2_due_at` set.
- A lead past its `followup2_due_at` with no human reply receives Follow-up #2, moves to `FOLLOWUP_2_SENT`, then `COMPLETED`.
- A lead with `automation_stopped: true` is skipped by the scheduler entirely, at any due stage.
- The daily limit is respected by follow-up sends exactly as it is by initial sends (shared guard, not a separate limit).
- Scheduler failures for one lead do not stop the job from processing other due leads (per `03-backend-architecture.md` section 8: "Scheduler job failures are logged per job and do not stop the scheduler").

**Verification required**
- Direct DB seeding of leads at various due-times and `automation_stopped` states, real scheduler run (not mocked), confirmed via DB query afterward — not just log output.
- At least one real Meta send exercised for a follow-up template (same `jaspers_market_order_confirmation_v1` stand-in, or confirm if a different demo template is more appropriate — flag to user, don't assume).
- Confirm scheduler does not double-send if run twice against the same due lead (idempotency check — a real risk with interval-based polling if a job run takes longer than the interval, or if the process restarts mid-cycle).

**Result**
Complete.

- Installed `node-cron` (no other new dependency — its published types are bundled, no `@types/node-cron` needed).
- Added `src/repositories/followup.repository.ts`: `findLeadsDueForFollowup1`/`findLeadsDueForFollowup2` (status + due-date + `automation_stopped` filter, expressed directly in the Prisma `where` — a lead with no `conversations` row is treated the same as one with `automationStopped: false`, both meaning "nothing has stopped this sequence"), `markLeadFollowup1Sent`, `markLeadFollowup2Sent`, `markLeadCompleted`, `markLeadFailed`.
- Added `src/repositories/messages.repository.ts`'s `createFailedOutboundTemplateMessage` (a failed send still gets a message row — `status: FAILED`, `failedAt`, no `metaMessageId`).
- Exported `buildTestTemplateComponents`/`renderMessageContent` from `messages.service.ts` for reuse (avoids duplicating the stand-in-template variable-substitution logic per `docs/rules/coding-standards.md`'s "reuse existing code" rule).
- Added `src/services/followup.service.ts`'s `processDueFollowups()`: for each due lead (Follow-up #1 leads, then Follow-up #2 leads), checks the shared daily-limit guard (`messages.repository.ts`'s `countTodaysOutboundMessages`, same function `sendInitialTemplate` uses), sends via `metaClient.ts`, and on success advances the lead's status/due-dates; on a Meta send failure, records a `FAILED` message and sets `LeadStatus.FAILED` (no retry/reschedule, per this step's Explicit exclusions). Every per-lead step is wrapped so one lead's failure can't stop the run from reaching the rest — `src/jobs/followupScheduler.ts` (below) adds a second safety net at the whole-run level. **Interpretive decision** (flagged, not invented): on a successful Follow-up #2 send, the lead is written to `FOLLOWUP_2_SENT` and then immediately to `COMPLETED` in the same call — two sequential writes, matching this step's acceptance criteria wording ("moves to FOLLOWUP_2_SENT, then COMPLETED") — since neither the contract nor `04-database-design.md` states the trigger moment explicitly.
- Added `src/jobs/followupScheduler.ts`: `node-cron` schedule, proposed default `*/15 * * * *` (every 15 minutes, flagged as a proposed default per this step's Scope, not a hard requirement anywhere in the docs). Uses `node-cron`'s `noOverlap: true` option (confirmed via Context7 docs) as the idempotency guard against a run overlapping a still-in-progress previous run; `execution:failed`/`execution:overlap` listeners log per `03-backend-architecture.md` section 8 ("Scheduler job failures are logged per job and do not stop the scheduler"). Started from `src/index.ts` alongside `app.listen`.
- Confirmed with the user before running (outward-facing, real Meta API calls): reuse `jaspers_market_order_confirmation_v1` as the follow-up template (already set as `campaign.followup1TemplateId`/`followup2TemplateId` on every campaign row, including the M4 placeholder — no separate demo template exists), and proceed with real sends to the same test recipient used in M1/M4 (`+96171819509`).

**Verification (`scripts/verify-followup-scheduler.ts`, against the real dev DB, real Meta Cloud API calls where noted, all created rows cleaned up and the pre-existing real lead restored to its original state afterward — confirmed via direct `psql` re-query matching the pre-run snapshot exactly):**

1. **Due-leads query correctness** (DB-only, no Meta calls): seeded a due CONTACTED lead, a not-yet-due CONTACTED lead, a due-but-`automation_stopped` CONTACTED lead, a due FOLLOWUP_1_SENT lead, and a due-but-`automation_stopped` FOLLOWUP_1_SENT lead — `findLeadsDueForFollowup1`/`findLeadsDueForFollowup2` included exactly the two truly-eligible leads and excluded the other three.
2. **Daily limit respected, shared guard**: a dedicated campaign with `dailyLimit: 1` and one filler message already "sent today" — `processDueFollowups()` skipped the due lead entirely (`skippedDailyLimit: 1`, zero new message rows, lead status untouched). Raising the limit and rerunning sent it for real — **real Meta send #1** to `+96171819509`, confirmed via a real `wamid.` id, lead moved to `FOLLOWUP_1_SENT` with `followup2DueAt` set.
3. **Failed send sets FAILED**: a due lead with a deliberately invalid recipient number — **real Meta call**, rejected by Meta itself (`#131030 Recipient phone number not in allowed list`) — confirmed the failure path end-to-end: `MessageStatus.FAILED` (no `metaMessageId`, `failedAt` set) and `LeadStatus.FAILED`, no retry attempted.
4. **No double-send across two non-overlapping runs**: rerunning `processDueFollowups()` immediately after, with no lead newly due, created zero additional message rows — confirms a lead's own status transition out of the eligibility window prevents a resend on a subsequent, non-overlapping run. This is **not** a full idempotency guarantee — see the Known Limitation below.

5. **Follow-up #2 end-to-end**: pushed the same lead's `followup2_due_at` into the past — **real Meta send #2** to `+96171819509`, confirmed via a real `wamid.` id, lead moved to `FOLLOWUP_2_SENT` then `COMPLETED` (final DB state `COMPLETED`, per this step's interpretive decision above).

`rm -rf dist && npm run build` — 0 errors. `rm -rf dist && npm test` — 30/30 passing, unchanged (no new pure-logic function; this step is Prisma/Meta-touching orchestration, verified above per `docs/rules/testing.md`, not a new `vitest` file).

**Known limitation — carried forward, not fixed in M5 (flagged during review, deliberately not closed):**

`sendFollowup()` in `followup.service.ts` calls Meta *before* writing the lead's status/due-date advance (`sendTemplateMessage()` → `createOutboundTemplateMessage()` → `markLeadFollowup1Sent`/`markLeadFollowup2Sent`+`markLeadCompleted`, in that order). **If the process crashes or is killed between the Meta call succeeding and that status write landing, the lead is left exactly as it was before the send** (still `CONTACTED`/`FOLLOWUP_1_SENT`, due-date still in the past) — indistinguishable from "never attempted." The next scheduler tick will pick it up and send it again for real. This is a genuine duplicate-send risk, not just a theoretical one.

`node-cron`'s `noOverlap: true` does **not** close this gap — it only prevents two cron *fires* from running concurrently in time. It does nothing for a crash that happens between two separate, non-overlapping runs, which is exactly the scenario above. Check 4's verification above confirms the weaker, correct claim only: no double-send across two clean, non-overlapping runs with no crash in between. Crash-recovery between a successful Meta call and the status write landing is **not tested and not guaranteed** — this was previously reported as "idempotency confirmed" without that caveat, which overstated what was actually verified; corrected here.

**Why not fixed now**: closing this properly needs a claim/lock mechanism (e.g. writing an intermediate "sending" state or claiming the lead *before* calling Meta) — that requires a schema change (`docs/architecture/04-database-design.md` must be updated first, per `docs/rules/database.md`) plus its own failure-mode handling (what happens if the claim write itself fails, or a claimed-but-never-resolved lead needs manual recovery). At this project's actual scale (~150 leads/day, one possible duplicate WhatsApp message in a rare crash-timing scenario), that cost is disproportionate to the risk. Flagging this for `04-database-design.md`'s later consideration if load or reliability requirements change — not addressing it before then.

---

## Step 4 — End-to-End Automation Verification

**Objective**
Confirm the full sequence works together: initial send → wait/simulate delay → Follow-up #1 → simulate delay → Follow-up #2 → COMPLETED, and separately, initial send → human reply → sequence stops; initial send → auto-reply → sequence continues.

**Scope**
Verification only, using short artificial delays (e.g. seconds/minutes, not real hours) for practical testing — real `followup1_delay_hours`/`followup2_delay_hours` values are for production, not for verifying the mechanism works.

**Acceptance Criteria**
Matches M5's stated acceptance in `01-mvp-plan.md`, confirmed via direct DB inspection at each stage transition, not just a final-state check.

**Result**
To be filled in during implementation.

---

## Milestone Checklist

- [x] Step 0 — Inspect Current Webhook and Conversation State
- [x] Step 1 — Conversation Creation and Auto-Reply Detection
- [x] Step 2 — Stop-on-Human-Reply Logic
- [x] Step 3 — Scheduler and Follow-up Send Logic
- [ ] Step 4 — End-to-End Automation Verification
