/**
 * FormStepper — شريط تقدّم موحّد لنماذج المنصة.
 *
 * يُستخدم في:
 *   - ProjectRegister   (نموذج التسجيل العام)
 *   - ProjectParticipantForm (نموذج المشاركين الشخصي)
 *
 * التصميم: دوائر مترابطة بخط + شريط تقدّم نسبة مئوية تحتها.
 * الاستجابة: يُخفي التسميات على الشاشات الصغيرة ويُظهر الرقم فقط.
 * التفاعل: الخطوات المنتهية قابلة للنقر (مع callback اختياري onStepClick).
 */
import { CheckCircle } from "lucide-react";
import { cn } from "@/lib/utils";

// أيقونات افتراضية دائرية بسيطة إن لم يمرّر المستدعي أيقوناته
const DefaultDot = () => (
  <span className="block w-2 h-2 rounded-full bg-current" />
);

export interface FormStepperProps {
  /** أسماء الخطوات (بدون "مراجعة" — يُضاف تلقائياً) */
  steps: string[];
  /** الخطوة الحالية (0-indexed) */
  currentStep: number;
  /** هل الاتجاه عربي (RTL) */
  isAr: boolean;
  /** نسبة الإنجاز (0-100) — إن لم تُمرَّر تُحسب تلقائياً */
  progressPercent?: number;
  /** أيقونة لكل خطوة (اختياري) */
  stepIcons?: React.ComponentType<{ className?: string }>[];
  /** كلمة "مراجعة" (تُضاف كخطوة أخيرة) */
  reviewLabel?: string;
  /** callback عند النقر على خطوة منتهية */
  onStepClick?: (stepIndex: number) => void;
}

export function FormStepper({
  steps,
  currentStep,
  isAr,
  progressPercent,
  stepIcons = [],
  reviewLabel,
  onStepClick,
}: FormStepperProps) {
  // الخطوة الأخيرة هي المراجعة
  const allSteps = [...steps, reviewLabel || (isAr ? "مراجعة" : "Review")];
  const totalSteps = allSteps.length;

  const pct = progressPercent ?? Math.round((currentStep / Math.max(totalSteps - 1, 1)) * 100);

  return (
    <div className="space-y-3">
      {/* ── دوائر الخطوات ── */}
      <div className="relative flex items-start justify-between">
        {/* خط الخلفية */}
        <div className="absolute top-[18px] right-5 left-5 h-0.5 bg-slate-200 dark:bg-slate-700" />
        {/* خط التقدّم */}
        <div
          className="absolute top-[18px] h-0.5 bg-primary transition-all duration-500"
          style={{
            width:
              totalSteps > 1
                ? `calc(${(currentStep / (totalSteps - 1)) * 100}% * (100% - 40px) / 100%)`
                : "0%",
            [isAr ? "right" : "left"]: "20px",
            [isAr ? "left" : "right"]: "auto",
          }}
        />
        {allSteps.map((label, i) => {
          const Icon = stepIcons[i] ?? DefaultDot;
          const done = i < currentStep;
          const active = i === currentStep;
          const isLastStep = i === totalSteps - 1;
          const clickable = done && !!onStepClick && !isLastStep;

          return (
            <div
              key={i}
              className={cn("flex flex-col items-center gap-1.5 z-10", clickable && "cursor-pointer")}
              style={{ minWidth: 0, flex: 1 }}
              onClick={() => clickable && onStepClick!(i)}
              role={clickable ? "button" : undefined}
              tabIndex={clickable ? 0 : undefined}
              onKeyDown={e => { if (clickable && (e.key === "Enter" || e.key === " ")) onStepClick!(i); }}
            >
              {/* الدائرة */}
              <div
                className={cn(
                  "w-9 h-9 rounded-full flex items-center justify-center border-2 transition-all duration-300 bg-white dark:bg-slate-800",
                  done
                    ? "border-primary bg-primary"
                    : active
                    ? "border-primary shadow-[0_0_0_4px_rgba(var(--primary-rgb,79,70,229)/0.15)]"
                    : "border-slate-300 dark:border-slate-600",
                )}
              >
                {done ? (
                  <CheckCircle className="h-5 w-5 text-white" />
                ) : (
                  <Icon
                    className={cn(
                      "h-4 w-4",
                      active ? "text-primary" : "text-slate-400 dark:text-slate-500",
                    )}
                  />
                )}
              </div>
              {/* التسمية */}
              <span
                className={cn(
                  "text-[10px] font-semibold text-center leading-tight px-1 truncate w-full",
                  active
                    ? "text-primary"
                    : done
                    ? "text-slate-500"
                    : "text-slate-400 dark:text-slate-500",
                )}
              >
                <span className="hidden sm:inline">{label}</span>
                <span className="sm:hidden">{i + 1}</span>
              </span>
            </div>
          );
        })}
      </div>

      {/* ── شريط التقدّم + النسبة ── */}
      <div className="flex items-center gap-3">
        <div className="flex-1 h-2 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
          <div
            className={cn(
              "h-full rounded-full transition-all duration-500",
              isAr
                ? "bg-gradient-to-l from-primary to-primary/70"
                : "bg-gradient-to-r from-primary/70 to-primary",
            )}
            style={{ width: `${pct}%` }}
          />
        </div>
        <span className="text-[11px] text-muted-foreground font-semibold whitespace-nowrap">
          {isAr
            ? `الخطوة ${currentStep + 1} من ${totalSteps} — ${pct}% مكتمل`
            : `Step ${currentStep + 1} of ${totalSteps} — ${pct}% complete`}
        </span>
      </div>
    </div>
  );
}
