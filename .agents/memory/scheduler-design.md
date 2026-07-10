---
name: Automated reminder scheduler
description: Design decisions for the background reminder scheduler in server/services/scheduler.ts
---

## Rule
Reminders use ONE channel per participant per cycle: Telegram if linked, email only as fallback (identifierType=email + no telegramChatId).

**Why:** Sending both channels simultaneously for the same participant is noisy and was identified as a bug in code review.

## How to apply
- Telegram candidates query: telegramChatId IS NOT NULL, notifyCount < max, lastNotifiedAt overdue
- Email candidates query: identifierType=email AND telegramChatId IS NULL AND emailCount < max, lastEmailedAt overdue
- Never require both counters under max in a single query — each channel is independent

## Concurrency protection
- `isRunning` flag prevents overlapping cycles within the same process
- Atomic DB claim: conditional UPDATE with WHERE (submittedAt IS NULL AND count < max AND timestamp overdue) before sending
- If rowCount < 1 after claim update → skip (already claimed by another instance)
- Roll back counter (GREATEST(count-1, 0) + NULL timestamp) if send fails

## Scheduler startup
- Called as `startScheduler()` from server/index.ts after initDB()
- First run deferred 60s after startup; then setInterval every 30 minutes
