import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { ArrowRight, Save, Loader2 } from "lucide-react";
import type { ProjectRecord, ProjectField } from "@shared/schema";
import { useEffect } from "react";

export function ProjectRecordEdit() {
  const { id, recordId } = useParams<{ id: string; recordId: string }>();
  const [, nav] = useLocation();
  const qc = useQueryClient();

  const { data } = useQuery<{ record: ProjectRecord }>({
    queryKey: ["/api/projects", id, "records", recordId],
    queryFn: () => fetch(`/api/projects/${id}/records/${recordId}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: fields = [] } = useQuery<ProjectField[]>({
    queryKey: ["/api/projects", id, "fields"],
    queryFn: () => fetch(`/api/projects/${id}/fields`, { credentials: "include" }).then(r => r.json()),
  });

  const { register, handleSubmit, reset, formState: { errors } } = useForm<Record<string, any>>();

  useEffect(() => {
    if (data?.record) {
      reset(data.record.data as Record<string, any>);
    }
  }, [data?.record, reset]);

  const saveMut = useMutation({
    mutationFn: (formData: Record<string, any>) => apiRequest("PATCH", `/api/projects/${id}/records/${recordId}`, formData),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/projects", id, "records"] });
      nav(`/admin/projects/${id}/records/${recordId}`);
    },
  });

  const grouped = fields.reduce<Record<number, ProjectField[]>>((acc, f) => {
    const s = f.stepNumber || 1;
    if (!acc[s]) acc[s] = [];
    acc[s].push(f);
    return acc;
  }, {});

  return (
    <Layout projectId={id}>
      <form onSubmit={handleSubmit(d => saveMut.mutate(d))} className="max-w-3xl space-y-5">
        <div className="flex items-center gap-3">
          <Button type="button" variant="ghost" size="sm" onClick={() => nav(`/admin/projects/${id}/records/${recordId}`)}>
            <ArrowRight className="h-4 w-4 ml-1" />
            تفاصيل السجل
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <h1 className="text-lg font-bold">تعديل السجل #{data?.record?.sequentialNumber}</h1>
          <div className="flex-1" />
          <Button type="submit" size="sm" disabled={saveMut.isPending} data-testid="button-save">
            {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
            حفظ
          </Button>
        </div>

        {saveMut.isError && (
          <div className="p-3 rounded-lg bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 text-sm">
            حدث خطأ أثناء الحفظ
          </div>
        )}

        {Object.entries(grouped).map(([step, stepFields]) => (
          <Card key={step} className="p-5">
            <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
              الخطوة {step}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {stepFields.map(f => (
                <div key={f.id} className="space-y-1.5">
                  <Label className="text-xs font-medium">
                    {f.label}
                    {f.isRequired && <span className="text-red-500 mr-1">*</span>}
                  </Label>
                  {f.fieldType === "textarea" ? (
                    <Textarea {...register(f.key, { required: f.isRequired ? `${f.label} مطلوب` : false })}
                      placeholder={f.placeholder || ""} rows={3} className="text-sm" data-testid={`input-${f.key}`} />
                  ) : f.fieldType === "select" && f.options ? (
                    <select {...register(f.key, { required: f.isRequired ? `${f.label} مطلوب` : false })}
                      className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                      data-testid={`select-${f.key}`}>
                      <option value="">— اختر —</option>
                      {(f.options as string[]).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                    </select>
                  ) : (
                    <Input {...register(f.key, { required: f.isRequired ? `${f.label} مطلوب` : false })}
                      type={f.fieldType === "number" ? "number" : f.fieldType === "date" ? "date" : f.fieldType === "email" ? "email" : f.fieldType === "phone" ? "tel" : "text"}
                      placeholder={f.placeholder || ""}
                      className="text-sm" data-testid={`input-${f.key}`} />
                  )}
                  {(errors as any)[f.key] && (
                    <p className="text-xs text-red-500">{(errors as any)[f.key]?.message}</p>
                  )}
                </div>
              ))}
            </div>
          </Card>
        ))}

        {fields.length === 0 && (
          <Card className="p-10 text-center text-muted-foreground text-sm">لا يوجد حقول محددة لهذا المشروع</Card>
        )}
      </form>
    </Layout>
  );
}
