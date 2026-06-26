import { useFormContext } from "react-hook-form";
import { User, Home, IdCard } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLang } from "@/context/LanguageContext";

function SectionCard({ title, icon, children }: { title: string; icon: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="section-card mb-4">
      <div className="flex items-center gap-3 mb-4 pb-3 border-b border-slate-100 dark:border-slate-700">
        <div className="p-2 bg-green-100 dark:bg-green-900/30 rounded-lg text-[#0f766e] dark:text-[#14b8a6]">
          {icon}
        </div>
        <h3 className="font-semibold text-slate-800 dark:text-slate-200">{title}</h3>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">{children}</div>
    </div>
  );
}

function F({ name, label, required, type = "text", maxLength, inputMode, placeholder, extraClass }: {
  name: string; label: string; required?: boolean; type?: string;
  maxLength?: number; inputMode?: any; placeholder?: string; extraClass?: string;
}) {
  const { register, watch, formState: { errors } } = useFormContext();
  const error = (errors as any)[name];
  const val = watch(name);
  return (
    <div>
      <Label htmlFor={name} required={required}>{label}</Label>
      <Input
        id={name}
        type={type}
        maxLength={maxLength}
        inputMode={inputMode}
        placeholder={placeholder}
        {...register(name)}
        error={!!error}
        success={!error && !!val}
        className={`mt-1${extraClass ? " " + extraClass : ""}`}
      />
      {error && <p className="text-xs text-red-500 mt-1">{error.message}</p>}
    </div>
  );
}

export function Step3Personal() {
  const { lang } = useLang();
  const { register } = useFormContext();
  const ar = lang === "ar";

  return (
    <div className="space-y-4">
      {/* الاسم والهوية */}
      <SectionCard title={ar ? "الاسم والهوية" : "Name & Identity"} icon={<IdCard className="h-5 w-5" />}>
        <F name="firstName"      label={ar ? "الاسم" : "First Name"}                    required />
        <F name="fatherName"     label={ar ? "اسم الأب" : "Father's Name"} />
        <F name="familyName"     label={ar ? "النسبة" : "Family Name"}                  required />
        <F name="motherFullName" label={ar ? "اسم الأم الكامل" : "Mother's Full Name"} />
        <F name="nationalId"
           label={ar ? "الرقم الوطني (11 رقم)" : "National ID (11 digits)"}
           required
           maxLength={11}
           inputMode="numeric"
           placeholder="00000000000"
           extraClass="tracking-widest font-mono"
        />
        <F name="gender"        label={ar ? "الجنس" : "Gender"} />
        <F name="birthDate"     label={ar ? "تاريخ التولد" : "Birth Date"}     type="date" />
        <F name="maritalStatus" label={ar ? "الوضع العائلي" : "Marital Status"} />
        <F name="childrenCount" label={ar ? "عدد الأبناء" : "Children Count"}   type="number" />
        <F name="wivesCount"    label={ar ? "عدد الزوجات" : "Wives Count"}      type="number" />
        <F name="mobile"        label={ar ? "رقم الجوال" : "Mobile"}            type="tel" />
      </SectionCard>

      {/* بيانات الإقامة */}
      <SectionCard title={ar ? "بيانات الإقامة" : "Residence Data"} icon={<Home className="h-5 w-5" />}>
        <F name="residenceArea"   label={ar ? "منطقة السكن" : "Residence Area"} />
        <F name="residenceDetail" label={ar ? "تفصيل مكان السكن" : "Residence Detail"} />
        <F name="registryNumber"  label={ar ? "رقم القيد" : "Registry Number"} />
        <F name="registryPlace"   label={ar ? "مكان القيد" : "Registry Place"} />
        <F name="birthCountry"    label={ar ? "دولة الولادة" : "Birth Country"} />
        <F name="governorate"     label={ar ? "المحافظة" : "Governorate"} />
        <F name="cityDistrict"    label={ar ? "المنطقة_المدينة" : "City / District"} />
        <F name="subDistrict"     label={ar ? "الناحية" : "Sub-District"} />
      </SectionCard>

      {/* المؤهلات والحالة والإعاقة */}
      <SectionCard title={ar ? "المؤهلات والحالة والإعاقة" : "Qualifications, Status & Disability"} icon={<User className="h-5 w-5" />}>
        <F name="lastQualification" label={ar ? "آخر مؤهل علمي معين على أساسه" : "Last Qualification"} />
        <F name="hasDisability"     label={ar ? "هل لديك إعاقة" : "Has Disability"} />
        <F name="disabilityType"    label={ar ? "نوع الإعاقة" : "Disability Type"} />
        <F name="disabilityCard"    label={ar ? "بطاقة الإعاقة" : "Disability Card"} />
        <F name="status"            label={ar ? "الحالة" : "Status"} />
        <F name="statusDetail"      label={ar ? "تفصيل الحالة" : "Status Detail"} />
        <F name="shamCashAccount"   label={ar ? "حساب شام كاش" : "Sham Cash Account"} />
        <div className="md:col-span-2">
          <Label htmlFor="centralNotes">{ar ? "ملاحظات مركزية" : "Central Notes"}</Label>
          <textarea
            id="centralNotes"
            {...register("centralNotes")}
            rows={3}
            className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 resize-none dark:bg-slate-900 dark:border-slate-600"
          />
        </div>
      </SectionCard>
    </div>
  );
}
