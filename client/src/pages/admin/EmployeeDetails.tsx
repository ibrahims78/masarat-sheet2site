import { useQuery } from "@tanstack/react-query";
import { useParams, useLocation } from "wouter";
import { Loader2, ArrowRight, Edit, Printer, Clock } from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { apiRequest } from "@/lib/queryClient";

interface Employee {
  id: string; sequentialNumber: number;
  orgLevel1?: string; orgClassification?: string;
  orgLevel2?: string; orgLevel3?: string; orgLevel4?: string; orgLevel5?: string;
  workGovernorate?: string; employeeRefId?: string; jobTitle?: string;
  birthDate?: string; workStartDate?: string; permanentDate?: string; contractDate?: string;
  firstName: string; fatherName?: string; familyName: string; motherFullName?: string;
  nationalId: string; gender?: string; mobile?: string;
  residenceArea?: string; residenceDetail?: string; maritalStatus?: string;
  jobCategory?: string; employmentStatus?: string; appointmentPattern?: string; mergeDetails?: string;
  hasDisability?: string; disabilityType?: string; disabilityCard?: string;
  registryNumber?: string; registryPlace?: string; birthCountry?: string;
  governorate?: string; cityDistrict?: string; subDistrict?: string;
  lastQualification?: string; status?: string; statusDetail?: string;
  shamCashAccount?: string; childrenCount?: number; wivesCount?: number; centralNotes?: string;
  submittedAt?: string; updatedAt?: string;
  [key: string]: any;
}

interface AuditEntry { id: string; changedBy?: string; action: string; changedAt?: string; }

const STATUS_BADGE: Record<string, string> = {
  "نشط": "success", "إجازة": "warning", "منتدب": "secondary",
  "متوفى": "outline", "مفصول": "destructive",
};

function Row({ label, value }: { label: string; value?: string | number | null }) {
  return (
    <div className="flex gap-2 py-1.5 border-b border-slate-100 dark:border-slate-700 last:border-0">
      <dt className="text-xs text-muted-foreground min-w-40 shrink-0">{label}</dt>
      <dd className="text-sm font-medium text-slate-800 dark:text-slate-200">
        {value != null && value !== "" ? value : <span className="text-slate-300 dark:text-slate-600">—</span>}
      </dd>
    </div>
  );
}

export function EmployeeDetails() {
  const { id } = useParams<{ id: string }>();
  const [, nav] = useLocation();
  const { user } = useAuth();
  const { lang } = useLang();
  const ar = lang === "ar";

  const { data, isLoading } = useQuery({
    queryKey: ["employee", id],
    queryFn: () => apiRequest<{ employee: Employee; auditLog: AuditEntry[] }>("GET", `/api/admin/employees/${id}`),
  });

  if (isLoading) return (
    <Layout>
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-10 w-10 animate-spin text-primary" />
      </div>
    </Layout>
  );

  const emp = data?.employee;
  if (!emp) return (
    <Layout><div className="text-center p-12 text-muted-foreground">الموظف غير موجود</div></Layout>
  );

  return (
    <Layout>
      <div className="max-w-4xl mx-auto space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={() => nav("/admin/employees")}>
              <ArrowRight className="h-5 w-5" />
            </Button>
            <div>
              <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {emp.firstName} {emp.fatherName} {emp.familyName}
              </h1>
              <p className="text-muted-foreground text-sm">
                م: {emp.sequentialNumber} | الرقم الوطني: {emp.nationalId}
                {emp.employeeRefId && ` | الرقم الذاتي: ${emp.employeeRefId}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 no-print">
            {emp.status && <Badge variant={(STATUS_BADGE[emp.status] || "outline") as any}>{emp.status}</Badge>}
            <Button variant="outline" size="sm" onClick={() => window.print()}>
              <Printer className="h-4 w-4 ml-2" /> طباعة
            </Button>
            {(user?.role === "admin" || user?.role === "editor") && (
              <Button size="sm" onClick={() => nav(`/admin/employees/${id}/edit`)}>
                <Edit className="h-4 w-4 ml-2" /> تعديل
              </Button>
            )}
          </div>
        </div>

        {/* Print Header */}
        <div className="hidden print:block text-center mb-6 pb-4 border-b-2">
          <h1 className="text-xl font-bold">نموذج منصة نواة لمديريات الصحة والهيئات</h1>
          <p className="text-sm text-gray-500">
            {emp.firstName} {emp.fatherName} {emp.familyName} — رقم وطني: {emp.nationalId}
          </p>
          <p className="text-xs text-gray-400">طُبع: {new Date().toLocaleDateString("ar-SY")}</p>
        </div>

        {/* Tabs — matching master file groupings */}
        <Tabs defaultValue="org" dir="rtl" className="no-print">
          <TabsList className="w-full grid grid-cols-4">
            <TabsTrigger value="org">التنظيمية والوظيفية</TabsTrigger>
            <TabsTrigger value="personal">الشخصية</TabsTrigger>
            <TabsTrigger value="residence">الإقامة والقيد</TabsTrigger>
            <TabsTrigger value="qual">المؤهلات والحالة</TabsTrigger>
          </TabsList>

          {/* Tab 1: التنظيمية والوظيفية — columns 1–14 of master file */}
          <TabsContent value="org">
            <div className="section-card">
              <dl>
                <Row label="المستوى التنظيمي الاول"       value={emp.orgLevel1} />
                <Row label="التصنيف/ الجهة المرتبطة"      value={emp.orgClassification} />
                <Row label="المستوى التنظيمي الثاني"      value={emp.orgLevel2} />
                <Row label="المستوى التنظيمي الثالث"      value={emp.orgLevel3} />
                <Row label="المستوى التنظيمي الرابع"      value={emp.orgLevel4} />
                <Row label="المستوى التنظيمي الخامس"      value={emp.orgLevel5} />
                <Row label="محافظة العمل"                  value={emp.workGovernorate} />
                <Row label="الرقم الذاتي"                  value={emp.employeeRefId} />
                <Row label="مسمى العمل"                    value={emp.jobTitle} />
                <Row label="تاريخ التولد"                  value={emp.birthDate} />
                <Row label="تاريخ بدء العمل بالدولة"       value={emp.workStartDate} />
                <Row label="تاريخ التثبيت في الدولة"       value={emp.permanentDate} />
                <Row label="تاريخ التعاقد في الدولة"       value={emp.contractDate} />
                <Row label="الفئة الوظيفية"                value={emp.jobCategory} />
                <Row label="مثبت أو متعاقد"                value={emp.employmentStatus} />
                <Row label="نمط التعيين أو التعاقد"        value={emp.appointmentPattern} />
                <Row label="تفاصيل دمج"                    value={emp.mergeDetails} />
              </dl>
            </div>
          </TabsContent>

          {/* Tab 2: الشخصية — columns 15–24 */}
          <TabsContent value="personal">
            <div className="section-card">
              <dl>
                <Row label="الاسم"           value={emp.firstName} />
                <Row label="اسم الأب"        value={emp.fatherName} />
                <Row label="النسبة"          value={emp.familyName} />
                <Row label="اسم الأم الكامل" value={emp.motherFullName} />
                <Row label="الرقم الوطني"    value={emp.nationalId} />
                <Row label="الجنس"           value={emp.gender} />
                <Row label="رقم الجوال"      value={emp.mobile} />
                <Row label="الوضع العائلي"   value={emp.maritalStatus} />
                <Row label="عدد الأبناء"     value={emp.childrenCount} />
                <Row label="عدد الزوجات"     value={emp.wivesCount} />
              </dl>
            </div>
          </TabsContent>

          {/* Tab 3: الإقامة والقيد — columns 22–37 */}
          <TabsContent value="residence">
            <div className="section-card">
              <dl>
                <Row label="منطقة السكن"     value={emp.residenceArea} />
                <Row label="تفصيل مكان السكن" value={emp.residenceDetail} />
                <Row label="رقم القيد"        value={emp.registryNumber} />
                <Row label="مكان القيد"       value={emp.registryPlace} />
                <Row label="دولة الولادة"     value={emp.birthCountry} />
                <Row label="المحافظة"         value={emp.governorate} />
                <Row label="المنطقة_المدينة"  value={emp.cityDistrict} />
                <Row label="الناحية"          value={emp.subDistrict} />
              </dl>
            </div>
          </TabsContent>

          {/* Tab 4: المؤهلات والحالة — columns 29–44 */}
          <TabsContent value="qual">
            <div className="section-card">
              <dl>
                <Row label="آخر مؤهل علمي معين على أساسه" value={emp.lastQualification} />
                <Row label="هل لديك إعاقة"               value={emp.hasDisability} />
                <Row label="نوع الإعاقة"                 value={emp.disabilityType} />
                <Row label="بطاقة الإعاقة"               value={emp.disabilityCard} />
                <Row label="الحالة"                       value={emp.status} />
                <Row label="تفصيل الحالة"                 value={emp.statusDetail} />
                <Row label="حساب شام كاش"                 value={emp.shamCashAccount} />
                <Row label="ملاحظات مركزية"               value={emp.centralNotes} />
                <Row label="تاريخ التسجيل"
                  value={emp.submittedAt ? new Date(emp.submittedAt).toLocaleDateString("ar-SY") : undefined} />
              </dl>
            </div>
          </TabsContent>
        </Tabs>

        {/* Print View — all sections shown */}
        <div className="hidden print:block space-y-6">
          {[
            { title: "البيانات التنظيمية والوظيفية", rows: [
              ["المستوى التنظيمي الاول", emp.orgLevel1],
              ["التصنيف/ الجهة المرتبطة", emp.orgClassification],
              ["المستوى التنظيمي الثاني", emp.orgLevel2],
              ["المستوى التنظيمي الثالث", emp.orgLevel3],
              ["المستوى التنظيمي الرابع", emp.orgLevel4],
              ["المستوى التنظيمي الخامس", emp.orgLevel5],
              ["محافظة العمل", emp.workGovernorate],
              ["الرقم الذاتي", emp.employeeRefId],
              ["مسمى العمل", emp.jobTitle],
              ["تاريخ التولد", emp.birthDate],
              ["تاريخ بدء العمل بالدولة", emp.workStartDate],
              ["تاريخ التثبيت في الدولة", emp.permanentDate],
              ["تاريخ التعاقد في الدولة", emp.contractDate],
              ["الفئة الوظيفية", emp.jobCategory],
              ["مثبت أو متعاقد", emp.employmentStatus],
              ["نمط التعيين أو التعاقد", emp.appointmentPattern],
              ["تفاصيل دمج", emp.mergeDetails],
            ]},
            { title: "البيانات الشخصية", rows: [
              ["الاسم", emp.firstName],
              ["اسم الأب", emp.fatherName],
              ["النسبة", emp.familyName],
              ["اسم الأم الكامل", emp.motherFullName],
              ["الرقم الوطني", emp.nationalId],
              ["الجنس", emp.gender],
              ["رقم الجوال", emp.mobile],
              ["الوضع العائلي", emp.maritalStatus],
              ["عدد الأبناء", emp.childrenCount],
              ["عدد الزوجات", emp.wivesCount],
            ]},
            { title: "الإقامة والقيد", rows: [
              ["منطقة السكن", emp.residenceArea],
              ["تفصيل مكان السكن", emp.residenceDetail],
              ["رقم القيد", emp.registryNumber],
              ["مكان القيد", emp.registryPlace],
              ["دولة الولادة", emp.birthCountry],
              ["المحافظة", emp.governorate],
              ["المنطقة_المدينة", emp.cityDistrict],
              ["الناحية", emp.subDistrict],
            ]},
            { title: "المؤهلات والحالة", rows: [
              ["آخر مؤهل علمي معين على أساسه", emp.lastQualification],
              ["هل لديك إعاقة", emp.hasDisability],
              ["نوع الإعاقة", emp.disabilityType],
              ["بطاقة الإعاقة", emp.disabilityCard],
              ["الحالة", emp.status],
              ["تفصيل الحالة", emp.statusDetail],
              ["حساب شام كاش", emp.shamCashAccount],
              ["ملاحظات مركزية", emp.centralNotes],
            ]},
          ].map(sec => (
            <div key={sec.title}>
              <h3 className="font-bold text-sm border-b-2 border-slate-800 pb-1 mb-2">{sec.title}</h3>
              <div className="grid grid-cols-2 gap-x-8">
                {sec.rows.map(([label, val]) => (
                  <div key={label as string} className="flex gap-2 py-1 border-b border-gray-200">
                    <span className="text-xs text-gray-500 min-w-36">{label as string}</span>
                    <span className="text-xs font-medium">{val as string || "—"}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        {/* Audit Log */}
        {data?.auditLog && data.auditLog.length > 0 && (
          <div className="section-card no-print">
            <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-100 dark:border-slate-700">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <h3 className="font-semibold text-sm text-slate-700 dark:text-slate-300">سجل التعديلات</h3>
            </div>
            <div className="space-y-1">
              {data.auditLog.map(log => (
                <div key={log.id} className="flex items-center gap-3 text-xs text-muted-foreground py-1.5 border-b border-slate-50 dark:border-slate-700 last:border-0">
                  <Badge variant={log.action === "create" ? "success" : log.action === "delete" ? "destructive" : "secondary"} className="text-[10px]">
                    {log.action === "create" ? "إنشاء" : log.action === "update" ? "تعديل" : "حذف"}
                  </Badge>
                  <span>{log.changedBy === "employee" ? "الموظف" : log.changedBy || "—"}</span>
                  <span className="mr-auto">
                    {log.changedAt ? new Date(log.changedAt).toLocaleString("ar-SY") : "—"}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}
