---
name: Security hardening decisions
description: Auth/session/crypto security rules applied to this project and why they must stay this way.
---

# Security Hardening Decisions

## SESSION_SECRET and ENCRYPTION_KEY — fail fast
Both are required at startup. If either is missing the server calls `process.exit(1)` with a clear error.

**Why:** Hardcoded fallback for SESSION_SECRET makes sessions forgeable. Random ENCRYPTION_KEY at runtime makes all encrypted DB values (Telegram tokens, Google keys, SMTP passwords) unreadable after restart — critical for a healthcare system.

**How to apply:** Any new env var holding secrets must either fail-fast or degrade gracefully with an explicit log, never silently use a random/hardcoded value.

## ENCRYPTION_KEY format
Must be exactly 64 hex characters (256-bit). Validated with `/^[0-9a-fA-F]{64}$/` at startup; pad/truncate fallback was removed.

## CORS restriction
`cors({ origin: true })` was replaced with an allowlist built from `REPLIT_DEV_DOMAIN` and `REPLIT_DOMAINS` env vars (auto-set by Replit) plus localhost in non-production.

**Why:** `origin: true` + `credentials: true` reflects any origin and enables authenticated cross-origin requests — a session hijack/CSRF risk.

## Session cookie sameSite
Changed from `"none"` in production to `"lax"` always. The frontend and backend share the same Replit domain so same-site cookies work fine with `lax`. `sameSite: lax` blocks cross-site `fetch`/`XHR` from sending the session cookie, which is sufficient CSRF protection for JSON API endpoints.

## Route ordering in projects.ts
Static routes (`GET /global-settings`, `PATCH /global-settings`, `GET /users-list`) must be registered BEFORE the dynamic `GET /:id` / `PATCH /:id` routes in Express, or they are silently shadowed.
