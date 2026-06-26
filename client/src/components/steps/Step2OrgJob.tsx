import { useFormContext } from "react-hook-form";
import { Building2, Briefcase, Calendar } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/context/LanguageContext";

function FieldGroup({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="section-card mb-4">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="p-2 bg-blue-100 dark:bg-blue-900/30 rounded-lg text-[#1d4ed8] dark:text-[#3b82f6]">
          {icon}
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function F({ name, label, type = "text" }: { name: string; label: string; type?: string }) {
  const { register, watch, formState: { errors } } = useFormContext();
  const error = (errors as any)[name];
  const val = watch(name);
  return (
    <div>
      <Label htmlFor={name}>{label}</Label>
      <Input
        id={name}
        type={type}
        {...register(name)}
        error={!!error}
        success={!error && !!val}
        className="mt-1"
      />
      {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
  );
}

export function Step2OrgJob() {
  const { lang } = useLang();
  const ar = lang === "ar";

  return (
    <div className="space-y-4">
      <FieldGroup title={ar ? "المستويات التنظيمية" : "Organizational Levels"} icon={<Building2 className="h-5 w-5" />}>
        <F name="orgLevel1"          label={ar ? "المستوى التنظيمي الاول" : "Org Level 1"} />
        <F name="orgClassification"  label={ar ? "التصنيف/ الجهة المرتبطة" : "Classification / Entity"} />
        <F name="orgLevel2"          label={ar ? "المستوى التنظيمي الثاني" : "Org Level 2"} />
        <F name="orgLevel3"          label={ar ? "المستوى التنظيمي الثالث" : "Org Level 3"} />
        <F name="orgLevel4"          label={ar ? "المستوى التنظيمي الرابع" : "Org Level 4"} />
        <F name="orgLevel5"          label={ar ? "المستوى التنظيمي الخامس" : "Org Level 5"} />
      </FieldGroup>

      <FieldGroup title={ar ? "بيانات العمل" : "Work Data"} icon={<Briefcase className="h-5 w-5" />}>
        <F name="workGovernorate"    label={ar ? "محافظة العمل" : "Work Governorate"} />
        <F name="employeeRefId"      label={ar ? "الرقم الذاتي" : "Employee Ref ID"} />
        <F name="jobTitle"           label={ar ? "مسمى العمل" : "Job Title"} />
        <F name="jobCategory"        label={ar ? "الفئة الوظيفية" : "Job Category"} />
        <F name="employmentStatus"   label={ar ? "مثبت أو متعاقد" : "Employment Status"} />
        <F name="appointmentPattern" label={ar ? "نمط التعيين أو التعاقد" : "Appointment Pattern"} />
        <F name="mergeDetails"       label={ar ? "تفاصيل دمج" : "Merge Details"} />
      </FieldGroup>

      <FieldGroup title={ar ? "التواريخ" : "Dates"} icon={<Calendar className="h-5 w-5" />}>
        <F name="workStartDate"  label={ar ? "تاريخ بدء العمل بالدولة" : "Work Start Date (State)"} type="date" />
        <F name="permanentDate"  label={ar ? "تاريخ التثبيت في الدولة" : "Permanent Date (State)"} type="date" />
        <F name="contractDate"   label={ar ? "تاريخ التعاقد في الدولة" : "Contract Date (State)"} type="date" />
      </FieldGroup>
    </div>
  );
}
