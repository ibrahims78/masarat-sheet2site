import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { systemSettings, userInvitations } from "../../shared/schema.js";
import { eq } from "drizzle-orm";
import { requireAdmin } from "../middleware/auth.js";
import { encrypt, decrypt } from "../services/crypto.js";
import { testSheetsConnection, verifySheetColumns, fixSheetHeaders } from "../services/sheets.js";
import { testTelegramBot, getTelegramUpdates } from "../services/telegram.js";
import { sendInvitationEmail, testEmailConnection } from "../services/email.js";
import { v4 as uuidv4 } from "uuid";

const router = Router();

// GET settings (safe — no secrets)
router.get("/", requireAdmin, async (_req, res) => {
  try {
    const [s] = await db.select().from(systemSettings).where(eq(systemSettings.id, "singleton"));
    if (!s) return res.json({});
    // Remove encrypted fields from response
    const { googleServiceAccountKeyEnc, googleOauthAccessTokenEnc, googleOauthRefreshTokenEnc, telegramBotTokenEnc, smtpPassEnc, ...safe } = s;
    res.json({
      ...safe,
      hasGoogleKey: !!googleServiceAccountKeyEnc,
      hasTelegramToken: !!telegramBotTokenEnc,
      hasSmtpPass: !!smtpPassEnc,
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// UPDATE settings
router.patch("/", requireAdmin, async (req: Request, res: Response) => {
  try {
    const body = req.body;
    const update: any = { updatedAt: new Date() };

    // General fields
    const plainFields = ["appName", "defaultLanguage", "timezone", "editTokenHours", "invitationExpiryHours", "formEnabled", "formDisabledMessage",
      "invitationCode", "googleSheetId", "googleSheetName", "googleServiceAccountEmail",
      "googleDriveFolderId", "googleDriveBackupEnabled", "googleDriveBackupFrequency",
      "googleOauthEmail", "telegramChatId", "smtpHost", "smtpPort", "smtpUser", "smtpFromName", "appLogoUrl"];

    for (const field of plainFields) {
      if (field in body) update[field] = body[field];
    }

    // Encrypted fields
    if (body.googleServiceAccountKey) update.googleServiceAccountKeyEnc = encrypt(body.googleServiceAccountKey);
    if (body.telegramBotToken) update.telegramBotTokenEnc = encrypt(body.telegramBotToken);
    if (body.smtpPass) update.smtpPassEnc = encrypt(body.smtpPass);
    if (body.googleOauthAccessToken) update.googleOauthAccessTokenEnc = encrypt(body.googleOauthAccessToken);
    if (body.googleOauthRefreshToken) update.googleOauthRefreshTokenEnc = encrypt(body.googleOauthRefreshToken);
    if (body.invitationCode) update.codeUpdatedAt = new Date();

    await db.update(systemSettings).set(update).where(eq(systemSettings.id, "singleton"));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Test Google Sheets
router.post("/test-sheets", requireAdmin, async (_req, res) => {
  const result = await testSheetsConnection();
  res.json(result);
});

// Verify Sheet columns vs system columns
router.post("/verify-columns", requireAdmin, async (_req, res) => {
  const result = await verifySheetColumns();
  res.json(result);
});

// Fix Sheet headers to match reference file
router.post("/fix-sheet-headers", requireAdmin, async (_req, res) => {
  const result = await fixSheetHeaders();
  res.json(result);
});

// Test Telegram
router.post("/test-telegram", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { token, chatId } = req.body;
    let botToken = token;
    if (!botToken) {
      const [s] = await db.select().from(systemSettings).where(eq(systemSettings.id, "singleton"));
      if (s?.telegramBotTokenEnc) botToken = decrypt(s.telegramBotTokenEnc);
    }
    if (!botToken) return res.status(400).json({ error: "لم يتم إدخال Bot Token" });
    const result = await testTelegramBot(botToken, chatId);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get Telegram updates (to auto-detect Chat ID)
router.post("/telegram-updates", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { token } = req.body;
    let botToken = token;
    if (!botToken) {
      const [s] = await db.select().from(systemSettings).where(eq(systemSettings.id, "singleton"));
      if (s?.telegramBotTokenEnc) botToken = decrypt(s.telegramBotTokenEnc);
    }
    if (!botToken) return res.status(400).json({ ok: false, message: "أدخل Bot Token أولاً" });
    const result = await getTelegramUpdates(botToken);
    res.json(result);
  } catch (err: any) {
    res.status(500).json({ ok: false, message: err.message });
  }
});

// Test Email — accepts live credentials from body (no save required)
router.post("/test-email", requireAdmin, async (req: Request, res: Response) => {
  const { host, port, user, pass } = req.body;
  const result = await testEmailConnection(
    host || user || pass ? { host, port: Number(port) || 587, user, pass } : undefined
  );
  res.json(result);
});

// Send invitation email
router.post("/send-invitation", requireAdmin, async (req: Request, res: Response) => {
  try {
    const { email, role } = req.body;

    const [s] = await db.select().from(systemSettings).where(eq(systemSettings.id, "singleton"));
    const expiryHours = s?.invitationExpiryHours ?? 72;
    const appName = s?.appName || "نظام بيانات الكوادر الصحية";

    const token = uuidv4();
    const expiresAt = new Date(Date.now() + expiryHours * 60 * 60 * 1000);

    await db.insert(userInvitations).values({
      email, role: role || "viewer",
      inviteToken: token,
      invitedBy: (req.session as any).userId,
      expiresAt,
    });

    // Build public app URL — in production behind Replit's proxy use X-Forwarded-Host
    // to get the real public domain instead of the internal container host
    const forwardedHost = req.get("x-forwarded-host");
    const host = forwardedHost || req.get("host") || "";
    const protocol = req.secure || req.get("x-forwarded-proto") === "https" ? "https" : "http";
    const appUrl = `${protocol}://${host}`;

    const sent = await sendInvitationEmail(email, token, role || "viewer", appUrl, expiryHours, appName);
    if (!sent) return res.json({ ok: true, inviteUrl: `${appUrl}/admin/register/${token}`, emailSent: false });
    res.json({ ok: true, inviteUrl: `${appUrl}/admin/register/${token}`, emailSent: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Create user directly
router.post("/create-user", requireAdmin, async (req: Request, res: Response) => {
  try {
    const bcrypt = await import("bcryptjs");
    const { fullName, email, password, role } = req.body;
    const hash = await bcrypt.default.hash(password, 12);
    const { users } = await import("../../shared/schema.js");
    const [user] = await db.insert(users).values({ fullName, email, passwordHash: hash, role: role || "viewer", mustChangePassword: true }).returning({ id: users.id });
    res.json({ ok: true, userId: user.id });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Reset password
router.post("/reset-password/:userId", requireAdmin, async (req: Request, res: Response) => {
  try {
    const bcrypt = await import("bcryptjs");
    const { password } = req.body;
    const { users } = await import("../../shared/schema.js");
    const hash = await bcrypt.default.hash(password, 12);
    await db.update(users).set({ passwordHash: hash, mustChangePassword: true }).where(eq(users.id, (req.params.userId as string)));
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
