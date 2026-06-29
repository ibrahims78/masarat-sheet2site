---
name: Drizzle eq() type safety with useParams
description: wouter useParams returns string | string[], drizzle eq() needs string
---

# Drizzle eq() with useParams

`useParams()` from wouter returns `string | string[]` for each param. Drizzle's `eq()` only accepts `string | SQLWrapper`.

Always cast: `const pid = String(req.params.projectId);` then use `eq(projects.id, pid)`.

On the server side, Express `req.params` is always `string` but TypeScript may not know this — explicit cast avoids type errors.

**Why:** Without casting, TypeScript emits `No overload matches this call` errors on all `eq()` calls that use route params.
