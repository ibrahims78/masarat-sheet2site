import { Check } from "lucide-react";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

interface Step {
  label: string;
  labelEn: string;
  icon: string;
}

const STEPS: Step[] = [
  { label: "رمز الدعوة",        labelEn: "Invite Code",   icon: "🔑" },
  { label: "التنظيمي والوظيفي", labelEn: "Org & Job",     icon: "🏢" },
  { label: "الشخصية والإقامة",  labelEn: "Personal Info", icon: "👤" },
  { label: "المراجعة",          labelEn: "Review",        icon: "✅" },
];

interface FormStepperProps {
  currentStep: number;
}

export function FormStepper({ currentStep }: FormStepperProps) {
  const { lang } = useLang();

  const progressPct = (currentStep / (STEPS.length - 1)) * 100;

  return (
    <div className="w-full">
      {/* Step circles row */}
      <div className="flex items-center justify-between relative">
        {/* Track line */}
        <div className="absolute top-5 right-0 left-0 h-0.5 bg-slate-200 dark:bg-slate-700 z-0" />
        {/* Filled progress line */}
        <div
          className="absolute top-5 right-0 h-0.5 bg-primary z-0 transition-all duration-500 ease-out"
          style={{ width: `${progressPct}%`, left: "auto" }}
        />

        {STEPS.map((step, idx) => {
          const isCompleted = idx < currentStep;
          const isCurrent   = idx === currentStep;
          return (
            <div key={idx} className="flex flex-col items-center z-10 gap-2">
              <div
                className={cn(
                  "w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all duration-300 border-2",
                  isCompleted && "bg-primary border-primary text-white shadow-md",
                  isCurrent   && "bg-white dark:bg-slate-800 border-primary text-primary dark:text-blue-400 shadow-lg scale-110",
                  !isCompleted && !isCurrent && "bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 text-slate-400"
                )}
              >
                {isCompleted ? <Check className="h-5 w-5" /> : (
                  <span className={isCurrent ? "text-base" : "text-sm opacity-70"}>
                    {isCurrent ? step.icon : idx + 1}
                  </span>
                )}
              </div>
              <span className={cn(
                "text-[11px] font-semibold text-center max-w-[4.5rem] leading-tight hidden sm:block",
                isCurrent   && "text-primary dark:text-blue-400",
                isCompleted && "text-slate-500 dark:text-slate-400",
                !isCompleted && !isCurrent && "text-slate-400 dark:text-slate-600"
              )}>
                {lang === "ar" ? step.label : step.labelEn}
              </span>
            </div>
          );
        })}
      </div>

      {/* Progress bar */}
      <div className="mt-5 h-1.5 bg-slate-200 dark:bg-slate-700 rounded-full overflow-hidden">
        <div
          className="h-full bg-gradient-to-l from-primary to-secondary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${((currentStep + 1) / STEPS.length) * 100}%` }}
        />
      </div>
      <p className="text-xs text-muted-foreground mt-1.5 text-center font-medium">
        {lang === "ar"
          ? `الخطوة ${currentStep + 1} من ${STEPS.length} — ${Math.round(((currentStep + 1) / STEPS.length) * 100)}% مكتمل`
          : `Step ${currentStep + 1} of ${STEPS.length} — ${Math.round(((currentStep + 1) / STEPS.length) * 100)}% complete`
        }
      </p>
    </div>
  );
}
