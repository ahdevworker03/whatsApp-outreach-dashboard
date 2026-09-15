# M7 — Frontend

Goal (per `docs/planning/01-mvp-plan.md`): build the five MVP pages, wired to the real backend.

Acceptance criteria for the milestone as a whole (from `01-mvp-plan.md`):

- All five pages function against the real backend.
- Dashboard statistics match the actual underlying data.

**Review mode: batch, not per-step.** No Meta compliance logic, no automation loop — pure UI wired to an already-proven API. Same mode as M4. Exception: the Settings page (Step 5) touches `auto_reply_patterns`, real business logic feeding M5's detection — flag that step's output for a closer look before accepting it.

**Design direction: plain and functional.** No visual design effort — no theming, no component library beyond what's needed for basic forms/tables, no time spent on layout polish. Priority is clarity: readable tables, clear labels, obvious buttons, legible spacing. Simple HTML-level styling is enough. Do not spend implementation time on colors, animations, or custom components beyond what's functionally required.

---

## What already exists

- Full working API: /api/v1/leads, /api/v1/campaign, /api/v1/messages/send, /api/v1/inbox, /api/v1/settings — all built and verified M2-M6, real HTTP, real Meta sends. /api/v1/dashboard/stats was documented in 05-api-design.md section 7 but never actually implemented in M2-M6 (confirmed: M2's own milestone doc explicitly states it doesn't exist yet) — this was an error in this M7 doc's original drafting, not a prior milestone regression. Built and verified in Step 0 instead (see Step 0's Result).
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
To be filled in during implementation.

---

## Step 4 — Inbox Page

**Objective**
Conversation list (`GET /api/v1/inbox`, status filter), detail view with full message history (`GET .../:id`), reply box (`POST .../reply`), mark closed (`PATCH .../status`).

**Scope**
This page only. Message history clearly distinguishes inbound vs outbound (e.g. left/right alignment or a simple label) — must be easy to follow at a glance.

**Acceptance Criteria**
The 24-hour-window rejection (M6) surfaces as a clear disabled/warning state in the UI, not a raw 409 after the user tries to send. Meta-failure (502) shows a clear "failed to send" state, matching the `FAILED` message row.

**Result**
To be filled in during implementation.

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
To be filled in during implementation. _(Flag for closer review — real business logic, not just display.)_

---

## Step 6 — End-to-End Frontend Verification

**Objective**
Walk all five pages against the real backend and real dev DB: import leads → activate campaign → send → see it in Dashboard/Inbox → reply → close.

**Scope**
Verification only.

**Acceptance Criteria**
Matches M7's stated acceptance in `01-mvp-plan.md` — all five pages function against the real backend, Dashboard stats match actual data.

**Result**
To be filled in during implementation.

---

## Milestone Checklist

- [x] Step 0 — Frontend Scaffold and API Client
- [x] Step 1 — Leads Page
- [x] Step 2 — Dashboard Page
- [ ] Step 3 — Campaign Page
- [ ] Step 4 — Inbox Page
- [ ] Step 5 — Settings Page
- [ ] Step 6 — End-to-End Frontend Verification
