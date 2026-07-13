import { useState, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Loader2, Upload, FileText, X, Plus, Files } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface FileFieldProps {
  /** Current value — string for single-file mode, string[] for multi-file mode */
  value: string | string[] | null | undefined;
  onChange: (val: string | string[]) => void;
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
  /**
   * Maximum number of files allowed.
   * null / undefined / 1 = single-file mode (original behaviour).
   * 2-10 = multi-file mode: stores value as string[].
   */
  maxFiles?: number | null;
}

export function FileField({
  value, onChange, uploadUrl, fieldKey, authSuffix,
  allowedTypes, maxSizeMb, uploadFolder, extraFields, maxFiles,
}: FileFieldProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const isMulti = typeof maxFiles === "number" && maxFiles > 1;

  // Normalise value to an array for multi-file mode
  const fileList: string[] = isMulti
    ? (Array.isArray(value) ? value.filter(Boolean) : (value ? [value] : []))
    : [];

  // Build accept string from allowedTypes
  const acceptAttr = allowedTypes && allowedTypes.length > 0
    ? allowedTypes.map(t => `.${t.replace(/^\./, "")}`).join(",")
    : ".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt";

  const validateFile = (file: File): string | null => {
    if (maxSizeMb && maxSizeMb > 0) {
      const sizeMb = file.size / (1024 * 1024);
      if (sizeMb > maxSizeMb) {
        return isAr
          ? `حجم الملف (${sizeMb.toFixed(1)} MB) يتجاوز الحد المسموح (${maxSizeMb} MB)`
          : `File size (${sizeMb.toFixed(1)} MB) exceeds the ${maxSizeMb} MB limit`;
      }
    }
    if (allowedTypes && allowedTypes.length > 0) {
      const ext = (file.name.split(".").pop() || "").toLowerCase();
      const allowed = allowedTypes.map(t => t.toLowerCase().replace(/^\./, ""));
      if (!allowed.includes(ext)) {
        return isAr
          ? `نوع الملف غير مسموح. الأنواع المقبولة: ${allowedTypes.join("، ")}`
          : `File type not allowed. Accepted: ${allowedTypes.join(", ")}`;
      }
    }
    return null;
  };

  const uploadFile = async (file: File): Promise<string> => {
    const fd = new FormData();
    fd.append("file", file);
    fd.append("fieldKey", fieldKey);
    if (uploadFolder) fd.append("uploadFolder", uploadFolder);
    if (extraFields) {
      for (const [k, v] of Object.entries(extraFields)) fd.append(k, v);
    }
    const res = await fetch(uploadUrl, { method: "POST", credentials: "include", body: fd });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || (isAr ? "فشل رفع الملف" : "File upload failed"));
    return data.url as string;
  };

  // ── SINGLE-FILE MODE ────────────────────────────────────────────────────────
  const handleSingleFile = async (file: File) => {
    setError("");
    const validationError = validateFile(file);
    if (validationError) { setError(validationError); return; }
    setUploading(true);
    try {
      const url = await uploadFile(file);
      onChange(url);
    } catch (err: any) {
      setError(err.message || (isAr ? "فشل رفع الملف" : "File upload failed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  // ── MULTI-FILE MODE ─────────────────────────────────────────────────────────
  const handleMultiFiles = async (files: FileList) => {
    setError("");
    const remaining = maxFiles! - fileList.length;
    const toUpload = Array.from(files).slice(0, remaining);
    if (toUpload.length === 0) return;

    for (const file of toUpload) {
      const validationError = validateFile(file);
      if (validationError) { setError(validationError); return; }
    }

    setUploading(true);
    try {
      const urls = await Promise.all(toUpload.map(uploadFile));
      const updated = [...fileList, ...urls];
      onChange(updated);
    } catch (err: any) {
      setError(err.message || (isAr ? "فشل رفع الملف" : "File upload failed"));
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const removeFile = (index: number) => {
    const updated = fileList.filter((_, i) => i !== index);
    onChange(updated);
  };

  const getFileName = (url: string) => decodeURIComponent(url.split("/").pop() || "");

  // ─────────────────────────────────────────────────────────────────────────────
  // MULTI-FILE RENDER
  // ─────────────────────────────────────────────────────────────────────────────
  if (isMulti) {
    const canAddMore = fileList.length < maxFiles!;
    return (
      <div className="space-y-2">
        {/* Hidden file input */}
        <input
          ref={inputRef}
          type="file"
          className="hidden"
          id={`file-${fieldKey}`}
          accept={acceptAttr}
          multiple
          onChange={e => { if (e.target.files && e.target.files.length > 0) handleMultiFiles(e.target.files); }}
          data-testid={`input-file-${fieldKey}`}
        />

        {/* Uploaded files list */}
        {fileList.length > 0 && (
          <div className="space-y-1.5">
            {fileList.map((url, i) => (
              <div
                key={i}
                className="flex items-center gap-2 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm"
                data-testid={`file-item-${fieldKey}-${i}`}
              >
                <FileText className="h-4 w-4 text-primary shrink-0" />
                <a
                  href={url + (authSuffix ?? "")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex-1 truncate text-primary hover:underline text-xs"
                  data-testid={`link-file-${fieldKey}-${i}`}
                >
                  {getFileName(url)}
                </a>
                <button
                  type="button"
                  onClick={() => removeFile(i)}
                  className="text-slate-400 hover:text-red-500 shrink-0 transition-colors"
                  data-testid={`button-remove-file-${fieldKey}-${i}`}
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Add file button + counter */}
        <div className="flex items-center gap-3">
          {canAddMore && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(
                "h-9 text-xs gap-2 border-dashed transition-colors",
                fileList.length === 0
                  ? "w-full"
                  : "border-slate-300 dark:border-slate-600 hover:border-primary hover:text-primary"
              )}
              disabled={uploading}
              onClick={() => inputRef.current?.click()}
              data-testid={`button-upload-${fieldKey}`}
            >
              {uploading
                ? <Loader2 className="h-3.5 w-3.5 animate-spin" />
                : fileList.length === 0
                  ? <Upload className="h-3.5 w-3.5" />
                  : <Plus className="h-3.5 w-3.5" />}
              {uploading
                ? (isAr ? "جاري الرفع..." : "Uploading...")
                : fileList.length === 0
                  ? (isAr ? "اختر ملفات" : "Choose Files")
                  : (isAr ? "إضافة ملف" : "Add File")}
            </Button>
          )}
          {fileList.length > 0 && (
            <span className="text-[11px] text-muted-foreground flex items-center gap-1">
              <Files className="h-3 w-3" />
              {isAr
                ? `${fileList.length} / ${maxFiles} ملفات`
                : `${fileList.length} / ${maxFiles} files`}
            </span>
          )}
        </div>

        {/* Hints */}
        {fileList.length === 0 && (allowedTypes && allowedTypes.length > 0 || maxSizeMb) && !uploading && (
          <p className="text-[10px] text-muted-foreground">
            {allowedTypes && allowedTypes.length > 0
              ? (isAr ? `الأنواع المقبولة: ${allowedTypes.join("، ")}` : `Accepted: ${allowedTypes.join(", ")}`)
              : ""}
            {maxSizeMb ? (isAr ? ` — الحد: ${maxSizeMb} MB` : ` — Max: ${maxSizeMb} MB`) : ""}
          </p>
        )}
        {error && <p className="text-xs text-red-500">{error}</p>}
      </div>
    );
  }

  // ─────────────────────────────────────────────────────────────────────────────
  // SINGLE-FILE RENDER (original behaviour)
  // ─────────────────────────────────────────────────────────────────────────────
  const singleValue = typeof value === "string" ? value : (Array.isArray(value) ? value[0] : undefined);
  const fileName = singleValue ? getFileName(singleValue) : "";

  return (
    <div className="space-y-1.5">
      <input
        ref={inputRef}
        type="file"
        className="hidden"
        id={`file-${fieldKey}`}
        accept={acceptAttr}
        onChange={e => { const f = e.target.files?.[0]; if (f) handleSingleFile(f); }}
        data-testid={`input-file-${fieldKey}`}
      />
      {singleValue ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <a
            href={singleValue + (authSuffix ?? "")}
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
      {allowedTypes && allowedTypes.length > 0 && !singleValue && !uploading && (
        <p className="text-[10px] text-muted-foreground">
          {isAr ? `الأنواع المقبولة: ${allowedTypes.join("، ")}` : `Accepted: ${allowedTypes.join(", ")}`}
          {maxSizeMb ? (isAr ? ` — الحد الأقصى: ${maxSizeMb} MB` : ` — Max: ${maxSizeMb} MB`) : ""}
        </p>
      )}
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
