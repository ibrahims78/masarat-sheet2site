import { Router, Request, Response } from "express";
import { db } from "../db.js";
import { employees, systemSettings, auditLog } from "../../shared/schema.js";
import { eq, ilike } from "drizzle-orm";
import { appendToSheet, updateSheetRow } from "../services/sheets.js";
import { sendTelegramNotification } from "../services/telegram.js";
import rateLimit from "express-rate-limit";

const router = Router();

const submitLimiter   = rateLimit({ windowMs: 60 * 1000, max: 10 });
const verifyCodeLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: { error: "محاولات كثيرة — حاول بعد 15 دقيقة" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Strip system-managed fields from user-submitted data to prevent drizzle timestamp errors
const SYSTEM_FIELDS = ["id", "sequentialNumber", "editToken", "tokenExpiresAt", "submittedAt", "updatedAt", "sheetsRowIndex"];
function sanitizeEmployeeData(data: Record<string, any>) {
  const clean: Record<string, any> = {};
  for (const [k, v] of Object.entries(data)) {
    if (!SYSTEM_FIELDS.includes(k)) clean[k] = v;
  }
  return clean;
}

// Verify invitation code
router.post("/verify-code", verifyCodeLimiter, async (req: Request, res: Response) => {
  try {
    const { code } = req.body;
    const [settings] = await db.select({ invitationCode: systemSettings.invitationCode, formEnabled: systemSettings.formEnabled, formDisabledMessage: systemSettings.formDisabledMessage })
      .from(systemSettings).where(eq(systemSettings.id, "singleton"));

    if (!settings?.formEnabled) {
      return res.status(403).json({ error: settings?.formDisabledMessage || "النموذج متوقف مؤقتاً" });
    }

    if (!settings || code?.trim() !== settings.invitationCode) {
      return res.status(401).json({ error: "رمز الدعوة غير صحيح" });
    }

    (req.session as any).codeVerified = true;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Submit form
router.post("/submit", submitLimiter, async (req: Request, res: Response) => {
  try {
    if (!(req.session as any).codeVerified) {
      return res.status(401).json({ error: "يجب التحقق من رمز الدعوة أولاً" });
    }

    const data = req.body;

    // Prevent duplicate by national ID
    if (data.nationalId) {
      const [existing] = await db.select({ id: employees.id })
        .from(employees).where(eq(employees.nationalId, data.nationalId));
      if (existing) {
        return res.status(409).json({ error: "الرقم الوطني مسجّل مسبقاً في النظام. إذا أردت تعديل بياناتك استخدم رابط التعديل الذي وصلك سابقاً." });
      }
    }

    // Read token hours from settings
    const [settings] = await db.select({ editTokenHours: systemSettings.editTokenHours })
      .from(systemSettings).where(eq(systemSettings.id, "singleton"));
    const tokenHours = settings?.editTokenHours ?? 48;
    const tokenExpiresAt = new Date(Date.now() + tokenHours * 60 * 60 * 1000);

    const clean: any = sanitizeEmployeeData(data);
    const [employee] = await db.insert(employees).values({
      ...clean,
      childrenCount: clean.childrenCount ? parseInt(clean.childrenCount) : null,
      wivesCount: clean.wivesCount ? parseInt(clean.wivesCount) : null,
      tokenExpiresAt,
      submittedAt: new Date(),
    }).returning();

    // Audit log
    await db.insert(auditLog).values({ employeeId: employee.id, changedBy: "employee", action: "create", changesJson: data });

    // Google Sheets (non-blocking)
    appendToSheet(employee).then(async (rowIndex) => {
      if (rowIndex) {
        await db.update(employees).set({ sheetsRowIndex: rowIndex }).where(eq(employees.id, employee.id));
      }
    }).catch(console.error);

    // Telegram (non-blocking)
    sendTelegramNotification({
      firstName: employee.firstName,
      familyName: employee.familyName,
      nationalId: employee.nationalId,
      jobTitle: employee.jobTitle,
      workGovernorate: employee.workGovernorate,
    }).catch(console.error);

    (req.session as any).codeVerified = false;
    res.json({ ok: true, editToken: employee.editToken, employeeId: employee.id, tokenHours });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Get by edit token
router.get("/edit/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const [employee] = await db.select().from(employees).where(eq(employees.editToken, token as any));
    if (!employee) return res.status(404).json({ error: "الرابط غير صالح" });
    if (employee.tokenExpiresAt && employee.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: "انتهت صلاحية رابط التعديل" });
    }
    res.json(employee);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Update by edit token
router.patch("/edit/:token", async (req: Request, res: Response) => {
  try {
    const { token } = req.params;
    const [existing] = await db.select().from(employees).where(eq(employees.editToken, token as any));
    if (!existing) return res.status(404).json({ error: "الرابط غير صالح" });
    if (existing.tokenExpiresAt && existing.tokenExpiresAt < new Date()) {
      return res.status(410).json({ error: "انتهت صلاحية رابط التعديل" });
    }

    const data = req.body;
    const clean: any = sanitizeEmployeeData(data);
    const [updated] = await db.update(employees).set({
      ...clean,
      childrenCount: clean.childrenCount ? parseInt(clean.childrenCount) : null,
      wivesCount: clean.wivesCount ? parseInt(clean.wivesCount) : null,
      updatedAt: new Date(),
    }).where(eq(employees.id, existing.id)).returning();

    await db.insert(auditLog).values({ employeeId: existing.id, changedBy: "employee", action: "update", changesJson: data });

    if (updated.sheetsRowIndex) {
      updateSheetRow(updated.sheetsRowIndex, updated).catch(console.error);
    } else {
      // لم يكن في الـ Sheet من قبل — أضفه الآن
      appendToSheet(updated).then(async (rowIndex) => {
        if (rowIndex) {
          await db.update(employees).set({ sheetsRowIndex: rowIndex }).where(eq(employees.id, updated.id));
        }
      }).catch(console.error);
    }

    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
