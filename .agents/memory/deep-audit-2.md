---
name: Deep audit round 2 fixes
description: All bugs confirmed and fixed in the second comprehensive audit pass
---

## /setup race condition fix
**Rule:** POST /setup must wrap the user-count check AND insert in `db.transaction()` with `pg_advisory_xact_lock(hashtext('masarat_initial_setup'))`.
**Why:** Two concurrent setup requests can both see count=0 and both create admin users. The advisory lock is released automatically when the transaction ends.
**Pattern:** Hash bcrypt BEFORE the transaction (it's slow); throw `{ alreadySetup: true }` inside; catch it outside to return 400.

## GET /records limit and page caps
**Rule:** Always `Math.min(Math.max(parseInt(...) || default, 1), MAX)` for pagination params.
**Values:** limit max=500, page max=10_000.
**Why:** Without a cap, `?limit=1000000` loads all rows into memory. `(page-1)*limit` with huge page causes massive SQL OFFSET.

## Date filter validation in GET /records
**Rule:** After `new Date(userInput)`, always check `isNaN(from.getTime())` and return 400 if invalid.
**Why:** `new Date("garbage")` returns Invalid Date; comparisons silently return false, making the filter appear to work while actually doing nothing.

## Global API rate limiter
**Rule:** Add `rateLimit({ windowMs: 15*60*1000, max: 500 })` on `app.use("/api/", ...)` BEFORE route registration.
**Why:** Routes like /api/projects, /api/participants had no rate limiting at all.

## draftId UUID validation
**Rule:** Validate draftId with UUID_RE before any DB operation in GET/PUT/DELETE /:projectId/draft/:draftId.
**Pattern:** `/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i`
**Why:** Arbitrary strings as draftId bypass format expectations and could be used for DB pollution.

## Timing-safe invitation code comparison
**Rule:** Use `timingSafeCompare(a, b)` helper (using crypto.timingSafeEqual) for invite code checks in pform.ts.
**Why:** Standard string `!==` leaks timing information; attacker can discover the code character-by-character via response time measurement.
**Note:** timingSafeCompare handles unequal lengths safely by doing a dummy equal-length compare before returning false.
