import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Download, FileSpreadsheet, FileText, Loader2 } from "lucide-react";
import { useState } from "react";
import type { ProjectField } from "@shared/schema";

export function ProjectExport() {
  const { id } = useParams<{ id: string }>();
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [exporting, setExporting] = useState(false);

  const { data: fields = [] } = useQuery<ProjectField[]>({
    queryKey: ["/api/projects", id, "fields"],
    queryFn: () => fetch(`/api/projects/${id}/fields`, { credentials: "include" }).then(r => r.json()),
  });

  const doExport = async () => {
    setExporting(true);
    try {
      const url = `/api/projects/${id}/export?format=${format}`;
      const res = await fetch(url, { credentials: "include" });
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `تصدير.${format}`;
      link.click();
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout projectId={id}>
      <div className="max-w-2xl space-y-6">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">تصدير البيانات</h1>
          <p className="text-sm text-muted-foreground mt-0.5">تصدير سجلات المشروع بالصيغة المطلوبة</p>
        </div>

        <Card className="p-5 space-y-5">
          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-3">صيغة الملف</p>
            <div className="flex gap-3">
              <button
                onClick={() => setFormat("xlsx")}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${format === "xlsx" ? "border-primary bg-primary/5" : "border-slate-200 dark:border-slate-700 hover:border-primary/40"}`}
                data-testid="button-xlsx"
              >
                <FileSpreadsheet className={`h-6 w-6 ${format === "xlsx" ? "text-primary" : "text-slate-400"}`} />
                <div className="text-right">
                  <p className="text-sm font-semibold">Excel (.xlsx)</p>
                  <p className="text-xs text-muted-foreground">أفضل للتحرير والتنسيق</p>
                </div>
              </button>
              <button
                onClick={() => setFormat("csv")}
                className={`flex-1 flex items-center gap-3 p-3 rounded-xl border-2 transition-all ${format === "csv" ? "border-primary bg-primary/5" : "border-slate-200 dark:border-slate-700 hover:border-primary/40"}`}
                data-testid="button-csv"
              >
                <FileText className={`h-6 w-6 ${format === "csv" ? "text-primary" : "text-slate-400"}`} />
                <div className="text-right">
                  <p className="text-sm font-semibold">CSV (.csv)</p>
                  <p className="text-xs text-muted-foreground">للأنظمة الأخرى والبيانات الخام</p>
                </div>
              </button>
            </div>
          </div>

          <div>
            <p className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-2">الحقول المصدَّرة ({fields.length})</p>
            <div className="flex flex-wrap gap-1.5">
              {fields.map(f => (
                <Badge key={f.id} variant="secondary" className="text-xs">{f.label}</Badge>
              ))}
              {fields.length === 0 && <p className="text-xs text-muted-foreground">لا يوجد حقول</p>}
            </div>
          </div>

          <Button className="w-full" onClick={doExport} disabled={exporting} data-testid="button-export">
            {exporting ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : <Download className="h-4 w-4 ml-2" />}
            تصدير الآن
          </Button>
        </Card>
      </div>
    </Layout>
  );
}
