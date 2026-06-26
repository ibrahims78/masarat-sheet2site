import { useState, useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Download, FileSpreadsheet, FileText, Loader2, Calendar, Filter,
  Columns, ChevronDown, ChevronUp, CheckSquare, Square, LayoutGrid,
} from "lucide-react";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useLang } from "@/context/LanguageContext";

// ---- Column definitions (mirrors server EXPORT_COL_DEFS) ----
const ALL_COLS = [
  { key: "seq", label: "م" },
  { key: "orgLevel1", label: "المستوى التنظيمي الاول" },
  { key: "orgClassification", label: "التصنيف/ الجهة المرتبطة" },
  { key: "orgLevel2", label: "المستوى التنظيمي الثاني" },
  { key: "orgLevel3", label: "المستوى التنظيمي الثالث" },
  { key: "orgLevel4", label: "المستوى التنظيمي الرابع" },
  { key: "orgLevel5", label: "المستوى التنظيمي الخامس" },
  { key: "workGovernorate", label: "محافظة العمل" },
  { key: "employeeRefId", label: "الرقم الذاتي" },
  { key: "jobTitle", label: "مسمى العمل" },
  { key: "birthDate", label: "تاريخ التولد" },
  { key: "workStartDate", label: "تاريخ بدء العمل بالدولة" },
  { key: "permanentDate", label: "تاريخ التثبيت في الدولة" },
  { key: "contractDate", label: "تاريخ التعاقد في الدولة" },
  { key: "firstName", label: "الاسم" },
  { key: "fatherName", label: "اسم الأب" },
  { key: "familyName", label: "النسبة" },
  { key: "motherFullName", label: "اسم الأم الكامل" },
  { key: "nationalId", label: "الرقم الوطني" },
  { key: "gender", label: "الجنس" },
  { key: "mobile", label: "رقم الجوال" },
  { key: "residenceArea", label: "منطقة السكن" },
  { key: "residenceDetail", label: "تفصيل مكان السكن" },
  { key: "maritalStatus", label: "الوضع العائلي" },
  { key: "jobCategory", label: "الفئة الوظيفية" },
  { key: "employmentStatus", label: "مثبت أو متعاقد" },
  { key: "appointmentPattern", label: "نمط التعيين أو التعاقد" },
  { key: "mergeDetails", label: "تفاصيل دمج" },
  { key: "hasDisability", label: "هل لديك إعاقة" },
  { key: "disabilityType", label: "نوع الإعاقة" },
  { key: "disabilityCard", label: "بطاقة الإعاقة" },
  { key: "registryNumber", label: "رقم القيد" },
  { key: "registryPlace", label: "مكان القيد" },
  { key: "birthCountry", label: "دولة الولادة" },
  { key: "governorate", label: "المحافظة" },
  { key: "cityDistrict", label: "المنطقة_المدينة" },
  { key: "subDistrict", label: "الناحية" },
  { key: "lastQualification", label: "آخر مؤهل علمي معين على أساسه" },
  { key: "status", label: "الحالة" },
  { key: "statusDetail", label: "تفصيل الحالة" },
  { key: "shamCashAccount", label: "حساب شام كاش" },
  { key: "childrenCount", label: "عدد الأبناء" },
  { key: "wivesCount", label: "عدد الزوجات" },
  { key: "centralNotes", label: "ملاحظات مركزية" },
];

const COL_GROUPS = [
  { label: "تنظيمية", keys: ["seq", "orgLevel1", "orgClassification", "orgLevel2", "orgLevel3", "orgLevel4", "orgLevel5"] },
  { label: "وظيفية", keys: ["workGovernorate", "employeeRefId", "jobTitle", "workStartDate", "permanentDate", "contractDate", "jobCategory", "employmentStatus", "appointmentPattern", "mergeDetails"] },
  { label: "شخصية", keys: ["firstName", "fatherName", "familyName", "motherFullName", "nationalId", "gender", "birthDate", "maritalStatus", "childrenCount", "wivesCount", "mobile"] },
  { label: "إقامة", keys: ["residenceArea", "residenceDetail", "registryNumber", "registryPlace", "birthCountry", "governorate", "cityDistrict", "subDistrict"] },
  { label: "مؤهلات وحالة", keys: ["lastQualification", "hasDisability", "disabilityType", "disabilityCard", "status", "statusDetail", "shamCashAccount", "centralNotes"] },
];

const ALL_KEYS = ALL_COLS.map(c => c.key);

const PRESETS: Record<string, string[]> = {
  full: ALL_KEYS,
  personal: ["seq", "firstName", "fatherName", "familyName", "nationalId", "gender", "birthDate", "mobile"],
  work: ["seq", "employeeRefId", "jobTitle", "workGovernorate", "jobCategory", "employmentStatus", "workStartDate"],
  contact: ["seq", "firstName", "familyName", "mobile", "workGovernorate", "shamCashAccount"],
};

const PRESET_INFO = [
  { id: "full", icon: "📋", label: "الملف الأساسي", desc: "جميع الـ44 عمود كما هو في الملف الأساسي" },
  { id: "personal", icon: "👤", label: "بيانات شخصية", desc: "الاسم الثلاثي + الرقم الوطني + الجنس + الجوال" },
  { id: "work", icon: "🏢", label: "بيانات وظيفية", desc: "الرقم الذاتي + المسمى + المحافظة + الفئة" },
  { id: "contact", icon: "📱", label: "قائمة الاتصال", desc: "الاسم + الجوال + المحافظة + شام كاش" },
  { id: "custom", icon: "⚙️", label: "مخصص", desc: "اختر الأعمدة يدوياً" },
];

function smartDefault() {
  const now = new Date();
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `كوادر_صحية_${months[now.getMonth()]}${now.getFullYear()}`;
}

interface Filters {
  governorate: string;
  status: string;
  gender: string;
  employmentStatus: string;
  jobCategory: string;
  dateFrom: string;
  dateTo: string;
}

interface PreviewData {
  total: number;
  male: number;
  female: number;
}

export function Export() {
  const { lang } = useLang();
  const ar = lang === "ar";

  // File name
  const [fileName, setFileName] = useState(smartDefault());

  // Filters
  const [filters, setFilters] = useState<Filters>({
    governorate: "", status: "", gender: "", employmentStatus: "", jobCategory: "",
    dateFrom: "", dateTo: "",
  });
  const [showFilters, setShowFilters] = useState(false);

  // Columns
  const [preset, setPreset] = useState<string>("full");
  const [customCols, setCustomCols] = useState<string[]>(ALL_KEYS);
  const [showCustom, setShowCustom] = useState(false);

  // Format options
  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [sheetPerGov, setSheetPerGov] = useState(false);

  const [loading, setLoading] = useState(false);

  // Active column keys
  const activeCols = preset === "custom" ? customCols : (PRESETS[preset] ?? ALL_KEYS);

  // Filter params for preview query
  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    if (filters.governorate) p.set("governorate", filters.governorate);
    if (filters.status) p.set("status", filters.status);
    if (filters.gender) p.set("gender", filters.gender);
    if (filters.employmentStatus) p.set("employmentStatus", filters.employmentStatus);
    if (filters.jobCategory) p.set("jobCategory", filters.jobCategory);
    if (filters.dateFrom) p.set("dateFrom", filters.dateFrom);
    if (filters.dateTo) p.set("dateTo", filters.dateTo);
    return p.toString();
  }, [filters]);

  const { data: preview, isLoading: previewLoading } = useQuery<PreviewData>({
    queryKey: ["/api/admin/export/preview", filterParams],
    queryFn: async () => {
      const res = await fetch(`/api/admin/export/preview?${filterParams}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل جلب المعاينة");
      return res.json();
    },
    staleTime: 30000,
  });

  // Active filter count
  const activeFilterCount = Object.values(filters).filter(v => v !== "").length;

  const setFilter = (key: keyof Filters, val: string) =>
    setFilters(prev => ({ ...prev, [key]: val }));

  const addToFileName = (suffix: string) => setFileName(prev => `${prev}_${suffix}`);

  const toggleCustomCol = (key: string) =>
    setCustomCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const toggleGroupCols = (keys: string[]) => {
    const allOn = keys.every(k => customCols.includes(k));
    setCustomCols(prev => allOn ? prev.filter(k => !keys.includes(k)) : [...new Set([...prev, ...keys])]);
  };

  const handleExport = async () => {
    if (activeCols.length === 0) { alert("اختر عموداً واحداً على الأقل"); return; }
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set("format", format);
      params.set("filename", fileName || "كوادر_صحية");
      params.set("columns", activeCols.join(","));
      if (sheetPerGov && format === "xlsx") params.set("sheetPerGov", "true");
      if (filters.governorate) params.set("governorate", filters.governorate);
      if (filters.status) params.set("status", filters.status);
      if (filters.gender) params.set("gender", filters.gender);
      if (filters.employmentStatus) params.set("employmentStatus", filters.employmentStatus);
      if (filters.jobCategory) params.set("jobCategory", filters.jobCategory);
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);

      const res = await fetch(`/api/admin/export?${params}`, { credentials: "include" });
      if (!res.ok) throw new Error("فشل التصدير");
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `${fileName || "كوادر_صحية"}.${format}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const labelCol = (key: string) => ALL_COLS.find(c => c.key === key)?.label ?? key;

  return (
    <Layout>
      <div className="max-w-3xl mx-auto space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">📤 تصدير البيانات</h1>
          <p className="text-muted-foreground text-sm mt-1">تصدير احترافي مع تحكم كامل في الفلاتر والأعمدة</p>
        </div>

        {/* ① File name */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileSpreadsheet className="h-4 w-4 text-green-600" />
              اسم الملف
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <Input
              value={fileName}
              onChange={e => setFileName(e.target.value)}
              placeholder="كوادر_صحية_يونيو2026"
              data-testid="input-filename"
              dir="rtl"
            />
            <div className="flex flex-wrap gap-2">
              <span className="text-xs text-muted-foreground self-center">أضف سريعاً:</span>
              {(() => {
                const now = new Date();
                const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
                return (
                  <>
                    <Button size="sm" variant="outline" onClick={() => addToFileName(`${now.getDate()}-${now.getMonth()+1}-${now.getFullYear()}`)}>
                      📅 التاريخ
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => filters.governorate && addToFileName(filters.governorate)}>
                      🏛 المحافظة
                    </Button>
                    <Button size="sm" variant="outline" onClick={() => preview && addToFileName(`${preview.total}سجل`)}>
                      🔢 عدد السجلات
                    </Button>
                  </>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* ② Filters */}
        <Card>
          <CardHeader className="pb-2 cursor-pointer" onClick={() => setShowFilters(v => !v)}>
            <CardTitle className="text-base flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Filter className="h-4 w-4 text-blue-600" />
                فلترة السجلات
                {activeFilterCount > 0 && (
                  <Badge variant="secondary">{activeFilterCount} فلتر نشط</Badge>
                )}
              </span>
              {showFilters ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
            </CardTitle>
          </CardHeader>
          {showFilters && (
            <CardContent className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {[
                { key: "governorate", label: "محافظة العمل", placeholder: "مثال: دمشق" },
                { key: "status", label: "الحالة", placeholder: "مثال: نشط" },
                { key: "gender", label: "الجنس", placeholder: "ذكر / أنثى" },
                { key: "employmentStatus", label: "مثبت أو متعاقد", placeholder: "مثبت / متعاقد" },
                { key: "jobCategory", label: "الفئة الوظيفية", placeholder: "مثال: طبيب" },
              ].map(f => (
                <div key={f.key} className="space-y-1">
                  <Label className="text-xs">{f.label}</Label>
                  <Input
                    value={filters[f.key as keyof Filters]}
                    onChange={e => setFilter(f.key as keyof Filters, e.target.value)}
                    placeholder={f.placeholder}
                    data-testid={`filter-${f.key}`}
                  />
                </div>
              ))}
              <div className="space-y-1">
                <Label className="text-xs">نطاق تاريخ التسجيل</Label>
                <div className="flex gap-2 items-center">
                  <Input type="date" value={filters.dateFrom} onChange={e => setFilter("dateFrom", e.target.value)} className="text-sm" data-testid="filter-dateFrom" />
                  <span className="text-xs text-muted-foreground">—</span>
                  <Input type="date" value={filters.dateTo} onChange={e => setFilter("dateTo", e.target.value)} className="text-sm" data-testid="filter-dateTo" />
                </div>
              </div>
              {activeFilterCount > 0 && (
                <div className="sm:col-span-2">
                  <Button size="sm" variant="ghost" className="text-red-500" onClick={() =>
                    setFilters({ governorate: "", status: "", gender: "", employmentStatus: "", jobCategory: "", dateFrom: "", dateTo: "" })
                  }>
                    ✕ مسح جميع الفلاتر
                  </Button>
                </div>
              )}
            </CardContent>
          )}
        </Card>

        {/* ③ Column presets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Columns className="h-4 w-4 text-purple-600" />
              الأعمدة المُصدَّرة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESET_INFO.map(p => (
                <button
                  key={p.id}
                  data-testid={`preset-${p.id}`}
                  onClick={() => { setPreset(p.id); if (p.id === "custom") setShowCustom(true); }}
                  className={`text-right p-3 rounded-xl border-2 transition-all text-sm ${
                    preset === p.id
                      ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                      : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                  }`}
                >
                  <div className="font-semibold">{p.icon} {p.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-snug">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Custom columns panel */}
            {preset === "custom" && (
              <div className="border rounded-xl p-3 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">اختر الأعمدة ({customCols.length} / {ALL_COLS.length})</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCustomCols(ALL_KEYS)}>تحديد الكل</Button>
                    <Button size="sm" variant="outline" onClick={() => setCustomCols([])}>إلغاء الكل</Button>
                  </div>
                </div>
                {COL_GROUPS.map(group => {
                  const allOn = group.keys.every(k => customCols.includes(k));
                  const someOn = group.keys.some(k => customCols.includes(k));
                  return (
                    <div key={group.label}>
                      <button
                        className="flex items-center gap-2 text-sm font-semibold text-slate-700 dark:text-slate-300 mb-2 w-full"
                        onClick={() => toggleGroupCols(group.keys)}
                      >
                        {allOn ? <CheckSquare className="h-4 w-4 text-blue-500" /> : someOn ? <LayoutGrid className="h-4 w-4 text-blue-300" /> : <Square className="h-4 w-4 text-slate-400" />}
                        {group.label}
                      </button>
                      <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5 pr-5">
                        {group.keys.map(k => (
                          <label key={k} className="flex items-center gap-2 text-xs cursor-pointer hover:text-blue-600">
                            <input
                              type="checkbox"
                              checked={customCols.includes(k)}
                              onChange={() => toggleCustomCol(k)}
                              data-testid={`col-${k}`}
                              className="accent-blue-500"
                            />
                            {labelCol(k)}
                          </label>
                        ))}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              سيتم تصدير <span className="font-bold text-blue-600">{activeCols.length}</span> عمود من أصل {ALL_COLS.length}
            </p>
          </CardContent>
        </Card>

        {/* ④ Format */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <FileText className="h-4 w-4 text-orange-500" />
              صيغة التصدير
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <button
                data-testid="format-xlsx"
                onClick={() => setFormat("xlsx")}
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  format === "xlsx" ? "border-green-500 bg-green-50 dark:bg-green-900/20" : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="text-2xl mb-1">📗</div>
                <div className="font-semibold text-sm">Excel (.xlsx)</div>
                <div className="text-xs text-muted-foreground">تنسيق احترافي وعناوين عربية</div>
              </button>
              <button
                data-testid="format-csv"
                onClick={() => setFormat("csv")}
                className={`p-4 rounded-xl border-2 text-right transition-all ${
                  format === "csv" ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20" : "border-slate-200 dark:border-slate-700"
                }`}
              >
                <div className="text-2xl mb-1">📄</div>
                <div className="font-semibold text-sm">CSV</div>
                <div className="text-xs text-muted-foreground">UTF-8 مع BOM لدعم Excel العربي</div>
              </button>
            </div>

            {format === "xlsx" && (
              <label className="flex items-center gap-3 cursor-pointer p-3 rounded-xl border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800">
                <input
                  type="checkbox"
                  checked={sheetPerGov}
                  onChange={e => setSheetPerGov(e.target.checked)}
                  data-testid="check-sheet-per-gov"
                  className="accent-blue-500 w-4 h-4"
                />
                <div>
                  <div className="text-sm font-medium">تجميع حسب المحافظة (Sheet منفصل لكل محافظة)</div>
                  <div className="text-xs text-muted-foreground">مفيد عند تصدير بيانات محافظات متعددة</div>
                </div>
              </label>
            )}
          </CardContent>
        </Card>

        {/* ⑤ Preview summary */}
        <Card className="border-2 border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-900/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold">📊 ملخص التصدير</span>
              {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-blue-500" />}
            </div>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center mb-4">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <div className="text-2xl font-bold text-blue-600">{previewLoading ? "…" : (preview?.total ?? 0)}</div>
                <div className="text-xs text-muted-foreground">إجمالي السجلات</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <div className="text-2xl font-bold text-indigo-600">{previewLoading ? "…" : (preview?.male ?? 0)}</div>
                <div className="text-xs text-muted-foreground">ذكور</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <div className="text-2xl font-bold text-pink-500">{previewLoading ? "…" : (preview?.female ?? 0)}</div>
                <div className="text-xs text-muted-foreground">إناث</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{activeCols.length}</div>
                <div className="text-xs text-muted-foreground">عمود مُصدَّر</div>
              </div>
            </div>

            <div className="text-sm text-slate-600 dark:text-slate-400 mb-4 space-y-1 border rounded-lg p-3 bg-white dark:bg-slate-800">
              <div className="flex justify-between">
                <span>اسم الملف:</span>
                <span className="font-mono font-medium">{fileName || "كوادر_صحية"}.{format}</span>
              </div>
              <div className="flex justify-between">
                <span>الصيغة:</span>
                <span>{format === "xlsx" ? "Excel (.xlsx)" : "CSV (UTF-8 BOM)"}</span>
              </div>
              {activeFilterCount > 0 && (
                <div className="flex justify-between">
                  <span>الفلاتر النشطة:</span>
                  <span className="text-blue-600">{activeFilterCount} فلتر</span>
                </div>
              )}
              {sheetPerGov && format === "xlsx" && (
                <div className="flex justify-between">
                  <span>تجميع:</span>
                  <span className="text-green-600">sheet لكل محافظة</span>
                </div>
              )}
            </div>

            <Button
              className="w-full bg-blue-600 hover:bg-blue-700 text-white py-5 text-base font-bold"
              onClick={handleExport}
              disabled={loading || activeCols.length === 0}
              data-testid="button-export"
            >
              {loading
                ? <><Loader2 className="h-5 w-5 animate-spin ml-2" /> جاري التصدير...</>
                : <><Download className="h-5 w-5 ml-2" /> 📥 تصدير {preview?.total ?? ""} سجل الآن</>
              }
            </Button>
          </CardContent>
        </Card>

      </div>
    </Layout>
  );
}
