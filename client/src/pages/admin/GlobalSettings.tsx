import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { apiRequest } from "@/lib/queryClient";
import {
  Save, Loader2, Users, Mail, Globe, Plus, Trash2,
  Eye, EyeOff, Send, Check, X, RefreshCw, KeyRound,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";

type ExtUser = User & { lastLoginAt?: string | Date | null };

function formatDate(d?: string | Date | null) {
  if (!d) return "—";
  return new Date(d).toLocaleDateString("ar", { year: "numeric", month: "short", day: "numeric" });
}

export function GlobalSettings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"general" | "smtp" | "users">("general");
  const [showPass, setShowPass] = useState(false);
  const [createResult, setCreateResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [inviteResult, setInviteResult] = useState<string | null>(null);
  const [saveResult, setSaveResult] = useState<{ ok: boolean; msg: string } | null>(null);
  const [smtpTestResult, setSmtpTestResult] = useState<string | null>(null);
  const [smtpTesting, setSmtpTesting] = useState(false);

  // Reset password dialog
  const [resetUserId, setResetUserId] = useState<string | null>(null);
  const [resetUserName, setResetUserName] = useState("");
  const [newPass, setNewPass] = useState("");
  const [resetLoading, setResetLoading] = useState(false);
  const [resetResult, setResetResult] = useState<string | null>(null);
  const [showNewPass, setShowNewPass] = useState(false);

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/projects/global-settings"],
    queryFn: () => fetch("/api/projects/global-settings", { credentials: "include" }).then(r => r.json()),
  });

  const { data: userList = [] } = useQuery<ExtUser[]>({
    queryKey: ["/api/projects/users-list"],
    queryFn: () => fetch("/api/projects/users-list", { credentials: "include" }).then(r => r.json()),
  });

  const { register: regGeneral, handleSubmit: hsGeneral, reset: resetGeneral } = useForm<any>();
  const {
    register: regSmtp, handleSubmit: hsSmtp, reset: resetSmtp, getValues: getSmtpValues,
  } = useForm<any>();
  const {
    register: regInvite, handleSubmit: hsInvite, reset: resetInvite,
  } = useForm<{ email: string; role: string }>({ defaultValues: { email: "", role: "viewer" } });
  const {
    register: regUser, handleSubmit: hsUser, reset: resetUser, formState: { errors: userErrors },
  } = useForm<{ fullName: string; email: string; password: string; role: string }>({
    defaultValues: { fullName: "", email: "", password: "", role: "viewer" },
  });

  useEffect(() => {
    if (settings) {
      resetGeneral({
        appName: settings.appName,
        defaultLanguage: settings.defaultLanguage,
        invitationExpiryHours: settings.invitationExpiryHours,
      });
      resetSmtp({
        smtpHost: settings.smtpHost,
        smtpPort: settings.smtpPort,
        smtpUser: settings.smtpUser,
        smtpFromName: settings.smtpFromName,
      });
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/projects/global-settings", data),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["/api/projects/global-settings"] });
      setSaveResult({ ok: true, msg: "✅ تم الحفظ بنجاح" });
      setTimeout(() => setSaveResult(null), 3000);
    },
    onError: (err: any) => setSaveResult({ ok: false, msg: `❌ ${err.message}` }),
  });

  const inviteMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects/send-invitation", data),
    onSuccess: (res: any) => {
      setInviteResult(res.emailSent
        ? "✅ تم إرسال الدعوة بالبريد الإلكتروني"
        : `🔗 رابط الدعوة: ${res.inviteUrl || ""}`);
      resetInvite({ email: "", role: "viewer" });
    },
    onError: (err: any) => setInviteResult(`❌ ${err.message}`),
  });

  const createUserMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects/create-user", data),
    onSuccess: (_, vars: any) => {
      qc.invalidateQueries({ queryKey: ["/api/projects/users-list"] });
      setCreateResult({ ok: true, msg: `✅ تم إنشاء حساب ${vars.fullName} بنجاح` });
      resetUser({ fullName: "", email: "", password: "", role: "viewer" });
      setTimeout(() => setCreateResult(null), 4000);
    },
    onError: (err: any) => setCreateResult({ ok: false, msg: `❌ ${err.message}` }),
  });

  const deleteUserMut = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/projects/users/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects/users-list"] }),
  });

  const testSmtp = async () => {
    setSmtpTesting(true);
    setSmtpTestResult(null);
    const vals = getSmtpValues();
    const res: any = await apiRequest("POST", "/api/projects/test-email", {
      host: vals.smtpHost,
      port: vals.smtpPort,
      user: vals.smtpUser,
      pass: vals.smtpPass,
    }).catch(e => ({ ok: false, message: `❌ ${e.message}` }));
    setSmtpTestResult(res.message);
    setSmtpTesting(false);
  };

  const doResetPassword = async () => {
    if (!resetUserId || newPass.length < 8) return;
    setResetLoading(true);
    setResetResult(null);
    const res: any = await apiRequest("POST", `/api/projects/reset-password/${resetUserId}`, { password: newPass })
      .catch(e => ({ ok: false, message: `❌ ${e.message}` }));
    setResetResult(res.ok ? "✅ تم تغيير كلمة المرور بنجاح" : res.message || "❌ فشل");
    setResetLoading(false);
    if (res.ok) {
      setNewPass("");
      setTimeout(() => { setResetUserId(null); setResetResult(null); }, 2000);
    }
  };

  const ROLE_LABEL: Record<string, string> = {
    admin: "مدير", editor: "محرر", viewer: "مشاهد",
  };
  const ROLE_VARIANT: Record<string, "default" | "outline" | "secondary"> = {
    admin: "default", editor: "outline", viewer: "secondary",
  };

  const tabs = [
    { key: "general", label: "عام", icon: Globe },
    { key: "smtp", label: "البريد", icon: Mail },
    { key: "users", label: "المستخدمون", icon: Users },
  ] as const;

  const ResultBox = ({ msg }: { msg: string }) => (
    <div className={`text-sm p-2.5 rounded-lg border flex items-start gap-2 ${
      msg.startsWith("✅") || msg.startsWith("🔗")
        ? "bg-green-50 dark:bg-green-900/20 border-green-200 text-green-700 dark:text-green-400"
        : "bg-red-50 dark:bg-red-900/20 border-red-200 text-red-700 dark:text-red-400"
    }`}>
      {msg.startsWith("✅") ? <Check className="h-4 w-4 shrink-0 mt-0.5" /> : <X className="h-4 w-4 shrink-0 mt-0.5" />}
      <span className="break-all">{msg}</span>
    </div>
  );

  return (
    <Layout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">الإعدادات العامة</h1>
          <p className="text-sm text-muted-foreground">إعدادات النظام على مستوى المنصة</p>
        </div>

        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {tabs.map(t => (
            <button
              key={t.key}
              onClick={() => { setTab(t.key); setSaveResult(null); setSmtpTestResult(null); }}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${
                tab === t.key
                  ? "bg-white dark:bg-slate-700 shadow-sm text-primary"
                  : "text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300"
              }`}
              data-testid={`tab-${t.key}`}
            >
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {/* ─── General Tab ─── */}
        {tab === "general" && (
          <form onSubmit={hsGeneral(d => saveMut.mutate(d))}>
            <Card className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">اسم التطبيق / المنصة</Label>
                <Input {...regGeneral("appName")} placeholder="مسار" data-testid="input-appName" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اللغة الافتراضية</Label>
                <select {...regGeneral("defaultLanguage")}
                  className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                  data-testid="select-language">
                  <option value="ar">العربية</option>
                  <option value="en">English</option>
                </select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">مدة صلاحية دعوة المستخدمين (ساعة)</Label>
                <Input
                  {...regGeneral("invitationExpiryHours")}
                  type="number" min={1} max={720}
                  placeholder="72"
                  className="w-40"
                  data-testid="input-invitationHours"
                />
              </div>
              {saveResult && <ResultBox msg={saveResult.msg} />}
              <Button type="submit" disabled={saveMut.isPending} data-testid="button-save-general">
                {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
                حفظ الإعدادات
              </Button>
            </Card>
          </form>
        )}

        {/* ─── SMTP Tab ─── */}
        {tab === "smtp" && (
          <form onSubmit={hsSmtp(d => saveMut.mutate(d))}>
            <Card className="p-5 space-y-4">
              <div className="p-3 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 text-xs text-blue-700 dark:text-blue-300">
                📧 إعدادات SMTP تُستخدم لإرسال دعوات المستخدمين. اتركها فارغة إن لم تكن تستخدم إرسال البريد.
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">SMTP Host</Label>
                  <Input {...regSmtp("smtpHost")} placeholder="smtp.gmail.com" data-testid="input-smtpHost" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">Port</Label>
                  <Input {...regSmtp("smtpPort")} type="number" placeholder="587" data-testid="input-smtpPort" />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className="text-xs">اسم المستخدم (البريد)</Label>
                  <Input {...regSmtp("smtpUser")} placeholder="user@gmail.com" data-testid="input-smtpUser" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">كلمة المرور</Label>
                  <Input
                    {...regSmtp("smtpPass")}
                    type="password"
                    placeholder={settings?.hasSmtpPass ? "محفوظة — اتركها فارغة للإبقاء" : "كلمة المرور"}
                    data-testid="input-smtpPass"
                  />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اسم المرسل</Label>
                <Input {...regSmtp("smtpFromName")} placeholder="مسار" data-testid="input-smtpFromName" />
              </div>

              {smtpTestResult && <ResultBox msg={smtpTestResult} />}
              {saveResult && <ResultBox msg={saveResult.msg} />}

              <div className="flex gap-2 flex-wrap">
                <Button type="submit" disabled={saveMut.isPending} data-testid="button-save-smtp">
                  {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
                  حفظ
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  disabled={smtpTesting}
                  onClick={testSmtp}
                  data-testid="button-test-smtp"
                >
                  {smtpTesting
                    ? <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    : <RefreshCw className="h-4 w-4 ml-1" />}
                  اختبار الاتصال
                </Button>
              </div>
            </Card>
          </form>
        )}

        {/* ─── Users Tab ─── */}
        {tab === "users" && (
          <div className="space-y-4">

            {/* Users table */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
                <h3 className="text-sm font-semibold">المستخدمون الحاليون</h3>
                <Badge variant="secondary">{userList.length}</Badge>
              </div>
              {userList.length === 0 ? (
                <div className="py-8 text-center text-muted-foreground text-sm">لا يوجد مستخدمون بعد</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-slate-50 dark:bg-slate-800/50 border-b border-slate-100 dark:border-slate-700">
                      <tr>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">الاسم</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground hidden md:table-cell">البريد</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground">الدور</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground hidden lg:table-cell">آخر دخول</th>
                        <th className="px-4 py-2.5 text-right text-xs font-semibold text-muted-foreground w-28">إجراءات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                      {userList.map(u => (
                        <tr key={u.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors" data-testid={`row-user-${u.id}`}>
                          <td className="px-4 py-2.5 font-medium text-sm">{u.fullName}</td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground hidden md:table-cell">{u.email}</td>
                          <td className="px-4 py-2.5">
                            <Badge variant={ROLE_VARIANT[u.role] || "secondary"}>
                              {ROLE_LABEL[u.role] || u.role}
                            </Badge>
                          </td>
                          <td className="px-4 py-2.5 text-xs text-muted-foreground hidden lg:table-cell">
                            {formatDate(u.lastLoginAt)}
                          </td>
                          <td className="px-4 py-2.5">
                            <div className="flex gap-1">
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-blue-400 hover:text-blue-600"
                                title="إعادة تعيين كلمة المرور"
                                onClick={() => {
                                  setResetUserId(u.id);
                                  setResetUserName(u.fullName);
                                  setResetResult(null);
                                  setNewPass("");
                                }}
                                data-testid={`button-reset-pass-${u.id}`}
                              >
                                <KeyRound className="h-3.5 w-3.5" />
                              </Button>
                              <Button
                                variant="ghost" size="icon"
                                className="h-7 w-7 text-red-400 hover:text-red-600"
                                onClick={() => {
                                  if (confirm(`حذف مستخدم "${u.fullName}"؟`)) deleteUserMut.mutate(u.id);
                                }}
                                data-testid={`button-delete-user-${u.id}`}
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </Card>

            {/* Create user directly */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Plus className="h-4 w-4 text-green-600" />
                إنشاء مستخدم مباشرة
              </h3>
              <form onSubmit={hsUser(d => createUserMut.mutate(d))} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">الاسم الكامل</Label>
                    <Input
                      {...regUser("fullName", { required: true })}
                      placeholder="محمد أحمد"
                      data-testid="input-new-fullName"
                    />
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">البريد الإلكتروني</Label>
                    <Input
                      {...regUser("email", { required: true })}
                      type="email"
                      placeholder="user@example.com"
                      data-testid="input-new-email"
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-1">
                    <Label className="text-xs">كلمة المرور</Label>
                    <div className="relative">
                      <Input
                        {...regUser("password", { required: true, minLength: 8 })}
                        type={showPass ? "text" : "password"}
                        placeholder="8 أحرف على الأقل"
                        data-testid="input-new-password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPass(v => !v)}
                        className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700"
                        tabIndex={-1}
                      >
                        {showPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                    {userErrors.password && (
                      <p className="text-xs text-red-500">8 أحرف على الأقل</p>
                    )}
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">الدور</Label>
                    <select
                      {...regUser("role")}
                      className="w-full h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                      data-testid="select-new-role"
                    >
                      <option value="viewer">مشاهد</option>
                      <option value="editor">محرر</option>
                      <option value="admin">مدير</option>
                    </select>
                  </div>
                </div>
                {createResult && <ResultBox msg={createResult.msg} />}
                <Button
                  type="submit"
                  size="sm"
                  disabled={createUserMut.isPending}
                  className="bg-green-600 hover:bg-green-700"
                  data-testid="button-create-user"
                >
                  {createUserMut.isPending
                    ? <Loader2 className="h-4 w-4 animate-spin ml-1" />
                    : <Plus className="h-4 w-4 ml-1" />}
                  إنشاء مستخدم
                </Button>
              </form>
            </Card>

            {/* Invite via email */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold flex items-center gap-2">
                <Send className="h-4 w-4 text-blue-600" />
                دعوة مستخدم بالبريد الإلكتروني
              </h3>
              <form onSubmit={hsInvite(d => inviteMut.mutate(d))} className="space-y-3">
                <div className="flex gap-3">
                  <Input
                    {...regInvite("email", { required: true })}
                    placeholder="user@example.com"
                    type="email"
                    className="flex-1"
                    data-testid="input-invite-email"
                  />
                  <select
                    {...regInvite("role")}
                    className="h-9 rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 text-sm"
                    data-testid="select-invite-role"
                  >
                    <option value="viewer">مشاهد</option>
                    <option value="editor">محرر</option>
                    <option value="admin">مدير</option>
                  </select>
                  <Button type="submit" disabled={inviteMut.isPending} data-testid="button-invite">
                    {inviteMut.isPending
                      ? <Loader2 className="h-4 w-4 animate-spin" />
                      : <Send className="h-4 w-4" />}
                  </Button>
                </div>
                {inviteResult && <ResultBox msg={inviteResult} />}
              </form>
            </Card>
          </div>
        )}
      </div>

      {/* Reset Password Dialog */}
      <Dialog open={!!resetUserId} onOpenChange={v => { if (!v) { setResetUserId(null); setResetResult(null); setNewPass(""); } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-blue-500" />
              إعادة تعيين كلمة المرور
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <p className="text-sm text-muted-foreground">
              إعادة تعيين كلمة مرور المستخدم: <strong>{resetUserName}</strong>
            </p>
            <div className="space-y-1.5">
              <Label className="text-xs">كلمة المرور الجديدة</Label>
              <div className="relative">
                <Input
                  type={showNewPass ? "text" : "password"}
                  value={newPass}
                  onChange={e => setNewPass(e.target.value)}
                  placeholder="8 أحرف على الأقل"
                  data-testid="input-new-pass"
                />
                <button
                  type="button"
                  onClick={() => setShowNewPass(v => !v)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-slate-700"
                >
                  {showNewPass ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {newPass && newPass.length < 8 && (
                <p className="text-xs text-red-500">كلمة المرور يجب أن تكون 8 أحرف على الأقل</p>
              )}
            </div>
            {resetResult && (
              <div className={`p-2.5 rounded-lg text-sm border flex items-center gap-2 ${
                resetResult.startsWith("✅")
                  ? "bg-green-50 dark:bg-green-900/20 border-green-200 text-green-700"
                  : "bg-red-50 dark:bg-red-900/20 border-red-200 text-red-700"
              }`}>
                {resetResult.startsWith("✅") ? <Check className="h-4 w-4" /> : <X className="h-4 w-4" />}
                {resetResult}
              </div>
            )}
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => { setResetUserId(null); setResetResult(null); setNewPass(""); }}>
              إلغاء
            </Button>
            <Button
              onClick={doResetPassword}
              disabled={resetLoading || newPass.length < 8}
              data-testid="button-confirm-reset-pass"
            >
              {resetLoading ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <KeyRound className="h-4 w-4 ml-1" />}
              تغيير كلمة المرور
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Layout>
  );
}
