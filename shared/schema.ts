import {
  pgTable, text, integer, boolean, timestamp, uuid, serial, jsonb,
} from "drizzle-orm/pg-core";
import { z } from "zod";

// ============================================================
// USERS
// ============================================================
export const users = pgTable("users", {
  id: uuid("id").primaryKey().defaultRandom(),
  fullName: text("full_name").notNull(),
  email: text("email").unique().notNull(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("viewer"),
  mustChangePassword: boolean("must_change_password").default(false),
  rememberMeToken: text("remember_me_token"),
  rememberMeExpiresAt: timestamp("remember_me_expires_at"),
  lastLoginAt: timestamp("last_login_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// USER INVITATIONS
// ============================================================
export const userInvitations = pgTable("user_invitations", {
  id: uuid("id").primaryKey().defaultRandom(),
  email: text("email").notNull(),
  role: text("role").notNull().default("viewer"),
  inviteToken: text("invite_token").unique().notNull(),
  invitedBy: uuid("invited_by").references(() => users.id),
  expiresAt: timestamp("expires_at").notNull(),
  usedAt: timestamp("used_at"),
  createdAt: timestamp("created_at").defaultNow(),
});

// ============================================================
// EMPLOYEES
// ============================================================
export const employees = pgTable("employees", {
  id: uuid("id").primaryKey().defaultRandom(),
  sequentialNumber: serial("sequential_number"),
  // التنظيمي
  orgLevel1: text("org_level_1"),
  orgClassification: text("org_classification"),
  orgLevel2: text("org_level_2"),
  orgLevel3: text("org_level_3"),
  orgLevel4: text("org_level_4"),
  orgLevel5: text("org_level_5"),
  // الوظيفي
  workGovernorate: text("work_governorate"),
  employeeRefId: text("employee_ref_id"),
  jobTitle: text("job_title"),
  workStartDate: text("work_start_date"),
  permanentDate: text("permanent_date"),
  contractDate: text("contract_date"),
  jobCategory: text("job_category"),
  employmentStatus: text("employment_status"),
  appointmentPattern: text("appointment_pattern"),
  mergeDetails: text("merge_details"),
  // الشخصي ✱
  firstName: text("first_name").notNull(),
  fatherName: text("father_name"),
  familyName: text("family_name").notNull(),
  motherFullName: text("mother_full_name"),
  nationalId: text("national_id").notNull(),
  gender: text("gender"),
  birthDate: text("birth_date"),
  maritalStatus: text("marital_status"),
  childrenCount: integer("children_count"),
  wivesCount: integer("wives_count"),
  // الإقامة
  mobile: text("mobile"),
  residenceArea: text("residence_area"),
  residenceDetail: text("residence_detail"),
  registryNumber: text("registry_number"),
  registryPlace: text("registry_place"),
  birthCountry: text("birth_country"),
  governorate: text("governorate"),
  cityDistrict: text("city_district"),
  subDistrict: text("sub_district"),
  // المؤهلات والحالة
  lastQualification: text("last_qualification"),
  hasDisability: text("has_disability"),
  disabilityType: text("disability_type"),
  disabilityCard: text("disability_card"),
  status: text("status"),
  statusDetail: text("status_detail"),
  centralNotes: text("central_notes"),
  shamCashAccount: text("sham_cash_account"),
  // النظام
  editToken: uuid("edit_token").defaultRandom(),
  tokenExpiresAt: timestamp("token_expires_at"),
  submittedAt: timestamp("submitted_at").defaultNow(),
  updatedAt: timestamp("updated_at"),
  sheetsRowIndex: integer("sheets_row_index"),
});

// ============================================================
// SYSTEM SETTINGS
// ============================================================
export const systemSettings = pgTable("system_settings", {
  id: text("id").primaryKey().default("singleton"),
  appName: text("app_name").default("نظام بيانات الكوادر الصحية"),
  appLogoUrl: text("app_logo_url"),
  defaultLanguage: text("default_language").default("ar"),
  timezone: text("timezone").default("Asia/Damascus"),
  editTokenHours: integer("edit_token_hours").default(48),
  formEnabled: boolean("form_enabled").default(true),
  formDisabledMessage: text("form_disabled_message"),
  // الدعوة
  invitationCode: text("invitation_code").notNull().default("NAWAH-2026"),
  codeUpdatedAt: timestamp("code_updated_at").defaultNow(),
  invitationExpiryHours: integer("invitation_expiry_hours").default(72),
  // Google Sheets
  googleSheetId: text("google_sheet_id"),
  googleSheetName: text("google_sheet_name").default("بيانات الكوادر الصحية"),
  googleServiceAccountEmail: text("google_service_account_email"),
  googleServiceAccountKeyEnc: text("google_service_account_key_enc"),
  // Google Drive
  googleDriveFolderId: text("google_drive_folder_id"),
  googleDriveBackupEnabled: boolean("google_drive_backup_enabled").default(false),
  googleDriveBackupFrequency: text("google_drive_backup_frequency").default("daily"),
  // Google OAuth
  googleOauthEmail: text("google_oauth_email"),
  googleOauthAccessTokenEnc: text("google_oauth_access_token_enc"),
  googleOauthRefreshTokenEnc: text("google_oauth_refresh_token_enc"),
  // Telegram
  telegramBotTokenEnc: text("telegram_bot_token_enc"),
  telegramChatId: text("telegram_chat_id"),
  // SMTP
  smtpHost: text("smtp_host"),
  smtpPort: integer("smtp_port").default(587),
  smtpUser: text("smtp_user"),
  smtpPassEnc: text("smtp_pass_enc"),
  smtpFromName: text("smtp_from_name"),
  updatedAt: timestamp("updated_at").defaultNow(),
});

// ============================================================
// AUDIT LOG
// ============================================================
export const auditLog = pgTable("audit_log", {
  id: uuid("id").primaryKey().defaultRandom(),
  employeeId: uuid("employee_id").references(() => employees.id, { onDelete: "cascade" }),
  changedBy: text("changed_by"),
  action: text("action").notNull(),
  changedAt: timestamp("changed_at").defaultNow(),
  changesJson: jsonb("changes_json"),
});

// ============================================================
// ZOD SCHEMAS (manual — no drizzle-zod dependency)
// ============================================================
export const insertEmployeeSchema = z.object({
  orgLevel1: z.string().optional(),
  orgClassification: z.string().optional(),
  orgLevel2: z.string().optional(),
  orgLevel3: z.string().optional(),
  orgLevel4: z.string().optional(),
  orgLevel5: z.string().optional(),
  workGovernorate: z.string().optional(),
  employeeRefId: z.string().optional(),
  jobTitle: z.string().optional(),
  workStartDate: z.string().optional(),
  permanentDate: z.string().optional(),
  contractDate: z.string().optional(),
  jobCategory: z.string().optional(),
  employmentStatus: z.string().optional(),
  appointmentPattern: z.string().optional(),
  mergeDetails: z.string().optional(),
  firstName: z.string().min(1, "الاسم مطلوب"),
  fatherName: z.string().optional(),
  familyName: z.string().min(1, "النسبة مطلوبة"),
  motherFullName: z.string().optional(),
  nationalId: z.string().regex(/^\d{11}$/, "الرقم الوطني يجب أن يكون 11 رقماً"),
  gender: z.string().optional(),
  birthDate: z.string().optional(),
  maritalStatus: z.string().optional(),
  childrenCount: z.union([z.string(), z.number()]).optional(),
  wivesCount: z.union([z.string(), z.number()]).optional(),
  mobile: z.string().optional(),
  residenceArea: z.string().optional(),
  residenceDetail: z.string().optional(),
  registryNumber: z.string().optional(),
  registryPlace: z.string().optional(),
  birthCountry: z.string().optional(),
  governorate: z.string().optional(),
  cityDistrict: z.string().optional(),
  subDistrict: z.string().optional(),
  lastQualification: z.string().optional(),
  hasDisability: z.string().optional(),
  disabilityType: z.string().optional(),
  disabilityCard: z.string().optional(),
  status: z.string().optional(),
  statusDetail: z.string().optional(),
  centralNotes: z.string().optional(),
  shamCashAccount: z.string().optional(),
});

export const insertUserSchema = z.object({
  fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  email: z.string().email("بريد إلكتروني غير صالح"),
  role: z.enum(["admin", "editor", "viewer"]).default("viewer"),
});

export type User = typeof users.$inferSelect;
export type InsertUser = typeof users.$inferInsert;
export type Employee = typeof employees.$inferSelect;
export type InsertEmployee = typeof employees.$inferInsert;
export type SystemSettings = typeof systemSettings.$inferSelect;
export type AuditLog = typeof auditLog.$inferSelect;
