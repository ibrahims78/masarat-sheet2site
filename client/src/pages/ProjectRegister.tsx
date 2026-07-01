import { useParams } from "wouter";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Loader2, CheckCircle, ChevronLeft, ChevronRight, Shield } from "lucide-react";
import { cn } from "@/lib/utils";
import type { ProjectField } from "@shared/schema";

interface FormInfo {
  project: { id: string; name: string; formTitle: string; formSubtitle?: string; formEnabled: boolean; formDisabledMessage?: string; steps: string[]; requiresCode: boolean };
  fields: ProjectField[];
}

export function ProjectRegister() {
  const { projectId } = useParams<{ projectId: string }>();
  const [step, setStep] = useState(0);
  const [codeVerified, setCodeVerified] = useState(false);
  const [codeSkipped, setCodeSkipped] = useState(false);
  const [invitationCode, setInvitationCode] = useState("");
  const [codeError, setCodError] = useState("");
  const [submitted, setSubmitted] = useState(false);
  const [editToken, setEditToken] = useState("");
  const [tokenHours, setTokenHours] = useState(48);
  const [verifying, setVerifying] = useState(false);

  const { data: formInfo, isLoading } = useQuery<FormInfo>({
    queryKey: ["/api/pform", projectId, "info"],
    queryFn: () => fetch(`/api/pform/${projectId}/info`).then(r => r.json()),
  });

  const { register, handleSubmit, trigger, formState: { errors } } = useForm<Record<string, any>>();

  const project = formInfo?.project;
  const fields = formInfo?.fields || [];
  const steps = project?.steps || ["التسجيل"];
  const totalSteps = steps.length;

  useEffect(() => {
    if (project && !project.requiresCode && !codeVerified && !codeSkipped) {
      setCodeSkipped(true);
      setCodeVerified(true);
    }
  }, [project]);

  const getStepFields = (stepNum: number) => fields.filter(f => (f.stepNumber || 1) === stepNum);
  const isLastStep = step === totalSteps - 1;
  const isReviewStep = step === totalSteps - 1;

  const verifyCode = async () => {
    setVerifying(true); setCodError("");
    try {
      const res = await fetch(`/api/pform/${projectId}/verify-code`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ code: invitationCode }),
      });
      const data = await res.json();
      if (res.ok) { setCodeVerified(true); }
      else { setCodError(data.error || "رمز الدعوة غير صحيح"); }
    } catch { setCodError("حدث خطأ. حاول مجدداً."); }
    setVerifying(false);
  };

  const submitMut = useMutation({
    mutationFn: (formData: Record<string, any>) => fetch(`/api/pform/${projectId}/submit`, {
      method: "POST", headers: { "Content-Type": "application/json" }, credentials: "include",
      body: JSON.stringify(formData),
    }).then(r => r.json()),
    onSuccess: (data) => {
      if (data.ok) { setSubmitted(true); setEditToken(data.editToken); setTokenHours(data.tokenHours); }
    },
  });

  const nextStep = async () => {
    const stepFields = getStepFields(step + 1);
    const keys = stepFields.map(f => f.key);
    const valid = await trigger(keys);
    if (valid) setStep(s => Math.min(s + 1, totalSteps - 1));
  };

  if (isLoading) return (
    <div className="min-h-screen flex items-center justify-center">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
    </div>
  );

  if (!project || !project.formEnabled) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="p-8 max-w-sm w-full text-center">
        <Shield className="h-12 w-12 text-slate-300 mx-auto mb-4" />
        <h2 className="text-lg font-bold mb-2">{project?.formDisabledMessage || "النموذج متوقف مؤقتاً"}</h2>
      </Card>
    </div>
  );

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 p-4">
      <Card className="p-8 max-w-sm w-full text-center space-y-4">
        <CheckCircle className="h-14 w-14 text-green-500 mx-auto" />
        <h2 className="text-xl font-bold text-slate-800 dark:text-slate-100">تم التسجيل بنجاح!</h2>
        <p className="text-sm text-muted-foreground">احتفظ برابط التعديل أدناه</p>
        <div className="p-3 bg-slate-50 dark:bg-slate-800 rounded-lg text-xs font-mono break-all dir-ltr text-right">
          {`${window.location.origin}/p/${projectId}/edit/${editToken}`}
        </div>
        <p className="text-xs text-muted-foreground">صالح لمدة {tokenHours} ساعة</p>
      </Card>
    </div>
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 dark:from-slate-900 dark:to-slate-800 py-8 px-4" dir="rtl">
      <div className="max-w-xl mx-auto space-y-6">
        {/* Header */}
        <div className="text-center">
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project.formTitle}</h1>
          {project.formSubtitle && <p className="text-sm text-muted-foreground mt-1">{project.formSubtitle}</p>}
        </div>

        {/* Code verification */}
        {!codeVerified ? (
          <Card className="p-6 space-y-4">
            <div className="text-center">
              <Shield className="h-10 w-10 text-primary mx-auto mb-3" />
              <h3 className="font-semibold">أدخل رمز الدعوة</h3>
              <p className="text-xs text-muted-foreground mt-1">رمز خاص للوصول إلى النموذج</p>
            </div>
            <Input
              value={invitationCode}
              onChange={e => setInvitationCode(e.target.value)}
              placeholder="NAWAH-2026"
              className="text-center text-lg tracking-widest font-mono"
              onKeyDown={e => e.key === "Enter" && verifyCode()}
              data-testid="input-invitation-code"
            />
            {codeError && <p className="text-sm text-red-500 text-center">{codeError}</p>}
            <Button className="w-full" onClick={verifyCode} disabled={verifying} data-testid="button-verify-code">
              {verifying ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
              تحقق
            </Button>
          </Card>
        ) : (
          <>
            {/* Step indicator */}
            <div className="flex items-center justify-center gap-2">
              {steps.map((s, i) => (
                <div key={i} className="flex items-center gap-2">
                  <div className={cn(
                    "w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all",
                    i < step ? "bg-green-500 text-white" : i === step ? "bg-primary text-white shadow-md" : "bg-slate-200 dark:bg-slate-700 text-muted-foreground"
                  )}>
                    {i < step ? "✓" : i + 1}
                  </div>
                  {i < steps.length - 1 && <div className={cn("h-0.5 w-6", i < step ? "bg-green-400" : "bg-slate-200 dark:bg-slate-700")} />}
                </div>
              ))}
            </div>

            <Card className="p-6">
              <h3 className="font-semibold text-slate-700 dark:text-slate-200 mb-4 pb-2 border-b border-slate-100 dark:border-slate-700">
                {steps[step]}
              </h3>

              <form onSubmit={handleSubmit(d => submitMut.mutate(d))}>
                {isReviewStep ? (
                  <div className="space-y-3">
                    <p className="text-sm text-muted-foreground mb-4">مراجعة البيانات المدخلة قبل الإرسال النهائي</p>
                    {fields.map(f => (
                      <div key={f.id} className="flex justify-between py-2 border-b border-slate-100 dark:border-slate-700 last:border-0 text-sm">
                        <span className="text-muted-foreground">{f.label}</span>
                        <span className="font-medium">{(document.querySelector(`[name="${f.key}"]`) as HTMLInputElement)?.value || "—"}</span>
                      </div>
                    ))}
                    <Button type="submit" className="w-full mt-4" disabled={submitMut.isPending} data-testid="button-submit-form">
                      {submitMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-2" /> : null}
                      إرسال
                    </Button>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {getStepFields(step + 1).map(f => (
                      <div key={f.id} className="space-y-1.5">
                        <Label className="text-sm font-medium">
                          {f.label}{f.isRequired && <span className="text-red-500 mr-1">*</span>}
                        </Label>
                        {f.fieldType === "textarea" ? (
                          <Textarea {...register(f.key, { required: f.isRequired ? `${f.label} مطلوب` : false })}
                            placeholder={f.placeholder || ""} rows={3} data-testid={`input-${f.key}`} />
                        ) : f.fieldType === "select" && f.options ? (
                          <select {...register(f.key, { required: f.isRequired ? `${f.label} مطلوب` : false })}
                            className="w-full rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                            data-testid={`select-${f.key}`}>
                            <option value="">— اختر —</option>
                            {(f.options as string[]).map(opt => <option key={opt} value={opt}>{opt}</option>)}
                          </select>
                        ) : f.fieldType === "radio" && f.options ? (
                          <div className="space-y-2">
                            {(f.options as string[]).map(opt => (
                              <label key={opt} className="flex items-center gap-2 text-sm cursor-pointer">
                                <input type="radio" {...register(f.key, { required: f.isRequired ? `${f.label} مطلوب` : false })} value={opt} className="accent-primary" />
                                {opt}
                              </label>
                            ))}
                          </div>
                        ) : (
                          <Input {...register(f.key, { required: f.isRequired ? `${f.label} مطلوب` : false })}
                            type={f.fieldType === "number" ? "number" : f.fieldType === "date" ? "date" : f.fieldType === "email" ? "email" : f.fieldType === "phone" ? "tel" : "text"}
                            placeholder={f.placeholder || ""}
                            data-testid={`input-${f.key}`} />
                        )}
                        {(errors as any)[f.key] && <p className="text-xs text-red-500">{(errors as any)[f.key]?.message}</p>}
                      </div>
                    ))}

                    <div className="flex gap-3 pt-2">
                      {step > 0 && (
                        <Button type="button" variant="outline" onClick={() => setStep(s => s - 1)} data-testid="button-prev">
                          <ChevronRight className="h-4 w-4 ml-1" />
                          السابق
                        </Button>
                      )}
                      <Button type="button" className="flex-1" onClick={nextStep} data-testid="button-next">
                        التالي
                        <ChevronLeft className="h-4 w-4 mr-1" />
                      </Button>
                    </div>
                  </div>
                )}
              </form>
            </Card>
          </>
        )}
      </div>
    </div>
  );
}
