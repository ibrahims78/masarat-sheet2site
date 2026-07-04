import multer from "multer";
import path from "path";
import fs from "fs";
import { fileURLToPath } from "url";
import { v4 as uuidv4 } from "uuid";

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

export function publicFileUrl(filename: string): string {
  return `/uploads/${filename}`;
}
