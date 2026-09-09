# M2 — Backend Foundation and Data Model

Goal (per `docs/planning/01-mvp-plan.md`): production-grade backend with the full data model per `docs/architecture/04-database-design.md`.

Acceptance criteria for the milestone as a whole:
- All tables and enums from the database design doc exist and migrate cleanly.
- Webhook events are persisted correctly.

**What already exists from M1 that this milestone builds on:** the Express + TypeScript skeleton in `backend/` boots and is proven working end-to-end against the live Meta Cloud API (see `docs/development-milestones/01-whatsapp-integration-proof.md`). Specifically:
- `src/index.ts` — Express app, `/health`, mounts `/webhook`.
- `src/config/env.ts` — env loader with fail-fast getters for required variables; the pattern this milestone extends with `DATABASE_URL`.
- `src/lib/metaClient.ts` — outbound `sendTemplateMessage()`, proven against live Meta.
- `src/webhooks/whatsapp.controller.ts` — `GET /webhook` (verify handshake) and `POST /webhook` (event receiver), both proven against genuine Meta-originated requests. `receiveWebhookEvent` currently only `console.log`s inbound messages and status updates — its own doc comment states persistence is deferred to M2. This milestone is what upgrades that.
- `src/middleware/errorHandler.ts` — global JSON error handler, built in M1 with no database involved yet.

**Confirmed missing** (direct repo inspection, no prior work exists): Prisma is not installed, no `prisma/schema.prisma` exists anywhere in the repo, no `DATABASE_URL` anywhere, no PostgreSQL connection, no `src/services/` or `src/repositories/` layer.

None of the following steps have been started. All statuses below are Not Started.

---

## Step 1 — PostgreSQL Setup and Connection

**Status**
Not Started.

**Must Read**
`docs/architecture/03-backend-architecture.md` (section 7, environment variables), `backend/src/config/env.ts`.

**Objective**
Get a local PostgreSQL instance running and reachable, with `DATABASE_URL` wired into `backend/.env` following the existing `env.ts` fail-fast pattern.

**Scope**
Local development database only. Explicitly excluded: production database setup, which belongs to M8 (VPS Deployment).

**Acceptance Criteria**
`DATABASE_URL` is set in `backend/.env` (and documented in `backend/.env.example`), and the backend can establish a connection to PostgreSQL, verified with a simple connectivity check.

**Verification**
Not yet performed.

**Result**
Not yet performed.

---

## Step 2 — Prisma Installation and Schema Definition

**Status**
Not Started.

**Must Read**
`docs/architecture/04-database-design.md` (full document — tables, enums, constraints), `docs/rules/database.md` (conventions: UUID primary keys, singular table names, snake_case database naming).

**Objective**
Install `prisma` and `@prisma/client`, and write `prisma/schema.prisma` implementing exactly the 5 tables and 6 enums specified in `docs/architecture/04-database-design.md`: `leads`, `campaigns`, `messages`, `conversations`, `settings`; `LeadStatus`, `CampaignStatus`, `MessageDirection`, `MessageType`, `MessageStatus`, `ConversationStatus`.

**Scope**
Schema definition only, matching the database design doc field-for-field. Explicitly excluded: inventing any field, table, or enum value not already in that doc.

**Acceptance Criteria**
`schema.prisma` exists, matches the database design doc exactly, and `prisma validate` passes with no errors.

**Verification**
Not yet performed.

**Result**
Not yet performed.

---

## Step 3 — Initial Migration

**Status**
Not Started.

**Must Read**
`docs/rules/database.md` (section 2, Migrations), `prisma/schema.prisma` (once Step 2 exists).

**Objective**
Generate and run the first Prisma migration, creating all tables and enums in the actual PostgreSQL database from Step 1.

**Scope**
Initial migration only.

**Acceptance Criteria**
Migration runs cleanly with no errors; all 5 tables and their enums exist in the database, confirmed by inspecting the database directly (e.g. via `prisma studio` or a direct `psql` query).

**Verification**
Not yet performed.

**Result**
Not yet performed.

---

## Step 4 — Prisma Client Singleton

**Status**
Not Started.

**Must Read**
`docs/architecture/03-backend-architecture.md` (section 2, folder structure — `src/prisma/`).

**Objective**
Create a single shared Prisma client instance module, per the architecture doc's `src/prisma/` folder convention, that the rest of the backend imports rather than each file instantiating its own client.

**Scope**
The client module itself only.

**Acceptance Criteria**
A single Prisma client instance exists and can be imported and used to run a basic query (e.g. count rows in an empty table) successfully.

**Verification**
Not yet performed.

**Result**
Not yet performed.

---

## Step 5 — Webhook Persistence: Incoming Messages

**Status**
Not Started.

**Must Read**
`backend/src/webhooks/whatsapp.controller.ts` (current log-only implementation), `docs/rules/backend.md` (layer flow: route → controller → service → repository → Prisma/database), `docs/architecture/04-database-design.md` (leads, messages, conversations tables and their relationships).

**Objective**
Upgrade the existing webhook handler (built in M1) so that when it receives an inbound `messages` event, it actually writes a row to the `messages` table — and creates/updates the related `leads` and `conversations` records as needed per the data model's relationships — instead of only logging to console.

**Scope**
Incoming message persistence only, following the layered flow already established in `docs/rules/backend.md` (controller → service → repository/Prisma). Explicitly excluded: campaign logic, follow-up scheduling, auto-reply detection — those are M4/M5, not M2.

**Acceptance Criteria**
Triggering the same synthetic "Incoming Message" test payload used in M1 Step 6 now results in a real row being written to the `messages` table, queryable and confirmed to exist.

**Verification**
Not yet performed.

**Result**
Not yet performed.

---

## Step 6 — Webhook Persistence: Status Updates

**Status**
Not Started.

**Must Read**
`backend/src/webhooks/whatsapp.controller.ts` (current log-only implementation), `docs/architecture/04-database-design.md` (messages table — status, sent_at/delivered_at/read_at/failed_at fields; MessageStatus enum).

**Objective**
Upgrade the same webhook handler so that when it receives a `statuses` event (sent/delivered/read/failed), it updates the corresponding message record's `status` and relevant timestamp field (`sent_at`/`delivered_at`/`read_at`/`failed_at`) rather than only logging.

**Scope**
Status update persistence only.

**Acceptance Criteria**
Triggering the same synthetic "Status Message" (Delivered) test payload used in M1 Step 7 now results in the corresponding message row's `status` and `delivered_at` fields being updated in the database, confirmed by querying it.

**Verification**
Not yet performed.

**Result**
Not yet performed.

---

## Step 7 — Basic API Structure Confirmation

**Status**
Not Started.

**Must Read**
`backend/src/middleware/errorHandler.ts` (current implementation, built in M1), `docs/architecture/03-backend-architecture.md` (section 8, Error Handling), `docs/rules/backend.md` (section on Requests and Responses).

**Objective**
Confirm the existing global error handler still fits M2's needs with a database layer now in place — specifically, that Prisma errors (e.g. connection failures, constraint violations) are caught and returned as consistent JSON errors rather than crashing the process or leaking raw stack traces.

**Scope**
Verification and minor extension of the existing error handler only, not a rewrite. Explicitly excluded: building any new API endpoints — that belongs to M3 onward.

**Acceptance Criteria**
A deliberately triggered Prisma error (e.g. a duplicate unique constraint violation) results in a clean, consistent JSON error response, not an unhandled crash.

**Verification**
Not yet performed.

**Result**
Not yet performed.

---

## Milestone Checklist

- [ ] Step 1 — PostgreSQL Setup and Connection
- [ ] Step 2 — Prisma Installation and Schema Definition
- [ ] Step 3 — Initial Migration
- [ ] Step 4 — Prisma Client Singleton
- [ ] Step 5 — Webhook Persistence: Incoming Messages
- [ ] Step 6 — Webhook Persistence: Status Updates
- [ ] Step 7 — Basic API Structure Confirmation
