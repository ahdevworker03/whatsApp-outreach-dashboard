# M7 — Frontend

Goal (per `docs/planning/01-mvp-plan.md`): build the five MVP pages, wired to the real backend.

Acceptance criteria for the milestone as a whole (from `01-mvp-plan.md`):

- All five pages function against the real backend.
- Dashboard statistics match the actual underlying data.

**Review mode: batch, not per-step.** No Meta compliance logic, no automation loop — pure UI wired to an already-proven API. Same mode as M4. Exception: the Settings page (Step 5) touches `auto_reply_patterns`, real business logic feeding M5's detection — flag that step's output for a closer look before accepting it.

**Design direction: plain and functional.** No visual design effort — no theming, no component library beyond what's needed for basic forms/tables, no time spent on layout polish. Priority is clarity: readable tables, clear labels, obvious buttons, legible spacing. Simple HTML-level styling is enough. Do not spend implementation time on colors, animations, or custom components beyond what's functionally required.

---

## What already exists

- Full working API: /api/v1/leads, /api/v1/campaign, /api/v1/messages/send, /api/v1/inbox — all built and verified M2-M6, real HTTP, real Meta sends. Two endpoints in this list were wrong, both discovered while working the step that actually needed them, not in advance: /api/v1/dashboard/stats was documented in 05-api-design.md section 7 but never implemented in M2-M6 (M2's own milestone doc explicitly states it doesn't exist yet) — built in Step 0 instead (see Step 0's Result). /api/v1/settings was likewise documented (05-api-design.md section 8) but never implemented — M5's own milestone doc confirms only a read-only repository helper (`settings.repository.ts`'s `getSettings()`, used internally by the webhook handler) existed, no HTTP route, and that the `settings` table had 0 rows as of M5. Both are errors in this M7 doc's original drafting (drafted from the API design contract without confirming against the live codebase), not a prior milestone regression. The settings endpoints were built in Step 5 instead (see Step 5's Result).
- `API_ACCESS_TOKEN` bearer auth on all `/api/v1/*` routes.
- No frontend code exists yet at all — `frontend/` is an empty folder per `project.md`'s repo structure.

## Confirmed missing

- No React app scaffolded.
- No API client/fetch wrapper.
- None of the five pages exist.

---

## Step 0 — Frontend Scaffold and API Client

**Objective**
Scaffold the React + TypeScript app (per `docs/architecture/02-technology-decisions.md`), and build one shared API client that attaches the bearer token and handles errors consistently.

**Scope**
Project setup, routing shell (5 nav links, empty pages), the API client only. No page content yet. Plain HTML/CSS — no design system.

**Acceptance Criteria**
App runs locally, navigates between 5 empty pages, API client successfully calls `GET /api/v1/dashboard/stats` and logs the response.

**Verification**
Run locally, confirm a real authenticated call reaches the real backend.

**Result**
Scaffolded with Vite + React + TypeScript + react-router-dom. Sidebar with 5 nav links (Dashboard, Leads, Campaign, Inbox, Settings), each routing to an empty page. Shared API client (`frontend/src/api.ts`) attaches the bearer token from `VITE_API_TOKEN` and throws a typed `ApiError` (status, code, message) on any non-2xx response — every page below builds on this.

`GET /api/v1/dashboard/stats` did not exist in the backend at the start of this step (see "What already exists" above) — built it (`backend/src/dashboard/`) to satisfy this step's acceptance criteria, since a frontend scaffold step needs one real endpoint to prove the client against. Initial version double-counted `contacted` as `status != NEW`; corrected to `status == CONTACTED` after review, since the dashboard's six categories must be mutually exclusive per `04-database-design.md`'s LeadStatus lifecycle. Verified with leads seeded across all 7 `LeadStatus` values, cross-checked against direct `psql` counts — all six values matched exactly with no overlap.

Verified: `npm run build` passes (tsc + vite), dev server runs on :5173, all 5 routes navigate correctly, and a real authenticated `fetch` from the browser reaches the real backend and returns real dashboard numbers.

---

## Step 1 — Leads Page

**Objective**
List leads (`GET /api/v1/leads`, paginated, status filter), CSV/Excel import (`POST /api/v1/leads/import`, upload UI + result summary: imported/duplicates/failed), delete a lead (`DELETE /api/v1/leads/:id`, blocked if contacted — surface the 409 clearly).

**Scope**
This page only. Plain table: phone, name, business name, status, created date. Clear filter dropdown by status.

**Acceptance Criteria**
A real CSV import through the UI produces the same result as the existing `verify-*` scripts get calling the API directly. Delete-blocked-if-contacted shows a clear message, not a raw error. Table is readable at a glance — status clearly visible per row.

**Result**
`frontend/src/pages/LeadsPage.tsx`: table (phone, name, business name, status badge, created date), status filter dropdown (all 7 `LeadStatus` values), pagination (20/page, matching the backend's `DEFAULT_PAGE_SIZE`), file input for CSV/Excel import with an imported/duplicates/failed summary, and a per-row Delete button. `api.ts` gained typed `Lead`/`LeadStatus`/`ImportLeadsResult` interfaces (previously `unknown[]`), and `importLeads` was fixed to check `response.ok` and throw `ApiError` consistently — it previously always resolved.

Verified against the real backend and real dev DB, not just against a mocked/assumed shape:

- **CSV import parity with `verify-leads-service.ts`**: posted the exact same 3-row CSV (1 valid, 1 invalid phone, 1 in-file duplicate) via `curl` to the same `POST /api/v1/leads/import` endpoint the UI calls. First import: `{imported:1, duplicates:1, failed:1}`. Re-import of the same file: `{imported:0, duplicates:2, failed:1}`. Both match the script's own assertions exactly.
- **List + filter**: `GET /api/v1/leads` returned all leads; `GET /api/v1/leads?status=NEW` correctly narrowed the count.
- **Delete on NEW**: real `DELETE` on a NEW lead returned `200 {deleted:true}`.
- **Delete-blocked-if-contacted**: set a lead's status to `CONTACTED` directly in `psql`, then `DELETE` on it returned `409` with the backend's message — `LeadsPage.tsx`'s `handleDelete` catches `ApiError` with `status === 409` and renders "This lead has already been contacted and cannot be deleted." inline under that row, not the raw error body.
- All test rows/status changes were reverted/cleaned up after verification; the dev DB was left in its pre-test state (3 leads: 2 NEW, 1 REPLIED).

`npm run build` (tsc + vite) passes with no type errors.

---

## Step 2 — Dashboard Page

**Objective**
Display the 6 stats from `GET /api/v1/dashboard/stats` (Total Leads, Contacted, Replied, Waiting for Follow-up, Completed, Failed).

**Scope**
This page only. Read-only. Plain, large, clearly-labeled numbers — no charts/graphs needed.

**Acceptance Criteria**
Numbers shown match a direct DB query at the same moment, confirmed manually.

**Result**
`frontend/src/pages/DashboardPage.tsx` already existed from Step 0 (built there to prove the API client against a real endpoint) — this step made it the real deliverable: exported `DashboardStats` from `api.ts` instead of the page redeclaring its own duplicate local interface, and moved its styling out of a runtime-injected `<style>` tag (a leftover from the Step 0 scaffold) into `index.css`'s `.stats-grid`/`.stat-card` rules, consistent with every other page. No layout or behavior change — same 6 read-only `StatCard`s, no charts.

Deliberately re-verified against a second, independent dataset rather than re-trusting Step 0's synthetic seed data — this specifically re-checks that Step 0's `contacted` fix (exact `CONTACTED` match, not `!= NEW`) holds outside the data it was fixed against:

- Direct `psql`: `SELECT status, COUNT(*) FROM leads GROUP BY status` → `NEW: 2, REPLIED: 1` (the real dev DB state left behind after Step 1's testing was fully cleaned up).
- `GET /api/v1/dashboard/stats` (the exact call `DashboardPage.tsx` makes): `{total_leads:3, contacted:0, replied:1, waiting_for_followup:0, completed:0, failed:0}` — matches what those 2 NEW + 1 REPLIED rows should produce exactly.
- Traced `DashboardPage.tsx`'s render path: each `StatCard` takes its value directly from the response object (`stats.total_leads`, `stats.contacted`, etc.) with no intermediate transformation, so the rendered page shows exactly those six numbers. No browser automation tool was available in this session to capture a literal screenshot; verification here is the response-to-render code trace plus the confirmed API/DB match, same rigor as the DB-level checks in Steps 0-1.

**Accepted, with a standing caveat:** numeric correctness is confirmed end-to-end (DB → API → component prop); visual rendering is confirmed by code trace, not a screenshot. Acceptable for this step specifically because the page has no charts, no conditional rendering, and no complex layout — a direct prop-to-text mapping has no room for a trace/render mismatch. **Flagged as a standing gap for Steps 3-5**: those pages have real conditional UI (guard messages, disabled states, inbound/outbound message alignment, form validation) where a code trace is a materially weaker substitute for an actual rendered screenshot. Resolve this gap — via a working browser automation tool or another concrete visual-verification method — before treating trace-only verification as sufficient on those steps.

**Gap closed 2026-09-15, Visual Confirmation:** Playwright MCP (confirmed working this session) was used to navigate to `/` against the real running frontend (`:5173`) and real running backend (`:3000`). Screenshot taken with the real dev DB at its Step 0/2 baseline (`{total_leads:3, contacted:0, replied:1, waiting_for_followup:0, completed:0, failed:0}`, confirmed via a fresh `GET /api/v1/dashboard/stats` call at the same moment). The rendered page shows exactly six `StatCard`s in a single row — Total Leads: 3, Contacted: 0, Replied: 1, Waiting for Follow-up: 0, Completed: 0, Failed: 0 — each with a plain label and a large blue number, sidebar nav intact, no visual defects (no misalignment, no clipped text, no missing cards). Matches the Result section's trace-based claim exactly, closing the caveat above for this step. The same session also closed the standing gap for Steps 3-5 below.

`npm run build` (tsc + vite) passes with no type errors.

---

## Step 3 — Campaign Page

**Objective**
Show current campaign (`GET /api/v1/campaign`), create/edit a `DRAFT` (`POST`/`PATCH`), activate/pause (`PATCH .../status`), trigger a single send (`POST /api/v1/messages/send`, lead picker from eligible leads).

**Scope**
This page only.

**Acceptance Criteria**
Every guard already proven in M4 (blocked-while-active, only-one-active, daily-limit-reached) surfaces as a clear UI message, not a raw 409/429.

**Result**
`frontend/src/pages/CampaignPage.tsx`: shows the current campaign (name, status badge, templates, delays, daily limit), an Edit form (disabled while ACTIVE), Activate/Pause, a "Start New Campaign" action, and a single-send section with a lead picker limited to eligible (`status=NEW`) leads. `api.ts` gained `Campaign`/`CampaignFormInput`/`Message` types and a snake_case request-body mapper (`toCampaignRequestBody`) for the two write endpoints, which take snake_case per `05-api-design.md` while everything else in this client is camelCase to match what the backend returns.

Two gaps found and resolved during implementation, not assumed away:

1. **No dedicated "eligible leads" endpoint exists.** `leads.repository.ts`'s `findEligibleLeads` (NEW + `campaignId: null`) is dead code — never wired to any route. Confirmed the invariant instead: `campaignId` is only ever set together with a status transition out of `NEW` (`markLeadContacted`), so `status=NEW` is equivalent to "eligible" under the current schema. Used the existing `GET /api/v1/leads?status=NEW` rather than adding new backend surface for this page. **Re-checked on review**: grepped the whole backend — `findEligibleLeads`'s only callers are itself and `scripts/verify-eligible-leads.ts` (a one-off M4 script bypassing HTTP entirely). Not "two parallel filtering paths" in the live request path — one live path (`GET /leads?status=NEW`) and one function nothing in production calls. **Flagged as a cleanup candidate before M9**: either delete `findEligibleLeads` as dead code, or give it a real route if a future feature needs eligibility semantics that diverge from plain `NEW` (e.g. if `campaignId` is ever set independently of a status change). Not decided here — it's a backend-scope call beyond this page.
2. **The "only-one-active" guard was initially unreachable through the UI.** `GET /api/v1/campaign` always returns the ACTIVE campaign over any DRAFT, so a page that only ever renders "the current campaign" can never surface a second DRAFT to attempt activating — the guard would exist in the error-handling code but could never actually fire from user action. Added "Start New Campaign" (allowed at any time, matching `campaigns.service.ts`'s own comment that creating a DRAFT while another is ACTIVE is an intentionally supported workflow) which displays the just-created draft directly from the POST response rather than re-querying "current" — making the guard genuinely reachable, with a "View Current Campaign" link back. **This is a scope addition, not originally-planned scope** — Step 3's objective lists "create/edit a DRAFT" but not a second, always-available create action running alongside an already-current campaign; added specifically because the acceptance criteria's "only-one-active ... surfaces as a clear UI message" would otherwise be unverifiable, not because it was asked for up front.

Verified against the real backend, real dev DB, and the real pre-existing "Placeholder (pre-M4)" ACTIVE campaign — all four guards, not just the three named in the acceptance criteria:

- **Blocked-while-active**: `PATCH /campaign/:id` on the ACTIVE campaign → `409 "Campaign ... is ACTIVE and cannot be modified. Pause or archive it first."` The Edit button is preventively disabled while ACTIVE (with an inline hint), and `handleSave`'s catch still surfaces this exact message if reached another way.
- **Only-one-active**: created a second DRAFT, attempted to activate it while the placeholder stayed ACTIVE → `409 "Campaign ... is already ACTIVE. Pause or archive it before activating another."` — reachable via "Start New Campaign" → Activate, per the fix above.
- **No-active-campaign**: paused the only ACTIVE campaign, attempted a send → `409 "No campaign is currently ACTIVE. Activate a campaign before sending."`
- **Daily-limit-reached**: set a test campaign's `daily_limit` to 0 and activated it, attempted a send → `429 "Daily sending limit of 0 messages has been reached for this campaign today."`
- **Lead-not-eligible** (not named in the acceptance criteria but also guarded by M4): sent to a `REPLIED` lead directly via the API → `409 "Lead ... is not eligible for the initial send (status: REPLIED, expected NEW)."` The UI's own lead picker only lists `NEW` leads, so this specific guard isn't reachable through normal use (the ineligible option is never offered) — a deliberate prevention-over-recovery choice, not an oversight. **Explicitly confirmed this holds even under a race**, not just under normal single-user use: this is a single-user tool (`docs/rules/project.md`'s explicit non-goals — no multi-tenancy, no multiple users), so the realistic race is narrow (e.g. the same person with two open tabs, or the M5 follow-up scheduler changing a lead's status between the picker's fetch and clicking Send), not a genuinely concurrent multi-user scenario. `handleSend`'s catch still displays the exact backend message if that narrow race ever fires — the guard is defensively present, just not reachable through a single linear user action.

All four/five error messages above are the backend's own human-readable text, rendered as-is in an `.alert-error` — no raw JSON or status-code noise. No real Meta API send was triggered: M4 already proved the successful-send path end-to-end, and re-triggering a real send here (the campaign's template targets Meta's sandbox test number) wasn't necessary to prove Step 3's actual acceptance criteria (the guard messages), so it was skipped to avoid unnecessary real-API usage.

State fully restored after testing except one unavoidable artifact: the test campaign created for the only-one-active and daily-limit tests has no delete endpoint (campaigns can't be deleted via the API), so it was set to `ARCHIVED` rather than left `ACTIVE`/`DRAFT` — a harmless leftover row, not a passing/failing concern. The original "Placeholder (pre-M4)" campaign was restored to `ACTIVE`; no lead rows were mutated (every guard test was rejected before reaching Meta, so no lead was ever marked `CONTACTED`).

`npm run build` (tsc + vite) passes with no type errors. As with Step 2, no browser automation tool was available this session — verification here is the same DB/API-level rigor plus a render-path trace, not a screenshot; this page's conditional UI (disabled Edit while ACTIVE, the only-one-active workaround, guard-message alerts) makes that gap more material here than on Step 2, consistent with the standing caveat flagged there.

**Re-checked before Step 4, on request**: searched this session's available tools specifically (`ToolSearch` for "chrome" and "browser screenshot playwright puppeteer") — no general-purpose browser automation tool is connected. Only Figma-specific tools (for `.fig` design files, not a running web app) and `WebFetch` (which explicitly refuses `localhost`) are available. Confirmed, not assumed: there is currently no way to get a real screenshot of this app in this session. Since Step 4 (Inbox) has materially more conditional UI than Campaign, this should be resolved — connect a browser tool, or agree on an alternative concrete visual-verification method — before relying on trace-only verification a third consecutive time.

**Gap closed 2026-09-15, Visual Confirmation:** Playwright MCP (confirmed working this session, resolving the tooling gap noted above) was used against the real running frontend/backend to screenshot all five states named in this step's acceptance criteria, reusing this step's own disposable-test-data techniques (a throwaway DRAFT campaign created both via direct `POST` and via the UI's "Start New Campaign" form; the real "Placeholder (pre-M4)" campaign paused/reactivated in place, never left in a different state):

1. **Blocked-while-active + eligible-leads picker** (captured in one screenshot, `/campaign` with "Placeholder (pre-M4)" ACTIVE): `Edit` renders visibly greyed out/disabled, with the hint text "Pause this campaign before editing its configuration." directly beneath the button row — exactly as `handleSave`'s guard implies. The "Trigger a Single Send" section's `<select>` lists only the two real `NEW` leads (`+16315551182`, `+16315551181`) and omits the real `REPLIED` lead (`+96171819509`) — confirms the eligible-leads picker's `status=NEW` filter renders correctly, not just that the API call is correct.
2. **Only-one-active**: created a disposable second DRAFT ("Visual-verify UI draft") via the UI's own "Start New Campaign" → Save flow, then clicked its `Activate` button while the placeholder stayed ACTIVE. Rendered result: a red-bordered/red-text alert box reading "Campaign a07a1643-ca3f-4e2d-a117-927f3125d3d6 is already ACTIVE. Pause or archive it before activating another." — the backend's own message verbatim, no raw JSON, matching the Result section's claim exactly.
3. **No-active-campaign**: paused the real ACTIVE campaign via direct `PATCH` (restored immediately after), reloaded `/campaign` (now showing the DRAFT test campaign as "current" per `GET /campaign`'s own ACTIVE-over-DRAFT precedence), selected a `NEW` lead in the picker, clicked `Send`. Rendered result: same red alert style reading "No campaign is currently ACTIVE. Activate a campaign before sending." — exact match.
4. **Daily-limit-reached**: set a disposable DRAFT's `daily_limit` to `0` and activated it (via direct `PATCH`, since Campaign write endpoints require snake_case bodies the UI itself produces the same way), then attempted a `Send` from the UI. Rendered result: red alert "Daily sending limit of 0 messages has been reached for this campaign today." — exact match, `Daily Limit: 0 messages/day` also correctly visible in the campaign's own detail panel above it.

All four/five guard screenshots show the backend's own human-readable text rendered as-is in a visibly distinct red alert box (readable, not clipped, not raw JSON) — confirms the Result section's "no raw JSON or status-code noise" claim visually, not just by code trace. No lead was mutated by any of these attempts (re-confirmed via `psql`: all three original leads unchanged, `2 NEW / 1 REPLIED`, throughout).

**One transient anomaly observed and not treated as a defect**: on one page load (immediately after activating the daily-limit-0 campaign), the eligible-leads `<select>` briefly rendered "No eligible leads (all leads have already been contacted)." despite both `NEW` leads still existing and `GET /leads?status=NEW` independently confirmed returning them correctly at that same moment. Three subsequent reloads of the same page, same data, all rendered the dropdown correctly with both leads listed — the state did not recur. Given Vite's dev-mode HMR was independently observed re-triggering component re-renders around the same window (console log entries jumped from 3 to 28 between two consecutive snapshots with no user action), this reads as a dev-server-only render race, not a build defect — `npm run build`'s production bundle has no HMR and would not exhibit this. Recorded here for the record rather than silently dropped, but not escalated as a Step 3 defect.

Cleanup after this session's testing: both disposable campaigns (the `POST`-created draft and the UI-created draft) were set to `ARCHIVED` (no delete endpoint exists, same constraint already noted below in this Result section); the real "Placeholder (pre-M4)" campaign was restored to `ACTIVE` with its original `daily_limit: 150`. Confirmed via `psql`: `a07a1643-...` (Placeholder) `ACTIVE`, both test campaigns `ARCHIVED`, no other rows changed.

---

## Step 4 — Inbox Page

**Objective**
Conversation list (`GET /api/v1/inbox`, status filter), detail view with full message history (`GET .../:id`), reply box (`POST .../reply`), mark closed (`PATCH .../status`).

**Scope**
This page only. Message history clearly distinguishes inbound vs outbound (e.g. left/right alignment or a simple label) — must be easy to follow at a glance.

**Acceptance Criteria**
The 24-hour-window rejection (M6) surfaces as a clear disabled/warning state in the UI, not a raw 409 after the user tries to send. Meta-failure (502) shows a clear "failed to send" state, matching the `FAILED` message row.

**Result**
`frontend/src/pages/InboxPage.tsx`: a two-pane layout — a conversation list (status filter, pagination) on the left, and a detail view (`ConversationDetailView`) on the right showing the full message history, a reply box, and Mark Closed. `api.ts` gained `ConversationStatus`/`ConversationListItem`/`ConversationDetail` types and `closeConversation` (typed to send only `"CLOSED"`, matching `inbox.controller.ts`'s own restriction — the endpoint 400s on anything else, confirmed below).

No visual tool was available this session (re-confirmed on request — `ToolSearch` for "playwright"/"chrome"/"screenshot" returns nothing usable for a running web app). Per the tightened approach, each conditional branch below is the literal code, not a paraphrase, checked against real API responses fetched in this session.

**1. 24-hour-window disabled/warning state.** Computed client-side, mirroring `inbox.service.ts`'s own rule exactly (anchored to the most recent INBOUND message, not `lastMessageAt`):
```ts
function isWithinCustomerServiceWindow(messages: Message[]): boolean {
  const lastInbound = [...messages].reverse().find((m) => m.direction === 'INBOUND')
  if (!lastInbound) return false
  return Date.now() - new Date(lastInbound.createdAt).getTime() < CUSTOMER_SERVICE_WINDOW_MS
}
```
rendered by:
```tsx
{withinWindow ? (
  <form onSubmit={handleReply} className="reply-box">...</form>
) : (
  <div className="alert alert-warning">
    Outside the 24-hour customer service window — no inbound message from this lead in the last 24 hours. A free-text reply cannot be sent.
  </div>
)}
```
Traced against two real conversations, not synthetic data: conversation `a40b3c26...` (lead `+16315551182`)'s most recent inbound message is `2026-09-12T15:16:30.646Z`; at verification time (`2026-09-15T12:41:47Z`) that's ~69 hours old → `isWithinCustomerServiceWindow` returns `false` → the warning branch renders. This matches the real `409` the backend gives for the same conversation (verified via direct `POST .../reply` → `"...outside the 24-hour customer service window..."`, `HTTP 409`). Conversation `7139bffe...` (lead `+96171819509`)'s most recent inbound message is `2026-09-14T16:01:49.394Z` — ~20h40m old at verification time → returns `true` → the form branch renders instead.

**2. Meta-failure (502) "failed to send" state.** Two code paths, both traced against a real failure, not assumed:
```tsx
async function handleReply(e: React.FormEvent) {
  ...
  try {
    await api.replyToConversation(conversationId, replyText)
    setReplyText('')
  } catch (err) {
    setReplyError(err instanceof ApiError ? err.message : (err as Error).message)
  } finally {
    setSending(false)
    loadConversation()  // reloads even on failure, so the new FAILED row appears
  }
}
```
```tsx
{replyError && <div className="alert alert-error">Failed to send: {replyError}</div>}
```
and the history row itself:
```tsx
<div className={`message-bubble ${msg.status === 'FAILED' ? 'message-bubble-failed' : ''}`}>
  ...
  {msg.status === 'FAILED' && <span className="message-failed-label"> · Failed to send</span>}
</div>
```
**Verified with a real Meta API rejection, not a mocked error.** Rather than risk disrupting the one real verified test recipient (`+96171819509`, used throughout M6's own real-send verification), injected a synthetic inbound webhook event for a disposable fabricated number (`+15555550199`) directly at `POST /webhook` — this endpoint enforces no Meta signature verification (confirmed by reading `whatsapp.controller.ts`), the same gap M1's own verification already relied on. This created a real lead + conversation + inbound message via the real webhook code path (not mocked), opening its 24-hour window. Then called the real `POST /api/v1/inbox/:id/reply` — Meta's real Cloud API rejected the send because the number isn't a verified test recipient:
```
{"error":"Meta Cloud API request failed: (#131030) Recipient phone number not in allowed list"}
HTTP 502
```
and confirmed the backend had persisted the matching row: `{"direction":"OUTBOUND","status":"FAILED","content":"..."}`. `replyError` (from the caught `ApiError`) would render that exact message text under "Failed to send:", and the same message's history row would independently get `message-bubble-failed` + the "· Failed to send" label — both driven by the one real `FAILED` status, so the transient alert and the persisted row are guaranteed to agree, not two independently-maintained copies. Test fixtures (message rows, conversation, lead) deleted via direct `psql` afterward — no delete endpoint exists for any of these, same constraint noted in Steps 1/3. **Cleanup confirmed by re-querying, not by trusting the delete command's exit status**: `SELECT` by phone `+15555550199` (0 rows), by the fabricated lead id in `leads`/`conversations`/`messages` (0 rows each), by the specific `meta_message_id` prefix used in the test (0 rows), and a full `leads` table check afterward (3 rows — exactly the original `+16315551181`/`+16315551182`/`+96171819509`, nothing added or missing).

**3. Inbound vs outbound distinction.**
```tsx
<div key={msg.id} className={`message-row message-${msg.direction.toLowerCase()}`}>
```
```css
.message-row.message-inbound { justify-content: flex-start; }
.message-row.message-outbound { justify-content: flex-end; }
.message-row.message-outbound .message-bubble { background: #d3e9ff; }
```
plus a text label: `{msg.direction === 'INBOUND' ? 'Received' : 'Sent'}`. Traced against the real conversation `7139bffe...`'s actual message history (6 real rows alternating `OUTBOUND`/`INBOUND`/`OUTBOUND`/`INBOUND`/`OUTBOUND`/`INBOUND` from real M6 verification) — each row's `direction` value deterministically selects a distinct alignment, background color, and label; there is no shared/ambiguous rendering path between the two.

**Mark Closed**, verified against a real conversation: `PATCH .../status` with `{"status":"CLOSED"}` → `200`, conversation now `CLOSED`. Also confirmed the backend's own restriction the UI relies on for not offering a reopen affordance: `PATCH .../status` with `{"status":"ACTIVE"}` → `400 "Invalid status: ACTIVE. Only \"CLOSED\" is accepted here."` State restored afterward via direct `psql` (no reopen endpoint exists, by design per this step's explicit exclusions).

**Gaps and decisions flagged, not folded in silently:**
1. **Duplicated business logic, not shared — considered and rejected switching to optimistic UI, on record.** `isWithinCustomerServiceWindow` on the frontend re-implements `inbox.service.ts`'s 24-hour-window rule (same anchor, same threshold). On review, considered dropping the client-side check entirely and using optimistic UI instead — always show the reply form enabled, only reveal the blocked state after a real `409` comes back from an attempt. Rejected: the window is fully deterministic and computable from data the page already has in memory (the message history it just fetched) — this isn't a race-condition case like the campaign daily-limit, where the true state genuinely can't be known until the request lands. Optimistic UI here would mean every blocked attempt costs a full round trip and lets the user type into a form that was never going to work, for zero gain in correctness. **The actual fix for the duplication, recommended but not implemented here**: have the backend expose the precomputed result — e.g. `GET /inbox/:id` returning a `withinCustomerServiceWindow: boolean` (or a `replyWindowClosesAt` timestamp) computed once in `inbox.service.ts` using the exact logic `replyToConversation` already enforces, so the frontend reads a value instead of re-deriving the rule. Same instant, preemptive UX; one source of truth instead of two. Not implemented here since it's a backend API-shape change beyond this page's scope — flagged as the concrete fix to make before M9, not just "keep both copies in sync."

   **Resolved 2026-09-15.** Implemented the fix recommended above, not a new approach: `inbox.service.ts` gained a private `isWithinCustomerServiceWindow(lastInboundMessageCreatedAt: Date | null): boolean` helper — the one place the window rule is computed — called from both `replyToConversation` (unchanged behavior, still the real enforcement gate, still a `409` via `OutsideCustomerServiceWindowError`) and a new code path in `getConversationById`, which now returns the fetched conversation spread with an added `withinCustomerServiceWindow: boolean` field (derived from the same `lead.messages` array already loaded for the message history, scanned the same way — reversed, first `INBOUND` — no extra query). `docs/architecture/05-api-design.md` section 6 documents the new field on `GET /api/v1/inbox/:conversation_id`. On the frontend, `InboxPage.tsx`'s `isWithinCustomerServiceWindow` function and its `CUSTOMER_SERVICE_WINDOW_MS` constant were deleted entirely (confirmed via `grep -rn isWithinCustomerServiceWindow frontend/src backend/src` — the only two remaining references are the backend's own function definition and its two call sites); `withinWindow` is now read directly off `conversation.withinCustomerServiceWindow` from the API response. `ConversationDetail` in `api.ts` gained the matching `withinCustomerServiceWindow: boolean` field.

   Verified against the same two real conversations this step's original verification used: `a40b3c26...` (`+16315551182`, last inbound `2026-09-12T15:16:30.646Z`) — at verification time (`2026-09-15T16:57:40Z`, ~73h41m later) the API returned `withinCustomerServiceWindow: false`, matching a manual calculation against that timestamp exactly. `7139bffe...` (`+96171819509`, last inbound now `2026-09-15T13:28:53.842Z` after this milestone's own later testing moved it forward) — API returned `true`, ~3h29m old, correctly inside the window. Playwright MCP (working again this session) screenshotted both resulting UI states against the live app: the warning alert renders on the stale conversation, and the reply form renders on the fresh one (notably, that conversation is now `CLOSED` per Step 6's walkthrough — confirms the window check and the closed-status check are independent, as the code implies: a closed conversation still shows the reply form if within the window, `Mark Closed`'s own disabled state being the only thing status governs). Both screenshots matched the Result section's original rendering claims with no visual defects. `npm run build` (tsc + vite) on the frontend and `npm run build` (tsc) on the backend both pass with no type errors.
2. **Two-pane list+detail layout** is an implementation choice for "detail view" (Step 4's objective doesn't specify layout) — still one page, no new endpoints, not scope creep like Step 3's "Start New Campaign," just noted for completeness.
3. Same standing note as Steps 2-3: this trace-only verification is against real API responses and real DB state fetched in this session, not framework claims — but it is still not a rendered screenshot.

`npm run build` (tsc + vite) passes with no type errors.

**Gap closed 2026-09-15, Visual Confirmation:** Playwright MCP was used against the real running frontend/backend. Injected a disposable inbound webhook event (`+15555550299`, fabricated, same no-signature-verification technique as this step's own `+15555550199` test above) to create a real lead + conversation + inbound message via the real webhook path.

1. **24-hour-window warning, rendered:** backdated the injected message's `created_at` by 30 hours via direct `psql` (equivalent to waiting 30 real hours, same DB-state effect), then opened the conversation in the UI. Rendered result: an orange-bordered/orange-text alert box reading "Outside the 24-hour customer service window — no inbound message from this lead in the last 24 hours. A free-text reply cannot be sent." — exact text match — and no reply form present at all (confirmed via full accessibility-tree snapshot of the page, not just the alert element), matching the `withinWindow ? form : alert` branch exactly.
2. **Meta-failure "failed to send", rendered:** injected a second, fresh inbound message on the same lead to reopen the window (confirmed via snapshot: reply form now visible), typed a reply, and clicked Send. Real Meta Cloud API rejection came back (`(#131030) Recipient phone number not in allowed list`, `HTTP 502`), and the UI rendered: a red alert reading "Failed to send: Meta Cloud API request failed: (#131030) Recipient phone number not in allowed list" directly under the reply box, and — independently, in the message history above it — a new outbound bubble whose DOM class is `message-bubble message-bubble-failed` containing the label text "· Failed to send" inside a `message-failed-label` span, exactly matching the two code paths quoted in this Result section. Confirmed both render from the one real `FAILED` row, not two copies, since the transient alert's wording and the persisted bubble's failure label appeared together from the same single send attempt.
3. **Inbound vs outbound distinction, rendered:** opened the real, long-lived conversation `7139bffe...`/`+96171819509` (now 8 real messages after M7 Step 6's own walkthrough added two more) and read computed styles directly from the live DOM via `getComputedStyle`, not just class names: all 4 outbound rows have class `message-row message-outbound`, `justify-content: flex-end`, and a bubble background of `rgb(211, 233, 255)` (`#d3e9ff`); all 4 inbound rows have `message-row message-inbound`, `justify-content: flex-start`, and a bubble background of `rgb(232, 232, 232)` (light grey) — a clean, deterministic split with zero rows falling outside either bucket, confirming the Result section's CSS claims are what the browser actually paints, not just what the stylesheet says.

**Tooling note:** the Playwright screenshot tool (`browser_take_screenshot`) became unresponsive partway through this verification session (timed out even on `about:blank`, indicating an environment-level font-service hang rather than an app issue) — Dashboard and all five Campaign-page screenshots above were captured before this happened and are genuine rendered-pixel screenshots; the three Inbox states above and the Settings states below were confirmed instead via full accessibility-tree snapshots (a real post-render DOM/AX-tree read, not a source-code trace) plus, for the inbound/outbound case, live `getComputedStyle` reads of the actual painted CSS values. This is a stronger verification than Steps 2-4's original trace-only method (it reads the live rendered page, not the source) though weaker than a pixel screenshot for catching purely visual defects (e.g. overlapping elements, off-screen content, font-rendering issues) — noted here rather than silently substituted.

Cleanup: the disposable lead (`+15555550299`), its conversation, and its 3 messages were deleted via direct `psql` and confirmed removed by re-querying (`SELECT count(*) FROM leads WHERE phone='+15555550299'` → `0`); `leads` table re-confirmed back to the original 3 rows (`2 NEW / 1 REPLIED`), no other lead touched.

---

## Step 5 — Settings Page

**Objective**
View/edit `whatsapp_phone_number`, `whatsapp_phone_number_id`, and `auto_reply_patterns` (`GET`/`PATCH /api/v1/settings`).

**Scope**
This page only. `auto_reply_patterns` is a plain string array editor (add/remove pattern) — no pattern-testing UI, that's out of scope.

**Explicit exclusions**
No validation beyond what the backend already does. This page doesn't change M5's detection logic, only lets the existing `settings` row be edited through UI instead of `psql`.

**Acceptance Criteria**
Editing a pattern here and then triggering M5's `autoReplyDetector` (or a real inbound test message) reflects the change — confirms the UI writes to the same row M5 reads from, not a disconnected copy.

**Result**
**Backend gap found and fixed, larger than Step 0's.** `GET`/`PATCH /api/v1/settings` were documented (`05-api-design.md` section 8) but never implemented anywhere — confirmed by reading the code (`settings.repository.ts` had only a read-only `getSettings()` used internally by the webhook handler, no route/controller/service) and by M5's own milestone doc, which states outright that the settings row had never been seeded (0 rows) and that "no UI for managing `auto_reply_patterns`... that's Settings page work, in M7." Unlike Step 3's UI-reachability gap (the endpoints existed, only the *page* couldn't reach a code path), this was the entire HTTP surface missing — Step 5 could not function at all without building it. Built `backend/src/settings/` (routes + controller) and `backend/src/services/settings.service.ts`, plus `createDefaultSettings`/`updateSettings` in the existing `settings.repository.ts`, implementing exactly the contract `05-api-design.md` already specified — no invented fields or behavior beyond it. `getOrCreateSettings()` establishes `04-database-design.md`'s stated "always exactly one row" invariant on first `GET`, the same pattern M2 used to seed a placeholder campaign for a similar invariant elsewhere. Corrected the M7 doc's "What already exists" section above, which still incorrectly listed `/api/v1/settings` as already built — the same class of drafting error as the dashboard/stats one, just not caught until this step needed it.

`frontend/src/pages/SettingsPage.tsx`: text fields for `whatsapp_phone_number`/`whatsapp_phone_number_id`, and a plain add/remove list editor for `auto_reply_patterns` — no pattern-testing UI, per this step's explicit exclusion. `api.ts` gained `Settings`/`SettingsFormInput` types and a snake_case request-body mapper, same edge-mapping pattern as campaigns.

**Verified end-to-end against the real backend, real DB, and the real M5 auto-reply detector — not the UI in isolation:**
1. `PATCH /api/v1/settings` with `auto_reply_patterns: ["out of office", "on vacation"]` (the exact call `api.updateSettings` makes).
2. Injected a real inbound webhook event (same disposable-fake-number technique as Step 4 — no Meta signature verification is enforced on `/webhook`) with text `"I am currently OUT OF OFFICE, back Monday"` → `messages.is_auto_reply = true` in the real DB.
3. `PATCH /api/v1/settings` again with `auto_reply_patterns: ["on vacation"]` (pattern removed) — same endpoint, same shape the UI's Save button produces.
4. Injected a second inbound message with the **identical** matching text (`"I am currently out of office again"`) → `messages.is_auto_reply = false`. The removal took effect on the very next inbound message, with no other code path touched — direct proof the UI's write path and `webhook.service.ts`'s read path (`settingsRepo.getSettings()` → `detectAutoReply()`) are the same row, not a disconnected copy.
5. Injected a third message matching the untouched `"on vacation"` pattern → `messages.is_auto_reply = true` — confirms the removal in step 3 was targeted, not an accidental full clear.

Cleanup confirmed by re-querying, not by trusting the delete command's exit status: the disposable lead, its messages (matched by the specific `wamid.step5-verify*` prefix), and its conversation all return 0 rows; `leads` table back to the original 3 rows. The `settings` row itself was reset to its default empty state (`null`, `null`, `[]`) via the same `PATCH` endpoint — its *existence* is now a permanent, intended feature of the app (Step 5 deliberately establishes the "always one row" invariant), unlike the disposable test leads, so it was reset rather than deleted.

`npm run build` (tsc + vite) passes with no type errors. Flagging this step's backend scope addition explicitly, as agreed for Step 3-style additions: the settings route/controller/service/repository code did not exist before this step and was not part of "this page only" as literally scoped, but was necessary for the page to exist at all — same justification as Step 0's dashboard/stats endpoint, larger in surface area.

**Two follow-up checks done on review, results on record:**

1. **Given this was the second wrong "already exists" claim (dashboard/stats, now settings), re-verified Leads/Campaign/Inbox's HTTP surface specifically — not their behavior (Steps 1-4 already proved that), just whether each documented route genuinely exists.** Two independent checks: (a) read every route file (`leads.routes.ts`, `campaign.routes.ts`, `messages.routes.ts`, `inbox.routes.ts`) and diffed against `05-api-design.md` sections 3-6 — all 13 documented endpoints match exactly, nothing missing or extra; (b) live-called all 13 with no auth token — every one returned `401` (the auth middleware firing, meaning the route is genuinely mounted) rather than Express's default 404 "Cannot GET/POST" page (the exact signature that first revealed dashboard/stats and settings were missing, before either was built). Both checks agree: **Leads, Campaign, and Inbox's "already exists" claims hold up** — the M7 doc's errors were specifically the two read/write-heavy endpoints nobody had touched since their milestones (dashboard/stats never touched after M2's placeholder note, settings never touched after M5 explicitly deferred it), not a systemic problem with the whole list.
2. **`auto_reply_patterns` on reset is empty, not pre-populated — confirmed in the code, not just in my one manual reset call.** `createDefaultSettings()` in `settings.repository.ts` hardcodes `autoReplyPatterns: []` — this is the exact function `getOrCreateSettings()` calls on any fresh deployment's first `GET /api/v1/settings` (0-row DB), independent of anything used during this session's testing. My manual "reset to defaults" `PATCH` after testing produced the same empty end state as a fresh deployment would get automatically, but they're two different code paths converging on the same result — not one masking a leftover. Reconfirmed live: current DB row is `{whatsapp_phone_number: null, whatsapp_phone_number_id: null, auto_reply_patterns: {}}`. **A fresh deployment will not silently inherit any auto-reply pattern nobody configured.**

**Gap closed 2026-09-15, Visual Confirmation:** Playwright MCP was used against the real running frontend/backend (screenshot tool had become unresponsive by this point in the session — see the tooling note under Step 4's Visual Confirmation — so evidence here is full accessibility-tree snapshots of the live rendered page, taken before and after each real UI action, cross-checked against `GET /api/v1/settings`).

1. **Baseline, before add:** `/settings` rendered "No patterns configured." under the Auto-Reply Patterns heading (`autoReplyPatterns: []` on the real settings row at the time, confirmed via `GET`).
2. **After add:** typed "visual verify test pattern" into the add-pattern textbox, clicked "Add Pattern" (added to local form state — the list re-rendered immediately showing one `<li>` with the pattern text and a "Remove" button, "No patterns configured." correctly gone), then clicked "Save". The page rendered a "Settings saved." confirmation, and a fresh `GET /api/v1/settings` in the same moment returned `{"autoReplyPatterns":["visual verify test pattern"], ...}` on the same row id (`e869d7ba-...`) — confirms the rendered list and the persisted row agree, not a disconnected local-only list.
3. **After remove:** clicked the pattern's "Remove" button (list re-rendered back to "No patterns configured." immediately, before Save), clicked "Save". A fresh `GET /api/v1/settings` confirmed `{"autoReplyPatterns":[], ...}` on the same row — the removal reached the same row the add did, and the rendered empty-state text matches the baseline exactly (no leftover styling difference between "never configured" and "configured then cleared").

Both rendered states (populated list with a Remove button per item, and the "No patterns configured." empty state) match this step's Result section description exactly — no misrendering, no layout issue, no stale text between the two states.

Cleanup: the settings row was left in its default empty state (`autoReplyPatterns: []`, `whatsapp_phone_number: null`, `whatsapp_phone_number_id: null`) by the remove-and-save step above — the same end state this step's own Result section left it in, re-confirmed via the final `GET` shown above.

---

## Step 6 — End-to-End Frontend Verification

**Objective**
Walk all five pages against the real backend and real dev DB: import leads → activate campaign → send → see it in Dashboard/Inbox → reply → close.

**Scope**
Verification only.

**Acceptance Criteria**
Matches M7's stated acceptance in `01-mvp-plan.md` — all five pages function against the real backend, Dashboard stats match actual data.

**Result**
**Decision flagged before executing, not made unilaterally**: this walkthrough needs a genuinely successful real send somewhere in the chain (Steps 3-4 already proved guard/failure paths thoroughly, but no step had yet completed one real successful send through this M7 frontend's exact code path). Only one phone number in this environment (`+96171819509`) is Meta-verified to receive messages, and it already carries real accumulated history from M4/M6. Asked the user how to handle this rather than deciding solo; chosen approach: **reuse that number for the reply/close legs without touching its lead status at all**, and use a freshly-imported non-verified lead for the "Send" leg specifically to exercise a real live 502 (a case Step 3 explicitly declined to trigger). Fully non-destructive to prior evidence.

**Walked all five pages against the real backend and real dev DB, in the order Step 6 specifies:**

1. **Import** — `POST /api/v1/leads/import` with a real 2-row CSV → `{imported:2, duplicates:0, failed:0}`. (First attempt used `+1555...` numbers and got `failed:2` — libphonenumber correctly rejects the reserved-for-fiction `555` exchange as an invalid NANP number, not a bug; switched to the same valid-format pattern already established in Step 1's `verify-leads-service.ts` parity test.) Confirmed via `GET /leads?status=NEW` — both new leads present with correct `name`/`businessName`/`sourceFile`/`status`, exactly what `LeadsPage`'s table renders.
2. **Activate campaign** — already `ACTIVE` (the same "Placeholder (pre-M4)" campaign whose activate/pause guards Step 3 fully proved); not re-tested here since Step 6 is integration verification, not guard re-verification.
3. **Send** — `POST /api/v1/messages/send` to one freshly-imported lead → real `502` from Meta (`"(#131030) Recipient phone number not in allowed list"`), the same genuine rejection reason as Step 4's. **New finding, not previously checked**: unlike `inbox.service.ts`'s `replyToConversation` (which wraps its Meta call in try/catch and persists a `FAILED` message row before re-throwing), `messages.service.ts`'s `sendInitialTemplate` had **no try/catch around its Meta call at all** — confirmed empirically: after the `502`, the lead's `status` was still `NEW` (not moved, not `FAILED`), and zero message rows existed for that lead. Re-checked Dashboard stats before/after — unchanged, as expected given no row was ever written. This meant a failed campaign send left no trace anywhere in the app except the transient `sendError` alert in `CampaignPage` — not in Leads, not in Dashboard, not in any message history.

**Fixed on request, not deferred** — this is a real gap against the contract's own Dashboard spec (Failed Messages must be accurate) with a small fix, since the correct pattern already existed in two sibling paths (`inbox.service.ts`'s M6 reply path, `followup.service.ts`'s M5 follow-up path). Wrapped `sendTemplateMessage()`'s call in `sendInitialTemplate()` in try/catch; on failure it now calls the already-existing `messagesRepo.createFailedOutboundTemplateMessage()` (added in M5, reused as-is — no new repository code needed for the message side) and a new `leadsRepo.markLeadFailed()` (mirroring `followup.repository.ts`'s existing function of the same name), then re-throws so the HTTP response is unchanged (`MetaApiError` still → `502`). **This is a correction to M4's send path, not new M7 scope** — flagged in both milestone docs: full detail in `04-campaign-outbound-messaging.md` Step 5's Result (`Corrected 2026-09-15`), same pattern already used there for the M4 Step 1 activation-guard correction.

Re-verified with the same real-502 technique, same rigor as every other guard tested this milestone: imported a fresh `NEW` lead (`+14155552674`), sent to it, got the identical real Meta rejection, then confirmed — exactly one `Message` row (`OUTBOUND`/`TEMPLATE`/`FAILED`, no `metaMessageId`, `failedAt` set), the lead's `status` moved to `FAILED` (not `NEW`), and Dashboard's `failed` count moved from `0` to `1`. Cleaned up afterward via direct `psql` (a `FAILED` lead can't be deleted through the API's own blocked-if-contacted guard, same restriction as any non-`NEW` lead) — confirmed back to the original 3 leads and `{failed:0}`.
4. **Dashboard** — confirmed stats correctly reflect real state at each checkpoint: before the failed send, `{total_leads:5, contacted:0, replied:1, ...}`; unchanged after (per finding above); final state after cleanup `{total_leads:3, contacted:0, replied:1, waiting_for_followup:0, completed:0, failed:0}`, cross-checked directly against `psql` (`NEW: 2, REPLIED: 1`) — exact match, consistent with every prior Dashboard verification in this milestone.
5. **Inbox** — injected a real inbound webhook event for `+96171819509` (same no-signature-verification technique established in Steps 4-5, safe because it only writes to this app's own DB, never sends anything to the real phone) → conversation correctly resorted to the top of the list by `lastMessageAt` (`listConversations`'s documented ordering), confirming `InboxPage`'s list would show it first.
6. **Reply** — `POST /api/v1/inbox/:id/reply` within the now-fresh 24-hour window → **a genuine successful real send**: `{"status":"SENT","metaMessageId":"wamid.HBgLOTYxNzE4MTk1MDkVAgARGBI0RjQ2MEQwMjg1QTc2QzYxMEIA", ...}` — the one real successful send this milestone's testing had not yet completed through this exact frontend code path (M4 proved it existed at the backend level; this is the same endpoint, now proven end-to-end for M7).
7. **Close** — `PATCH /inbox/:id/status` with `{"status":"CLOSED"}` → `200`, then confirmed via `GET /inbox?status=CLOSED` — the conversation appears, count `1`. **Left `CLOSED`, not reverted** — unlike Step 4's isolated guard test (which was reverted since it wasn't part of an intended narrative), this is the walkthrough's actual intended final state, not test pollution.

**Cleanup**: the two freshly-imported throwaway leads were deleted via the real `DELETE /api/v1/leads/:id` endpoint (both `NEW`, so permitted — incidentally exercising that action once more). Confirmed via `psql`: `leads` table back to the original 3 rows. `+96171819509`'s lead status (`REPLIED`) was never touched, per the chosen approach; its conversation is now `CLOSED` and carries two additional real messages (the injected inbound trigger and the real outbound reply) — intended additions to its ongoing real history, not cleaned up, consistent with how this lead has accumulated genuine test evidence across M4/M5/M6/M7 rather than being reset between uses.

Acceptance criteria met: all five pages' actions were exercised against the real backend and real dev DB in this walkthrough (Settings' `auto_reply_patterns` linkage was already end-to-end verified in Step 5 and wasn't re-touched here, since re-triggering it wasn't part of this chain); Dashboard stats matched direct DB queries at every checkpoint.

Same standing caveat as Steps 2-5: no visual/browser tool was available this session (not re-checked again this step, since the prior confirmation stands and nothing changed) — this verification is real HTTP/DB-level proof plus code traces, not rendered screenshots.

---

## Milestone Checklist

- [x] Step 0 — Frontend Scaffold and API Client
- [x] Step 1 — Leads Page
- [x] Step 2 — Dashboard Page
- [x] Step 3 — Campaign Page
- [x] Step 4 — Inbox Page
- [x] Step 5 — Settings Page
- [x] Step 6 — End-to-End Frontend Verification
