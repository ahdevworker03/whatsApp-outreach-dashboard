# Database Rules

These rules describe the conventions actually established in this repo's Prisma/PostgreSQL layer. When code and this file disagree, flag it (per `docs/rules/project.md`'s Repository Truth) — don't silently pick one.

## 1. Persistence Truth

- PostgreSQL is the system of record; Prisma is the only approved persistence path.
- `backend/prisma/schema.prisma` is the current data-model source — itself derived from `docs/architecture/04-database-design.md`. Do not add a field, table, or enum value to the schema that isn't in that doc; update the doc first, then the schema.
- `backend/src/prisma/client.ts` is the shared Prisma client singleton. Every persistence-touching module imports it from there — never instantiate a second `PrismaClient`.
- Generated Prisma client artifacts must not be edited manually.

## 2. Migrations

- Every schema change requires a real migration (`npx prisma migrate dev`), tracked under `backend/prisma/migrations/`.
- Schema changes precede the application/API behavior that depends on them.
- Inspect current data before introducing a new constraint, unique index, or backfill.
- Do not modify an already-applied migration.

## 3. Conventions

- UUID primary keys: `id String @id @default(uuid()) @db.Uuid`.
- Prisma field names are `camelCase`; every field maps to a `snake_case` column via `@map`, and every model maps to a plural `snake_case` table via `@@map` (e.g. `businessName` → `business_name`, model `Lead` → table `leads`).
- Phone numbers are stored normalized to E.164 (`src/lib/phone.ts`'s `normalizePhoneNumber`). Normalization happens once, at write time (import or webhook) — never assumed or re-derived on read.

## 4. Multi-Tenancy

Not applicable. This is a single-user tool (`docs/rules/project.md`'s Explicit Non-Goals list "no multi-tenancy, no multiple users, no roles/permissions") — no `organization_id`, no tenant scoping, no per-tenant isolation strategy anywhere in the schema.

## 5. Integrity

- Use foreign keys and uniqueness constraints where Postgres can reliably enforce an invariant (e.g. `leads.phone @unique`; `Message`/`Conversation` foreign keys to `Lead`; `Message` to `Campaign`).
- Database constraints complement application validation; they do not replace it. Concretely: `src/lib/leadRowValidator.ts` detects and reports a duplicate phone itself before insert, rather than letting `leads.phone`'s unique constraint reject it as an unhandled `P2002` mid-batch.
- Preserve referential integrity between `Lead`, `Campaign`, `Message`, and `Conversation`.

## 6. Safety

- Never reset, truncate, drop, or run destructive direct data repair against the dev database without explicit approval.
- Verify the target database (`DATABASE_URL`, currently the local `whatsapp_outreach_dev` cluster) before any destructive command.
- A verification script that creates rows against the real dev database (e.g. `scripts/verify-leads-service.ts`) must delete every row it created before finishing.
