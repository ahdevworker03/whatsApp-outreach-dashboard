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

All 7 steps below are Complete. Milestone done.

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
Complete.

**Must Read**
`docs/architecture/05-api-design.md` (section 3, Leads Endpoints; section 11, API Access Control), `docs/rules/backend.md` (Requests and Responses — success/error shapes).

**Objective**
Implement the actual `/api/v1/leads/*` routes and controllers per `docs/architecture/05-api-design.md` section 3: `POST /leads/import` (multipart file upload), `GET /leads` (list with status filter, pagination), `GET /leads/:id` (with message history), `DELETE /leads/:id` (blocked if already contacted).

**Scope**
Routes/controllers wiring Steps 1–5 together into the documented HTTP contract. Explicitly excluded: any new business logic not already built in prior steps.

**Acceptance Criteria**
Each endpoint, called via real HTTP requests (not just unit-level calls), behaves exactly as documented in the API design doc, including the correct HTTP status codes for success/duplicate/not-found/already-contacted cases.

**Verification**
Ran the server locally (`PORT=3902 tsx src/index.ts`) with a real `API_ACCESS_TOKEN`, hit every endpoint with `curl` against the real dev database, cleaned up all test data afterward:
- `POST /leads/import` with no token → 401
- `POST /leads/import` with the Step 3 `.csv` fixture → 201 `{"imported":3,"duplicates":0,"failed":1}`
- Same file imported again → 201 `{"imported":0,"duplicates":3,"failed":1}` (all now "already exists")
- The Step 3 `.xlsx` fixture (same 4 rows) → 201 `{"imported":0,"duplicates":3,"failed":1}` — correctly detected as duplicates of the CSV import by phone, confirming the two file formats interoperate through the same pipeline
- No file field → 400 with a clear message
- An unsupported file type (`.txt`) → 400 naming the rejected filename
- `GET /leads?limit=100` → 200 with `{ leads, total }`, timestamps auto-serialized to ISO 8601 strings
- `GET /leads?status=NOT_A_STATUS` → 400; `GET /leads?status=NEW` → 200, correctly filtered
- `GET /leads/:id` on a real id → 200 with the lead plus its (empty) `messages` array
- `GET /leads/:id` on a well-formed but non-existent UUID → 404
- `GET /leads/:id` on a malformed id → 400 (not a 500 from an invalid DB query)
- `DELETE /leads/:id` on a `NEW` lead → 200 `{"deleted":true}`, confirmed gone via a follow-up `GET` (404)
- `DELETE /leads/:id` again on the now-deleted id → 404
- `DELETE /leads/:id` on a lead manually set to `CONTACTED` → 409 with the "already been contacted" message

Also reran the full `npm test` suite (23 tests, unaffected) and type-checked all of `src/` with the same temporary-tsconfig workaround from Step 5 — zero errors.

**Result**
Added `src/leads/leads.controller.ts` and `src/leads/leads.routes.ts` (grouped under `src/leads/`, matching the existing `src/webhooks/` routes+controller convention), mounted at `/api/v1/leads` in `src/routes/v1.routes.ts` — replacing Step 1's placeholder `/ping` route now that the real endpoints exist.

Installed `multer` (memory storage — the parsers from Steps 2-3 already operate on `Buffer`s, and import files here are small client spreadsheets, not large/high-volume uploads) for `POST /leads/import`'s multipart handling, 10MB file size limit.

Added `src/lib/asyncHandler.ts`: this repo's Express version (4.x) doesn't catch a rejected promise from an async route handler, so every controller is wrapped with it to forward errors to `errorHandler.ts` instead of crashing the process — avoids repeating try/catch/`next(err)` in all four controller functions.

Extended `src/middleware/errorHandler.ts` to map the leads domain's thrown errors to their documented status codes: `LeadNotFoundError` → 404, `LeadAlreadyContactedError` → 409, `UnsupportedLeadFileTypeError` / `InvalidPhoneNumberError` → 400, `multer.MulterError` → 400. Per `docs/rules/backend.md`, this mapping lives in the global handler, not scattered across controllers — controllers only handle their own local "not found"/"bad input" cases that aren't already an error thrown by the service (e.g. `GET /leads/:id`'s null-result 404, and a malformed-UUID 400 caught before ever reaching Prisma).

Response bodies match `docs/architecture/05-api-design.md` section 2/3's documented shapes exactly (`{ imported, duplicates, failed }`, `{ leads, total }`, the raw Lead object, etc.) — not wrapped in any envelope. Note: this differs from Step 1's placeholder route, which used a `{ data }` wrapper following `docs/rules/backend.md`'s convention; now that real endpoints exist, the actual, project-specific `05-api-design.md` (a higher-priority source of truth per `CLAUDE.md`'s Rule Priority) is what's followed, and the placeholder is gone.

No new business logic was added beyond what Steps 1-5 already built, per this step's scope — routes/controllers only wire the existing service/repository functions to HTTP.

---

## Step 7 — End-to-End Import Verification

**Status**
Complete.

**Must Read**
`docs/planning/01-mvp-plan.md` (M3 acceptance criteria).

**Objective**
Run a real, realistic Excel or CSV file (client-like data — messy phone formats, at least one duplicate, at least one invalid row) through the full `POST /api/v1/leads/import` endpoint and confirm correct behavior end-to-end.

**Scope**
Verification only, no new code expected unless this surfaces a bug.

**Acceptance Criteria**
Matches M3's stated acceptance in `01-mvp-plan.md` — "a real client-provided Excel/CSV file imports correctly with duplicates and invalid rows handled as expected," confirmed via direct database inspection, not just the HTTP response.

**Verification**
No client-provided file exists yet (pre-launch), so built a realistic 9-row client-like CSV (`client-leads-export.csv`) covering exactly the scenarios this acceptance criterion names: messy phone formats (dashes, spaces, parentheses, a local number with no country code at all), a row duplicating another row within the same file, a row duplicating a lead already in the dev database, and multiple distinct kinds of invalid rows (missing phone, garbage/too-short phone, unresolvable local format) — plus realistic missing name/business-name cells. Ran it through the real, running server via `POST /api/v1/leads/import` (not a direct service call), then confirmed the outcome via direct Prisma queries against the dev database (not just the HTTP response):

- HTTP response: `{"imported":4,"duplicates":2,"failed":3}` — matching the row-by-row expectation worked out in advance
- Direct DB query for `sourceFile: "client-leads-export.csv"` returned exactly the 4 expected leads, each with the correct normalized E.164 phone, `name`/`businessName` (including the two rows with a legitimately blank field), and `status: "NEW"`
- The pre-existing lead the file intentionally duplicated (`+16315551182`) was confirmed still present as exactly one row, unmodified — not touched or duplicated by the import
- A direct query for the 3 invalid-row names and the 1 duplicate-in-file name confirmed all four produced no lead record at all — not silently inserted, not partially inserted

All test leads created by this run were deleted afterward; the dev database is back to its pre-verification state.

**Result**
No bug surfaced — nothing to fix. Every case (valid, both kinds of duplicate, every kind of invalid row) behaved exactly as designed across Steps 2-6, end-to-end through the real HTTP endpoint and confirmed at the database level. M3 is complete.

---

## Milestone Checklist

- [x] Step 1 — API Access Control Middleware
- [x] Step 2 — Phone Number Normalization
- [x] Step 3 — CSV and Excel Parsing
- [x] Step 4 — Validation and Duplicate Handling
- [x] Step 5 — Leads Repository and Service Layer
- [x] Step 6 — Leads API Endpoints
- [x] Step 7 — End-to-End Import Verification

---

## Post-Milestone Follow-ups

Three items flagged during M3 were resolved before closing the milestone:

**1. `docs/rules/backend.md` and `docs/rules/database.md` rewritten.** Both described a different project (an `apps/api`/`src/modules/<domain>/` layout, an `{ error: { code, message } }` shape, multi-tenancy/`organization_id`) — flagged repeatedly across Steps 1, 4, 5, and 6 rather than applied. Both files now describe this repo's actual, working conventions (the flat `backend/src/{routes,services,repositories,middleware,lib}` structure, `src/leads/`/`src/webhooks/` domain grouping, the `{ error: string, code? }` shape from `docs/architecture/05-api-design.md`, no multi-tenancy), in the same trimmed style as `docs/rules/project.md`.

**2. The `vitest` critical npm audit finding was investigated and fixed, not deferred.** It was [GHSA-5xrq-8626-4rwp](https://github.com/advisories/GHSA-5xrq-8626-4rwp) (CVSS 9.8, arbitrary file read/execute) plus a related moderate path-traversal advisory in `@vitest/mocker` ([GHSA-82fw-gwwq-j7x9](https://github.com/advisories/GHSA-82fw-gwwq-j7x9)) — both affecting the `vitest@2.1.9` pinned in Step 2. Both explicitly require the **Vitest UI/API server exposed to the network** (`--ui`, `--api.host` set to a non-localhost address) or Vitest's browser mode; this project only ever runs `vitest run` via `npm test` — no UI, no `--api.host`, no browser mode — so there was never an exposure path here. Still, since no patched release exists on the 2.x line (per the advisories, 2.x/3.x are unmaintained), deferring would have meant carrying a critical CVE indefinitely for no reason: `@types/node` was only pinned to `^20` for `vitest@2` compatibility (Step 2's note), and `@types/node` is a type-only dev dependency — bumping it doesn't change the actual Node runtime (`engines.node: ">=18"` unchanged; the dev machine already runs Node 24). Upgraded `vitest` to `^5.0.0` and `@types/node` to `^22.10.0` together; all 23 tests still pass unmodified. `npm audit` now reports 0 critical findings (down from 1 critical + several vitest-linked moderates; 8 pre-existing, unrelated findings remain in `prisma`/`express`/`exceljs` and their transitive deps, untouched by this change).

**3. `tsconfig.json`'s `ignoreDeprecations` fixed at the source.** Flagged since Step 1 as `TS5103: Invalid value for '--ignoreDeprecations'` — M2 had set it to `"6.0"`, not a value the installed TypeScript 5.9.3 accepts (this project isn't on TypeScript 6.x). The setting exists to silence `moduleResolution: "node10"`'s deprecation warning (introduced as a deprecation in TypeScript 5.0); the correct value for that is `"5.0"`. Changed `"6.0"` → `"5.0"`. `npm run build` (`tsc -p tsconfig.json`) now exits 0 with no errors and no temporary/workaround tsconfig — confirmed with a full clean build (`rm -rf dist && npm run build`), and every step's own type-check (previously done via a temporary local tsconfig in Steps 5 and 6) would now pass the same way directly.
