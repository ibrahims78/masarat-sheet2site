---
name: Deep audit round 4 fixes
description: All bugs confirmed and fixed in the fourth comprehensive audit pass (8 issues)
---

## D1 — Last-admin self-demotion (PATCH /users/:userId)
**Rule:** Before applying a role change that would remove admin status, count current admins. If count ≤ 1 and target is an admin, return 400.
**Why:** Without this check, an admin can change their own role to viewer/editor, leaving zero admins and permanently locking all users out. DELETE /users already had this guard — PATCH did not.
**How to apply:** Check is in projects.ts PATCH /users/:userId before the db.update() call.

## D2 — register-invite race condition
**Rule:** Hash bcrypt BEFORE the transaction (it's slow). Inside the transaction: `pg_advisory_xact_lock(hashtext(token))` + re-read invitation + insert user + mark usedAt — all atomic.
**Why:** Two concurrent requests can both see usedAt=null, both insert a user. The email unique constraint catches the second, but the invitation is not marked used. Wrapping in a transaction with advisory lock makes token consumption atomic.
**Pattern:** Custom error object `{ inviteInvalid: true }` thrown inside transaction, caught outside to return 400 vs 500.

## D3 — Missing unique constraint on project_fields(projectId, key)
**Rule:** uniqueIndex("project_fields_project_key_idx").on(t.projectId, t.key) + CREATE UNIQUE INDEX IF NOT EXISTS in initDB.
**Why:** Duplicate field keys within a project cause silent frontend mapping collisions — two fields with key "name" means only one value is ever shown.

## D4 — Missing unique constraint on project_records(projectId, sequentialNumber)
**Rule:** uniqueIndex("project_records_project_seq_idx").on(t.projectId, t.sequentialNumber) + partial CREATE UNIQUE INDEX WHERE sequential_number IS NOT NULL.
**Why:** DB-level enforcement of sequential number uniqueness as a second safety net behind the advisory lock in recordInsert.ts.

## D5 — Sessions not invalidated after password change/reset
**Rule:** After change-password: `DELETE FROM session WHERE sess->>'userId' = $1 AND sid != $2` (keep current). After admin reset-password: `DELETE FROM session WHERE sess->>'userId' = $1` (kill all).
**Why:** connect-pg-simple stores sessions in the `session` table with sess JSONB. The userId is a top-level key: `sess->>'userId'`. Without invalidation, a stolen session cookie remains valid after a password change.

## D6 — Scheduler unbounded candidate queries
**Rule:** All three candidate queries (telegramCandidates, emailCandidates, public-draft candidates) must have `.limit(500)`.
**Why:** A project with 100k overdue participants loads all rows into Node.js memory in one query — OOM DoS. Remaining participants are picked up in the next 30-min cycle.

## D7 — SMTP header injection via fromName
**Rule:** In getTransporter() in email.ts: strip `[\r\n]+` and `"` from fromName; strip `[\r\n]+` from fromUser before building the `from` header string.
**Why:** `from: `"${fromName}" <${fromUser}>`` — if an admin stores a display name with CRLF, nodemailer can be tricked into injecting extra headers into outbound emails.

## D8 — change-password has no rate limiter
**Rule:** Apply `changePasswordLimiter` (10 req / 15 min) to POST /api/auth/change-password.
**Why:** Without a rate limit, an attacker who has a session token can brute-force the current password field to learn the plaintext password, or attempt many password guesses.
