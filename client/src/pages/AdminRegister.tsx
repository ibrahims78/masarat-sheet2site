import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useParams, useLocation } from "wouter";
import { Loader2, UserPlus, AlertCircle, Eye, EyeOff, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/context/AuthContext";
import { ThemeToggle } from "@/components/ThemeToggle";

const schema = z.object({
  fullName: z.string().min(2, "الاسم يجب أن يكون حرفين على الأقل"),
  password: z.string().min(8, "8 أحرف على الأقل"),
  confirmPassword: z.string(),
}).refine(d => d.password === d.confirmPassword, {
  message: "كلمتا المرور غير متطابقتان",
  path: ["confirmPassword"],
});

export function AdminRegister() {
  const { token } = useParams<{ token: string }>();
  const [, nav] = useLocation();
  const { refresh } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [showPass, setShowPass] = useState(false);
  const { register, handleSubmit, formState: { errors } } = useForm({ resolver: zodResolver(schema) });

  const onSubmit = async (data: any) => {
    setLoading(true);
    setError("");
    try {
      await apiRequest("POST", "/api/auth/register-invite", {
        token,
        fullName: data.fullName,
        password: data.password,
      });
      await refresh();
      nav("/admin/dashboard");
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-bg flex items-center justify-center p-4 relative overflow-hidden">
      <div className="auth-blob w-96 h-96 bg-primary top-[-8rem] right-[-8rem]" />
      <div className="auth-blob w-80 h-80 bg-secondary bottom-[-6rem] left-[-6rem]" />

      <div className="absolute top-4 left-4">
        <ThemeToggle />
      </div>

      <div className="w-full max-w-md relative z-10 animate-fade-in">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary to-secondary shadow-card-lg mb-4">
            <UserPlus className="h-8 w-8 text-white" />
          </div>
          <h1 className="text-2xl font-black text-slate-800 dark:text-slate-100">إنشاء حسابك</h1>
          <p className="text-muted-foreground text-sm mt-1.5">
            تم دعوتك للانضمام إلى منصة مسار
          </p>
        </div>

        <div className="glass-card rounded-3xl p-8">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div>
              <Label htmlFor="fullName" required className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                الاسم الكامل
              </Label>
              <Input
                id="fullName"
                {...register("fullName")}
                error={!!errors.fullName}
                className="mt-1.5"
                placeholder="محمد أحمد السيد"
                autoFocus
              />
              {errors.fullName && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {(errors.fullName as any).message}
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
                  placeholder="8 أحرف على الأقل"
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
                  <AlertCircle className="h-3 w-3" /> {(errors.password as any).message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="confirmPassword" required className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                تأكيد كلمة المرور
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                {...register("confirmPassword")}
                error={!!errors.confirmPassword}
                className="mt-1.5"
                placeholder="••••••••"
              />
              {errors.confirmPassword && (
                <p className="text-xs text-red-500 mt-1 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" /> {(errors.confirmPassword as any).message}
                </p>
              )}
            </div>

            {error && (
              <div className="error-box">
                <AlertCircle className="h-4 w-4 shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <Button type="submit" className="w-full h-12 text-base font-bold shadow-md" disabled={loading}>
              {loading
                ? <><Loader2 className="h-5 w-5 animate-spin ml-2" />جاري الإنشاء...</>
                : <><CheckCircle2 className="h-5 w-5 ml-2" />إنشاء الحساب</>}
            </Button>
          </form>
        </div>

        <p className="text-center text-xs text-muted-foreground mt-5">
          منصة مسار
        </p>
      </div>
    </div>
  );
}
