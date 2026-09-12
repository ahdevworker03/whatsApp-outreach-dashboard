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
Complete.

**Must Read**
`docs/architecture/04-database-design.md` (section 5, Key Constraints and Rules — "Phone numbers are stored in E.164 format. Normalization happens at import time."), `backend/src/services/webhook.service.ts` (the existing, non-normalizing `+`-prefix handling for comparison).

**Objective**
Implement real E.164 phone normalization for arbitrary input formats (spaces, dashes, parentheses, missing `+`, different country codes) — needed for import data, unlike the webhook path, which receives Meta's already-clean numbers.

**Scope**
A normalization utility function, likely under `src/lib/`, with clear input/output behavior and explicit handling of invalid/unparseable numbers (reject, don't silently corrupt). Check Context7 for a current, well-maintained phone-parsing library (e.g. `libphonenumber-js`) rather than hand-rolling regex — recommend evaluating this against writing custom logic, and justify whichever choice is made.

**Acceptance Criteria**
A range of realistic messy input formats (with dashes, spaces, missing `+`, local formats) all normalize to correct E.164, and clearly invalid numbers are rejected with a defined error rather than silently stored malformed.

**Verification**
Added `vitest` (no test framework previously existed in this repo) and wrote `src/lib/phone.test.ts`, 13 cases run via `npm test`, all passing:
- Already-clean E.164, and the same number with dashes, spaces, and parentheses — all normalize to `+14155552671`
- A local-format number normalizes correctly when a default country is supplied (`(415) 555-2671` + `"US"`)
- A different country's number (`+44 20 7946 0958`) and the `00` international-dialing-prefix form of the same number (with a default country to interpret the exit code) both normalize correctly
- A local-format number with no default country to interpret it against is rejected (can't safely guess the country)
- Empty string, non-numeric garbage, a too-short number, and a real-length-but-invalid-pattern number (bad US area code) are all rejected
- Confirmed the rejection path always throws `InvalidPhoneNumberError` rather than returning any value

**Result**
Installed `libphonenumber-js` (`^1.13.13`) and added `src/lib/phone.ts` exporting `normalizePhoneNumber(raw, defaultCountry?)` and `InvalidPhoneNumberError`.

**Library decision:** used `libphonenumber-js` over hand-rolled regex, per this step's instruction to evaluate that against custom logic. Justification: phone validity/formatting rules vary per country (length, prefixes, area codes) in ways a regex would either miss or reimplement poorly; `libphonenumber-js` is a maintained, widely-used, much-smaller-footprint port of Google's `libphonenumber` and already handles every messy-input case this step lists. Used the `/max` metadata build (not the library's default `/min`) — `/min`'s `isValid()` only checks number length, while `/max` also validates per-country digit patterns, which is what "clearly invalid numbers are rejected" requires; the too-short and bad-area-code test cases above would not both be caught under `/min`.

`defaultCountry` is an optional parameter, not a hardcoded assumption — the contract and architecture docs don't name a single country for this project's leads, so a local (non-"+") number with no `defaultCountry` given is rejected rather than guessed at; callers (Step 4) can supply one if the import context establishes it.

Added `vitest` (`^2.1.9`) as a dev dependency and a `test` script, since `docs/rules/testing.md` requires tests for new features and no test runner existed yet in this repo. Note: `vitest@5` (latest) conflicts with this repo's pinned `@types/node@^20`, which requires `@types/node@^22`; installed `vitest@^2` instead, which is compatible. `npm audit` now flags `vitest` itself (critical) plus several of its transitive dev-only dependencies — these affect the test runner, not the production server, and are unrelated to `libphonenumber-js` (zero runtime dependencies).

---

## Step 3 — CSV and Excel Parsing

**Status**
Complete.

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
`npm test` — 4 new cases in `src/lib/leadFileParser.test.ts`, all passing:
- The real `.csv` fixture (`src/lib/__fixtures__/leads-sample.csv`) and the real `.xlsx` fixture (`leads-sample.xlsx`, generated by `scripts/gen-lead-fixture.ts`) encode the same 4 rows — a complete row, one missing business name, one missing name, one missing phone — and both parse to the exact same `ParsedLeadRow[]`, with the missing cell simply absent from the object (not `""`, not a crash) in every case
- Header matching is case-insensitive and ignores unrecognized columns (`FULL NAME` / `Notes` / `PHONE` → only `name`/`phone` populated, `Notes` dropped)
- A header-only file (no data rows) parses to `[]` rather than erroring

**Result**
Installed `csv-parse` (`^7.0.2`) and `exceljs` (`^4.4.0`) per this step's library decision (already justified in the milestone doc above — standard-registry installs, not the SheetJS CDN-tarball path). Added `src/lib/leadFileParser.ts` exporting `parseLeadsCsv(input)` and `parseLeadsExcel(input)`, both returning `ParsedLeadRow[]` (`{ name?, businessName?, phone? }`) — the common intermediate structure the milestone's `leads` fields map onto (`source_file` is set at the import-service layer from the upload itself, not parsed from file content; `campaign_id` isn't in scope for import rows).

Both parsers read the first row as headers and match each column against a small alias list per field (e.g. `phone` also matches "phone number", "mobile", "whatsapp") after normalizing case/spacing/punctuation — real client spreadsheets won't always use our exact column names. An unrecognized column is ignored, not rejected; validating which required fields are actually present is Step 4, not this step. A missing or blank cell becomes `undefined` on the row object, never an empty string or a parse failure — that's what "correct handling of missing/empty cells" means here, since Step 4 needs to tell "was empty" apart from "was the string `\"\"`" reliably.

Explicitly out of scope here per the milestone (not implemented): validation, deduplication, and database writes.

---

## Step 4 — Validation and Duplicate Handling

**Status**
Complete.

**Must Read**
`docs/architecture/04-database-design.md` (`leads.phone` unique constraint), `docs/rules/database.md` (section 5, Integrity — "Database constraints complement application validation; they do not replace it.").

**Objective**
Validate each parsed row (required fields present, phone normalizes successfully per Step 2) and detect duplicates against the existing `leads` table (by phone, the unique constraint already in place) before insert.

**Scope**
Validation and dedup logic only, operating on Step 3's parsed rows.

**Acceptance Criteria**
Invalid rows (bad/missing phone) are rejected and counted, not silently dropped without a count; rows matching an existing lead's phone are detected as duplicates and not inserted as new leads.

**Verification**
`npm test` — 6 new cases in `src/lib/leadRowValidator.test.ts`, all passing:
- A valid row is accepted with its phone normalized to E.164 via Step 2
- A row with a missing phone is rejected and shows up in `invalid` with a stated reason (not silently dropped)
- A row with an unparseable/garbage phone is rejected and counted the same way
- A row whose normalized phone matches an existing lead's phone (supplied via `existingPhones`) is placed in `duplicates`, not `valid` — not inserted as a new lead
- Two rows in the same file with the same phone (different formatting) — the first is valid, the second is caught as a duplicate too
- A mixed batch of 5 rows (1 valid, 2 invalid, 2 duplicate — one already-in-DB, one repeated-in-file) sorts every row into the correct bucket with the correct reason

**Result**
Added `src/lib/leadRowValidator.ts` exporting `validateLeadRows(rows, existingPhones)`, which sorts Step 3's `ParsedLeadRow[]` into `{ valid, invalid, duplicates }`:
- **Invalid**: missing phone, or a phone that fails Step 2's `normalizePhoneNumber` — each entry carries the original row and a reason string, so counts are never lost.
- **Duplicate**: phone matches an entry in the caller-supplied `existingPhones` set (`"already exists"`), or matches an earlier row already accepted from the same file (`"duplicate in file"`) — both cases are excluded from `valid` and reported separately from `invalid`.
- **Valid**: everything else, with `phone` replaced by its normalized E.164 form (`name`/`business_name` pass through as-is — both nullable on `Lead`, per `prisma/schema.prisma`, so only `phone` is a required field here).

`existingPhones` is a plain `ReadonlySet<string>` parameter rather than a database query — this step stays pure validation/dedup logic with no persistence dependency, per its scope; Step 5's repository is what will query current phones and call this function. This also directly follows `docs/rules/database.md`'s Integrity rule ("Database constraints complement application validation; they do not replace it") — the app checks and reports duplicates/invalid rows itself, rather than relying on `leads.phone`'s unique constraint to reject them at the database (which would surface as an ugly `P2002` error mid-batch instead of the documented `{ imported, duplicates, failed }` response shape).

Note on `docs/rules/database.md`: like `backend.md` (flagged in Step 1), this file describes a different project's conventions (`lib/db/prisma/schema.prisma`, `organization_id` multi-tenancy, a `vehicle_rental_test` database) that don't apply here — this project's `project.md` explicitly lists "No multi-tenancy" as a non-goal. Followed only the generically-applicable Integrity guidance above; flagging the mismatch rather than applying the rest.

---

## Step 5 — Leads Repository and Service Layer

**Status**
Complete.

**Must Read**
`docs/rules/backend.md` (layer flow: route → controller → service → repository → Prisma/database; Module Structure section), `backend/src/repositories/webhook.repository.ts` and `backend/src/services/webhook.service.ts` (the existing `upsertLeadByPhone` pattern being split out of here).

**Objective**
Create `leads.repository.ts` and `leads.service.ts` (splitting Lead-specific logic out of the generic `webhook.repository.ts`, as M2 anticipated), implementing create-many-from-import, list-all, find-by-id, and delete operations needed for the API endpoints.

**Scope**
The repository/service layer only, following the same controller → service → repository → Prisma pattern from M2. Explicitly excluded: the route/controller layer itself — that's Step 6.

**Acceptance Criteria**
Each function is directly callable and produces correct results against the real dev database (not just type-checks) — verified with direct calls, not yet via HTTP.

**Verification**
`npx tsx scripts/verify-leads-service.ts` — direct calls against the real dev database (`whatsapp_outreach_dev`), all 8 checks passed, all rows created by the script cleaned up afterward (confirmed 0 remaining):
1. `importLeads()` on a 3-row CSV (1 valid, 1 invalid phone, 1 duplicate-in-file) → `{ imported: 1, duplicates: 1, failed: 1 }`
2. Re-running `importLeads()` with the same file → `{ imported: 0, duplicates: 2, failed: 1 }` (both rows now match the already-inserted lead)
3. `listLeads({ status: "NEW" })` finds the newly created lead among the results, with a correct `total`
4. `getLeadById()` returns it with a `messages` array (empty — none sent yet)
5. `getLeadById()` with a random UUID returns `null`
6. `deleteLead()` succeeds while the lead's status is still `NEW`, and the lead is confirmed gone afterward
7. `deleteLead()` on that now-deleted id throws `LeadNotFoundError`
8. `deleteLead()` on a lead whose status was set to `CONTACTED` throws `LeadAlreadyContactedError`

Also ran the full `npm test` suite (23 tests from Steps 2-4, unaffected) and type-checked all of `src/` with a temporary local tsconfig that removes the pre-existing broken `ignoreDeprecations` setting (flagged in Step 1) — zero errors.

**Result**
Added `src/repositories/leads.repository.ts` (Prisma-only): `createManyLeads`, `findExistingPhones` (feeds Step 4's `existingPhones` set), `listLeads` (status filter + pagination, returns `[leads, total]`), `findLeadById` (includes `messages`), `deleteLeadById`. Split out of `webhook.repository.ts` as M2 anticipated — `webhook.repository.ts`'s `upsertLeadByPhone` still owns the webhook-driven upsert path only.

Added `src/services/leads.service.ts`: `importLeads(file, fileName)` ties Steps 3-5 together — dispatches CSV/Excel parsing by file extension, normalizes each row's phone to query `findExistingPhones` with the same E.164 form the DB actually stores (querying with raw, un-normalized cell text would silently miss real duplicates), runs Step 4's `validateLeadRows`, and persists only the valid rows — returning `{ imported, duplicates, failed }` matching `docs/architecture/05-api-design.md` section 3's documented response exactly. Also `listLeads`, `getLeadById`, and `deleteLead`.

`deleteLead` enforces "not allowed if lead has been contacted" (the business rule Step 6's `DELETE /leads/:id` needs) by rejecting any status other than `NEW` — per the status lifecycle in `docs/architecture/04-database-design.md`, a lead only ever leaves `NEW` once contacted. It throws `LeadNotFoundError` / `LeadAlreadyContactedError` (plain `Error` subclasses, matching the existing `InvalidPhoneNumberError` pattern from Step 2) rather than deciding an HTTP status itself — Step 6's controller maps these to 404/409, keeping the service HTTP-agnostic per `docs/rules/backend.md`'s layer split.

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
- [x] Step 2 — Phone Number Normalization
- [x] Step 3 — CSV and Excel Parsing
- [x] Step 4 — Validation and Duplicate Handling
- [x] Step 5 — Leads Repository and Service Layer
- [ ] Step 6 — Leads API Endpoints
- [ ] Step 7 — End-to-End Import Verification
