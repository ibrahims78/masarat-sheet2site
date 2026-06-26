import { type ClassValue, clsx } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return "—";
  try {
    return new Date(date).toLocaleDateString("ar-SY");
  } catch {
    return String(date);
  }
}

export function copyToClipboard(text: string): Promise<void> {
  return navigator.clipboard.writeText(text);
}
