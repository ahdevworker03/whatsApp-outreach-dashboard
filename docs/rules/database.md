# Database Rules

## Table of Contents

| # | Section |
| - | ------- |
| 1 | [Persistence Truth](#persistence-truth) |
| 2 | [Migrations](#migrations) |
| 3 | [Conventions](#conventions) |
| 4 | [Multi-Tenancy](#multi-tenancy) |
| 5 | [Integrity](#integrity) |
| 6 | [Safety](#safety) |

These rules govern PostgreSQL persistence through Prisma in this repository. SQL and Prisma specifics belong in the corresponding skills.

## Persistence Truth

- PostgreSQL is the system of record.
- Prisma is the approved backend persistence path.
- `lib/db/prisma/schema.prisma` is the current Prisma data-model source.
- Generated Prisma client artifacts must not be edited manually.

## Migrations

- Every schema change requires an intentional migration.
- Schema changes precede dependent application/API behavior.
- Inspect current data before introducing constraints, unique indexes, backfills, or ownership rules.
- Do not modify already-applied migrations unless the repository explicitly requires that workflow.

## Conventions

Preserve the current approved conventions:

- UUID primary keys.
- Singular table names and `snake_case` database naming.
- Money as `Decimal(10, 2)`.
- Audit fields and soft delete on business models where applicable.

## Multi-Tenancy

- Tenant-owned models should carry `organization_id` according to approved schema conventions.
- Scope tenant-owned reads and writes by organization.
- Any model that omits a direct `organization_id` must have an explicitly approved ownership/isolation strategy.
- Never allow ordinary tenant operations to trust a client-controlled organization identifier when authenticated tenant context is available.

## Integrity

- Use foreign keys, uniqueness, and check constraints where PostgreSQL can reliably enforce invariants.
- Database constraints complement application validation; they do not replace it.
- Preserve referential integrity.
- Prefer soft deletion for business history unless an approved requirement requires permanent removal.

## Safety

- Follow `safety.md` for destructive operations.
- Never reset, truncate, drop, or perform destructive direct data repair against development or production data without explicit approval.
- Verify the target database before destructive commands.
- The dedicated `vehicle_rental_test` database may be reset when required by an approved task/testing workflow.
- Never treat destructive test-database permissions as permission to modify development data.
