import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ArrowRight, Edit, Loader2, Clock } from "lucide-react";
import type { ProjectRecord, ProjectField, ProjectAuditLog } from "@shared/schema";

interface DetailsResponse { record: ProjectRecord; auditLog: ProjectAuditLog[]; }

export function ProjectRecordDetails() {
  const { id, recordId } = useParams<{ id: string; recordId: string }>();
  const [, nav] = useLocation();

  const { data, isLoading } = useQuery<DetailsResponse>({
    queryKey: ["/api/projects", id, "records", recordId],
    queryFn: () => fetch(`/api/projects/${id}/records/${recordId}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: fields = [] } = useQuery<ProjectField[]>({
    queryKey: ["/api/projects", id, "fields"],
    queryFn: () => fetch(`/api/projects/${id}/fields`, { credentials: "include" }).then(r => r.json()),
  });

  const record = data?.record;
  const rdata = (record?.data || {}) as Record<string, any>;

  const grouped = fields.reduce<Record<number, ProjectField[]>>((acc, f) => {
    const s = f.stepNumber || 1;
    if (!acc[s]) acc[s] = [];
    acc[s].push(f);
    return acc;
  }, {});

  return (
    <Layout projectId={id}>
      <div className="max-w-3xl space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav(`/admin/projects/${id}/records`)}>
            <ArrowRight className="h-4 w-4 ml-1" />
            السجلات
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <h1 className="text-lg font-bold text-slate-800 dark:text-slate-100">تفاصيل السجل #{record?.sequentialNumber}</h1>
          <div className="flex-1" />
          <Button size="sm" onClick={() => nav(`/admin/projects/${id}/records/${recordId}/edit`)} data-testid="button-edit">
            <Edit className="h-4 w-4 ml-1" />
            تعديل
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : record ? (
          <>
            <div className="flex gap-3 text-xs text-muted-foreground">
              <span>تاريخ التسجيل: {record.submittedAt ? new Date(record.submittedAt).toLocaleString("ar") : "—"}</span>
              {record.updatedAt && <span>• آخر تحديث: {new Date(record.updatedAt).toLocaleString("ar")}</span>}
            </div>

            {Object.keys(grouped).length > 0 ? (
              Object.entries(grouped).map(([step, stepFields]) => (
                <Card key={step} className="p-5">
                  <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                    الخطوة {step}
                  </h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {stepFields.map(f => (
                      <div key={f.id}>
                        <p className="text-[11px] text-muted-foreground font-medium mb-0.5">{f.label}</p>
                        <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{String(rdata[f.key] ?? "—")}</p>
                      </div>
                    ))}
                  </div>
                </Card>
              ))
            ) : (
              <Card className="p-5">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {Object.entries(rdata).map(([key, val]) => (
                    <div key={key}>
                      <p className="text-[11px] text-muted-foreground font-medium mb-0.5">{key}</p>
                      <p className="text-sm font-medium text-slate-800 dark:text-slate-100">{String(val ?? "—")}</p>
                    </div>
                  ))}
                </div>
              </Card>
            )}

            {data?.auditLog && data.auditLog.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-3 flex items-center gap-2">
                  <Clock className="h-4 w-4" />
                  سجل التعديلات
                </h3>
                <div className="space-y-2">
                  {data.auditLog.map(log => (
                    <div key={log.id} className="flex items-center gap-3 text-xs py-2 border-b border-slate-100 dark:border-slate-700 last:border-0">
                      <Badge variant={log.action === "create" ? "default" : "secondary"} className="text-[10px]">
                        {log.action === "create" ? "إنشاء" : "تحديث"}
                      </Badge>
                      <span className="text-muted-foreground">بواسطة: {log.changedBy || "غير محدد"}</span>
                      <span className="text-muted-foreground mr-auto">{log.changedAt ? new Date(log.changedAt).toLocaleString("ar") : "—"}</span>
                    </div>
                  ))}
                </div>
              </Card>
            )}
          </>
        ) : (
          <Card className="p-10 text-center text-muted-foreground">السجل غير موجود</Card>
        )}
      </div>
    </Layout>
  );
}
