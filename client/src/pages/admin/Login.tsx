import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useLocation } from "wouter";
import { ShieldCheck, Loader2, Eye, EyeOff, LogIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ThemeToggle } from "@/components/ThemeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useAuth } from "@/context/AuthContext";

const schema = z.object({
  email: z.string().email("بريد إلكتروني غير صالح"),
  password: z.string().min(1, "كلمة المرور مطلوبة"),
  rememberMe: z.boolean().optional(),
});
type FormData = z.infer<typeof schema>;

export function Login() {
  const [, nav] = useLocation();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
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
          <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">منصة نواة</span>
        </div>
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        {/* Brand header above card */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-card-lg mb-4">
            <ShieldCheck className="h-10 w-10 text-white" />
          </div>
          <h1 className="text-3xl font-black text-slate-800 dark:text-slate-100 tracking-tight">
            لوحة الإدارة
          </h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            نظام بيانات الكوادر الصحية
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="email" required className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                البريد الإلكتروني
              </Label>
              <Input
                id="email"
                type="email"
                {...register("email")}
                error={!!errors.email}
                className="mt-1.5"
                autoFocus
                placeholder="admin@health.gov.sy"
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
                كلمة المرور
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

            <label className="flex items-center gap-2.5 cursor-pointer group">
              <input
                type="checkbox"
                {...register("rememberMe")}
                className="w-4 h-4 rounded accent-primary cursor-pointer"
                data-testid="checkbox-rememberMe"
              />
              <span className="text-sm text-slate-600 dark:text-slate-400 group-hover:text-slate-800 dark:group-hover:text-slate-200 transition-colors">
                تذكرني لمدة 30 يوم
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
                <><Loader2 className="h-5 w-5 animate-spin ml-2" />جاري الدخول...</>
              ) : (
                <><LogIn className="h-5 w-5 ml-2" />تسجيل الدخول</>
              )}
            </Button>
          </form>
        </div>

        <div className="text-center mt-5 space-y-1">
          <p className="text-xs text-muted-foreground">
            نظام بيانات الكوادر الصحية · منصة نواة &copy; {new Date().getFullYear()}
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            تصميم وبرمجة{" "}
            <span className="font-semibold text-primary/80">إبراهيم الصيداوي</span>
          </p>
        </div>
      </div>
    </div>
  );
}
