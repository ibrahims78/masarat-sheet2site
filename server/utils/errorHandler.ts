import { Response } from "express";

/**
 * M-01: Centralised error handler.
 * Never leaks raw error messages in production; maps known DB error codes
 * to friendly Arabic messages, and logs all errors server-side.
 */
export function handleError(res: Response, err: unknown, context?: string): void {
  const error = err as any;

  // Known PostgreSQL error codes → safe user-facing messages
  if (error?.code === "23505") {
    res.status(409).json({ error: "البيانات المدخلة مستخدمة بالفعل" });
    return;
  }
  if (error?.code === "23503") {
    res.status(400).json({ error: "مرجع غير موجود" });
    return;
  }
  if (error?.code === "22P02") {
    res.status(400).json({ error: "صيغة البيانات غير صحيحة" });
    return;
  }
  if (error?.code === "42P01") {
    // undefined_table — schema not ready yet
    res.status(503).json({ error: "الخدمة غير جاهزة، أعد المحاولة" });
    return;
  }

  // Log full error on the server, never in the response
  console.error(`[ERROR]${context ? ` [${context}]` : ""}:`, err);

  // M-01: Never expose internal error details to the client.
  // Use SHOW_ERROR_DETAIL=1 (local dev only) if you need stack traces in responses.
  const showDetail = process.env.SHOW_ERROR_DETAIL === "1";
  res.status(500).json({
    error: "خطأ داخلي في الخادم",
    ...(showDetail && { detail: error?.message }),
  });
}
