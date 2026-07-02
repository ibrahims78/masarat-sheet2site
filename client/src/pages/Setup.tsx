import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { ShieldCheck, Loader2, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { apiRequest } from "@/lib/queryClient";
import { useAppSettings } from "@/context/AppSettingsContext";
import { useLang } from "@/context/LanguageContext";

type FormData = {
  fullName: string;
  email: string;
  password: string;
  confirmPassword: string;
};

export function Setup() {
  const { appName } = useAppSettings();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const schema = useMemo(() => z.object({
    fullName: z.string().min(2, ar ? "الاسم يجب أن يكون حرفين على الأقل" : "Name must be at least 2 characters"),
    email: z.string().email(ar ? "بريد إلكتروني غير صالح" : "Invalid email address"),
    password: z.string().min(8, ar ? "كلمة المرور يجب أن تكون 8 أحرف على الأقل" : "Password must be at least 8 characters"),
    confirmPassword: z.string(),
  }).refine(d => d.password === d.confirmPassword, {
    message: ar ? "كلمتا المرور غير متطابقتان" : "Passwords do not match",
    path: ["confirmPassword"],
  }), [ar]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      await apiRequest("POST", "/api/auth/setup", {
        fullName: data.fullName,
        email: data.email,
        password: data.password,
      });
      window.location.href = "/admin/dashboard";
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="auth-blob w-96 h-96 bg-primary top-[-8rem] right-[-8rem]" />
      <div className="auth-blob w-80 h-80 bg-secondary bottom-[-6rem] left-[-6rem]" />

      {/* Top controls */}
      <div className="absolute top-4 left-4 flex gap-2">
        <ThemeToggle />
        <LanguageToggle />
      </div>

      {/* Platform badge */}
      <div className="absolute top-4 right-4">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/70 dark:bg-slate-800/70 border border-slate-200/80 dark:border-slate-700/60 backdrop-blur-sm shadow-sm">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{appName}</span>
        </div>
      </div>

      <div className="glass-card rounded-3xl p-8 w-full max-w-md relative z-10 animate-fade-in">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary mb-5 shadow-glow-primary">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{ar ? "إعداد النظام" : "System Setup"}</h1>
          <p className="text-muted-foreground text-sm mt-2">{ar ? "إنشاء حساب المسؤول الأول للبدء" : "Create the first admin account to get started"}</p>
        </div>

        {/* Steps hint */}
        <div className="flex gap-2 mb-6">
          {(ar ? ["بيانات الحساب", "تأمين الدخول", "البدء"] : ["Account Info", "Secure Login", "Start"]).map((s, i) => (
            <div key={i} className="flex-1 text-center">
              <div className={`h-1 rounded-full mb-1.5 ${i === 0 ? "bg-primary" : "bg-slate-200 dark:bg-slate-700"}`} />
              <span className="text-[10px] text-muted-foreground">{s}</span>
            </div>
          ))}
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <Label htmlFor="fullName" required className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {ar ? "الاسم الكامل" : "Full Name"}
            </Label>
            <Input
              id="fullName"
              {...register("fullName")}
              error={!!errors.fullName}
              className="mt-1.5"
              placeholder={ar ? "محمد أحمد السيد" : "John Smith"}
              data-testid="input-fullName"
            />
            {errors.fullName && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <span>⚠</span> {errors.fullName.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="email" required className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {ar ? "البريد الإلكتروني" : "Email"}
            </Label>
            <Input
              id="email"
              type="email"
              {...register("email")}
              error={!!errors.email}
              className="mt-1.5"
              placeholder="admin@example.com"
              data-testid="input-email"
            />
            {errors.email && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <span>⚠</span> {errors.email.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="password" required className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {ar ? "كلمة المرور" : "Password"}
            </Label>
            <div className="relative mt-1.5">
              <Input
                id="password"
                type={showPass ? "text" : "password"}
                {...register("password")}
                error={!!errors.password}
                placeholder={ar ? "8 أحرف على الأقل" : "At least 8 characters"}
                data-testid="input-password"
              />
              <button
                type="button"
                onClick={() => setShowPass(!showPass)}
                className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
              >
                {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <span>⚠</span> {errors.password.message}
              </p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword" required className="text-sm font-semibold text-slate-700 dark:text-slate-300">
              {ar ? "تأكيد كلمة المرور" : "Confirm Password"}
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              {...register("confirmPassword")}
              error={!!errors.confirmPassword}
              className="mt-1.5"
              data-testid="input-confirmPassword"
            />
            {errors.confirmPassword && (
              <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                <span>⚠</span> {errors.confirmPassword.message}
              </p>
            )}
          </div>

          {error && (
            <div className="error-box">
              <span className="text-lg">⚠</span>
              <span>{error}</span>
            </div>
          )}

          <Button
            type="submit"
            className="w-full h-12 text-base font-bold shadow-md hover:shadow-lg"
            disabled={loading}
            data-testid="button-setup-submit"
          >
            {loading ? (
              <><Loader2 className="h-5 w-5 animate-spin ml-2" />{ar ? "جاري الإنشاء..." : "Creating..."}</>
            ) : (
              <><CheckCircle2 className="h-5 w-5 ml-2" />{ar ? "إنشاء الحساب والبدء" : "Create Account & Start"}</>
            )}
          </Button>
        </form>

        <p className="text-center text-xs text-muted-foreground mt-6">
          {appName}
        </p>
      </div>
    </div>
  );
}
