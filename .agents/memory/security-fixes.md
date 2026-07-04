---
name: Security hardening — all 17 vulnerabilities
description: Documents all security fixes applied from SECURITY_REPORT.md and decisions made
---

# Security fixes applied (SECURITY_REPORT.md)

All 17 vulnerabilities from the report were addressed in 4 phases.

## Key decisions

**M-02 CSP/Helmet:** frameguard and frameAncestors are DISABLED in dev to allow Replit preview iframe. Enabled only when `NODE_ENV=production` or `REPLIT_DEPLOYMENT=1`. Do not enable these globally or the preview pane will break.

**M-04 MIME validation fail-closed:** `validateMimeType` middleware uses `fileTypeFromFile` post-save. Binary extensions (jpg, pdf, doc, xls etc.) MUST have detectable magic bytes — undefined = reject. `.txt` files naturally have no magic bytes — allow undefined. Called as `await validateMimeType(req, res, callback)` inside multer's callback chain.

**M-01 Error detail:** `handleError()` in `server/utils/errorHandler.ts` only shows `detail: err.message` when env var `SHOW_ERROR_DETAIL=1` is set (not NODE_ENV). This is intentionally stricter than the report's suggestion.

**H-03 requirePasswordNotExpired:** Applied at router level in `server/index.ts` on `/api/projects`. The `/api/auth/change-password` path is checked via `req.originalUrl` inside the middleware.

**M-03 Upload authorization:** Object-level authorization (verifying the file belongs to the requesting user's record) is NOT implemented — only session/edit-token gating. Full ownership check deferred as follow-up (Task #3 scope).

**Why:**
- M-02: Replit preview runs in an iframe; frameguard:"deny" breaks the dev experience
- M-04: fail-open on binary extensions defeats the security purpose
- M-01: NODE_ENV is sometimes "development" on deployed replits; a separate flag is safer
