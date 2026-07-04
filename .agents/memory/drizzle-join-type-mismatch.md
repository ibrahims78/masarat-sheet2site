---
name: Drizzle join/eq column type mismatch
description: How to diagnose "operator does not exist: text = uuid" (or similar) errors from Drizzle queries
---

Postgres error `operator does not exist: text = uuid` (or any `type = type2`) from a Drizzle
query does NOT necessarily mean the column referenced in the `where()` clause is the mismatched
one — if the query also has a `leftJoin`/`innerJoin`, the mismatch can be in the join condition
instead.

**Why:** In this project, `project_audit_log.changed_by` was created as `text` while `users.id`
is `uuid`. The error surfaced pointed at the query as a whole, and the `where(eq(projectAuditLog.projectId, pid))`
clause looked identical to dozens of other working queries in the same file — the real mismatch
was in `.leftJoin(users, eq(projectAuditLog.changedBy, users.id))`.

**How to apply:** When a Drizzle/pg type-operator error appears, don't trust `shared/schema.ts`
alone — run `psql "$DATABASE_URL" -c "\d table_name"` to see the actual live column types (schema
drift between the TS definition and the real DB is possible), and check every join condition in
the query, not just the top-level `where()`. Fix by casting explicitly in a `sql` template
(e.g. `` sql`${colA} = ${colB}::text` ``) rather than guessing which side to change.
