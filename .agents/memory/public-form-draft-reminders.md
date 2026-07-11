---
name: Public-form draft reminders and resume links
description: How abandoned public-form drafts get identified, reminded by email, and resumed cross-device — separate from the participant-invite reminder system.
---

## Rule

The participant reminder system (Telegram/email, token-based) and the public-form
(open registration) reminder system are kept fully independent, even though they
share the same cadence settings (`reminderIntervalDays`, `reminderMaxCount`) and
the same email-sending function. Two separate enable toggles exist:
`confirmationEmailEnabled`/`reminderEnabled` (participants) vs.
`publicConfirmationEmailEnabled`/`publicReminderEnabled` (public form), because a
project can run both entry paths at once and an admin may want only one active.

**Why:** the public form has no pre-existing identity (no invite token, no
participant row) — a draft is only reachable by whatever `email` value happens to
appear in an `email`-type field the visitor filled in, extracted server-side and
stored on `projectFormDrafts.email`. Conflating this with the participant system
would either force a fake participant row per anonymous visitor or silently break
the "invite-only" isolation the participant system relies on.

## Cross-device resume

A reminder email cannot rely on `localStorage` (that's how the draft was tied to
the browser in the first place). The resume link instead carries the draftId as a
`?resume=<draftId>` query param that `ProjectRegister.tsx` reads via wouter's
`useSearch()` and adopts into its own `draftIdKey` localStorage slot before the
normal server-draft-restore effect runs. This is the established pattern for
carrying resumable state into that page — reuse it for any future email/link that
needs to reopen a specific draft.

**How to apply:** if a new email or notification needs to deep-link into an
in-progress (unsubmitted) form state, prefer this `?resume=` convention over
inventing a new mechanism, and keep the reminder cycle's abandonment check
(`updatedAt < cutoff`) so people still actively typing never get interrupted.
