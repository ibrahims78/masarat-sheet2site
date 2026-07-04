import { Router, Request, Response } from "express";
import bcrypt from "bcryptjs";
import { db } from "../db.js";
import { users, userInvitations, systemSettings } from "../../shared/schema.js";
import { eq, count } from "drizzle-orm";
import { requireAuth } from "../middleware/auth.js";
import { v4 as uuidv4 } from "uuid";
import rateLimit from "express-rate-limit";

const router = Router();

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  message: { error: "تم حجب الحساب مؤقتاً بسبب محاولات متعددة. حاول بعد 15 دقيقة" },
  standardHeaders: true,
  legacyHeaders: false,
});

// Check if setup is required
router.get("/setup-required", async (_req, res) => {
  try {
    const [result] = await db.select({ count: count() }).from(users);
    res.json({ required: (result?.count || 0) === 0 });
  } catch {
    res.json({ required: true });
  }
});

// Initial setup
router.post("/setup", async (req: Request, res: Response) => {
  try {
    const [result] = await db.select({ count: count() }).from(users);
    if ((result?.count || 0) > 0) {
      return res.status(400).json({ error: "تم إعداد النظام مسبقاً" });
    }
    const { fullName, email, password } = req.body;
    if (!fullName || !email || !password || password.length < 8) {
      return res.status(400).json({ error: "بيانات غير مكتملة أو كلمة المرور أقصر من 8 أحرف" });
    }
    const hash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({ fullName, email, passwordHash: hash, role: "admin" }).returning();

    // Insert default settings
    await db.insert(systemSettings).values({ id: "singleton" }).onConflictDoNothing();

    (req.session as any).userId = user.id;
    (req.session as any).role = user.role;
    (req.session as any).fullName = user.fullName;
    res.json({ ok: true });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Login
router.post("/login", loginLimiter, async (req: Request, res: Response) => {
  try {
    const { email, password, rememberMe } = req.body;
    const [user] = await db.select().from(users).where(eq(users.email, email));
    if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
      return res.status(401).json({ error: "بريد إلكتروني أو كلمة مرور خاطئة" });
    }

    (req.session as any).userId = user.id;
    (req.session as any).role = user.role;
    (req.session as any).fullName = user.fullName;

    if (rememberMe) {
      req.session.cookie.maxAge = 30 * 24 * 60 * 60 * 1000;
      const token = uuidv4();
      const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
      await db.update(users).set({ rememberMeToken: token, rememberMeExpiresAt: expiresAt, lastLoginAt: new Date() }).where(eq(users.id, user.id));
    } else {
      await db.update(users).set({ lastLoginAt: new Date() }).where(eq(users.id, user.id));
    }

    res.json({ ok: true, role: user.role, fullName: user.fullName });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Logout
router.post("/logout", (req: Request, res: Response) => {
  req.session.destroy(() => res.json({ ok: true }));
});

// Current user
router.get("/me", requireAuth, async (req: Request, res: Response) => {
  const userId = (req.session as any).userId;
  const [user] = await db.select({ id: users.id, fullName: users.fullName, email: users.email, role: users.role }).from(users).where(eq(users.id, userId));
  res.json(user || null);
});

// Register via invitation
router.post("/register-invite", async (req: Request, res: Response) => {
  try {
    const { token, fullName, password } = req.body;
    if (!fullName || !password || password.length < 8) {
      return res.status(400).json({ error: "الاسم مطلوب وكلمة المرور يجب أن تكون 8 أحرف على الأقل" });
    }
    const [inv] = await db.select().from(userInvitations).where(eq(userInvitations.inviteToken, token));
    if (!inv || inv.usedAt || inv.expiresAt < new Date()) {
      return res.status(400).json({ error: "رمز الدعوة غير صالح أو منتهي الصلاحية" });
    }
    const hash = await bcrypt.hash(password, 12);
    const [user] = await db.insert(users).values({ fullName, email: inv.email, passwordHash: hash, role: inv.role }).returning();
    await db.update(userInvitations).set({ usedAt: new Date() }).where(eq(userInvitations.id, inv.id));

    (req.session as any).userId = user.id;
    (req.session as any).role = user.role;
    (req.session as any).fullName = user.fullName;
    res.json({ ok: true });
  } catch (err: any) {
    if (err.code === "23505") {
      return res.status(409).json({ error: "يوجد حساب بهذا البريد الإلكتروني بالفعل" });
    }
    res.status(500).json({ error: err.message });
  }
});

export default router;
