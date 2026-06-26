import { useState } from "react";
import { useForm, FormProvider } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { Loader2, ArrowRight, UserPlus, CheckCircle2 } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Step2OrgJob } from "@/components/steps/Step2OrgJob";
import { Step3Personal } from "@/components/steps/Step3Personal";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useLang } from "@/context/LanguageContext";

const schema = z.object({
  firstName: z.string().min(1, "الاسم مطلوب"),
  familyName: z.string().min(1, "النسبة مطلوبة"),
  nationalId: z.string().regex(/^\d{11}$/, "الرقم الوطني يجب أن يكون 11 رقماً بالضبط"),
}).passthrough();

export function AdminAddEmployee() {
  const [, nav] = useLocation();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [created, setCreated] = useState<{ id: string; name: string } | null>(null);

  const methods = useForm({
    resolver: zodResolver(schema),
    mode: "onBlur",
    defaultValues: {},
  });

  const handleSave = async () => {
    const valid = await methods.trigger(["firstName", "familyName", "nationalId"]);
    if (!valid) return;
    setSaving(true);
    setError("");
    try {
      const result = await apiRequest<{ ok: boolean; employee: { id: string; firstName: string; familyName: string } }>(
        "POST",
        "/api/admin/employees",
        methods.getValues()
      );
      queryClient.invalidateQueries({ queryKey: ["employees"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
      setCreated({ id: result.employee.id, name: `${result.employee.firstName} ${result.employee.familyName}` });
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSaving(false);
    }
  };

  if (created) {
    return (
      <Layout>
        <div className="max-w-lg mx-auto mt-20 text-center space-y-6">
          <div className="flex justify-center">
            <div className="p-4 bg-green-100 dark:bg-green-900/30 rounded-full">
              <CheckCircle2 className="h-14 w-14 text-green-600 dark:text-green-400" />
            </div>
          </div>
          <h2 className="text-2xl font-bold text-slate-800 dark:text-slate-100">
            تمت إضافة الموظف بنجاح
          </h2>
          <p className="text-slate-500 dark:text-slate-400">
            تم حفظ <span className="font-semibold text-slate-700 dark:text-slate-200">{created.name}</span> في قاعدة البيانات ومزامنته مع Google Sheet تلقائياً.
          </p>
          <div className="flex justify-center gap-3 flex-wrap">
            <Button onClick={() => nav(`/admin/employees/${created.id}`)} data-testid="button-view-created">
              عرض ملف الموظف
            </Button>
            <Button variant="outline" onClick={() => { setCreated(null); methods.reset({}); }} data-testid="button-add-another">
              إضافة موظف آخر
            </Button>
            <Button variant="ghost" onClick={() => nav("/admin/employees")} data-testid="button-back-list">
              العودة للقائمة
            </Button>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 mb-4">
          <Button variant="ghost" size="icon" onClick={() => nav("/admin/employees")} data-testid="button-back">
            <ArrowRight className="h-5 w-5" />
          </Button>
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100 flex items-center gap-2">
              <UserPlus className="h-5 w-5 text-[#1d4ed8]" />
              {ar ? "إضافة موظف جديد" : "Add New Employee"}
            </h1>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
              يتم الحفظ في قاعدة البيانات ومزامنته مع Google Sheet تلقائياً
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-700 rounded-lg text-sm text-red-700 dark:text-red-400" data-testid="text-add-error">
            {error}
          </div>
        )}

        <FormProvider {...methods}>
          <Step2OrgJob />
          <Step3Personal />
        </FormProvider>

        <div className="flex justify-end pb-8 gap-3">
          <Button variant="outline" onClick={() => nav("/admin/employees")} data-testid="button-cancel">
            {ar ? "إلغاء" : "Cancel"}
          </Button>
          <Button onClick={handleSave} disabled={saving} size="lg" data-testid="button-save-employee">
            {saving
              ? <><Loader2 className="h-4 w-4 animate-spin ml-2" />{ar ? "جاري الحفظ..." : "Saving..."}</>
              : <><UserPlus className="h-4 w-4 ml-2" />{ar ? "حفظ وإضافة للـ Sheet" : "Save & Sync to Sheet"}</>
            }
          </Button>
        </div>
      </div>
    </Layout>
  );
}
