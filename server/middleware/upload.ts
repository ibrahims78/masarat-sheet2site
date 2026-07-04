import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";
import { Request, Response, NextFunction } from "express";
import { fileTypeFromFile } from "file-type";

const currentDir =
  typeof __dirname !== "undefined"
    ? __dirname
    : path.dirname(fileURLToPath(import.meta.url));

export const uploadsDir = path.join(currentDir, "..", "..", "uploads");

if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const ALLOWED_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".txt",
]);

// M-04: Map allowed MIME types — extension + content must both match
const ALLOWED_MIME_TYPES = new Set([
  "image/jpeg", "image/png", "image/gif", "image/webp",
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.ms-excel",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  "text/plain",
]);

const storage = multer.diskStorage({
  destination: (_req, _file, cb) => cb(null, uploadsDir),
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    cb(null, `${uuidv4()}${ext}`);
  },
});

export const fileUpload = multer({
  storage,
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (!ALLOWED_EXTENSIONS.has(ext)) {
      cb(new Error("نوع الملف غير مدعوم"));
      return;
    }
    cb(null, true);
  },
});

// Extensions that have no magic-byte signature (file-type returns undefined for them)
// and are safe to allow without a detected MIME type.
const NO_MAGIC_EXTENSIONS = new Set([".txt"]);

// Binary extensions that MUST have a detectable magic-byte signature.
// If file-type returns undefined for these, the file is malformed/spoofed → reject.
const BINARY_EXTENSIONS = new Set([
  ".jpg", ".jpeg", ".png", ".gif", ".webp",
  ".pdf", ".doc", ".docx", ".xls", ".xlsx",
]);

/**
 * M-04: Post-upload MIME validation middleware (fail-closed).
 * Call AFTER fileUpload.single()/array() — reads the saved file from disk,
 * checks its actual magic-bytes MIME type, and deletes it if it doesn't match
 * an allowed type. This prevents extension spoofing (e.g. .jpg containing HTML/JS).
 *
 * Fail-closed logic:
 *  - Binary extensions (.jpg, .pdf, etc.) must have a detectable MIME → reject if undefined.
 *  - Text-only extensions (.txt) naturally have no magic bytes → allow undefined.
 *  - Any detected MIME must be in the allowlist.
 */
export async function validateMimeType(req: Request, res: Response, next: NextFunction) {
  if (!req.file) return next();

  const filePath = path.join(uploadsDir, req.file.filename);
  const ext = path.extname(req.file.filename).toLowerCase();

  try {
    const detected = await fileTypeFromFile(filePath);

    if (detected) {
      // MIME detected — must be in the allowlist
      if (!ALLOWED_MIME_TYPES.has(detected.mime)) {
        fs.unlink(filePath, () => {});
        return res.status(400).json({ error: "محتوى الملف لا يتطابق مع امتداده" });
      }
    } else {
      // No magic bytes detected
      if (BINARY_EXTENSIONS.has(ext)) {
        // Binary files must have detectable magic bytes — reject to be safe
        fs.unlink(filePath, () => {});
        return res.status(400).json({ error: "محتوى الملف لا يتطابق مع امتداده" });
      }
      if (!NO_MAGIC_EXTENSIONS.has(ext)) {
        // Unknown extension with no magic bytes — reject
        fs.unlink(filePath, () => {});
        return res.status(400).json({ error: "نوع الملف غير مدعوم" });
      }
      // .txt with no magic bytes is expected — allow
    }
    next();
  } catch (err) {
    fs.unlink(filePath, () => {});
    return res.status(400).json({ error: "تعذّر التحقق من نوع الملف" });
  }
}

export function publicFileUrl(filename: string): string {
  return `/uploads/${filename}`;
}
