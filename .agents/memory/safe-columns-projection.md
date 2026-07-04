---
name: Safe-columns projection pitfall
description: New columns added to a table/schema must also be added to any explicit "safe select" column projection map used by GET routes, or they will be silently omitted from API responses.
---

When a route uses an explicit object of column selections (e.g. `db.select(SAFE_COLUMNS).from(table)`) instead of `select()` or `select({...spread})`, adding a new column to the Drizzle schema is not enough — the column must also be added to that projection object.

**Why:** Found in the Nawah project's `projects` GET `/:id` route: a `PROJECT_SAFE_COLUMNS` object explicitly listed which columns to return (to exclude secrets like encrypted keys/tokens). A new `importSheetId` column was added to the schema and to the PATCH/update path, but not to this projection map — so the field saved correctly but the settings UI could never read it back, since GET silently dropped it. No error was thrown; it just came back `undefined`.

**How to apply:** Whenever adding a new non-secret column to a table that has an explicit safe-columns/safe-select allowlist, grep for that allowlist constant and add the new field to it. When auditing a "field not showing up in the UI after save" bug, check for this pattern before assuming a frontend bug.
