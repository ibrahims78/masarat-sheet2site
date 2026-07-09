import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, X } from "lucide-react";
import { useLang } from "@/context/LanguageContext";

interface FileFieldProps {
  value: string | null | undefined;
  onChange: (url: string) => void;
  uploadUrl: string;
  fieldKey: string;
  authSuffix?: string;
  /** Allowed file extensions without dots, e.g. ["jpg","pdf"]. null/empty = all allowed */
  allowedTypes?: string[] | null;
  /** Max file size in MB. null/0 = no client-side limit (server still enforces 10 MB) */
  maxSizeMb?: number | null;
  /**
   * A UUID generated once per form session (or the record ID for edits).
   * Sent to the server so uploaded files land in uploads/{project}/{uploadFolder}/
   * instead of the flat uploads root.
   */
  uploadFolder?: string;
  /**
   * Extra form fields appended to the upload request body.
   * Used e.g. to pass a participant token when the project is invite-only.
   */
  extraFields?: Record<string, string>;
}

export function FileField({
  value, onChange, uploadUrl, fieldKey, authSuffix,
  allowedTypes, maxSizeMb, uploadFolder, extraFields,
}: FileFieldProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  // Build accept string from allowedTypes (or fall back to global list)
  const acceptAttr = allowedTypes && allowedTypes.length > 0
    ? allowedTypes.map(t => `.${t.replace(/^\./, "")}`).join(",")
    : ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt";

  const handleFile = async (file: File) => {
    setError("");

    // ── Client-side size check ──────────────────────────────────
    if (maxSizeMb && maxSizeMb > 0) {
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > maxSizeMb) {
        setError(isAr
          ? `حجم الملف (${sizeMb.toFixed(1)} MB) يتجاوز الحد المسموح (${maxSizeMb} MB)`
          : `File size (${sizeMb.toFixed(1)} MB) exceeds the ${maxSizeMb} MB limit`);
        return;
      }
    }

    // ── Client-side type check ──────────────────────────────────
    if (allowedTypes && allowedTypes.length > 0) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const allowed = allowedTypes.map(t => t.toLowerCase().replace(/^\./, ""));
      if (!allowed.includes(ext)) {
        setError(isAr
          ? `نوع الملف غير مسموح. الأنواع المقبولة: ${allowedTypes.join(", ")}`
          : `File type not allowed. Accepted: ${allowedTypes.join(", ")}`);
        return;
      }
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("fieldKey", fieldKey); // for server-side per-field validation
      if (uploadFolder) formData.append("uploadFolder", uploadFolder);
      if (extraFields) {
        for (const [k, v] of Object.entries(extraFields)) formData.append(k, v);
      }
      const res = await fetch(uploadUrl, { method: "POST", credentials: "include", body: formData });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || (isAr ? "فشل رفع الملف" : "File upload failed"));
      onChange(data.url);
    } catch (err: any) {
      setError(err.message || (isAr ? "فشل رفع الملف" : "File upload failed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const fileName = value ? decodeURIComponent(value.split("/").pop() || "") : "";

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        id={`file-${fieldKey}`}
        accept={acceptAttr}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        data-testid={`input-file-${fieldKey}`}
      />
      {value ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <a
            href={value + (authSuffix ?? "")}
            target="_blank"
            rel="noopener noreferrer"
            className="flex-1 truncate text-primary hover:underline"
            data-testid={`link-file-${fieldKey}`}
          >
            {fileName}
          </a>
          <button
            type="button"
            onClick={() => onChange("")}
            className="text-slate-400 hover:text-red-500 shrink-0"
            data-testid={`button-remove-file-${fieldKey}`}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="h-9 text-xs gap-2"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          data-testid={`button-upload-${fieldKey}`}
        >
          {uploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Upload className="h-3.5 w-3.5" />}
          {uploading ? (isAr ? "جاري الرفع..." : "Uploading...") : (isAr ? "اختر ملفاً" : "Choose File")}
        </Button>
      )}
      {allowedTypes && allowedTypes.length > 0 && !value && !uploading && (
        <p className="text-[10px] text-muted-foreground">
          {isAr ? `الأنواع المقبولة: ${allowedTypes.join("، ")}` : `Accepted: ${allowedTypes.join(", ")}`}
          {maxSizeMb ? (isAr ? ` — الحد الأقصى: ${maxSizeMb} MB` : ` — Max: ${maxSizeMb} MB`) : ""}
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
