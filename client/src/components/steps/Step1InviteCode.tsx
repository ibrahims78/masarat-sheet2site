import { useState } from "react";
import { KeyRound, AlertCircle, Loader2, ShieldCheck, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLang } from "@/context/LanguageContext";
import { apiRequest } from "@/lib/queryClient";

interface Step1Props {
  onVerified: () => void;
}

export function Step1InviteCode({ onVerified }: Step1Props) {
  const { lang } = useLang();
  const [code, setCode] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [shake, setShake] = useState(false);
  const ar = lang === "ar";

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!code.trim()) {
      setError(ar ? "الرجاء إدخال رمز الدعوة" : "Please enter the invitation code");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiRequest("POST", "/api/form/verify-code", { code: code.trim() });
      onVerified();
    } catch (err: any) {
      setError(err.message || (ar ? "رمز الدعوة غير صحيح" : "Invalid invitation code"));
      setShake(true);
      setTimeout(() => setShake(false), 600);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[65vh] px-4 py-8">
      <div className={`w-full max-w-md transition-transform ${shake ? "animate-[shake_0.5s_ease-in-out]" : ""}`}>
        {/* Brand card */}
        <div className="glass-card rounded-3xl overflow-hidden shadow-card-lg">
          {/* Header band */}
          <div className="bg-gradient-to-l from-primary to-secondary px-8 py-6 text-center">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-white/20 backdrop-blur-sm mb-4 pulse-ring">
              <ShieldCheck className="h-8 w-8 text-white" />
            </div>
            <h1 className="text-xl font-black text-white leading-tight">
              {ar ? "نموذج منصة نواة لمديريات الصحة والهيئات" : "Nawah Platform — Health Directorates Form"}
            </h1>
            <p className="text-white/75 text-sm mt-1 font-medium">
              {ar ? "منصة نواة — وزارة الصحة" : "Nawah Platform — Ministry of Health"}
            </p>
          </div>

          {/* Form body */}
          <div className="px-8 py-7">
            <div className="flex items-center gap-2 mb-6">
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
              <span className="text-xs font-semibold text-muted-foreground whitespace-nowrap px-2">
                {ar ? "أدخل رمز الدعوة للمتابعة" : "Enter invitation code to continue"}
              </span>
              <div className="h-px flex-1 bg-slate-200 dark:bg-slate-700" />
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="relative">
                <KeyRound className="absolute right-3.5 top-1/2 -translate-y-1/2 h-4.5 w-4.5 text-muted-foreground h-[18px] w-[18px]" />
                <Input
                  value={code}
                  onChange={e => setCode(e.target.value.toUpperCase())}
                  placeholder={ar ? "NAWAH-XXXX" : "NAWAH-XXXX"}
                  className="pr-10 text-center text-lg tracking-[0.2em] font-mono uppercase h-12 font-bold"
                  error={!!error}
                  autoFocus
                  data-testid="input-invite-code"
                />
              </div>

              {error && (
                <div className="flex items-center gap-2 text-red-600 dark:text-red-400 text-sm animate-slide-down p-3 bg-red-50 dark:bg-red-900/20 rounded-xl border border-red-200 dark:border-red-800">
                  <AlertCircle className="h-4 w-4 flex-shrink-0" />
                  <span className="font-medium">{error}</span>
                </div>
              )}

              <Button
                type="submit"
                className="w-full h-12 text-base font-bold shadow-md"
                disabled={loading}
                data-testid="button-verify-code"
              >
                {loading ? (
                  <><Loader2 className="h-5 w-5 animate-spin ml-2" />{ar ? "جاري التحقق..." : "Verifying..."}</>
                ) : (
                  <>{ar ? "متابعة" : "Continue"} <ArrowLeft className="h-4 w-4 mr-1" /></>
                )}
              </Button>
            </form>

            <div className="mt-6 flex items-start gap-3 p-4 bg-primary/5 dark:bg-primary/10 rounded-xl border border-primary/20">
              <span className="text-primary text-lg shrink-0">ℹ</span>
              <p className="text-xs text-primary/80 dark:text-blue-300 leading-relaxed font-medium">
                {ar
                  ? "هذا النموذج مخصص لموظفي وزارة الصحة المرخّصين فقط. إذا لم يكن لديك رمز دعوة، تواصل مع إدارتك."
                  : "This form is for authorized Ministry of Health employees only. Contact your department if you don't have an invitation code."}
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
