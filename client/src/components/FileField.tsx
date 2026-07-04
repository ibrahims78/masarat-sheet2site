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
}

export function FileField({ value, onChange, uploadUrl, fieldKey, authSuffix }: FileFieldProps) {
  const { lang } = useLang();
  const isAr = lang === "ar";
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = async (file: File) => {
    setUploading(true);
    setError("");
    try {
      const formData = new FormData();
      formData.append("file", file);
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
        onChange={e => { const f = e.target.files?.[0]; if (f) handleFile(f); }}
        accept=".jpg,.jpeg,.png,.gif,.webp,.pdf,.doc,.docx,.xls,.xlsx,.txt"
        data-testid={`input-file-${fieldKey}`}
      />
      {value ? (
        <div className="flex items-center gap-2 h-9 px-3 rounded-md border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50 text-sm">
          <FileText className="h-4 w-4 text-primary shrink-0" />
          <a href={value + (authSuffix ?? "")} target="_blank" rel="noopener noreferrer" className="flex-1 truncate text-primary hover:underline" data-testid={`link-file-${fieldKey}`}>
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
      {error && <p className="text-xs text-red-500">{error}</p>}
    </div>
  );
}
