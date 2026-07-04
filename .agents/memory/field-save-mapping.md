---
name: Field save mapping completeness
description: The POST /:id/fields endpoint uses an explicit object mapping when inserting — new schema columns must be added there and in the project-create field rows or they are silently dropped.
---

The `PUT /api/projects/:id/fields` route in `server/routes/projects.ts` deletes all fields then re-inserts with an explicit `{ key, label, fieldType, … }` mapping. Any new column added to `projectFields` schema MUST be added to:

1. The `PUT /:id/fields` insert mapping (around line 377).
2. The project creation `fieldRows` mapping (around line 167) if it should also be set at create time.
3. The `server/index.ts` migration block as `ALTER TABLE project_fields ADD COLUMN IF NOT EXISTS …`.

**Why:** Omitting a column from the explicit mapping means the value sent from the frontend is silently ignored — the DB column keeps its default (null/false) regardless of what the user configured.

**How to apply:** Whenever adding a new column to `shared/schema.ts` `projectFields`, grep for "isReadOnly" or "conditionOperator" in `server/routes/projects.ts` to find both field insert sites and add the new column alongside them.
