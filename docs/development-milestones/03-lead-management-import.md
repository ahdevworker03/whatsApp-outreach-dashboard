# M3 — Lead Management and Excel/CSV Import

Goal (per `docs/planning/01-mvp-plan.md`): import and manage leads reliably.

Acceptance criteria for the milestone as a whole:
- A real client-provided Excel/CSV file imports correctly with duplicates and invalid rows handled as expected.

**What already exists from M2 that this milestone builds on:**
- `backend/src/prisma/client.ts` — the shared Prisma client singleton every persistence-touching module imports.
- `backend/prisma/schema.prisma` — the `leads` table already exists per `docs/architecture/04-database-design.md`: `id`, `phone` (unique), `name`, `businessName`, `sourceFile`, `status` (`LeadStatus`), `campaignId`, `createdAt`, `updatedAt`, `followup1DueAt`, `followup2DueAt`.
- `backend/src/repositories/webhook.repository.ts`'s `upsertLeadByPhone(phone)` — the only existing `Lead` persistence operation. It `upsert`s by the unique `phone` constraint, creating with `status: "NEW"` on first insert. It only ever receives Meta's already-clean, digits-only `from` field with a `+` prefixed on — not real E.164 normalization, and it sets no `name`/`businessName`/`sourceFile`/`campaignId`. It's called only from `webhook.service.ts`'s `handleIncomingMessage`. M2 Step 5 deliberately left `Lead` logic inside the generic `webhook.repository.ts`/`webhook.service.ts` pair rather than splitting out a `leads` module, "until a second consumer needs it" — this milestone is that second consumer.

**Confirmed missing at the start of this milestone** (direct repo inspection):
- No `leads.routes.ts`, `leads.controller.ts`, `leads.service.ts`, or `leads.repository.ts` anywhere — no list/find-by-id/delete/bulk-create operation on `Lead` exists, only the single-row upsert above.
- No CSV or Excel parsing library installed (`package.json` dependencies are only `@prisma/adapter-pg`, `@prisma/client`, `dotenv`, `express`, `prisma`).
- No `/api/v1` route is mounted anywhere in `src/index.ts` — only `/webhook` and `/health` exist. Consequently, no `API_ACCESS_TOKEN` bearer-auth middleware exists either (`docs/architecture/05-api-design.md` section 11) — there's been nothing for it to guard yet. No `API_ACCESS_TOKEN` in `.env.example`, no getter for it in `src/config/env.ts`.
- No E.164 phone normalization logic exists anywhere. The webhook path's `+`-prefix trick only works because Meta's `from` field arrives pre-cleaned; arbitrary spreadsheet input (dashes, spaces, parentheses, missing `+`, local formats) has no handling at all yet.

All 7 steps below are Not Started.

---

## Step 1 — API Access Control Middleware

**Status**
Complete.

**Must Read**
`docs/architecture/05-api-design.md` (section 11, API Access Control), `backend/src/config/env.ts` (existing fail-fast getter pattern), `backend/src/index.ts` (current app/router mounting).

**Objective**
Implement the bearer-token auth middleware for `/api/v1/*` routes per `docs/architecture/05-api-design.md` section 11. This is the first milestone mounting any `/api/v1` route, so the auth gate must exist before any leads endpoint is reachable.

**Scope**
The middleware itself, `API_ACCESS_TOKEN` added to `env.ts`'s fail-fast pattern and to `.env.example`, and mounting the middleware ahead of a new `/api/v1` router in `index.ts`. Explicitly excluded: any actual leads endpoint logic — this step only proves the auth gate works, using a placeholder route if needed for testing.

**Acceptance Criteria**
A request to a mounted `/api/v1/*` route without a valid bearer token returns 401; with a valid token, it passes through.

**Verification**
Ran the server locally (`tsx src/index.ts`) with `API_ACCESS_TOKEN` set, against the placeholder `GET /api/v1/ping` route, via real HTTP requests (not unit-level calls):
- No `Authorization` header → 401
- `Authorization: Bearer <wrong token>` → 401
- `Authorization: Bearer <correct token>` → 200 `{"data":{"pong":true}}`
- `GET /health` still 200 with no token (confirms the gate only affects `/api/v1/*`)

**Result**
Added `API_ACCESS_TOKEN` to `src/config/env.ts` (same fail-fast getter pattern as the other required vars) and to `.env.example`. Added `src/middleware/apiAuth.ts` (`requireApiAccessToken`), and `src/routes/v1.routes.ts` — a router with the middleware applied via `.use()` ahead of a placeholder `GET /ping` route (to be replaced by the real leads endpoints in Step 6). Mounted at `/api/v1` in `src/index.ts`, alongside the existing `/webhook` mount. Error response uses `{ error: string }` to match `docs/architecture/05-api-design.md` section 2's documented error shape.

Note on `docs/rules/backend.md`: that file's Module Structure/Requests-and-Responses sections describe an `apps/api`, `src/modules/<domain>/` layout and an `{ error: { code, message } }` shape — neither matches this repo, which uses a flat `backend/src/{routes,middleware,services,repositories}` layout and `{ error: string }` (per `docs/architecture/05-api-design.md` and the existing M2 code, e.g. `errorHandler.ts`). Followed the repo's actual established structure and the API design doc's error shape instead, per the Repository Truth policy in `CLAUDE.md` — flagging rather than silently resolving.

---

## Step 2 — Phone Number Normalization

**Status**
Not Started.

**Must Read**
`docs/architecture/04-database-design.md` (section 5, Key Constraints and Rules — "Phone numbers are stored in E.164 format. Normalization happens at import time."), `backend/src/services/webhook.service.ts` (the existing, non-normalizing `+`-prefix handling for comparison).

**Objective**
Implement real E.164 phone normalization for arbitrary input formats (spaces, dashes, parentheses, missing `+`, different country codes) — needed for import data, unlike the webhook path, which receives Meta's already-clean numbers.

**Scope**
A normalization utility function, likely under `src/lib/`, with clear input/output behavior and explicit handling of invalid/unparseable numbers (reject, don't silently corrupt). Check Context7 for a current, well-maintained phone-parsing library (e.g. `libphonenumber-js`) rather than hand-rolling regex — recommend evaluating this against writing custom logic, and justify whichever choice is made.

**Acceptance Criteria**
A range of realistic messy input formats (with dashes, spaces, missing `+`, local formats) all normalize to correct E.164, and clearly invalid numbers are rejected with a defined error rather than silently stored malformed.

**Verification**


**Result**

---

## Step 3 — CSV and Excel Parsing

**Status**
Not Started.

**Must Read**
`docs/architecture/05-api-design.md` (section 3, `POST /api/v1/leads/import`), `docs/architecture/04-database-design.md` (`leads` table fields available to populate: `phone`, `name`, `business_name`, `source_file`).

**Objective**
Install `csv-parse` (CSV) and `exceljs` (Excel) — standard npm registry installs, not the `xlsx`/SheetJS CDN-tarball approach — and implement parsing for both formats into a common intermediate row structure (`name`, `business_name`, `phone`, at minimum) before validation/persistence.

**Library Decision — `csv-parse` + `exceljs`, not `xlsx` (SheetJS)**

`xlsx` (SheetJS) can parse both CSV and Excel in one library, which is otherwise attractive for this step. It was deliberately rejected: SheetJS's own current documentation states the npm-registry-published `xlsx` package lags behind their actual releases and instructs installing directly from their CDN instead (`npm rm --save xlsx` then `npm i --save https://cdn.sheetjs.com/xlsx-<version>/xlsx-<version>.tgz`) — a non-standard install path that pulls an un-pinned tarball from a third-party CDN outside npm's registry, integrity, and audit tooling on every fresh install unless the exact tarball URL is pinned. That's an unnecessary supply-chain risk for what two ordinary, standard-registry packages already cover. `csv-parse` (part of the `node-csv` suite) is a mature, Node-native streaming CSV parser; `exceljs` is an actively maintained, standard-registry `.xlsx` parser/writer. Two libraries, both installed the normal way, is preferred here over one library installed an abnormal way.

**Scope**
Parsing only, producing raw parsed rows. Explicitly excluded: validation, deduplication, or database writes — those are later steps.

**Acceptance Criteria**
Both a real sample `.csv` and a real sample `.xlsx` file (create small test fixtures) parse correctly into the same intermediate structure, with correct handling of missing/empty cells.

**Verification**


**Result**

---

## Step 4 — Validation and Duplicate Handling

**Status**
Not Started.

**Must Read**
`docs/architecture/04-database-design.md` (`leads.phone` unique constraint), `docs/rules/database.md` (section 5, Integrity — "Database constraints complement application validation; they do not replace it.").

**Objective**
Validate each parsed row (required fields present, phone normalizes successfully per Step 2) and detect duplicates against the existing `leads` table (by phone, the unique constraint already in place) before insert.

**Scope**
Validation and dedup logic only, operating on Step 3's parsed rows.

**Acceptance Criteria**
Invalid rows (bad/missing phone) are rejected and counted, not silently dropped without a count; rows matching an existing lead's phone are detected as duplicates and not inserted as new leads.

**Verification**


**Result**

---

## Step 5 — Leads Repository and Service Layer

**Status**
Not Started.

**Must Read**
`docs/rules/backend.md` (layer flow: route → controller → service → repository → Prisma/database; Module Structure section), `backend/src/repositories/webhook.repository.ts` and `backend/src/services/webhook.service.ts` (the existing `upsertLeadByPhone` pattern being split out of here).

**Objective**
Create `leads.repository.ts` and `leads.service.ts` (splitting Lead-specific logic out of the generic `webhook.repository.ts`, as M2 anticipated), implementing create-many-from-import, list-all, find-by-id, and delete operations needed for the API endpoints.

**Scope**
The repository/service layer only, following the same controller → service → repository → Prisma pattern from M2. Explicitly excluded: the route/controller layer itself — that's Step 6.

**Acceptance Criteria**
Each function is directly callable and produces correct results against the real dev database (not just type-checks) — verified with direct calls, not yet via HTTP.

**Verification**


**Result**

---

## Step 6 — Leads API Endpoints

**Status**
Not Started.

**Must Read**
`docs/architecture/05-api-design.md` (section 3, Leads Endpoints; section 11, API Access Control), `docs/rules/backend.md` (Requests and Responses — success/error shapes).

**Objective**
Implement the actual `/api/v1/leads/*` routes and controllers per `docs/architecture/05-api-design.md` section 3: `POST /leads/import` (multipart file upload), `GET /leads` (list with status filter, pagination), `GET /leads/:id` (with message history), `DELETE /leads/:id` (blocked if already contacted).

**Scope**
Routes/controllers wiring Steps 1–5 together into the documented HTTP contract. Explicitly excluded: any new business logic not already built in prior steps.

**Acceptance Criteria**
Each endpoint, called via real HTTP requests (not just unit-level calls), behaves exactly as documented in the API design doc, including the correct HTTP status codes for success/duplicate/not-found/already-contacted cases.

**Verification**


**Result**

---

## Step 7 — End-to-End Import Verification

**Status**
Not Started.

**Must Read**
`docs/planning/01-mvp-plan.md` (M3 acceptance criteria).

**Objective**
Run a real, realistic Excel or CSV file (client-like data — messy phone formats, at least one duplicate, at least one invalid row) through the full `POST /api/v1/leads/import` endpoint and confirm correct behavior end-to-end.

**Scope**
Verification only, no new code expected unless this surfaces a bug.

**Acceptance Criteria**
Matches M3's stated acceptance in `01-mvp-plan.md` — "a real client-provided Excel/CSV file imports correctly with duplicates and invalid rows handled as expected," confirmed via direct database inspection, not just the HTTP response.

**Verification**


**Result**

---

## Milestone Checklist

- [x] Step 1 — API Access Control Middleware
- [ ] Step 2 — Phone Number Normalization
- [ ] Step 3 — CSV and Excel Parsing
- [ ] Step 4 — Validation and Duplicate Handling
- [ ] Step 5 — Leads Repository and Service Layer
- [ ] Step 6 — Leads API Endpoints
- [ ] Step 7 — End-to-End Import Verification
