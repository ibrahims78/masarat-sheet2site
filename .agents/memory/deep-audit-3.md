---
name: Deep audit round 3 fixes
description: All bugs confirmed and fixed in the third comprehensive audit pass
---

## Zod schema unbounded strings
**Rule:** Every z.string() field that reaches the DB or an external API MUST have a .max() cap.
**Why:** Without a cap, an attacker can store MB-sized values in text columns, causing slow queries and storage bloat through the 512KB body limit alone.
**How to apply:** When adding a new Zod schema field, always add .max(). Reference limits used:
- Names/labels: 200, Descriptions: 2000, Codes/IDs: 100–200, URLs: 500, SMTP hostname: 253, Regex: 500

## bulkDeleteSchema / participant batch arrays
**Rule:** All `ids: z.array(...)` batch schemas MUST have `.max(500)`. All batch routes must check `ids.length > 500` early.
**Why:** `inArray(table.id, ids)` with 50,000 UUIDs generates a multi-MB SQL query that can crash the DB connection.

## Atomic notifyCount increments in participants.ts
**Rule:** Use `db.execute(sql\`UPDATE ... SET notify_count = COALESCE(notify_count, 0) + 1 WHERE id = ${id}\`)` for all counter increments.
**Why:** The read-then-write pattern `(p.notifyCount ?? 0) + 1` loses counts under concurrent batch requests. Email count routes already use atomic SQL — notify count must match.
**Locations fixed:** notify-all loop, notify-batch loop, single-participant notify route.

## Audit log access restriction
**Rule:** `GET /:id/audit-log` must use `requireEditorOrAdmin + requireProjectEditAccess`, NOT `requireProjectReadAccess`.
**Why:** Audit logs contain full field-value change history including sensitive data values. Viewers should not see this.

## submitFormSchema field count + value length caps
**Rule:** submitFormSchema uses .superRefine() to cap field count at 100 and .max(10_000) on string values.
**Why:** The public form submission endpoint is unauthenticated. Without caps, attackers can submit 1000 fields or MB-sized values within the 512KB body limit.

## Telegram message length cap
**Rule:** All notify routes must check `String(message).length > 4096` before sending.
**Why:** Telegram API silently truncates or rejects messages over 4096 chars. Better to reject early with a clear error.
