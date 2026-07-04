import { useState, useMemo } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { ShieldCheck, Loader2, Eye, EyeOff, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuth } from "@/context/AuthContext";
import { useAppSettings } from "@/context/AppSettingsContext";
import { useLang } from "@/context/LanguageContext";
import { DesignerCredit } from "@/components/DesignerCredit";

type FormData = {
  email: string;
  password: string;
  rememberMe?: boolean;
};

export function Login() {
  const [, nav] = useLocation();
  const { login } = useAuth();
  const { appName } = useAppSettings();
  const { lang } = useLang();
  const ar = lang === "ar";
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);

  const schema = useMemo(() => z.object({
    email: z.string().email(ar ? "بريد إلكتروني غير صالح" : "Invalid email address"),
    password: z.string().min(1, ar ? "كلمة المرور مطلوبة" : "Password is required"),
    rememberMe: z.boolean().optional(),
  }), [ar]);

  const { register, handleSubmit, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
  });

  const onSubmit = async (data: FormData) => {
    setLoading(true);
    setError("");
    try {
      await login(data.email, data.password, data.rememberMe);
      nav("/admin/projects");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg flex items-center justify-center p-4 relative overflow-hidden">
      {/* Decorative blobs */}
      <div className="auth-blob w-[32rem] h-[32rem] bg-primary top-[-12rem] right-[-12rem]" />
      <div className="auth-blob w-96 h-96 bg-secondary bottom-[-8rem] left-[-8rem]" />
      <div className="auth-blob w-64 h-64 bg-violet-500 top-1/2 left-1/4 opacity-[0.08]" />

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

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Brand header above card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-card-lg mb-4">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            {ar ? "لوحة الإدارة" : "Admin Panel"}
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            {appName} — {ar ? "منصة إدارة نماذج التسجيل والبيانات" : "Forms & Data Management Platform"}
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
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
                autoFocus
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
                  placeholder="••••••••"
                  data-testid="input-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className={cn("absolute top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors", ar ? "left-3" : "right-3")}
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

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                {...register("rememberMe")}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
                data-testid="checkbox-rememberMe"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                {ar ? "تذكرني لمدة 30 يوم" : "Remember me for 30 days"}
              </span>
            </label>

            {error && (
              <div className="error-box">
                <span className="text-lg shrink-0">⚠</span>
                <span>{error}</span>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-12 text-base font-bold shadow-md hover:shadow-lg"
              disabled={loading}
              data-testid="button-login"
            >
              {loading ? (
                <>{ar ? "جاري الدخول..." : "Signing in..."}<Loader2 className="h-5 w-5 animate-spin ml-2" /></>
              ) : (
                <>{ar ? "تسجيل الدخول" : "Sign In"}<LogIn className="h-5 w-5 ml-2" /></>
              )}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          {appName} &copy; {new Date().getFullYear()}
        </p>
        <DesignerCredit />
      </div>
    </div>
  );
}
