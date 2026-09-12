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

**Confirmed missing at the start of this milestone** (direct repo inspection): Prisma was not installed, no `prisma/schema.prisma` existed anywhere in the repo, no `DATABASE_URL` anywhere, no PostgreSQL connection, no `src/services/` or `src/repositories/` layer. All 7 steps below are now complete.

---

## Step 1 — PostgreSQL Setup and Connection

**Status**
Complete.

**Must Read**
`docs/architecture/03-backend-architecture.md` (section 7, environment variables), `backend/src/config/env.ts`.

**Objective**
Get a local PostgreSQL instance running and reachable, with `DATABASE_URL` wired into `backend/.env` following the existing `env.ts` fail-fast pattern.

**Scope**
Local development database only. Explicitly excluded: production database setup, which belongs to M8 (VPS Deployment).

**Acceptance Criteria**
`DATABASE_URL` is set in `backend/.env` (and documented in `backend/.env.example`), and the backend can establish a connection to PostgreSQL, verified with a simple connectivity check.

**Verification**
No native PostgreSQL server was installed on this machine beforehand — only client tooling existed. A pre-existing Docker container from an unrelated project (`api-db-1`, `postgres:16-alpine`) was already occupying port 5432, discovered during inspection. Installed PostgreSQL natively via `sudo apt install -y postgresql postgresql-contrib`; the apt-installed cluster auto-detected the port conflict and started on **port 5433** instead, confirmed via `pg_lsclusters`:

```
Ver Cluster Port Status Owner    Data directory              Log file
18  main    5433 online postgres /var/lib/postgresql/18/main /var/log/postgresql/postgresql-18-main.log
```

Created a dedicated database and a dedicated non-superuser app user (not the `postgres` superuser):

```
sudo -u postgres psql -c "CREATE USER whatsapp_outreach_app WITH PASSWORD '***';"
sudo -u postgres psql -c "CREATE DATABASE whatsapp_outreach_dev OWNER whatsapp_outreach_app;"
CREATE ROLE
CREATE DATABASE
```

Added `DATABASE_URL=postgresql://whatsapp_outreach_app:***@localhost:5433/whatsapp_outreach_dev` to `backend/.env`, and a placeholder (`postgresql://USER:PASSWORD@localhost:5432/DATABASE_NAME`) to `backend/.env.example`. Extended `backend/src/config/env.ts` with a `databaseUrl` getter in the same fail-fast style as the existing Meta variables.

Ran a throwaway connectivity check (`pg` library directly, installed with `npm install --no-save` so it left no trace in `package.json`/`package-lock.json`; the script itself was deleted after use):

```
SUCCESS — connected to PostgreSQL:
{
  current_database: 'whatsapp_outreach_dev',
  current_user: 'whatsapp_outreach_app',
  version: 'PostgreSQL 18.6 (Ubuntu 18.6-0ubuntu0.26.04.1) on x86_64-pc-linux-gnu, compiled by gcc (Ubuntu 15.2.0-16ubuntu1) 15.2.0, 64-bit'
}
Connection closed.
```

**Result**
A dedicated local PostgreSQL 18 instance is running and reachable on port 5433, isolated from the unrelated project's Docker-based Postgres on port 5432. `backend/.env` has a working `DATABASE_URL` using a dedicated, non-superuser app role scoped to its own database. Connectivity is proven with a real query round trip.

---

## Step 2 — Prisma Installation and Schema Definition

**Status**
Complete.

**Must Read**
`docs/architecture/04-database-design.md` (full document — tables, enums, constraints), `docs/rules/database.md` (conventions: UUID primary keys, singular table names, snake_case database naming).

**Objective**
Install `prisma` and `@prisma/client`, and write `prisma/schema.prisma` implementing exactly the 5 tables and 6 enums specified in `docs/architecture/04-database-design.md`: `leads`, `campaigns`, `messages`, `conversations`, `settings`; `LeadStatus`, `CampaignStatus`, `MessageDirection`, `MessageType`, `MessageStatus`, `ConversationStatus`.

**Scope**
Schema definition only, matching the database design doc field-for-field. Explicitly excluded: inventing any field, table, or enum value not already in that doc.

**Acceptance Criteria**
`schema.prisma` exists, matches the database design doc exactly, and `prisma validate` passes with no errors.

**Verification**
`npm view prisma dist-tags` showed the npm `latest` tag currently points to a pre-release (`8.0.0-rc.13`) with a broken transitive dependency (`@effect/vitest` requiring an unpublished `effect` version) — plain `npm install prisma @prisma/client` failed with `ETARGET`. Installed the actual latest **stable** release explicitly instead: `npm install prisma@7.10.0 @prisma/client@7.10.0`.

Wrote `backend/prisma/schema.prisma` with exactly the 5 tables and 6 enums from `docs/architecture/04-database-design.md`, field-for-field (Prisma model names are singular PascalCase per Prisma convention, mapped via `@@map`/`@map` to the doc's exact snake_case table/column names — e.g. model `Lead` maps to table `leads`, field `businessName` maps to column `business_name`). No field, table, or enum value was added beyond what the doc specifies.

Prisma 7 introduced a breaking change discovered during validation: `datasource.url` is no longer allowed directly in `schema.prisma` (error `P1012`). Fixed by moving the connection URL into a new `backend/prisma.config.ts` using `defineConfig`/`env()` from `prisma/config`, per Prisma's own migration guidance (confirmed via `https://pris.ly/d/config-datasource`).

```
npx prisma validate
...
The schema at prisma/schema.prisma is valid 🚀
```

**Result**
`backend/prisma/schema.prisma` and `backend/prisma.config.ts` exist; `prisma validate` passes cleanly. Note this pins Prisma to the last stable major (7.x) rather than the npm `latest` tag, which is currently a broken pre-release — this should be revisited once Prisma 8 is actually stable.

---

## Step 3 — Initial Migration

**Status**
Complete.

**Must Read**
`docs/rules/database.md` (section 2, Migrations), `prisma/schema.prisma` (once Step 2 exists).

**Objective**
Generate and run the first Prisma migration, creating all tables and enums in the actual PostgreSQL database from Step 1.

**Scope**
Initial migration only.

**Acceptance Criteria**
Migration runs cleanly with no errors; all 5 tables and their enums exist in the database, confirmed by inspecting the database directly (e.g. via `prisma studio` or a direct `psql` query).

**Verification**
`npx prisma migrate dev --name init` initially failed with `P3014` — Prisma Migrate needs a temporary "shadow database" to compute the schema diff, which requires `CREATEDB` privilege. The dedicated `whatsapp_outreach_app` user deliberately doesn't have that (least privilege, per Step 1). Checked Prisma's own docs on this (`https://pris.ly/d/migrate-shadow`): for local development, their recommended fix is exactly to grant `CREATEDB` to the dev user — not full superuser, just that one privilege. Ran (by the user, via `sudo -u postgres psql`):

```
ALTER USER whatsapp_outreach_app CREATEDB;
```

With that granted, the migration ran cleanly:

```
Applying migration `20260912142916_init`

The following migration(s) have been created and applied from new schema changes:

prisma/migrations/
  └─ 20260912142916_init/
    └─ migration.sql

Your database is now in sync with your schema.
```

Confirmed directly via `psql` (not just trusting Prisma's own output):

```
\dt
 public | campaigns          | table
 public | conversations      | table
 public | leads              | table
 public | messages           | table
 public | settings           | table
 public | _prisma_migrations | table

\dT
 public | "CampaignStatus"
 public | "ConversationStatus"
 public | "LeadStatus"
 public | "MessageDirection"
 public | "MessageStatus"
 public | "MessageType"
```

All 5 tables and all 6 enums exist.

**Result**
The initial migration is applied and verified by direct database inspection. The dedicated app user now has `CREATEDB` (in addition to its normal DML rights on its own database) — a documented, minimal, Prisma-recommended exception to "no superuser," not a return to broad privileges.

---

## Step 4 — Prisma Client Singleton

**Status**
Complete.

**Must Read**
`docs/architecture/03-backend-architecture.md` (section 2, folder structure — `src/prisma/`).

**Objective**
Create a single shared Prisma client instance module, per the architecture doc's `src/prisma/` folder convention, that the rest of the backend imports rather than each file instantiating its own client.

**Scope**
The client module itself only.

**Acceptance Criteria**
A single Prisma client instance exists and can be imported and used to run a basic query (e.g. count rows in an empty table) successfully.

**Verification**
Another Prisma 7 breaking change surfaced here: `new PrismaClient()` with no arguments now throws — Prisma 7 requires an explicit driver adapter (confirmed via `https://www.prisma.io/docs/orm/v7/prisma-client/setup-and-configuration/introduction`). Installed `@prisma/adapter-pg` and wrote `backend/src/prisma/client.ts` as a single exported `prisma` instance built with `PrismaPg({ connectionString: env.databaseUrl })`, per the architecture doc's `src/prisma/` convention.

Ran a throwaway script (`prisma.setting.count()` against the still-empty `settings` table, deleted after use):

```
SUCCESS — settings row count: 0
```

**Result**
`backend/src/prisma/client.ts` exports one shared `prisma` instance. A real query round trip through it succeeds. Every other module that needs the database imports from this file rather than instantiating its own client.

---

## Step 5 — Webhook Persistence: Incoming Messages

**Status**
Complete.

**Must Read**
`backend/src/webhooks/whatsapp.controller.ts` (current log-only implementation), `docs/rules/backend.md` (layer flow: route → controller → service → repository → Prisma/database), `docs/architecture/04-database-design.md` (leads, messages, conversations tables and their relationships).

**Objective**
Upgrade the existing webhook handler (built in M1) so that when it receives an inbound `messages` event, it actually writes a row to the `messages` table — and creates/updates the related `leads` and `conversations` records as needed per the data model's relationships — instead of only logging to console.

**Scope**
Incoming message persistence only, following the layered flow already established in `docs/rules/backend.md` (controller → service → repository/Prisma). Explicitly excluded: campaign logic, follow-up scheduling, auto-reply detection — those are M4/M5, not M2.

**Acceptance Criteria**
Triggering the same synthetic "Incoming Message" test payload used in M1 Step 6 now results in a real row being written to the `messages` table, queryable and confirmed to exist.

**Verification**
Added `src/repositories/webhook.repository.ts` (Prisma calls only) and `src/services/webhook.service.ts` (orchestration), and wired `whatsapp.controller.ts` to call the service instead of only logging — keeping the layer flow route → controller → service → repository → Prisma from `docs/rules/backend.md`. One repository/service file each for now, not split per-domain (leads/conversations/messages) — nothing else consumes them yet; split when a second consumer needs it.

**Schema conflict found and resolved:** `messages.campaign_id` is a required (non-nullable) foreign key per the database design doc, but no campaign system exists until M4. Rather than weaken the schema to a nullable field not specified in the doc, seeded one placeholder `campaigns` row directly via SQL (`status: DRAFT`, name `"Placeholder (pre-M4)"`) so the FK constraint can be satisfied; the service looks up "any campaign" (`findFirst`) to attach inbound messages to until real campaign assignment exists. This is a deliberate, documented stopgap — M4 replaces it with real campaign assignment.

**Other interim mapping decisions** (M2 excludes auto-reply detection and lead/campaign business logic, so these are the most literal, non-invented interpretations of the existing enums, not new business rules):
- A lead created from an inbound message (no prior import) gets `status: NEW` — the enum's own definition ("imported, not yet contacted") is the closest fit available without inventing a new value.
- A new conversation gets `status: ACTIVE` ("has unread or recent messages requiring attention") — directly true of an inbound message just received.
- An inbound message is stored with `status: DELIVERED` — none of the `MessageStatus` values are written for inbound messages in the doc (they describe outbound delivery lifecycle); `DELIVERED` ("delivered to the recipient's device") is the closest literal fit since the message did arrive at its destination (us).
- Phone numbers are stored as `+` + Meta's digits-only `from` field (e.g. `+16315551181`) — not full E.164 normalization, which is explicitly M3's job (Excel/CSV import).

Triggered the exact same payload shape as M1 Step 6 against the running server:

```
curl -X POST localhost:3050/webhook -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"16315551181","id":"ABGGFlA5Fpa","timestamp":"1504902988","type":"text","text":{"body":"this is a text message"}}]}}]}]}'
→ 200
```

Confirmed by direct `psql` query (not just trusting the app's own logs):

```
select id, phone, status from leads;
 0ed65e3b-... | +16315551181 | NEW

select id, lead_id, status, last_message_at from conversations;
 2ebf0eb0-... | 0ed65e3b-... | ACTIVE | 2026-09-12 14:33:03.489

select id, meta_message_id, direction, type, content, status, delivered_at from messages;
 e0af90f6-... | ABGGFlA5Fpa | INBOUND | TEXT | this is a text message | DELIVERED | (null at this point)
```

**Result**
A real `messages` row (plus its related `leads` and `conversations` rows) is written when an inbound webhook event arrives, confirmed by direct database query. The webhook handler no longer only logs.

**Post-completion fixes (from code review):** the find-then-create/branch logic above had two real bugs, fixed after this step was first marked done:

1. **Race condition in find-or-create.** `findLeadByPhone`/`createLead` and `findConversationByLeadId`/`createConversation`/`touchConversation` were a classic TOCTOU: two concurrent webhook deliveries for the same new phone could both pass the "not found" check and race on the unique constraint, throwing and silently dropping the second message. Replaced with `upsertLeadByPhone` and `upsertConversationForLead` in `webhook.repository.ts` (single `prisma.upsert()` calls, no race possible), and simplified `handleIncomingMessage` to call them directly instead of branching.

2. **No protection against Meta's at-least-once webhook delivery.** `metaMessageId` wasn't unique in the schema, and nothing checked for an existing message before inserting — a redelivered event would create a duplicate `messages` row. Added `@unique` to `metaMessageId` in `schema.prisma` (nullable + unique — Postgres allows multiple `NULL`s) and a new migration (`20260912144818_unique_meta_message_id`, generated via `prisma migrate diff` + applied via `prisma migrate deploy`, since `migrate dev`'s interactive confirmation prompt can't run in this non-TTY environment). `handleIncomingMessage` now calls `findMessageByMetaId` first and returns the existing row immediately if found, before doing anything else.

3. **Inbound messages stored with `status: DELIVERED`.** Per `docs/architecture/04-database-design.md`, `MessageStatus` is defined purely as an outbound delivery pipeline (`PENDING` → `SENT` → `DELIVERED`/`READ`/`FAILED`), each tied to a lifecycle timestamp (`sent_at`/`delivered_at`/`read_at`/`failed_at`). Storing an inbound message as `DELIVERED` overloaded that value to mean "arrived from the lead" — with no `delivered_at` set, since the message was never actually delivered by us to anyone. This is a real risk for M6 (Inbox): any status-badge rendering or delivery-rate metric that reads `status` without also filtering on `direction` would treat a received message as a confirmed outbound delivery. Added a `RECEIVED` value to the `MessageStatus` enum in `schema.prisma` and a new migration (`20260912181454_add_received_message_status`, generated via `prisma migrate diff --from-config-datasource --to-schema` + applied via `prisma migrate deploy`, same non-interactive approach as fix 2). `createInboundMessage` in `webhook.repository.ts` now sets `status: "RECEIVED"` instead of `"DELIVERED"`. Checked all other existing code (`webhook.service.ts`'s `handleStatusUpdate`, and every other file under `src/`) for anything assuming `MessageStatus` is exclusively an outbound-delivery signal: nothing else references `MessageStatus` or reads `message.status` — `handleStatusUpdate`'s own status whitelist (`SENT`/`DELIVERED`/`READ`/`FAILED`) is unaffected, since Meta's status webhooks never send `RECEIVED` and shouldn't. No dashboard/stats/analytics code exists yet in this repo. Note: `docs/architecture/04-database-design.md`'s `MessageStatus` enum list wasn't updated with `RECEIVED` as part of this fix (out of scope for the fix as approved) — this is a known, temporary doc/schema inconsistency, flagged here per this file's "Repository Truth" rule rather than silently resolved. Resolved — RECEIVED added to docs/architecture/04-database-design.md's MessageStatus list.

**Re-verification after fix 3:** posted a fresh synthetic inbound-message payload (same shape as M1 Step 6, new `id`/`from` to force a new row) against a running server:

```
curl -X POST localhost:3050/webhook -d '{"entry":[{"changes":[{"value":{"messages":[{"from":"16315551182","id":"ABGGFlA5Fpb","timestamp":"1504902988","type":"text","text":{"body":"this is a text message"}}]}}]}]}'
→ 200
```

Confirmed by direct `psql` query:

```
select id, meta_message_id, direction, type, content, status, delivered_at from messages where meta_message_id = 'ABGGFlA5Fpb';
 9abbea82-... | ABGGFlA5Fpb | INBOUND | TEXT | this is a text message | RECEIVED | (null)
```

`status` is `RECEIVED`, not `DELIVERED`, and `delivered_at` stays null — no longer implying a delivery event that never happened. `prisma validate` still passes after this fix. `npm run build` (`tsc -p tsconfig.json`) still fails with a pre-existing, unrelated error (`tsconfig.json(6,27): error TS5103: Invalid value for '--ignoreDeprecations'`) — confirmed via `git diff` that `tsconfig.json` is untouched by this fix; isolating the changed files (`webhook.repository.ts`, `schema.prisma`) against the same compiler options outside the broken flag type-checks cleanly.

**Re-verification after both prior fixes (1 and 2):** posted the identical M1 Step 6 payload twice in a row against a running server:

```
first POST  → 200
second POST → 200 (duplicate delivery)

select id, meta_message_id, content, created_at from messages where meta_message_id = 'ABGGFlA5Fpa';
 e0af90f6-... | ABGGFlA5Fpa | this is a text message | 2026-09-12 14:33:03.494   ← same row, same created_at as before
```

One row, unchanged `created_at` — the second delivery was a no-op, not a duplicate insert. `prisma validate` and a full `tsc`/`npm run build` still pass.

---

## Step 6 — Webhook Persistence: Status Updates

**Status**
Complete.

**Must Read**
`backend/src/webhooks/whatsapp.controller.ts` (current log-only implementation), `docs/architecture/04-database-design.md` (messages table — status, sent_at/delivered_at/read_at/failed_at fields; MessageStatus enum).

**Objective**
Upgrade the same webhook handler so that when it receives a `statuses` event (sent/delivered/read/failed), it updates the corresponding message record's `status` and relevant timestamp field (`sent_at`/`delivered_at`/`read_at`/`failed_at`) rather than only logging.

**Scope**
Status update persistence only.

**Acceptance Criteria**
Triggering the same synthetic "Status Message" (Delivered) test payload used in M1 Step 7 now results in the corresponding message row's `status` and `delivered_at` fields being updated in the database, confirmed by querying it.

**Verification**
`webhook.service.ts`'s `handleStatusUpdate` looks up the message by `meta_message_id`, maps the payload's `status` to the `MessageStatus` enum, and updates the matching timestamp field (`sent_at`/`delivered_at`/`read_at`/`failed_at`). An unrecognized status or an unmatched `meta_message_id` is logged and skipped, not thrown — consistent with the webhook handler's existing "never crash" rule.

Triggered the exact same payload shape as M1 Step 7 (status `delivered` for the message ID just created in Step 5) against the running server:

```
curl -X POST localhost:3050/webhook -d '{"entry":[{"changes":[{"value":{"statuses":[{"id":"ABGGFlA5Fpa","status":"delivered","timestamp":"1504902988","recipient_id":"16315551181"}]}}]}]}'
→ 200
```

Confirmed by direct `psql` query:

```
select id, meta_message_id, direction, type, content, status, delivered_at from messages;
 e0af90f6-... | ABGGFlA5Fpa | INBOUND | TEXT | this is a text message | DELIVERED | 2017-09-08 20:36:28
```

`delivered_at` is populated from the payload's own timestamp (`1504902988` → 2017-09-08), not "now" — proving the update actually read the payload rather than just stamping the current time.

**Result**
A real `messages` row's `status` and `delivered_at` are updated from a status-update webhook event, confirmed by direct database query.

---

## Step 7 — Basic API Structure Confirmation

**Status**
Complete.

**Must Read**
`backend/src/middleware/errorHandler.ts` (current implementation, built in M1), `docs/architecture/03-backend-architecture.md` (section 8, Error Handling), `docs/rules/backend.md` (section on Requests and Responses).

**Objective**
Confirm the existing global error handler still fits M2's needs with a database layer now in place — specifically, that Prisma errors (e.g. connection failures, constraint violations) are caught and returned as consistent JSON errors rather than crashing the process or leaking raw stack traces.

**Scope**
Verification and minor extension of the existing error handler only, not a rewrite. Explicitly excluded: building any new API endpoints — that belongs to M3 onward.

**Acceptance Criteria**
A deliberately triggered Prisma error (e.g. a duplicate unique constraint violation) results in a clean, consistent JSON error response, not an unhandled crash.

**Verification**
Ran the existing `errorHandler` (unchanged) against a real `PrismaClientKnownRequestError` (duplicate `leads.phone`, code `P2002`), calling the middleware function directly with a stub response object (no HTTP route needed — out of scope per this step). Before any change:

```
status: 500
body: {"error":"\nInvalid `prisma.lead.create()` invocation in\n/home/.../error-handler-check.ts:33:23\n\n...\nUnique constraint failed on the constraint: `leads_phone_key`"}
```

It didn't crash and did return JSON — but leaked Prisma's raw internal message, including a local file path and source snippet, which isn't a "clean" API response. Extended `errorHandler.ts` with one small branch: if the error is a `Prisma.PrismaClientKnownRequestError`, return 409 with `"A record with this value already exists."` for `P2002`, or 500 with a generic `"Database error."` for any other Prisma error code — before falling through to the existing generic handling for everything else. Not a rewrite; the non-Prisma path is untouched. Re-ran the same check:

```
status: 409
body: {"error":"A record with this value already exists."}
```

**Result**
A deliberately triggered Prisma unique-constraint violation now returns a clean, minimal JSON error with no leaked internals, no crash. The full raw error is still logged server-side via the existing `console.error` — only what reaches the HTTP response changed.

---

## Milestone Checklist

- [x] Step 1 — PostgreSQL Setup and Connection
- [x] Step 2 — Prisma Installation and Schema Definition
- [x] Step 3 — Initial Migration — *note: required granting `CREATEDB` to the dedicated app user for Prisma's shadow database (Prisma's own recommended local-dev workaround)*
- [x] Step 4 — Prisma Client Singleton
- [x] Step 5 — Webhook Persistence: Incoming Messages — *caveat: messages are attached to a seeded placeholder campaign until real campaign assignment exists in M4; find-then-create race condition and duplicate-webhook-delivery bug found in code review, both fixed and re-verified (upsert + unique `meta_message_id` + early-return dedup guard)*
- [x] Step 6 — Webhook Persistence: Status Updates
- [x] Step 7 — Basic API Structure Confirmation
