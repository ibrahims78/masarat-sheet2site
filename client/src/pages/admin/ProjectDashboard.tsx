import { useParams, useLocation } from "wouter";
import { useQuery } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Users, TrendingUp, Calendar, Clock, Plus, ExternalLink, Loader2 } from "lucide-react";
import { AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer } from "recharts";
import type { Project } from "@shared/schema";

interface Stats {
  total: number; today: number; week: number; month: number;
  dailyTrend: { date: string; count: number }[];
}

export function ProjectDashboard() {
  const { id } = useParams<{ id: string }>();
  const [, nav] = useLocation();

  const { data: project } = useQuery<Project>({ queryKey: ["/api/projects", id], queryFn: () => fetch(`/api/projects/${id}`, { credentials: "include" }).then(r => r.json()) });
  const { data: stats, isLoading } = useQuery<Stats>({ queryKey: ["/api/projects", id, "stats"], queryFn: () => fetch(`/api/projects/${id}/stats`, { credentials: "include" }).then(r => r.json()) });

  const statCards = [
    { label: "إجمالي السجلات", value: stats?.total ?? 0, icon: Users, color: "text-blue-600 bg-blue-50 dark:bg-blue-900/20" },
    { label: "هذا الشهر", value: stats?.month ?? 0, icon: Calendar, color: "text-purple-600 bg-purple-50 dark:bg-purple-900/20" },
    { label: "هذا الأسبوع", value: stats?.week ?? 0, icon: TrendingUp, color: "text-green-600 bg-green-50 dark:bg-green-900/20" },
    { label: "اليوم", value: stats?.today ?? 0, icon: Clock, color: "text-orange-600 bg-orange-50 dark:bg-orange-900/20" },
  ];

  return (
    <Layout projectId={id}>
      <div className="space-y-6 max-w-5xl">
        {/* Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">{project?.name || "..."}</h1>
            <p className="text-sm text-muted-foreground mt-0.5">{project?.description || "لوحة تحكم المشروع"}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={() => window.open(`/p/${id}/register`, "_blank")} data-testid="button-open-form">
              <ExternalLink className="h-3.5 w-3.5 ml-1" />
              فتح النموذج
            </Button>
            <Button size="sm" onClick={() => nav(`/admin/projects/${id}/records/new`)} data-testid="button-add-record">
              <Plus className="h-3.5 w-3.5 ml-1" />
              إضافة سجل
            </Button>
          </div>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : (
          <>
            {/* Stat cards */}
            <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
              {statCards.map(card => (
                <Card key={card.label} className="p-4" data-testid={`stat-${card.label}`}>
                  <div className={`w-10 h-10 rounded-xl flex items-center justify-center mb-3 ${card.color}`}>
                    <card.icon className="h-5 w-5" />
                  </div>
                  <div className="text-2xl font-bold text-slate-800 dark:text-slate-100">{card.value.toLocaleString("ar")}</div>
                  <div className="text-xs text-muted-foreground mt-0.5">{card.label}</div>
                </Card>
              ))}
            </div>

            {/* Trend chart */}
            {stats?.dailyTrend && stats.dailyTrend.length > 0 && (
              <Card className="p-5">
                <h3 className="text-sm font-semibold text-slate-700 dark:text-slate-200 mb-4">التسجيلات خلال آخر 14 يوم</h3>
                <ResponsiveContainer width="100%" height={200}>
                  <AreaChart data={stats.dailyTrend}>
                    <defs>
                      <linearGradient id="grad" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                        <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis dataKey="date" tick={{ fontSize: 10 }} tickFormatter={d => d.slice(5)} />
                    <YAxis tick={{ fontSize: 10 }} allowDecimals={false} />
                    <Tooltip formatter={(v: any) => [v, "سجل"]} labelFormatter={l => `تاريخ: ${l}`} />
                    <Area type="monotone" dataKey="count" stroke="#3b82f6" fill="url(#grad)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              </Card>
            )}

            {/* Quick actions */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => nav(`/admin/projects/${id}/records`)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-blue-50 dark:bg-blue-900/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">عرض السجلات</p>
                    <p className="text-xs text-muted-foreground">{stats?.total} سجل مسجّل</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => window.open(`/p/${id}/register`, "_blank")}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-green-50 dark:bg-green-900/20 flex items-center justify-center">
                    <ExternalLink className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">رابط التسجيل</p>
                    <p className="text-xs text-muted-foreground">مشاركة النموذج العام</p>
                  </div>
                </div>
              </Card>
              <Card className="p-4 cursor-pointer hover:shadow-md transition-shadow" onClick={() => nav(`/admin/projects/${id}/settings`)}>
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-purple-50 dark:bg-purple-900/20 flex items-center justify-center">
                    <Users className="h-5 w-5 text-purple-600" />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">إعدادات المشروع</p>
                    <p className="text-xs text-muted-foreground">Google Sheets، Telegram</p>
                  </div>
                </div>
              </Card>
            </div>
          </>
        )}
      </div>
    </Layout>
  );
}
