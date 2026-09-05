---
name: database-schema-design
description: PostgreSQL schema design with Prisma ORM, including data modeling, normalization, indexing strategies, primary keys, foreign key constraints, naming conventions, relations (one-to-one, one-to-many, many-to-many), enums, JSON fields, performance optimization, and migration planning. Applicable when designing database tables, relations, indexes, or evolving schema over time.
---

# Database Schema Design

## Purpose

This skill guides the agent in designing robust, performant, and maintainable PostgreSQL database schemas using Prisma's data modeling language. It covers normalization, primary and foreign keys, relationships, indexing, data types, naming conventions, enums, JSON fields, and schema evolution. The goal is to create schemas that are efficient, scalable, and aligned with application requirements while following PostgreSQL and Prisma best practices.

---

## When to Load

- User is designing, reviewing, or refactoring database models, tables, or schemas.
- User mentions: `schema`, `model`, `table`, `relation`, `foreign key`, `primary key`, `index`, `migration`, `normalization`, `denormalization`, `Prisma`, `PostgreSQL`, `enum`, `JSON`, `query performance`.
- User is creating new Prisma models or modifying existing ones.
- User asks about data modeling decisions, relationships, indexing strategies, or schema evolution.
- User is planning new features that require persistent data storage.

---

## When NOT to Load

- Pure frontend components or UI design.
- Application logic that does not involve schema design (e.g., API routes, business logic).
- Infrastructure or deployment configuration.
- General API design (see `api-design`) unless directly related to the data layer.

---

## Core Principles

1. **Normalization by Default** – Design schemas to minimize redundancy and maintain data integrity. Apply third normal form (3NF) unless performance or specific use cases justify denormalization.
2. **Primary Keys Are Required and Immutable** – Every model must have a single primary key field (`@id`). Use auto-incrementing integers or, preferably, UUIDs for public-facing keys.
3. **Relationships Should Be Explicit** – Define relations with foreign key constraints using `@@relation` and explicitly control `onDelete` and `onUpdate` behavior.
4. **Indexes for Performance** – Index fields used in `WHERE`, `JOIN`, `ORDER BY`, and `GROUP BY` clauses. Use composite indexes for multi-column filters.
5. **Consistent Naming Conventions** – Use singular names for models, `camelCase` for fields, `plural` for relation fields when appropriate. Follow Prisma's conventions for relation fields and references.
6. **Schema Evolution Is a First-Class Concern** – Design schemas to be forward-compatible; consider how migrations will be applied without downtime.
7. **Use Constraints to Enforce Business Rules** – Use `unique`, `default`, `updatedAt`, `createdAt`, and database-level constraints where possible.

---

## Decision Rules

### Primary Keys

- **ALWAYS** define a primary key with `@id`. Prefer `@default(uuid())` or `@default(dbgenerated("gen_random_uuid()"))` for public-facing IDs.
- **IF** using auto-incrementing integers, **THEN** use `@default(autoincrement())` but be aware of enumeration risks for public endpoints.
- **IF** using UUIDs, **THEN** use `@default(uuid())` (Prisma's built-in) or `@default(dbgenerated("gen_random_uuid()"))` for PostgreSQL native UUID generation.
- **DO NOT** use composite primary keys unless absolutely necessary; Prisma's support is limited and they complicate relations.

### Relationships

- **IF** a one-to-one relationship exists (e.g., `User` ↔ `Profile`), **THEN** define the foreign key on the dependent side: `profile: Profile? @relation(fields: [profileId], references: [id])`.
- **IF** a one-to-many relationship exists (e.g., `User` → `Post`), **THEN** define the foreign key on the many side: `authorId: Int` referencing `User.id`.
- **IF** a many-to-many relationship exists (e.g., `User` ↔ `Group`), **THEN** use an explicit join table (implicit many-to-many with `@relation`) or explicit model if extra fields are needed.
- **ALWAYS** define `onDelete` and `onUpdate` behavior. For most cases, use `onDelete: Cascade` or `onDelete: Restrict` to maintain referential integrity.
- **IF** a relation should be optional, **THEN** mark the foreign key field as `?` and the relation as optional.

### Indexing

- **IF** a field is frequently used in `WHERE` clauses (especially with equality or range conditions), **THEN** create a `@@index` on that field.
- **IF** multiple fields are often queried together (e.g., `firstName` + `lastName`), **THEN** create a composite index.
- **IF** a field is used in `ORDER BY` frequently, **THEN** index that field to avoid filesort.
- **IF** a field is used in `JOIN` conditions, **THEN** index the foreign key field.
- **IF** using unique constraints, **THEN** consider indexing them (`@@unique` automatically creates an index).
- **DO NOT** create indexes on very small tables (under 1000 rows) or fields with low cardinality (e.g., booleans) unless necessary.

### Data Types

- **String**: Use `String` with appropriate `@db.VarChar(length)` or `@db.Text` for unlimited length.
- **Integer**: Use `Int` for 32-bit, `BigInt` for 64-bit (e.g., for `BigInt` IDs).
- **Float/Double**: Use `Float` for floating-point approximations, but prefer `Decimal` for precise monetary values.
- **Boolean**: Use `Boolean` for true/false flags.
- **Date/Time**: Use `DateTime` for timestamps. For timezone-aware fields, rely on PostgreSQL's `timestamp with time zone` (default).
- **JSON**: Use `Json` for unstructured data, but avoid overuse; prefer normalized models for structured data.
- **Enum**: Use `enum` for static sets of values. Define enums in Prisma: `enum Role { USER ADMIN }`.
- **Array**: Use `String[]` etc., but prefer relational models for many-to-many relationships.

### Naming Conventions

- **Model names**: Singular, PascalCase (e.g., `User`, `Post`, `Profile`).
- **Field names**: `camelCase` (e.g., `firstName`, `createdAt`).
- **Foreign key fields**: Use the related model name in `camelCase` + `Id` suffix (e.g., `userId` for `User` relation).
- **Relation fields**: Use the same name as the model in `camelCase` (e.g., `author: User`).
- **Enum names**: PascalCase (e.g., `Role`, `Status`).

---

## Best Practices

1. **Use UUIDs for public identifiers** – Prefer UUID for primary keys in models exposed via API. This prevents enumeration attacks and hides internal counts.
2. **Add timestamp fields** – Always include `createdAt` and `updatedAt` fields:
   ```prisma
   createdAt DateTime @default(now())
   updatedAt DateTime @updatedAt
   ```
3. **Use `@default(now())` for creation timestamps** and `@updatedAt` for auto-updating.
4. **Define constraints clearly** – Use `@unique`, `@default`, `@relation` to enforce database-level constraints.
5. **Explicitly define relation fields** – For clarity and to control the underlying foreign key names, define relation fields with `fields` and `references`.
6. **Prefer explicit join tables for many-to-many** – This allows adding extra fields (e.g., `joinedAt`, `role`) without breaking the relation.
7. **Index foreign keys** – Always add an index on foreign key columns to speed up joins.
8. **Use `DbGenerated` for advanced functions** – For PostgreSQL-specific functions like `gen_random_uuid()`, use `@default(dbgenerated("gen_random_uuid()"))`.
9. **Version schema migrations** – Use Prisma migrations with `prisma migrate` to manage schema changes. Keep migration files in version control.
10. **Split large schemas into multiple files** – Use Prisma's `@@schema` feature (or separate files with `// @prisma/schema` comments) for organization, but keep it consistent.

---

## Anti-Patterns

| Anti-Pattern                                                      | Why it is wrong                                                  | Correct approach                                                                         |
| ----------------------------------------------------------------- | ---------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Using `@id` with `autoincrement` for public IDs                   | Enables enumeration attacks and exposes business growth metrics. | Use UUIDs for public keys; keep autoincrement for internal use only if needed.           |
| Storing multiple values in a single field (e.g., comma-separated) | Violates normalization; difficult to query and index.            | Use a related table (one-to-many or many-to-many).                                       |
| Over-normalization                                                | Excessive joins degrade performance.                             | Denormalize carefully when performance justifies it (e.g., materialized views, caching). |
| Not adding indexes                                                | Queries become slow as data grows.                               | Identify hot query patterns and add appropriate indexes.                                 |
| Using `Json` for structured data                                  | Bypasses schema validation and indexing.                         | Use relational models with proper fields and constraints.                                |
| Not handling `onDelete` cascades                                  | Orphaned records or foreign key errors.                          | Set `onDelete: Cascade` or `Restrict` explicitly.                                        |
| Using `String` without length constraint                          | Inefficient storage; no validation.                              | Use `@db.VarChar(length)` with appropriate maximum length.                               |
| Ignoring `updatedAt`                                              | No way to know when a record was last updated.                   | Always include `updatedAt` with `@updatedAt`.                                            |
| Using booleans for status fields                                  | Limited to two states; not extensible.                           | Use enums or a foreign key to a status table.                                            |

---

## Common Mistakes & Edge Cases

| Mistake                                         | Symptom                                                    | Solution                                                                                  |
| ----------------------------------------------- | ---------------------------------------------------------- | ----------------------------------------------------------------------------------------- |
| Forgetting to index foreign keys                | Slow joins and subqueries.                                 | Add `@@index` on foreign key fields.                                                      |
| Not setting `onDelete: Cascade`                 | Deleting parent records fails or leaves orphaned children. | Explicitly define `onDelete` behavior.                                                    |
| Using `String` for IDs without `@id`            | No primary key; duplicates possible.                       | Always use `@id` on the primary key field.                                                |
| Using `Json` for highly queryable fields        | Poor performance on JSON queries.                          | Normalize into separate tables.                                                           |
| Not handling `optional` relations correctly     | Errors when relation is missing.                           | Mark foreign key and relation as `?` for optional relationships.                          |
| Using `updatedAt` without `@updatedAt`          | Timestamp does not update automatically.                   | Add `@updatedAt` to the field.                                                            |
| Using `@default(now())` with timezone confusion | Timestamps are stored without timezone.                    | Use `@default(now())` which uses UTC; PostgreSQL's `timestamp with time zone` is default. |
| Hardcoding enum values in application code      | Schema and code drift.                                     | Define enums in Prisma schema; use generated types.                                       |
| Not planning for schema evolution               | Migrations break production.                               | Design incremental, backward-compatible migrations.                                       |

---

## Related Skills

- `prisma` – for detailed Prisma modeling, migrations, and client usage.
- `postgresql` – for advanced PostgreSQL features, performance tuning, and query optimization.
- `migrations` – for managing schema migrations and zero-downtime deployment.
- `api-design` – for aligning schema with API resource design.
- `data-fetching` – for building efficient queries from the client side.
- `performance` – for monitoring and optimizing database performance.

---

## Official References

- [Prisma Data Modeling Guide](https://www.prisma.io/docs/concepts/components/prisma-schema/data-model)
- [Prisma Relations Overview](https://www.prisma.io/docs/concepts/components/prisma-schema/relations)
- [Prisma Indexes](https://www.prisma.io/docs/concepts/components/prisma-schema/indexes)
- [PostgreSQL Data Types Documentation](https://www.postgresql.org/docs/current/datatype.html)
- [PostgreSQL Indexing Documentation](https://www.postgresql.org/docs/current/indexes.html)
- [PostgreSQL Constraints](https://www.postgresql.org/docs/current/ddl-constraints.html)
- [PostgreSQL Performance Tips](https://www.postgresql.org/docs/current/performance-tips.html)
- [Prisma Migration Guide](https://www.prisma.io/docs/guides/database/developing-with-prisma-migrate)
- [UUID Generation in PostgreSQL](https://www.postgresql.org/docs/current/functions-uuid.html)
