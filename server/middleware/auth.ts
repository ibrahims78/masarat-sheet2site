import { Request, Response, NextFunction } from "express";
import { db } from "../db.js";
import { users } from "../../shared/schema.js";
import { eq } from "drizzle-orm";

export function requireAuth(req: Request, res: Response, next: NextFunction) {
  if (req.session && (req.session as any).userId) {
    return next();
  }
  return res.status(401).json({ error: "غير مصادق" });
}

export function requireAdmin(req: Request, res: Response, next: NextFunction) {
  if (req.session && (req.session as any).userId && (req.session as any).role === "admin") {
    return next();
  }
  return res.status(403).json({ error: "صلاحيات غير كافية" });
}

export function requireEditorOrAdmin(req: Request, res: Response, next: NextFunction) {
  const role = (req.session as any)?.role;
  if (req.session && (req.session as any).userId && (role === "admin" || role === "editor")) {
    return next();
  }
  return res.status(403).json({ error: "صلاحيات غير كافية" });
}

// H-03: Enforce mustChangePassword — blocks all API access except /change-password
export async function requirePasswordNotExpired(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const userId = (req.session as any)?.userId;
  if (!userId) return next(); // requireAuth will reject unauthenticated requests

  try {
    const [user] = await db
      .select({ mustChangePassword: users.mustChangePassword })
      .from(users)
      .where(eq(users.id, userId));

    if (user?.mustChangePassword) {
      // Only allow the change-password endpoint
      if (req.path === "/api/auth/change-password" || req.originalUrl === "/api/auth/change-password") {
        return next();
      }
      return res.status(403).json({
        error: "يجب تغيير كلمة المرور أولاً",
        mustChangePassword: true,
      });
    }
    next();
  } catch (err) {
    console.error("[ERROR] requirePasswordNotExpired:", err);
    // Fail-closed: a DB error here means we cannot verify password status,
    // so we must not let the request through.
    res.status(500).json({ error: "خطأ في التحقق من حالة الحساب" });
  }
}
