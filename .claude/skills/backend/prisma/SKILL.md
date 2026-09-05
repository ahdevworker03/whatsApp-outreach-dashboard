---
name: prisma
description: Prisma ORM work for `lib/db/prisma`, including schema edits, generated client usage, migrations, and model relations. Applicable when writing Prisma schemas, designing database models, executing database queries, optimizing performance, or managing schema migrations.
---

# Prisma ORM

## Purpose

This skill guides the agent in using Prisma ORM to interact with PostgreSQL databases in a type-safe, production-ready manner. Prisma is a next-generation ORM that provides type-safe database queries, an intuitive data model, and powerful migrations. The skill covers schema design, query optimization, migration strategies, type safety, and security — all following official Prisma best practices.

---

## When to Load

- User is writing, modifying, or introspecting Prisma schema files (`schema.prisma`).
- User mentions: `Prisma`, `schema`, `model`, `relation`, `@relation`, `PrismaClient`, `migration`, `prisma migrate`, `query`, `findMany`, `create`, `update`, `transaction`.
- User is designing database models, defining relations, or planning schema changes.
- User is writing database queries or optimizing existing queries.
- User is managing migrations or deploying to production.

---

## When NOT to Load

- Pure frontend or React component development without database interaction.
- General PostgreSQL query tuning without Prisma (see `postgresql` skill).
- Infrastructure or deployment configuration unrelated to Prisma.
- API design without implementation details (see `api-design` skill).

---

## Core Principles

1. **Type Safety by Default** — Prisma Client provides full type safety for queries, including partial queries and included relations. Leverage generated types instead of duplicating interfaces.
2. **Single PrismaClient Instance** — Create one global `PrismaClient` instance and reuse it throughout the application. Creating multiple instances creates multiple connection pools, which can exhaust the database's connection limit.
3. **Explicit Relations** — Always define both sides of a relation in the Prisma schema to keep the schema clear and maintainable.
4. **Index What You Query** — Index fields used in `where`, `orderBy`, and relations. Without indexes, the database scans entire tables, which becomes slower as tables grow.
5. **Prefer ORM API Over Raw SQL** — Use Prisma ORM's query API by default. Use raw SQL only when you need features not supported by Prisma ORM or heavily optimized queries.
6. **Migrations Are Version Controlled** — Migration files belong in version control. Use `prisma migrate deploy` in production — never `migrate dev` or `db push`.

---

## Decision Rules

### Schema Design

- **IF** modeling a new entity, **THEN** use PascalCase for model names (singular) and camelCase for field names.
- **IF** the database uses different naming conventions (e.g., snake_case tables), **THEN** map names using `@map` and `@@map` to keep the Prisma Client API natural while supporting the legacy naming.
- **IF** a field has a finite set of values that rarely changes, **THEN** use Prisma `enum` for type safety. **IF** values change frequently or are user-generated, **THEN** use `String` to avoid schema changes.
- **IF** the schema grows large, **THEN** use multi-file Prisma schemas (available since v6.7.0). Group related models into files under `prisma/models/`. The `schema.prisma` file (with the generator block) and `migrations/` directory must be at the same level.

### Relations

- **IF** a one-to-many relation exists (e.g., `User` → `Post`), **THEN** the foreign key lives on the "many" side. Each post points at one user (`Post.authorId`), while a user points to a list of posts (`User.posts`).
- **IF** a one-to-one relation exists (e.g., `User` ↔ `Profile`), **THEN** put the foreign key on the dependent side — the record that cannot exist on its own. A profile needs a user; a user does not need a profile. Add `@unique` to the foreign key to enforce the "at most one" constraint.
- **IF** a many-to-many relation exists (e.g., `User` ↔ `Group`), **THEN** use an implicit relation table (letting Prisma handle it under the hood) OR an explicit model if extra fields are needed on the join table.
- **ALWAYS** define both sides of a relation to keep the schema clear and maintainable.

### Query Optimization

- **IF** fetching a list of records and then related data per record, **THEN** use `include` or `select` in a single query to avoid the N+1 problem.
- **IF** working with GraphQL resolvers where `findUnique` queries are called per item, **THEN** rely on Prisma Client's dataloader — it automatically batches `findUnique()` queries that occur in the same event-loop tick with the same `where` and `include` parameters.
- **IF** reading or writing large amounts of data, **THEN** use bulk operations (`createMany`, `updateMany`, `deleteMany`) instead of individual queries. Bulk operations automatically run as transactions.
- **IF** implementing pagination for large datasets, **THEN** use cursor-based pagination (which scales better because it uses indexed columns). Use offset pagination only for small datasets where jumping to arbitrary pages is needed.
- **IF** a query returns more fields than needed, **THEN** use `select` to whitelist specific fields, or `omit` to exclude sensitive fields. You cannot combine `select` and `omit` in the same query.
- **IF** you need features not supported by the ORM API, **THEN** use raw SQL with parameterized queries. Never concatenate user input into SQL strings.

### Connection Management

- **IF** building a long-running application (traditional server), **THEN** instantiate `PrismaClient` once in a dedicated file and reuse it throughout the application.
- **IF** building a serverless application (AWS Lambda, Vercel, Cloudflare Workers), **THEN** instantiate `PrismaClient` outside the handler function to reuse connections across warm invocations. Do not call `$disconnect()` at the end of each invocation — the container may be reused.
- **IF** using Prisma Postgres, **THEN** use the pooled connection string (`pooled.db.prisma.io`) for application queries and the direct connection string (`db.prisma.io`) for migrations, introspection, and admin tooling.
- **IF** in a serverless environment with high concurrency, **THEN** consider external connection poolers like PgBouncer.

### Migrations

- **IF** developing locally, **THEN** use `prisma migrate dev --name <descriptive_name>` to create and apply migrations.
- **IF** prototyping quickly (schema not finalized), **THEN** use `prisma db push` to sync the schema without generating migration files — but be aware it may reset data.
- **IF** deploying to production, **THEN** use only `prisma migrate deploy` with committed migrations. Never use `migrate dev` (can prompt to reset DB) or `db push` (can be destructive and locks you into a migrationless workflow).
- **IF** introspecting an existing database, **THEN** use `prisma db pull` and then manually adjust the resulting schema to adhere to Prisma's naming conventions.
- **IF** customizing generated SQL, **THEN** use `prisma migrate dev --create-only` to generate the migration file without applying it, then edit the SQL before applying.

### Type Safety

- **IF** you need the return type of a Prisma query, **THEN** use Prisma's generated types from the `Prisma` namespace instead of duplicating interfaces.
- **IF** working with `select` or `include` options, **THEN** use the corresponding generated types (e.g., `Prisma.UserSelect`) to type your objects.

---

## Best Practices

### Schema Design

1. **Use PascalCase for model names (singular)** and **camelCase for field names**. This keeps the schema readable and the generated Client API natural.
2. **Map to legacy naming with `@map` and `@@map`** when the database uses different conventions (e.g., snake_case).
3. **Prefer UUIDs for public identifiers** — use `@default(uuid())` or `@default(dbgenerated("gen_random_uuid()"))` for PostgreSQL.
4. **Always include timestamp fields** — `createdAt DateTime @default(now())` and `updatedAt DateTime @updatedAt`.
5. **Index foreign key fields** — manually add indexes on relation scalar fields to avoid full table scans.
6. **Index fields used in `where`, `orderBy`, and relations** — without indexes, the database can be forced to scan entire tables.
7. **Use enums for finite, stable sets of values**; use `String` for values that change frequently or are user-generated.

### Query Performance

1. **Reuse a single `PrismaClient` instance** — creating multiple instances creates multiple connection pools.
2. **Select only needed fields** — use `select` to whitelist fields instead of returning all scalar fields by default.
3. **Use bulk operations for multiple records** — `createMany`, `updateMany`, and `deleteMany` automatically run as transactions.
4. **Prevent N+1 queries** — use `include` or `select` to fetch related data in a single query, or rely on Prisma's dataloader for batched `findUnique` queries.
5. **Use cursor-based pagination for large datasets** — it scales better because it uses indexed columns.

### Security

1. **Prisma ORM's API is safe by default** — it uses parameterized queries.
2. **For raw queries, always use parameterized queries or tagged templates** — never concatenate user input into SQL strings.
3. **Exclude sensitive fields from query results** using `omit` or `select`.
4. **Validate and sanitize user input** before database operations.

### Deployment

1. **Use `prisma migrate deploy` in production** — it applies existing migrations in a non-interactive way, uses advisory locking to prevent concurrent runs, and is safe for production data.
2. **Never use `migrate dev` or `db push` in production** — they are for development only.
3. **In serverless environments, instantiate `PrismaClient` outside the handler** — reuse connections across warm invocations.
4. **Do not call `$disconnect()` at the end of each serverless invocation** — the container may be reused.

---

## Anti-Patterns

| Anti-Pattern                                | Why it is wrong                                                 | Correct approach                         |
| ------------------------------------------- | --------------------------------------------------------------- | ---------------------------------------- |
| Creating multiple `PrismaClient` instances  | Exhausts the database connection pool and slows down queries.   | Use a single global instance.            |
| Using `migrate dev` in production           | Can prompt to reset the database; unsafe for production.        | Use `migrate deploy`.                    |
| Using `db push` in production               | Can be destructive and locks you into a migrationless workflow. | Use `migrate deploy`.                    |
| Not defining both sides of a relation       | Schema becomes unclear and harder to maintain.                  | Always define both sides.                |
| Not indexing foreign key fields             | Full table scans degrade performance as tables grow.            | Add indexes on relation scalar fields.   |
| String concatenation in raw SQL             | Allows SQL injection attacks.                                   | Use parameterized queries.               |
| Storing sensitive fields in query results   | Exposes passwords, tokens, or PII.                              | Use `omit` or `select` to exclude them.  |
| Calling `$disconnect()` after every request | Prevents connection reuse; slows down the app.                  | Let the client manage connections.       |
| Using `select` and `omit` together          | Not allowed; causes query errors.                               | Use either `select` or `omit`, not both. |

---

## Common Mistakes & Edge Cases

| Mistake                                     | Symptom                                                   | Solution                                                                        |
| ------------------------------------------- | --------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `findUnique` not batching in GraphQL        | N+1 queries; each resolver runs a separate query.         | Use the fluent API (`user.findUnique(...).posts()`) to leverage the dataloader. |
| `updatedAt` not updating on bulk writes     | `@updatedAt` is skipped on `updateMany`.                  | Manually set `updatedAt` in bulk updates.                                       |
| `prisma migrate dev` resetting the DB       | Development database loses data.                          | Use `--create-only` to review SQL first, or use a dedicated dev database.       |
| Serverless connection exhaustion            | Each invocation creates a new client and connection pool. | Instantiate `PrismaClient` outside the handler.                                 |
| Raw SQL not using parameterized queries     | SQL injection vulnerability.                              | Always use parameterized queries.                                               |
| Migration conflict in CI/CD                 | Multiple developers generate conflicting migrations.      | Use `--create-only` to generate SQL without applying, then merge.               |
| Transaction timeouts                        | Long-running transactions exceed the default timeout.     | Use `$transaction` with appropriate timeout settings.                           |
| Prisma Client not found after schema change | Generated client is out of sync.                          | Run `prisma generate` after schema changes.                                     |

---

## Related Skills

- `database-schema-design` – for designing schemas and relationships before implementing in Prisma.
- `postgresql` – for PostgreSQL-specific performance tuning and indexing.
- `migrations` – for managing migration history, squashing, and resolving conflicts.
- `typescript` – for leveraging Prisma's generated types.
- `api-design` – for aligning Prisma models with API resources.
- `testing` – for using a dedicated test database with Prisma Migrate.

---

## Official References

- [Prisma Documentation – Best Practices](https://www.prisma.io/docs/orm/more/best-practices)
- [Prisma Schema Reference – Naming Conventions](https://www.prisma.io/docs/orm/reference/prisma-schema-reference#naming-conventions)
- [Prisma Relations – Relational Data Modeling](https://www.prisma.io/docs/orm/next/data-modeling/relational-databases)
- [Prisma Relations – Relation Mode](https://www.prisma.io/docs/orm/prisma-schema/data-model/relations/relation-mode)
- [Query Optimization – Performance Guide](https://www.prisma.io/docs/orm/prisma-client/queries/advanced/query-optimization-performance)
- [Connection Management – Prisma Client](https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections/connection-management)
- [Prisma Migrate – Mental Model](https://www.prisma.io/docs/orm/prisma-migrate/understanding-prisma-migrate/mental-model)
- [Type Safety – Prisma Client](https://www.prisma.io/docs/orm/prisma-client/type-safety)
- [Prisma Postgres – Connection Strings](https://www.prisma.io/docs/postgres/database/connecting-to-your-database)
- [Next.js + Prisma – Best Practices](https://www.prisma.io/docs/orm/more/troubleshooting/nextjs)
- [Production Deployment – Migration Strategies](https://www.prisma.io/docs/orm/more/best-practices#production-deployment)
