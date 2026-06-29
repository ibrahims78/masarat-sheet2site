import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Save, Loader2, Plus, Trash2, GripVertical, ArrowRight, ExternalLink } from "lucide-react";
import { useEffect, useState } from "react";
import type { Project, ProjectField } from "@shared/schema";

export function ProjectSettings() {
  const { id } = useParams<{ id: string }>();
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"form" | "fields" | "sheets" | "telegram">("form");
  const [testResult, setTestResult] = useState<string | null>(null);
  const [testing, setTesting] = useState(false);
  const [fields, setFields] = useState<ProjectField[]>([]);

  const { data: project } = useQuery<any>({
    queryKey: ["/api/projects", id],
    queryFn: () => fetch(`/api/projects/${id}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: rawFields = [] } = useQuery<ProjectField[]>({
    queryKey: ["/api/projects", id, "fields"],
    queryFn: () => fetch(`/api/projects/${id}/fields`, { credentials: "include" }).then(r => r.json()),
  });

  useEffect(() => { setFields(rawFields); }, [rawFields]);

  const { register, handleSubmit, reset, watch, setValue } = useForm<any>();
  useEffect(() => {
    if (project) {
      reset({
        name: project.name, description: project.description,
        formTitle: project.formTitle, formSubtitle: project.formSubtitle,
        invitationCode: project.invitationCode, editTokenHours: project.editTokenHours,
        formEnabled: project.formEnabled, formDisabledMessage: project.formDisabledMessage,
        steps: Array.isArray(project.steps) ? project.steps.join("\n") : "",
        googleSheetId: project.googleSheetId, googleSheetName: project.googleSheetName,
        googleServiceAccountEmail: project.googleServiceAccountEmail,
        telegramChatId: project.telegramChatId,
      });
    }
  }, [project, reset]);

  const formEnabled = watch("formEnabled");

  const saveMut = useMutation({
    mutationFn: (data: any) => {
      const stepsRaw = data.steps || "";
      const stepsArr = stepsRaw.split("\n").map((s: string) => s.trim()).filter(Boolean);
      return apiRequest("PATCH", `/api/projects/${id}`, { ...data, steps: stepsArr });
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects", id] }),
  });

  const saveFieldsMut = useMutation({
    mutationFn: () => apiRequest("POST", `/api/projects/${id}/fields`, { fields }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects", id, "fields"] }),
  });

  const testSheets = async () => {
    setTesting(true); setTestResult(null);
    const res: any = await apiRequest("POST", `/api/projects/${id}/test-sheets`, {});
    setTestResult(res.message); setTesting(false);
  };

  const createSheet = async () => {
    setTesting(true); setTestResult(null);
    const res: any = await apiRequest("POST", `/api/projects/${id}/create-sheet`, {});
    setTestResult(res.message);
    if (res.sheetId) qc.invalidateQueries({ queryKey: ["/api/projects", id] });
    setTesting(false);
  };

  const testTelegram = async (values: any) => {
    setTesting(true); setTestResult(null);
    const res: any = await apiRequest("POST", `/api/projects/${id}/test-telegram`, { token: values.telegramBotToken, chatId: values.telegramChatId });
    setTestResult(res.message); setTesting(false);
  };

  const addField = () => {
    setFields(prev => [...prev, {
      id: `new_${Date.now()}`, projectId: id!,
      key: `field_${prev.length + 1}`, label: `حقل ${prev.length + 1}`,
      fieldType: "text", isRequired: false, isVisible: true,
      options: null, stepNumber: 1, orderIndex: prev.length, placeholder: null,
    } as any]);
  };

  const removeField = (idx: number) => setFields(prev => prev.filter((_, i) => i !== idx));

  const updateField = (idx: number, upd: Partial<ProjectField>) => {
    setFields(prev => prev.map((f, i) => i === idx ? { ...f, ...upd } : f));
  };

  const tabs = [
    { key: "form", label: "النموذج" },
    { key: "fields", label: "الحقول" },
    { key: "sheets", label: "Google Sheets" },
    { key: "telegram", label: "Telegram" },
  ] as const;

  return (
    <Layout projectId={id}>
      <div className="max-w-3xl space-y-5">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => nav(`/admin/projects/${id}/dashboard`)}>
            <ArrowRight className="h-4 w-4 ml-1" />
            الرئيسية
          </Button>
          <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
          <h1 className="text-lg font-bold">إعدادات المشروع</h1>
          <div className="flex-1" />
          <Button variant="outline" size="sm" onClick={() => window.open(`/p/${id}/register`, "_blank")}>
            <ExternalLink className="h-3.5 w-3.5 ml-1" />
            معاينة النموذج
          </Button>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl overflow-x-auto">
          {tabs.map(t => (
            <button key={t.key} onClick={() => { setTab(t.key); setTestResult(null); }}
              className={`flex-shrink-0 px-4 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300"}`}
              data-testid={`tab-${t.key}`}>
              {t.label}
            </button>
          ))}
        </div>

        {/* FORM TAB */}
        {tab === "form" && (
          <form onSubmit={handleSubmit(d => saveMut.mutate(d))}>
            <Card className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">اسم المشروع *</Label>
                  <Input {...register("name")} data-testid="input-name" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">رمز الدعوة</Label>
                  <Input {...register("invitationCode")} data-testid="input-invitationCode" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">وصف المشروع</Label>
                <Textarea {...register("description")} rows={2} data-testid="input-description" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">عنوان النموذج</Label>
                  <Input {...register("formTitle")} data-testid="input-formTitle" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">العنوان الفرعي</Label>
                  <Input {...register("formSubtitle")} data-testid="input-formSubtitle" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">أسماء الخطوات (كل خطوة في سطر منفصل)</Label>
                <Textarea {...register("steps")} rows={3} placeholder={"الخطوة الأولى\nالخطوة الثانية\nالخطوة الثالثة"} data-testid="input-steps" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">مدة صلاحية رابط التعديل (ساعة)</Label>
                <Input {...register("editTokenHours")} type="number" className="w-32" data-testid="input-editTokenHours" />
              </div>

              <div className="flex items-center justify-between p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50">
                <div>
                  <p className="text-sm font-semibold">تفعيل النموذج</p>
                  <p className="text-xs text-muted-foreground">السماح للمستخدمين بالتسجيل</p>
                </div>
                <Switch checked={!!formEnabled} onCheckedChange={v => setValue("formEnabled", v)} data-testid="switch-formEnabled" />
              </div>

              {!formEnabled && (
                <div className="space-y-1.5">
                  <Label className="text-xs">رسالة التوقف</Label>
                  <Input {...register("formDisabledMessage")} placeholder="النموذج متوقف مؤقتاً" data-testid="input-formDisabledMessage" />
                </div>
              )}

              <Button type="submit" disabled={saveMut.isPending} data-testid="button-save-form">
                {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
                حفظ الإعدادات
              </Button>
            </Card>
          </form>
        )}

        {/* FIELDS TAB */}
        {tab === "fields" && (
          <div className="space-y-4">
            <Card className="p-4 space-y-3">
              {fields.length === 0 ? (
                <p className="text-center text-sm text-muted-foreground py-6">لا يوجد حقول. أضف حقلاً للبدء.</p>
              ) : (
                fields.map((f, idx) => (
                  <div key={f.id} className="border border-slate-200 dark:border-slate-700 rounded-xl p-3 space-y-3 bg-slate-50/50 dark:bg-slate-800/30" data-testid={`field-${idx}`}>
                    <div className="flex items-center gap-2">
                      <GripVertical className="h-4 w-4 text-slate-300 flex-shrink-0" />
                      <div className="grid grid-cols-2 gap-2 flex-1">
                        <Input value={f.label} onChange={e => updateField(idx, { label: e.target.value })} placeholder="الاسم المعروض" className="text-sm h-8" data-testid={`field-label-${idx}`} />
                        <Input value={f.key} onChange={e => updateField(idx, { key: e.target.value })} placeholder="المفتاح (key)" className="text-sm h-8 font-mono" data-testid={`field-key-${idx}`} />
                      </div>
                      <select value={f.fieldType || "text"} onChange={e => updateField(idx, { fieldType: e.target.value })}
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs h-8"
                        data-testid={`field-type-${idx}`}>
                        <option value="text">نص</option>
                        <option value="number">رقم</option>
                        <option value="date">تاريخ</option>
                        <option value="select">قائمة</option>
                        <option value="radio">راديو</option>
                        <option value="textarea">نص طويل</option>
                        <option value="phone">هاتف</option>
                        <option value="email">بريد</option>
                      </select>
                      <select value={f.stepNumber || 1} onChange={e => updateField(idx, { stepNumber: Number(e.target.value) })}
                        className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-2 py-1 text-xs h-8 w-20"
                        data-testid={`field-step-${idx}`}>
                        {[1, 2, 3, 4, 5].map(s => <option key={s} value={s}>خطوة {s}</option>)}
                      </select>
                      <div className="flex items-center gap-1">
                        <input type="checkbox" checked={!!f.isRequired} onChange={e => updateField(idx, { isRequired: e.target.checked })} id={`req-${idx}`} className="rounded" data-testid={`field-required-${idx}`} />
                        <label htmlFor={`req-${idx}`} className="text-xs">إلزامي</label>
                      </div>
                      <div className="flex items-center gap-1">
                        <input type="checkbox" checked={f.isVisible !== false} onChange={e => updateField(idx, { isVisible: e.target.checked })} id={`vis-${idx}`} className="rounded" />
                        <label htmlFor={`vis-${idx}`} className="text-xs">مرئي</label>
                      </div>
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => removeField(idx)} data-testid={`button-remove-field-${idx}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                    {(f.fieldType === "select" || f.fieldType === "radio") && (
                      <div className="pr-6">
                        <Input
                          value={(f.options as string[] | null || []).join(",")}
                          onChange={e => updateField(idx, { options: e.target.value.split(",").map(s => s.trim()).filter(Boolean) })}
                          placeholder="الخيارات مفصولة بفاصلة: خيار1,خيار2,خيار3"
                          className="text-xs h-7"
                        />
                      </div>
                    )}
                  </div>
                ))
              )}

              <div className="flex gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={addField} data-testid="button-add-field">
                  <Plus className="h-4 w-4 ml-1" />
                  إضافة حقل
                </Button>
                <Button size="sm" onClick={() => saveFieldsMut.mutate()} disabled={saveFieldsMut.isPending} data-testid="button-save-fields">
                  {saveFieldsMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
                  حفظ الحقول
                </Button>
              </div>
            </Card>
          </div>
        )}

        {/* SHEETS TAB */}
        {tab === "sheets" && (
          <form onSubmit={handleSubmit(d => saveMut.mutate(d))}>
            <Card className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Sheet ID</Label>
                <Input {...register("googleSheetId")} placeholder="1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgVE2upms" dir="ltr" data-testid="input-googleSheetId" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اسم الورقة</Label>
                <Input {...register("googleSheetName")} placeholder="بيانات" data-testid="input-googleSheetName" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service Account Email</Label>
                <Input {...register("googleServiceAccountEmail")} placeholder="project@appspot.iam.gserviceaccount.com" dir="ltr" data-testid="input-googleServiceAccountEmail" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Service Account JSON Key {project?.hasGoogleKey && <Badge variant="secondary" className="text-[10px] mr-1">محفوظ</Badge>}</Label>
                <Textarea {...register("googleServiceAccountKey")} placeholder='{"type":"service_account",...}' rows={4} dir="ltr" className="font-mono text-xs" data-testid="input-googleServiceAccountKey" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saveMut.isPending} data-testid="button-save-sheets">
                  {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
                  حفظ
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={testSheets} disabled={testing} data-testid="button-test-sheets">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
                  اختبار الاتصال
                </Button>
                <Button type="button" variant="outline" size="sm" onClick={createSheet} disabled={testing} data-testid="button-create-sheet">
                  إنشاء / تحديث الـ Sheet
                </Button>
              </div>
              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${testResult.startsWith("✅") ? "bg-green-50 dark:bg-green-900/20 text-green-700" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`} data-testid="text-test-result">
                  {testResult}
                </div>
              )}
            </Card>
          </form>
        )}

        {/* TELEGRAM TAB */}
        {tab === "telegram" && (
          <form onSubmit={handleSubmit(d => saveMut.mutate(d))}>
            <Card className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">Bot Token {project?.hasTelegramToken && <Badge variant="secondary" className="text-[10px] mr-1">محفوظ</Badge>}</Label>
                <Input {...register("telegramBotToken")} placeholder="اتركه فارغاً للإبقاء على القديم" dir="ltr" data-testid="input-telegramBotToken" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">Chat ID</Label>
                <Input {...register("telegramChatId")} placeholder="-1001234567890" dir="ltr" data-testid="input-telegramChatId" />
              </div>
              <div className="flex gap-2">
                <Button type="submit" size="sm" disabled={saveMut.isPending} data-testid="button-save-telegram">
                  {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
                  حفظ
                </Button>
                <Button type="button" variant="outline" size="sm" disabled={testing}
                  onClick={handleSubmit(d => testTelegram(d))} data-testid="button-test-telegram">
                  {testing ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : null}
                  إرسال رسالة اختبار
                </Button>
              </div>
              {testResult && (
                <div className={`p-3 rounded-lg text-sm ${testResult.startsWith("✅") ? "bg-green-50 dark:bg-green-900/20 text-green-700" : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400"}`} data-testid="text-telegram-result">
                  {testResult}
                </div>
              )}
            </Card>
          </form>
        )}
      </div>
    </Layout>
  );
}
