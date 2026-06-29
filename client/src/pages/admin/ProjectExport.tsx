import { useParams } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Download, FileSpreadsheet, FileText, Loader2,
  Filter, Columns, ChevronDown, ChevronUp, CheckSquare, Square,
} from "lucide-react";
import { useState, useMemo } from "react";
import type { ProjectField } from "@shared/schema";

interface PreviewData { total: number; }

const PRESETS = [
  { id: "full",   icon: "📋", label: "كامل",       desc: "جميع الحقول" },
  { id: "custom", icon: "⚙️", label: "مخصص",       desc: "اختر الحقول يدوياً" },
];

function smartDefault(projectName?: string) {
  const now = new Date();
  const months = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  return `${projectName || "بيانات"}_${months[now.getMonth()]}${now.getFullYear()}`;
}

export function ProjectExport() {
  const { id } = useParams<{ id: string }>();

  const [format, setFormat] = useState<"xlsx" | "csv">("xlsx");
  const [exporting, setExporting] = useState(false);
  const [preset, setPreset] = useState("full");
  const [customCols, setCustomCols] = useState<string[]>([]);
  const [showCustom, setShowCustom] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [fileName, setFileName] = useState("");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [sheetPerGroup, setSheetPerGroup] = useState(false);
  const [groupByField, setGroupByField] = useState("");

  const { data: fields = [] } = useQuery<ProjectField[]>({
    queryKey: ["/api/projects", id, "fields"],
    queryFn: () => fetch(`/api/projects/${id}/fields`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: project } = useQuery<{ id: string; name: string; [k: string]: any }>({
    queryKey: ["/api/projects", id],
    queryFn: () => fetch(`/api/projects/${id}`, { credentials: "include" }).then(r => r.json()),
  });

  const visibleFields = useMemo(() => fields.filter(f => f.isVisible !== false), [fields]);
  const allKeys = useMemo(() => visibleFields.map(f => f.key), [visibleFields]);

  const activeCols = preset === "custom" ? customCols : allKeys;

  const filterParams = useMemo(() => {
    const p = new URLSearchParams();
    Object.entries(filters).forEach(([k, v]) => { if (v) p.set(`filter_${k}`, v); });
    return p.toString();
  }, [filters]);

  const { data: preview, isLoading: previewLoading } = useQuery<PreviewData>({
    queryKey: ["/api/projects", id, "export-preview", filterParams],
    queryFn: () =>
      fetch(`/api/projects/${id}/records?page=1&limit=1&${filterParams}`, { credentials: "include" })
        .then(r => r.json())
        .then(d => ({ total: d.total ?? 0 })),
    staleTime: 30000,
  });

  const filterableFields = useMemo(() =>
    visibleFields.filter(f =>
      f.fieldType === "select" || f.fieldType === "radio" ||
      (Array.isArray(f.options) && (f.options as string[]).length > 0)
    ),
    [visibleFields]
  );

  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const toggleCustomCol = (key: string) =>
    setCustomCols(prev => prev.includes(key) ? prev.filter(k => k !== key) : [...prev, key]);

  const addToFileName = (suffix: string) => {
    if (suffix) setFileName(prev => `${prev}_${suffix}`);
  };

  const doExport = async () => {
    if (activeCols.length === 0) { alert("اختر حقلاً واحداً على الأقل"); return; }
    setExporting(true);
    try {
      const params = new URLSearchParams();
      params.set("format", format);
      params.set("filename", fileName || smartDefault(project?.name));
      params.set("columns", activeCols.join(","));
      if (sheetPerGroup && groupByField && format === "xlsx") {
        params.set("groupBy", groupByField);
      }
      Object.entries(filters).forEach(([k, v]) => { if (v) params.set(`filter_${k}`, v); });

      const url = `/api/projects/${id}/export?${params}`;
      const res = await fetch(url, { credentials: "include" });
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: "فشل التصدير" }));
        throw new Error(err.error || "فشل التصدير");
      }
      const blob = await res.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `${fileName || smartDefault(project?.name)}.${format}`;
      link.click();
      URL.revokeObjectURL(link.href);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setExporting(false);
    }
  };

  return (
    <Layout projectId={id}>
      <div className="max-w-3xl space-y-5">

        {/* Header */}
        <div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">📤 تصدير البيانات</h1>
          <p className="text-muted-foreground text-sm mt-1">تصدير سجلات المشروع مع تحكم كامل في الفلاتر والأعمدة</p>
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
              placeholder={smartDefault(project?.name)}
              data-testid="input-filename"
              dir="rtl"
            />
            <div className="flex flex-wrap gap-2 items-center">
              <span className="text-xs text-muted-foreground">أضف سريعاً:</span>
              <Button size="sm" variant="outline" onClick={() => {
                const now = new Date();
                addToFileName(`${now.getDate()}-${now.getMonth() + 1}-${now.getFullYear()}`);
              }}>📅 التاريخ</Button>
              <Button size="sm" variant="outline"
                onClick={() => preview && addToFileName(`${preview.total}سجل`)}
                disabled={previewLoading}>
                🔢 عدد السجلات
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* ② Filters */}
        <Card>
          <CardHeader
            className="pb-2 cursor-pointer select-none"
            onClick={() => setShowFilters(v => !v)}
          >
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
            <CardContent className="space-y-3">
              {filterableFields.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {filterableFields.map(f => {
                    const opts = (f.options as string[] | null) || [];
                    return (
                      <div key={f.key} className="space-y-1">
                        <Label className="text-xs">{f.label}</Label>
                        {opts.length > 0 ? (
                          <select
                            value={filters[f.key] || ""}
                            onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                            className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                            data-testid={`filter-${f.key}`}
                          >
                            <option value="">الكل</option>
                            {opts.map(o => <option key={o} value={o}>{o}</option>)}
                          </select>
                        ) : (
                          <Input
                            value={filters[f.key] || ""}
                            onChange={e => setFilters(p => ({ ...p, [f.key]: e.target.value }))}
                            placeholder={`فلتر ${f.label}...`}
                            data-testid={`filter-${f.key}`}
                          />
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-xs text-muted-foreground text-center py-4">
                  لا توجد حقول قابلة للفلترة في هذا المشروع
                </p>
              )}
              {activeFilterCount > 0 && (
                <Button size="sm" variant="ghost" className="text-red-500"
                  onClick={() => setFilters({})}>
                  ✕ مسح جميع الفلاتر
                </Button>
              )}
            </CardContent>
          )}
        </Card>

        {/* ③ Column presets */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2">
              <Columns className="h-4 w-4 text-purple-600" />
              الحقول المُصدَّرة
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {PRESETS.map(p => (
                <button
                  key={p.id}
                  data-testid={`preset-${p.id}`}
                  onClick={() => {
                    setPreset(p.id);
                    if (p.id === "custom") {
                      setCustomCols(allKeys);
                      setShowCustom(true);
                    } else {
                      setShowCustom(false);
                    }
                  }}
                  className={`text-right p-3 rounded-xl border-2 transition-all text-sm ${
                    preset === p.id
                      ? "border-primary bg-primary/5 dark:bg-primary/10"
                      : "border-slate-200 dark:border-slate-700 hover:border-primary/40"
                  }`}
                >
                  <div className="font-semibold">{p.icon} {p.label}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{p.desc}</div>
                </button>
              ))}
            </div>

            {/* Custom columns panel */}
            {preset === "custom" && showCustom && (
              <div className="border rounded-xl p-3 space-y-3 bg-slate-50 dark:bg-slate-800/40">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">
                    اختر الحقول ({customCols.length} / {visibleFields.length})
                  </span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" onClick={() => setCustomCols(allKeys)}>تحديد الكل</Button>
                    <Button size="sm" variant="outline" onClick={() => setCustomCols([])}>إلغاء الكل</Button>
                  </div>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-1.5">
                  {visibleFields.map(f => (
                    <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer hover:text-primary select-none">
                      {customCols.includes(f.key)
                        ? <CheckSquare className="h-3.5 w-3.5 text-primary shrink-0" />
                        : <Square className="h-3.5 w-3.5 text-slate-400 shrink-0" />}
                      <input
                        type="checkbox"
                        hidden
                        checked={customCols.includes(f.key)}
                        onChange={() => toggleCustomCol(f.key)}
                        data-testid={`col-${f.key}`}
                      />
                      {f.label}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-muted-foreground">
              سيتم تصدير{" "}
              <span className="font-bold text-primary">{activeCols.length}</span>
              {" "}حقل من أصل {visibleFields.length}
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
                  format === "xlsx"
                    ? "border-green-500 bg-green-50 dark:bg-green-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-green-300"
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
                  format === "csv"
                    ? "border-blue-500 bg-blue-50 dark:bg-blue-900/20"
                    : "border-slate-200 dark:border-slate-700 hover:border-blue-300"
                }`}
              >
                <div className="text-2xl mb-1">📄</div>
                <div className="font-semibold text-sm">CSV (.csv)</div>
                <div className="text-xs text-muted-foreground">UTF-8 مع BOM لدعم Excel العربي</div>
              </button>
            </div>

            {format === "xlsx" && visibleFields.length > 0 && (
              <div className="space-y-3 border rounded-xl p-3 bg-slate-50 dark:bg-slate-800/40">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={sheetPerGroup}
                    onChange={e => setSheetPerGroup(e.target.checked)}
                    data-testid="check-sheet-per-group"
                    className="accent-primary w-4 h-4"
                  />
                  <div>
                    <div className="text-sm font-medium">تجميع في Sheets منفصلة</div>
                    <div className="text-xs text-muted-foreground">ورقة عمل منفصلة لكل قيمة في الحقل المحدد</div>
                  </div>
                </label>
                {sheetPerGroup && (
                  <div className="space-y-1 pr-7">
                    <Label className="text-xs">التجميع حسب حقل</Label>
                    <select
                      value={groupByField}
                      onChange={e => setGroupByField(e.target.value)}
                      className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                      data-testid="select-group-field"
                    >
                      <option value="">اختر حقلاً...</option>
                      {visibleFields.map(f => <option key={f.key} value={f.key}>{f.label}</option>)}
                    </select>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* ⑤ Preview summary */}
        <Card className="border-2 border-primary/20 bg-primary/5 dark:bg-primary/10">
          <CardContent className="pt-4">
            <div className="flex items-center gap-2 mb-3">
              <span className="text-base font-bold">📊 ملخص التصدير</span>
              {previewLoading && <Loader2 className="h-4 w-4 animate-spin text-primary" />}
            </div>
            <div className="grid grid-cols-3 gap-3 text-center mb-5">
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <div className="text-2xl font-bold text-primary">
                  {previewLoading ? "…" : (preview?.total ?? 0).toLocaleString("ar")}
                </div>
                <div className="text-xs text-muted-foreground">إجمالي السجلات</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <div className="text-2xl font-bold text-purple-600">{activeCols.length}</div>
                <div className="text-xs text-muted-foreground">حقل مُصدَّر</div>
              </div>
              <div className="bg-white dark:bg-slate-800 rounded-xl p-3 shadow-sm">
                <div className="text-2xl font-bold text-orange-500 uppercase">{format}</div>
                <div className="text-xs text-muted-foreground">صيغة الملف</div>
              </div>
            </div>

            <div className="text-sm bg-white dark:bg-slate-800 rounded-lg p-3 space-y-1.5 mb-4">
              <div className="flex justify-between text-xs">
                <span className="text-muted-foreground">اسم الملف:</span>
                <span className="font-mono font-medium">{(fileName || smartDefault(project?.name))}.{format}</span>
              </div>
              {activeFilterCount > 0 && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">الفلاتر النشطة:</span>
                  <span className="text-blue-600 font-medium">{activeFilterCount} فلتر</span>
                </div>
              )}
              {sheetPerGroup && groupByField && (
                <div className="flex justify-between text-xs">
                  <span className="text-muted-foreground">التجميع حسب:</span>
                  <span className="font-medium">{visibleFields.find(f => f.key === groupByField)?.label || groupByField}</span>
                </div>
              )}
            </div>

            <Button
              className="w-full"
              size="lg"
              onClick={doExport}
              disabled={exporting || activeCols.length === 0}
              data-testid="button-export"
            >
              {exporting
                ? <><Loader2 className="h-5 w-5 animate-spin ml-2" /> جاري التصدير...</>
                : <><Download className="h-5 w-5 ml-2" /> تصدير الآن</>}
            </Button>
          </CardContent>
        </Card>
      </div>
    </Layout>
  );
}
