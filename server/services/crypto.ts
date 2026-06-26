import crypto from "crypto";

const ALGORITHM = "aes-256-gcm";

function loadKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY;
  if (!envKey) {
    console.warn(
      "⚠️  ENCRYPTION_KEY env var is not set. " +
      "A random key will be used — existing encrypted values in the DB will become unreadable after restart. " +
      "Set a stable 64-char hex ENCRYPTION_KEY in your environment secrets."
    );
    return Buffer.from(crypto.randomBytes(32).toString("hex"), "hex");
  }
  if (envKey.length < 64) {
    console.warn("⚠️  ENCRYPTION_KEY should be at least 64 hex characters. Padding key.");
  }
  return Buffer.from(envKey.slice(0, 64).padEnd(64, "0"), "hex");
}

const KEY = loadKey();

export function encrypt(text: string): string {
  if (!text) return "";
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(ALGORITHM, KEY.slice(0, 32), iv);
  const encrypted = Buffer.concat([cipher.update(text, "utf8"), cipher.final()]);
  const authTag = cipher.getAuthTag();
  return Buffer.concat([iv, authTag, encrypted]).toString("base64");
}

export function decrypt(encryptedText: string): string {
  if (!encryptedText) return "";
  try {
    const buffer = Buffer.from(encryptedText, "base64");
    const iv       = buffer.subarray(0, 16);
    const authTag  = buffer.subarray(16, 32);
    const encrypted = buffer.subarray(32);
    const decipher = crypto.createDecipheriv(ALGORITHM, KEY.slice(0, 32), iv);
    decipher.setAuthTag(authTag);
    return decipher.update(encrypted) + decipher.final("utf8");
  } catch {
    return "";
  }
}
