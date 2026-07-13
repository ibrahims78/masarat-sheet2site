---
name: Deep audit round 6 fixes
description: Second comprehensive re-audit — 7 parallel subagents — actionable fixes applied
---

## Rules and decisions

- **fullName must be trimmed** in register-invite (and anywhere user-supplied strings are stored as identity fields); use `req.body.x?.trim()` pattern, not trim-at-insert.
- **CRLF injection in email headers**: strip `[\r\n]+` from `to` and `subject` fields before passing to nodemailer — even though nodemailer has some protections, explicit stripping is required.
- **setDriveOAuthError must cover all 5 drive functions**: ensureProjectFolder, ensureRecordFolder, uploadLocalFileToDrive, deleteFileFromDrive, deleteFolderFromDrive.
- **PATCH WHERE clause must include projectId**: even when a prior SELECT verifies project scope, the UPDATE WHERE must also include `eq(projectRecords.projectId, pid)` for defense-in-depth IDOR protection.
- **Global error handler in Express**: must be registered AFTER all routes and static serving with the 4-arg signature `(err, req, res, next)`. Never expose stack traces; gate on `SHOW_ERROR_DETAIL=1`.
- **schedulerStarted flag**: prevents duplicate intervals and stacked SIGTERM handlers on hot-reload. Reset it in the stop handler so a clean restart (e.g. after SIGTERM+restart) works.
- **handleError in errorHandler.ts**: already correctly hides stacks in production (SHOW_ERROR_DETAIL=1 env var required). No fix needed there — the gap was only the *global* unhandled-exception catcher in index.ts.

**Why:** These were found in the second deep audit pass (7 parallel subagents across all layers).
**How to apply:** Any new route that stores user strings should trim them. Any new Drive function should wrap with isOAuthError→setDriveOAuthError. Any UPDATE must scope by projectId.
