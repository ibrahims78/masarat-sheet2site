import { useParams } from "wouter";
import { fetchJson, apiRequest } from "@/lib/queryClient";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Loader2, AlertCircle } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { DesignerCredit } from "@/components/DesignerCredit";
import type { ProjectField, ProjectRecord } from "@shared/schema";
import { useProjectFormEngine } from "@/hooks/useProjectFormEngine";
import { DynamicFieldRenderer } from "@/components/forms/DynamicFieldRenderer";
import { FormSubmitted } from "@/components/forms/FormSubmitted";

export function ProjectEditForm() {
  const { projectId, token } = useParams<{ projectId: string; token: string }>();
  const [saved, setSaved] = useState(false);
  const { lang } = useLang();
  const isAr = lang === "ar";

  const { data: record, isLoading, error } = useQuery<ProjectRecord & { error?: string }>({
    queryKey: ["/api/pform", projectId, "edit", token],
    queryFn: () => fetchJson(`/api/pform/${projectId}/edit/${token}`),
    retry: false,
  });

  const { data: formInfo } = useQuery<{ project: any; fields: ProjectField[] }>({
    queryKey: ["/api/pform", projectId, "info"],
    queryFn: () => fetchJson(`/api/pform/${projectId}/info`),
  });

  const fields = formInfo?.fields || [];
  const project = formInfo?.project;

  const { register, handleSubmit, reset, watch, setValue, formState: { errors } } = useForm<Record<string, any>>({ mode: "onBlur" });

  useEffect(() => {
    if (record && !record.error) {
      reset(record.data as Record<string, any>);
    }
  }, [record, reset]);

  const saveMut = useMutation({
    mutationFn: (formData: Record<string, any>) => apiRequest("PATCH", `/api/pform/${projectId}/edit/${token}`, formData),
    onSuccess: (data) => { if (data.ok) setSaved(true); },
  });

  const watchedValues = watch();

  // Shared engine: handles clear-hidden-fields effect + isFieldVisible + fieldValidationRules
  const { isFieldVisible, fieldValidationRules } = useProjectFormEngine({
    fields, formValues: watchedValues, setValue, isAr,
  });

  const grouped = fields
    .filter(f => f.fieldType !== "autoincrement")
    .reduce<Record<number, ProjectField[]>>((acc, f) => {
      const s = f.stepNumber || 1;
      if (!acc[s]) acc[s] = [];
      acc[s].push(f);
      return acc;
    }, {});

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if ((record as any)?.error || error) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 p-4">
      <Card className="p-8 max-w-sm w-full text-center space-y-3">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto" />
        <h2 className="font-bold text-slate-800">{(record as any)?.error || (isAr ? "الرابط غير صالح" : "Invalid link")}</h2>
      </Card>
    </div>
  );

  if (saved) return (
    <FormSubmitted
      isAr={isAr}
      type="success"
      title={isAr ? "تم حفظ التعديلات بنجاح!" : "Changes saved successfully!"}
      message={isAr ? "تم تحديث بياناتك." : "Your data has been updated."}
    />
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-8 px-4" dir={isAr ? "rtl" : "ltr"}>
      <div className="max-w-xl mx-auto space-y-6">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project?.formTitle || (isAr ? "تعديل البيانات" : "Edit Data")}</h1>
          <p className="text-sm text-muted-foreground mt-1">{isAr ? "يمكنك تعديل بياناتك أدناه" : "You can edit your data below"}</p>
        </div>

        <form onSubmit={handleSubmit(d => saveMut.mutate(d))} className="space-y-5">
          {Object.entries(grouped).map(([step, stepFields]) => (
            <Card key={step} className="p-5">
              <h3 className="text-sm font-bold text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                {Array.isArray(project?.steps) ? (project.steps[Number(step) - 1] || (isAr ? `الخطوة ${step}` : `Step ${step}`)) : (isAr ? `الخطوة ${step}` : `Step ${step}`)}
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {stepFields.filter(f => isFieldVisible(f)).map(f => (
                  <DynamicFieldRenderer
                    key={f.id}
                    field={f}
                    register={register}
                    errors={errors}
                    formValues={watchedValues}
                    setValue={setValue}
                    isAr={isAr}
                    validationRules={fieldValidationRules(f)}
                    showReadOnly
                    uploadConfig={{
                      url: `/api/pform/${projectId}/upload`,
                      folder: token || "edit",
                      authSuffix: `?token=${token}&project=${projectId}`,
                    }}
                  />
                ))}
              </div>
            </Card>
          ))}

          <Button type="submit" className="w-full" disabled={saveMut.isPending} data-testid="button-save">
            {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
            {isAr ? "حفظ التعديلات" : "Save Changes"}
          </Button>
        </form>
        <DesignerCredit />
      </div>
    </div>
  );
}
