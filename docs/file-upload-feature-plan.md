# File Upload Feature Plan — Nawah Healthcare Staff Management

## Status Overview (updated 2026-07-04)

| Phase | Title | Status |
|-------|-------|--------|
| 1 | UX fixes & DB columns | ✅ Complete |
| 2 | Drive sync service & UI | ✅ Complete |
| 3 | Delete cleanup & Sheet URL fix | ✅ Complete |
| 4 | Per-field restrictions & per-record sync | ✅ Complete |
| 5 | Testing | ⏳ Planned |

---

## Phase 1 — UX Fixes & DB Columns ✅

- `authSuffix` prop in `FileField` for authenticated file previews
- File field rendered in self-edit form (ProjectEditForm)
- DB columns added: `sync_status`, `drive_files`, `drive_folder_id` on `project_records`
- `fieldKey` prop wired through all FileField usages

## Phase 2 — Drive Sync Service & UI ✅

- `server/services/driveStorage.ts` — full Drive API service
- `POST /:id/sync-drive` — bulk project-level Drive sync endpoint
- `GET /:id/sync-stats` — sync statistics endpoint
- Drive tab in ProjectSettings with mode selection (keep_local / delete_local)
- Sync results shown in UI

## Phase 3 — Delete Cleanup & Sheet URL Fix ✅

### Bug fixes implemented:
- **`sync-drive` delete_local bug fixed**: When `mode=delete_local`, `project_records.data` is now updated
  in DB so the Drive URL replaces the broken `/uploads/...` path (`updatePayload.data = updatedData`).
- **`bulk-delete` now includes file cleanup**: Records are fetched before DB deletion; local files are
  unlinked from disk; Drive files are queued for deletion via `driveStorage.deleteFileFromDrive`.
- **Project delete now includes file cleanup**: `DELETE /api/projects/:id` fetches all project records
  first, deletes the project (cascade), then asynchronously unlinks local files and Drive files.
- **`APP_BASE_URL` resolution in projectSheets.ts**: `resolveFileUrlForSheet()` converts `/uploads/...`
  paths to absolute URLs using `process.env.APP_BASE_URL` before writing to Google Sheets, making them
  clickable from outside the server. Applied in both `appendRecordToSheet` and `updateRecordRow`.
- **Project delete warning dialog** in `Projects.tsx` now includes a note that Drive files are NOT
  auto-deleted and must be cleaned up manually.

## Phase 4 — Per-Field Restrictions & Per-Record Sync ✅

### Schema changes:
- `project_fields.allowed_file_types JSONB` — list of allowed extensions, e.g. `["jpg","pdf"]`
- `project_fields.max_file_size_mb INTEGER` — per-field size cap in MB
- Migration added in `server/index.ts`
- Both columns persisted in `POST /:id/fields` (field save) and project creation field rows

### Server-side validation:
- `validateFieldRestrictions()` middleware exported from `server/middleware/upload.ts`
- Admin upload endpoint (`POST /:id/upload`) applies per-field validation when `fieldKey` sent in FormData
- Public form upload endpoint (`POST /api/pform/:projectId/upload`) applies same validation
- Both endpoints look up field config from DB using `projectId + fieldKey`

### Client-side validation (FileField.tsx):
- `allowedTypes?: string[] | null` prop — sets `accept` attribute and checks extension before upload
- `maxSizeMb?: number | null` prop — checks file size before upload
- `fieldKey` sent in `FormData` to enable server-side per-field validation
- Hint text shown under file picker listing accepted types and max size

### Field editor (ProjectSettings.tsx):
- Toggle checkboxes for allowed extensions: jpg, jpeg, png, gif, webp, pdf, doc, docx, xls, xlsx, txt
- Number input for max file size in MB
- Both values saved to DB via PUT `/api/projects/:id/fields`

### Props wired to all FileField usages:
- `ProjectRegister.tsx` — passes `allowedFileTypes` + `maxFileSizeMb` from field config
- `ProjectAddRecord.tsx` — same
- `ProjectRecordEdit.tsx` — same

### Per-record Drive sync:
- New endpoint: `POST /api/projects/:id/records/:recordId/sync-drive`
  Body: `{ mode: "keep_local" | "delete_local" }`
- Full sync logic (create Drive folder, upload files, update DB `driveFiles`, `data`, `syncStatus`)
- Local file cleanup when `mode=delete_local`
- Sheet row updated via `updateRecordRow` after sync

### Sync status UI:
- **ProjectRecords.tsx** — sync badge (🟡/✅/🔴) in file column cell with tooltip
- **ProjectRecordDetails.tsx** — "Attached Files" card shows:
  - File name, local link, Drive link (if synced), sync date
  - Warning banner when local-only files exist
  - Per-record sync button opens modal with mode selection (keep_local / delete_local)
  - Sync badge in page header

## Phase 5 — Testing ⏳ Planned

- Unit tests for `validateFieldRestrictions` middleware
- Integration tests for per-record sync endpoint
- E2E tests: upload → validate restrictions → sync → verify Sheet URL absolute

---

## Environment Variables

| Variable | Purpose |
|----------|---------|
| `APP_BASE_URL` | Absolute base URL for resolving `/uploads/...` paths in Google Sheets (e.g. `https://your-app.replit.app`) |
| `ENCRYPTION_KEY` | AES-256 key for encrypting Google service account credentials |
| `SESSION_SECRET` | Express session signing secret |
