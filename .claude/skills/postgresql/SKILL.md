---
name: postgresql
description: PostgreSQL work for the Prisma-backed database in this repository, including schema inspection, migrations, query analysis, and performance tuning. Applicable when designing schemas, writing SQL queries, optimizing query performance, configuring PostgreSQL settings, implementing security, or monitoring database health.
---

# PostgreSQL

## Purpose

This skill guides the agent in managing, optimizing, and securing PostgreSQL databases following official PostgreSQL documentation. It covers indexing strategies, query planning, performance tuning, security configuration, monitoring, and routine maintenance. The goal is to ensure production PostgreSQL databases are performant, secure, and reliable.

---

## When to Load

- User is writing, reviewing, or optimizing SQL queries.
- User mentions: `PostgreSQL`, `postgres`, `query plan`, `EXPLAIN`, `ANALYZE`, `VACUUM`, `index`, `pg_stat`, `performance`, `tuning`, `GUC`, `connection pooling`.
- User asks about indexing strategies, query optimization, or database performance.
- User is configuring PostgreSQL settings, implementing security, or monitoring database health.
- User is designing schemas or data models (see also `database-schema-design`).

---

## When NOT to Load

- Pure application logic without database interaction.
- Frontend or React development.
- Prisma-specific modeling (see `prisma` and `database-schema-design` skills).
- Infrastructure or deployment configuration unrelated to PostgreSQL.

---

## Core Principles

1. **Measure Before Tuning** – Always use `EXPLAIN ANALYZE` to understand actual query performance before making changes. Never guess about performance bottlenecks.
2. **Statistics Drive Decisions** – The query planner relies on accurate table statistics. Always run `ANALYZE` after significant data changes to ensure the planner has up-to-date information.
3. **Index with Purpose** – Create indexes based on actual query patterns, not theoretical ones. Each index adds overhead on writes; only create indexes that will be used.
4. **Secure by Default** – Use SCRAM-SHA-256 authentication, enforce SSL/TLS connections, and follow the principle of least privilege for database users.
5. **Monitor Continuously** – Use PostgreSQL's cumulative statistics system (`pg_stat_*` views) and system monitoring tools to track performance and health.
6. **Plan for Maintenance** – Regular `VACUUM` and `ANALYZE` are essential for performance. Use autovacuum to automate this.

---

## Decision Rules

### Query Optimization

- **IF** a query is slow, **THEN** use `EXPLAIN ANALYZE` to examine the execution plan.
- **IF** a sequential scan is chosen but you expected an index scan, **THEN** run `ANALYZE` to update statistics; if the index is still not used, the planner may be correct that a sequential scan is cheaper.
- **IF** a query's cost estimates seem wrong, **THEN** adjust `default_statistics_target` or use `ALTER TABLE SET STATISTICS` for specific columns.
- **IF** a query involves many joins, **THEN** the planner may switch from exhaustive search to genetic optimization when the number of joins exceeds `geqo_threshold`.
- **IF** a query is CPU-bound and long-running, **THEN** consider JIT compilation (`jit = on`); for short queries, JIT overhead may hurt performance.

### Indexing

- **IF** queries involve equality comparisons, range queries, or sorting, **THEN** use B-tree indexes (the default).
- **IF** queries only need equality comparisons, **THEN** consider Hash indexes for faster lookups on large tables.
- **IF** queries involve full-text search or array containment, **THEN** use GIN indexes.
- **IF** queries involve geometric or spatial data, **THEN** use GiST indexes.
- **IF** queries involve very large tables with naturally ordered data, **THEN** consider BRIN indexes.
- **IF** a query condition involves multiple columns, **THEN** decide between:
  - A multicolumn index: more efficient for queries that use both columns
  - Separate single-column indexes: more flexible for queries that use only one column; PostgreSQL can combine them via bitmap scans
- **IF** a query requires a specific sort order, **THEN** consider creating an index with non-default sort ordering (`ASC`, `DESC`, `NULLS FIRST`, `NULLS LAST`).
- **IF** an index is not being used, **THEN** verify the query condition matches the index's operator class and the query is selective enough.

### Security

- **IF** configuring authentication, **THEN** use `scram-sha-256` as the password encryption method – it is the most secure and prevents password sniffing.
- **IF** using `md5` authentication, **THEN** note that MD5-encrypted passwords are deprecated and will be removed in a future release.
- **IF** clients connect over TCP, **THEN** enforce SSL/TLS with `hostssl` entries in `pg_hba.conf` and require clients to verify the server certificate (`sslmode=verify-full`).
- **IF** clients connect over local sockets, **THEN** protect against server spoofing by using a secure Unix domain socket directory.
- **IF** defining functions or triggers, **THEN** ensure objects have trusted owners; functions can be executed by other users unintentionally.

### Monitoring

- **IF** you need to see current database activity, **THEN** query `pg_stat_activity`.
- **IF** you need to track table and index access patterns, **THEN** ensure `track_counts` is enabled.
- **IF** you need to monitor I/O performance, **THEN** enable `track_io_timing`.
- **IF** you need to monitor function usage, **THEN** enable `track_functions`.

---

## Best Practices

### Query Performance

1. **Always use `EXPLAIN ANALYZE` before optimizing** – Understand the actual execution plan and row estimates before making changes.
2. **Run `ANALYZE` after bulk data loads** – Statistics become stale after large data changes, leading to poor query plans.
3. **Use real data for testing** – Test data that is too small or artificial will not reflect production query performance.
4. **Avoid `SELECT *`** – Only select the columns you actually need to reduce I/O and memory usage.
5. **Use `LIMIT` with `ORDER BY`** – If an index matches the `ORDER BY`, PostgreSQL can fetch the first N rows directly without scanning the entire table.

### Indexing

1. **Create indexes on foreign key columns** – This speeds up join operations and prevents full table scans.
2. **Use partial indexes for conditional queries** – Index only a subset of rows that match a condition to reduce index size.
3. **Drop unused indexes** – Each index adds overhead on `INSERT`, `UPDATE`, and `DELETE`. Monitor index usage with `pg_stat_user_indexes`.
4. **Consider index ordering** – For B-tree indexes with non-default sort order, consider the cost-benefit trade-off.
5. **Create covering indexes** – Use `INCLUDE` to add non-key columns to an index for index-only scans.

### Configuration

1. **Adjust `shared_buffers`** – Set to 15–25% of total RAM for dedicated database servers.
2. **Adjust `work_mem`** – Increase for complex sorts and hash joins, but be cautious of overall memory usage.
3. **Enable `autovacuum`** – Automates routine maintenance to prevent table bloat and stale statistics.
4. **Set `effective_cache_size`** – Inform the planner about the operating system's file system cache size.
5. **Use connection pooling** – Use PgBouncer or similar to manage connections and reduce overhead.

### Security

1. **Use `scram-sha-256` password encryption** – Set `password_encryption = scram-sha-256` in `postgresql.conf`.
2. **Enforce SSL/TLS for all remote connections** – Configure `pg_hba.conf` with `hostssl` entries.
3. **Use role-based access control** – Grant only the minimum necessary privileges via `GRANT` statements.
4. **Enable row-level security (RLS)** – For multi-tenant applications, use RLS policies to enforce data isolation.
5. **Regularly audit user permissions** – Review and revoke unnecessary privileges.

### Monitoring

1. **Monitor `pg_stat_activity` for long-running queries** – Identify and terminate queries that are consuming excessive resources.
2. **Track table and index usage with `pg_stat_user_tables` and `pg_stat_user_indexes`** – Identify unused indexes and hot tables.
3. **Monitor disk usage** – Use `pg_database_size()` and `pg_table_size()` to track growth.
4. **Set up alerting** – Use `check_postgres` or similar tools to monitor database health.
5. **Use system monitoring tools** – Combine PostgreSQL statistics with `ps`, `top`, `iostat`, and `vmstat` for full visibility.

---

## Anti-Patterns

| Anti-Pattern                           | Why it is wrong                                                           | Correct approach                               |
| -------------------------------------- | ------------------------------------------------------------------------- | ---------------------------------------------- |
| Indexing every column                  | Wastes storage, slows writes; indexes only benefit queries that use them. | Create indexes based on actual query patterns. |
| Tuning without `EXPLAIN ANALYZE`       | Blind tuning often makes things worse.                                    | Always measure first.                          |
| Using `SELECT *` in production         | Increases I/O and network overhead.                                       | Select only needed columns.                    |
| Disabling `autovacuum`                 | Leads to table bloat and stale statistics.                                | Keep `autovacuum` enabled.                     |
| Using `md5` authentication             | MD5 is deprecated and insecure.                                           | Use `scram-sha-256`.                           |
| Allowing unencrypted connections       | Passwords and data can be sniffed.                                        | Enforce SSL/TLS.                               |
| Using `password` authentication method | Sends password in plain text.                                             | Use `scram-sha-256`.                           |
| Ignoring connection pooling            | Each connection consumes memory and CPU.                                  | Use PgBouncer.                                 |
| Testing with artificial data           | Query plans may differ from production.                                   | Use realistic data for testing.                |

---

## Common Mistakes & Edge Cases

| Mistake                                                            | Symptom                                                              | Solution                                                  |
| ------------------------------------------------------------------ | -------------------------------------------------------------------- | --------------------------------------------------------- |
| Not running `ANALYZE` after bulk loads                             | Planner uses stale statistics, chooses poor plans.                   | Run `ANALYZE` after large data changes.                   |
| Creating indexes with `CREATE INDEX CONCURRENTLY` in a transaction | The `CONCURRENTLY` option cannot be used inside a transaction block. | Run `CREATE INDEX CONCURRENTLY` outside a transaction.    |
| Using `LIKE '%foo'` with a B-tree index                            | B-tree indexes only support prefix patterns (`foo%`), not suffix.    | Use a GIN index with `pg_trgm` for full pattern matching. |
| Forgetting to set `password_encryption`                            | Passwords may be stored with weak hashing.                           | Set `password_encryption = scram-sha-256`.                |
| Not adjusting `work_mem` for complex queries                       | Sorts and hash joins spill to disk, slowing queries.                 | Increase `work_mem` for the session or globally.          |
| `VACUUM` not keeping up with updates                               | Table bloat and slow queries.                                        | Ensure `autovacuum` is properly configured.               |
| Using `serial` for primary keys in multi-database setups           | Sequence values are not guaranteed globally unique.                  | Use `uuid` or `bigserial` with careful coordination.      |
| Not using `EXPLAIN (BUFFERS, ANALYZE)`                             | Missing I/O statistics in the plan.                                  | Use `EXPLAIN (ANALYZE, BUFFERS)` for complete insight.    |
| Creating too many indexes on partitioned tables                    | Each partition multiplies the index count.                           | Consider the total index count across all partitions.     |

---

## Related Skills

- `database-schema-design` – for designing schemas that PostgreSQL will implement.
- `prisma` – for using Prisma ORM with PostgreSQL.
- `migrations` – for managing schema changes safely.
- `performance` – for broader performance optimization strategies.
- `security` – for additional security best practices.
- `logging-monitoring` – for integrating database monitoring with application logging.

---

## Official References

- [PostgreSQL Official Documentation](https://www.postgresql.org/docs/current/)
- [Performance Tips – Chapter 14](https://www.postgresql.org/docs/current/performance-tips.html)
- [Examining Index Usage – Section 11.12](https://www.postgresql.org/docs/current/indexes-examine.html)
- [Index Types – Section 11.2](https://www.postgresql.org/docs/current/indexes-types.html)
- [Combining Multiple Indexes – Section 11.5](https://www.postgresql.org/docs/current/indexes-bitmap-scans.html)
- [Indexes and ORDER BY – Section 11.4](https://www.postgresql.org/docs/current/indexes-ordering.html)
- [Planner/Optimizer – Section 52.5](https://www.postgresql.org/docs/current/planner-optimizer.html)
- [Query Planning Configuration – Section 19.7](https://www.postgresql.org/docs/current/runtime-config-query.html)
- [Password Authentication – Section 20.5](https://www.postgresql.org/docs/current/auth-password.html)
- [Preventing Server Spoofing – Section 18.7](https://www.postgresql.org/docs/current/preventing-server-spoofing.html)
- [Monitoring Database Activity – Chapter 27](https://www.postgresql.org/docs/current/monitoring.html)
- [Cumulative Statistics System – Section 28.2](https://www.postgresql.org/docs/current/monitoring-stats.html)
- [Routine Database Maintenance – Chapter 25](https://www.postgresql.org/docs/current/maintenance.html)
