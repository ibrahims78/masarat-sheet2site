import express from "express";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { existsSync } from "fs";
import { pool, db } from "./db.js";
import { systemSettings } from "../shared/schema.js";
import authRoutes from "./routes/auth.js";
import formRoutes from "./routes/form.js";
import adminRoutes from "./routes/admin.js";
import settingsRoutes from "./routes/settings.js";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = parseInt(process.env.SERVER_PORT || process.env.PORT || "3001");

app.set("trust proxy", 1);

const PgSession = connectPgSimple(session);

app.use(helmet({ contentSecurityPolicy: false, frameguard: false }));
app.use(cors({ origin: true, credentials: true }));
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true }));

app.use(session({
  store: new PgSession({ pool, createTableIfMissing: true }),
  secret: process.env.SESSION_SECRET || "healthcare-secret-2026-nawah",
  resave: false,
  saveUninitialized: false,
  cookie: {
    secure: process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1",
    httpOnly: true,
    maxAge: 24 * 60 * 60 * 1000,
    sameSite: (process.env.NODE_ENV === "production" || process.env.REPLIT_DEPLOYMENT === "1") ? "none" : "lax",
  },
}));

app.use("/api/auth", authRoutes);
app.use("/api/form", formRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/settings", settingsRoutes);

// Health check
app.get("/api/health", (_req, res) => res.json({ ok: true, time: new Date().toISOString() }));

// Serve frontend in production (when dist/client exists)
const clientDist = path.join(__dirname, "..", "client");
if (existsSync(clientDist)) {
  app.use(express.static(clientDist));
  app.get("*", (_req, res) => {
    res.sendFile(path.join(clientDist, "index.html"));
  });
}

// Initialize DB tables and default settings
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        full_name TEXT NOT NULL,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        must_change_password BOOLEAN DEFAULT FALSE,
        remember_me_token TEXT,
        remember_me_expires_at TIMESTAMP,
        last_login_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS user_invitations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'viewer',
        invite_token TEXT UNIQUE NOT NULL,
        invited_by UUID REFERENCES users(id),
        expires_at TIMESTAMP NOT NULL,
        used_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS employees (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        sequential_number SERIAL,
        org_level_1 TEXT, org_classification TEXT,
        org_level_2 TEXT, org_level_3 TEXT, org_level_4 TEXT, org_level_5 TEXT,
        work_governorate TEXT, employee_ref_id TEXT, job_title TEXT,
        work_start_date TEXT, permanent_date TEXT, contract_date TEXT,
        job_category TEXT, employment_status TEXT, appointment_pattern TEXT, merge_details TEXT,
        first_name TEXT NOT NULL, father_name TEXT, family_name TEXT NOT NULL,
        mother_full_name TEXT, national_id TEXT NOT NULL,
        gender TEXT, birth_date TEXT, marital_status TEXT,
        children_count INTEGER, wives_count INTEGER,
        mobile TEXT, residence_area TEXT, residence_detail TEXT,
        registry_number TEXT, registry_place TEXT, birth_country TEXT,
        governorate TEXT, city_district TEXT, sub_district TEXT,
        last_qualification TEXT, has_disability TEXT, disability_type TEXT, disability_card TEXT,
        status TEXT, status_detail TEXT, central_notes TEXT, sham_cash_account TEXT,
        edit_token UUID DEFAULT gen_random_uuid(),
        token_expires_at TIMESTAMP,
        submitted_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP,
        sheets_row_index INTEGER
      );
      CREATE TABLE IF NOT EXISTS system_settings (
        id TEXT PRIMARY KEY DEFAULT 'singleton',
        app_name TEXT DEFAULT 'نظام بيانات الكوادر الصحية',
        app_logo_url TEXT,
        default_language TEXT DEFAULT 'ar',
        timezone TEXT DEFAULT 'Asia/Damascus',
        edit_token_hours INTEGER DEFAULT 48,
        form_enabled BOOLEAN DEFAULT TRUE,
        form_disabled_message TEXT,
        invitation_code TEXT NOT NULL DEFAULT 'NAWAH-2026',
        code_updated_at TIMESTAMP DEFAULT NOW(),
        google_sheet_id TEXT, google_sheet_name TEXT DEFAULT 'بيانات الكوادر الصحية',
        google_service_account_email TEXT, google_service_account_key_enc TEXT,
        google_drive_folder_id TEXT, google_drive_backup_enabled BOOLEAN DEFAULT FALSE,
        google_drive_backup_frequency TEXT DEFAULT 'daily',
        google_oauth_email TEXT, google_oauth_access_token_enc TEXT, google_oauth_refresh_token_enc TEXT,
        telegram_bot_token_enc TEXT, telegram_chat_id TEXT,
        smtp_host TEXT, smtp_port INTEGER DEFAULT 587, smtp_user TEXT, smtp_pass_enc TEXT, smtp_from_name TEXT,
        updated_at TIMESTAMP DEFAULT NOW()
      );
      CREATE TABLE IF NOT EXISTS audit_log (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        employee_id UUID REFERENCES employees(id) ON DELETE CASCADE,
        changed_by TEXT,
        action TEXT NOT NULL,
        changed_at TIMESTAMP DEFAULT NOW(),
        changes_json JSONB
      );
      INSERT INTO system_settings (id) VALUES ('singleton') ON CONFLICT (id) DO NOTHING;
    `);
    console.log("✅ Database tables initialized");
  } catch (err) {
    console.error("❌ DB init error:", err);
  }
}

initDB().then(() => {
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || "development"}`);
  });
});
