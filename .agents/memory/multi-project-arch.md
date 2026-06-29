---
name: Multi-project architecture
description: How the نواة platform stores multi-project data with dynamic fields
---

# Multi-project architecture

The system was transformed from a fixed-schema single-project employee system to a multi-project platform.

## Key tables
- `projects` — each project with its own form settings, Google Sheets, Telegram, invitation code
- `project_fields` — dynamic fields per project (key, label, fieldType, stepNumber, isRequired, isVisible, options JSONB)
- `project_records` — employee submissions as JSONB `data`, one per project
- `project_audit_log` — audit trail per project

## Old routes kept as stubs
`server/routes/admin.ts`, `form.ts`, `settings.ts` are empty stubs (to avoid TypeScript errors from unused files).

## API routes
- `GET/POST /api/projects` — projects CRUD
- `GET/POST /api/projects/:id/fields` — fields (replaces/updates all at once)
- `GET /api/projects/:id/records` — paginated, search via JS filter (JSONB)
- `POST /api/projects/parse-excel` — multer + exceljs, returns columns[]
- `GET/POST /api/pform/:projectId/*` — public form routes (no auth)

## Key decisions
**Why:** Starting from blank slate; dynamic fields can't be in fixed columns, JSONB allows any schema per project.
**How to apply:** When adding new data fields, put them in `project_fields` + `project_records.data`, not as new columns.
