# Nawah Healthcare Staff Management System (مسارات)

A full-stack bilingual (Arabic/English) healthcare staff management system. Staff submit registration data through a multi-step public form; admins manage records in a private dashboard.

## Tech Stack

- **Frontend:** React 18 + Vite, TypeScript, Tailwind CSS, shadcn/ui
- **Backend:** Node.js + Express, TypeScript (tsx)
- **Database:** PostgreSQL (Replit managed) with Drizzle ORM
- **State/Routing:** TanStack Query v5, Wouter
- **Integrations:** Google Sheets API, Telegram Bot API, Nodemailer (SMTP)
- **Security:** AES-256-GCM field-level encryption, Helmet, rate limiting, express-session

## Running the App

```
npm run dev
```

- Frontend (Vite): http://localhost:5000
- Backend (Express): http://localhost:3001
- Vite proxies `/api/*` → backend automatically

## Required Secrets

| Secret | Description |
|---|---|
| `SESSION_SECRET` | Express session signing key |
| `ENCRYPTION_KEY` | 32-byte hex key for AES-256-GCM field encryption |

## Optional Integration Secrets

| Secret | Description |
|---|---|
| `GOOGLE_SERVICE_ACCOUNT_KEY` | Google Sheets / Drive integration |
| `TELEGRAM_BOT_TOKEN` | Telegram notifications |
| SMTP credentials | Email (configurable per-project in admin settings) |

## First Run

On a fresh database, the app shows a setup wizard to create the first admin account. After that, admins can create projects, define custom form fields, and manage staff records.

## Project Structure

```
client/     React frontend
server/     Express backend (routes/, middleware/, services/)
shared/     Drizzle schema + Zod validators shared by both
```

## Database

Schema is managed via `initDB()` in `server/index.ts` (CREATE TABLE IF NOT EXISTS + ALTER TABLE migrations). Push schema changes with `npm run db:push`.

## User Preferences

- Keep bilingual support (Arabic/English) intact across all changes
- Do not restructure the monorepo layout
