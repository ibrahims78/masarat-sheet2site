---
name: Comprehensive bug audit fixes
description: Key bugs found and fixed during full-platform audit; decisions future work must not regress.
---

## File-access ILIKE → exact JSON-string match
**Rule:** `/uploads/*` serving for editors used `ILIKE %filename%` which matches any substring in record JSONB. Fixed to `LIKE %"<full stored path>"%` using `JSON.stringify(storedPath)` so the match requires the exact path as a JSON string value.
**Why:** A common filename suffix (e.g. `.jpg`) could grant access to unrelated records.
**How to apply:** Any future file-serving access check must search for the full `/uploads/...` path as a JSON string value, not a bare substring.

## DriveOAuth error message leakage
**Rule:** `server/routes/driveOAuth.ts` was returning raw `err.message` in API responses and in OAuth redirect URL query params.
**Fixed:** All three error paths now return generic Arabic messages and log details to console only. Redirect URL uses `msg=token_exchange_failed` instead of raw error text.
**Why:** Google API errors can contain internal project IDs, quota info, and credential hints.

## Database indexes on FK columns
**Rule:** All FK columns (projectId, userId, recordId, submittedAt) across all child tables now have explicit indexes in both `shared/schema.ts` (Drizzle) and `server/index.ts` initDB (idempotent `CREATE INDEX IF NOT EXISTS`).
**Tables fixed:** project_fields, project_form_drafts, project_records, project_audit_log, project_collaborators, project_participants.
**Why:** Without indexes, any query scoped to a project did a full sequential scan of the child table.

## Audit log record_id cascade → set null
**Rule:** `project_audit_log.record_id` FK was `onDelete: "cascade"` — deleting a record also deleted its audit trail.
**Fixed:** Changed to `onDelete: "set null"` so audit history is preserved after record deletion.
**Why:** Defeating the purpose of an audit log by deleting its entries on record delete.

## Client mutation onError toasts
**Rule:** `deleteMut` and `bulkDeleteMut` in `ProjectRecords.tsx`, and `deleteMut` in `Projects.tsx` had no `onError` handler — silent failures.
**Fixed:** Added `onError` with `useToast` showing a destructive toast in AR/EN.
**How to apply:** Every useMutation that performs a destructive or write operation must have an `onError` handler with a toast.

---
## Second-pass audit fixes (same session)

## Rate limiting on draft and webhook routes (pform.ts)
**Rule:** Public draft endpoints (GET/PUT/DELETE `/:projectId/draft/:draftId` and `/:projectId/p/:token/draft`) and Telegram webhook had no rate limiting — DoS / storage-flood risk.
**Fixed:** Added `draftLimiter` (60 req/min) on all 6 draft routes, `webhookLimiter` (30 req/min) on `/telegram-webhook`.

## Email normalization on login and setup (auth.ts)
**Rule:** Login and setup routes accepted mixed-case emails — `User@Example.com` would not match stored `user@example.com`.
**Fixed:** Both routes now apply `.toLowerCase().trim()` before DB lookup / insert.
**How to apply:** Any new auth route accepting an email must normalize it the same way before any DB operation.

## syncDeleted 30% safety threshold (projectSheets.ts)
**Rule:** `importFromProjectSheet` syncDeleted could delete all DB records if Google Sheets API returned a partial/truncated result.
**Fixed:** Added a 30% guard: if pending deletes > 30% of total DB records, the operation is aborted with a clear Arabic error message instead of wiping data.
**Why:** Partial API responses are indistinguishable from user deletions at the data level — the threshold prevents catastrophic wipes.
