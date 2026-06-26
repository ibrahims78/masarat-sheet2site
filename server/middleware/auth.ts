import { Request, Response, NextFunction } from "express";

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
