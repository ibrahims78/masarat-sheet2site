---
name: QueryClient default queryFn
description: TanStack Query requires a default queryFn if using useQuery without explicit queryFn
---

# QueryClient default queryFn

The project's `client/src/lib/queryClient.ts` must include a `defaultOptions.queries.queryFn` that fetches from the URL in `queryKey[0]`.

Without it, any `useQuery({ queryKey: ["/api/..."] })` without an explicit `queryFn` throws "No queryFn was passed".

**Why:** The ProjectContext and some admin pages use queryKey-only syntax (no explicit queryFn), relying on the default.
**How to apply:** The default is already configured in queryClient.ts. Don't remove it.
