// L-04: Typed session data — eliminates (req.session as any) casts throughout the codebase
import "express-session";

declare module "express-session" {
  interface SessionData {
    userId: string;
    role: "admin" | "editor" | "viewer";
    fullName: string;
    [key: `code_${string}`]: boolean; // per-project invitation-code verification flags
  }
}
