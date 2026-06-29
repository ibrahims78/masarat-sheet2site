import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/queryClient";
import { Save, Loader2, Users, Mail, Globe, Plus, Trash2 } from "lucide-react";
import { useEffect, useState } from "react";
import type { User } from "@shared/schema";

export function GlobalSettings() {
  const qc = useQueryClient();
  const [tab, setTab] = useState<"general" | "smtp" | "users">("general");

  const { data: settings } = useQuery<any>({
    queryKey: ["/api/projects/global-settings"],
    queryFn: () => fetch("/api/projects/global-settings", { credentials: "include" }).then(r => r.json()),
  });

  const { data: userList = [] } = useQuery<User[]>({
    queryKey: ["/api/projects/users-list"],
    queryFn: () => fetch("/api/projects/users-list", { credentials: "include" }).then(r => r.json()),
  });

  const { register: regGeneral, handleSubmit: hsGeneral, reset: resetGeneral } = useForm<any>();
  const { register: regSmtp, handleSubmit: hsSmtp, reset: resetSmtp } = useForm<any>();
  const { register: regInvite, handleSubmit: hsInvite } = useForm<{ email: string; role: string }>();
  const { register: regUser, handleSubmit: hsUser } = useForm<{ fullName: string; email: string; password: string; role: string }>();

  useEffect(() => {
    if (settings) {
      resetGeneral({ appName: settings.appName, defaultLanguage: settings.defaultLanguage, invitationExpiryHours: settings.invitationExpiryHours });
      resetSmtp({ smtpHost: settings.smtpHost, smtpPort: settings.smtpPort, smtpUser: settings.smtpUser, smtpFromName: settings.smtpFromName });
    }
  }, [settings]);

  const saveMut = useMutation({
    mutationFn: (data: any) => apiRequest("PATCH", "/api/projects/global-settings", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects/global-settings"] }),
  });

  const inviteMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects/send-invitation", data),
    onSuccess: (res: any) => {
      alert(`تم إرسال الدعوة${res.inviteUrl ? `\nالرابط: ${res.inviteUrl}` : ""}`);
    },
  });

  const createUserMut = useMutation({
    mutationFn: (data: any) => apiRequest("POST", "/api/projects/create-user", data),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects/users-list"] }),
  });

  const deleteUserMut = useMutation({
    mutationFn: (userId: string) => apiRequest("DELETE", `/api/projects/users/${userId}`),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["/api/projects/users-list"] }),
  });

  const tabs = [
    { key: "general", label: "عام", icon: Globe },
    { key: "smtp", label: "البريد", icon: Mail },
    { key: "users", label: "المستخدمون", icon: Users },
  ] as const;

  return (
    <Layout>
      <div className="max-w-3xl space-y-5">
        <div>
          <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">الإعدادات العامة</h1>
          <p className="text-sm text-muted-foreground">إعدادات النظام على مستوى المنصة</p>
        </div>

        {/* Tab buttons */}
        <div className="flex gap-1 bg-slate-100 dark:bg-slate-800 p-1 rounded-xl">
          {tabs.map(t => (
            <button key={t.key} onClick={() => setTab(t.key)}
              className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-semibold transition-all ${tab === t.key ? "bg-white dark:bg-slate-700 shadow-sm text-primary" : "text-muted-foreground hover:text-slate-700 dark:hover:text-slate-300"}`}
              data-testid={`tab-${t.key}`}>
              <t.icon className="h-4 w-4" />
              {t.label}
            </button>
          ))}
        </div>

        {tab === "general" && (
          <form onSubmit={hsGeneral(d => saveMut.mutate(d))}>
            <Card className="p-5 space-y-4">
              <div className="space-y-1.5">
                <Label className="text-xs">اسم التطبيق</Label>
                <Input {...regGeneral("appName")} data-testid="input-appName" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">مدة صلاحية دعوة المستخدمين (ساعة)</Label>
                <Input {...regGeneral("invitationExpiryHours")} type="number" data-testid="input-invitationHours" />
              </div>
              <Button type="submit" disabled={saveMut.isPending} data-testid="button-save-general">
                {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
                حفظ
              </Button>
            </Card>
          </form>
        )}

        {tab === "smtp" && (
          <form onSubmit={hsSmtp(d => saveMut.mutate(d))}>
            <Card className="p-5 space-y-4">
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
                  <Label className="text-xs">اسم المستخدم</Label>
                  <Input {...regSmtp("smtpUser")} data-testid="input-smtpUser" />
                </div>
                <div className="space-y-1.5">
                  <Label className="text-xs">كلمة المرور</Label>
                  <Input {...regSmtp("smtpPass")} type="password" placeholder="اتركه فارغاً للإبقاء على القديم" data-testid="input-smtpPass" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs">اسم المرسل</Label>
                <Input {...regSmtp("smtpFromName")} data-testid="input-smtpFromName" />
              </div>
              <Button type="submit" disabled={saveMut.isPending} data-testid="button-save-smtp">
                {saveMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Save className="h-4 w-4 ml-1" />}
                حفظ إعدادات البريد
              </Button>
            </Card>
          </form>
        )}

        {tab === "users" && (
          <div className="space-y-4">
            {/* Existing users */}
            <Card className="overflow-hidden">
              <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                <h3 className="text-sm font-semibold">المستخدمون الحاليون</h3>
              </div>
              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {userList.map(u => (
                  <div key={u.id} className="flex items-center justify-between px-4 py-3">
                    <div>
                      <p className="text-sm font-semibold">{u.fullName}</p>
                      <p className="text-xs text-muted-foreground">{u.email} • {u.role === "admin" ? "مدير" : u.role === "editor" ? "محرر" : "مشاهد"}</p>
                    </div>
                    <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteUserMut.mutate(u.id)} data-testid={`button-delete-user-${u.id}`}>
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </Card>

            {/* Invite user */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold">دعوة مستخدم بالبريد الإلكتروني</h3>
              <form onSubmit={hsInvite(d => inviteMut.mutate(d))} className="flex gap-3">
                <Input {...regInvite("email")} placeholder="البريد الإلكتروني" type="email" className="flex-1" data-testid="input-invite-email" />
                <select {...regInvite("role")} className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                  <option value="viewer">مشاهد</option>
                  <option value="editor">محرر</option>
                  <option value="admin">مدير</option>
                </select>
                <Button type="submit" disabled={inviteMut.isPending} data-testid="button-invite">
                  {inviteMut.isPending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Mail className="h-4 w-4" />}
                </Button>
              </form>
            </Card>

            {/* Create user directly */}
            <Card className="p-5 space-y-4">
              <h3 className="text-sm font-semibold">إنشاء مستخدم مباشرة</h3>
              <form onSubmit={hsUser(d => createUserMut.mutate(d))} className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <Input {...regUser("fullName")} placeholder="الاسم الكامل" data-testid="input-new-fullName" />
                  <Input {...regUser("email")} placeholder="البريد الإلكتروني" type="email" data-testid="input-new-email" />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <Input {...regUser("password")} placeholder="كلمة المرور" type="password" data-testid="input-new-password" />
                  <select {...regUser("role")} className="rounded-md border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 px-3 py-2 text-sm">
                    <option value="viewer">مشاهد</option>
                    <option value="editor">محرر</option>
                    <option value="admin">مدير</option>
                  </select>
                </div>
                <Button type="submit" size="sm" disabled={createUserMut.isPending} data-testid="button-create-user">
                  {createUserMut.isPending ? <Loader2 className="h-4 w-4 animate-spin ml-1" /> : <Plus className="h-4 w-4 ml-1" />}
                  إنشاء مستخدم
                </Button>
              </form>
            </Card>
          </div>
        )}
      </div>
    </Layout>
  );
}
