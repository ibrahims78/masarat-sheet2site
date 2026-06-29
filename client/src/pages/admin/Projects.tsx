import { useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { useProject } from "@/context/ProjectContext";
import { Plus, FolderKanban, Users, Settings, Trash2, LayoutDashboard, ExternalLink, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/queryClient";
import type { Project } from "@shared/schema";
import { useState } from "react";

export function Projects() {
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const { setCurrentProject } = useProject();
  const [deleting, setDeleting] = useState<string | null>(null);

  const { data: projects = [], isLoading } = useQuery<Project[]>({ queryKey: ["/api/projects"] });

  const deleteMut = useMutation({
    mutationFn: (id: string) => apiRequest("DELETE", `/api/projects/${id}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/projects"] }); setDeleting(null); },
  });

  const openProject = (p: Project) => {
    setCurrentProject(p);
    nav(`/admin/projects/${p.id}/dashboard`);
  };

  return (
    <Layout>
      <div className="max-w-5xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-800 dark:text-slate-100">المشاريع</h1>
            <p className="text-sm text-muted-foreground mt-0.5">إدارة مشاريع جمع البيانات</p>
          </div>
          <Button onClick={() => nav("/admin/projects/new")} data-testid="button-new-project">
            <Plus className="h-4 w-4 ml-2" />
            مشروع جديد
          </Button>
        </div>

        {isLoading ? (
          <div className="flex justify-center py-20"><Loader2 className="h-8 w-8 animate-spin text-primary" /></div>
        ) : projects.length === 0 ? (
          <Card className="flex flex-col items-center justify-center py-20 text-center">
            <FolderKanban className="h-16 w-16 text-slate-300 dark:text-slate-600 mb-4" />
            <h3 className="text-lg font-semibold text-slate-600 dark:text-slate-400 mb-2">لا يوجد مشاريع بعد</h3>
            <p className="text-sm text-muted-foreground mb-6">أنشئ مشروعك الأول لبدء جمع البيانات</p>
            <Button onClick={() => nav("/admin/projects/new")}>
              <Plus className="h-4 w-4 ml-2" />
              إنشاء مشروع
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {projects.map(p => (
              <Card key={p.id} className="p-5 hover:shadow-md transition-shadow cursor-pointer group" data-testid={`card-project-${p.id}`}>
                <div className="flex items-start justify-between mb-3">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center shadow-sm">
                    <span className="text-white font-bold text-sm">{p.name[0]}</span>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button variant="ghost" size="icon" className="h-7 w-7"
                      onClick={(e) => { e.stopPropagation(); nav(`/admin/projects/${p.id}/settings`); }}
                      data-testid={`button-settings-${p.id}`}>
                      <Settings className="h-3.5 w-3.5" />
                    </Button>
                    {deleting === p.id ? (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-red-500"
                        onClick={(e) => { e.stopPropagation(); deleteMut.mutate(p.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    ) : (
                      <Button variant="ghost" size="icon" className="h-7 w-7 text-slate-400 hover:text-red-500"
                        onClick={(e) => { e.stopPropagation(); setDeleting(p.id); }}
                        data-testid={`button-delete-${p.id}`}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    )}
                  </div>
                </div>

                <h3 className="font-bold text-slate-800 dark:text-slate-100 mb-1">{p.name}</h3>
                {p.description && <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{p.description}</p>}

                <div className="flex items-center gap-2 mb-4">
                  <Badge variant={p.formEnabled ? "default" : "secondary"} className="text-[10px]">
                    {p.formEnabled ? "النموذج مفعّل" : "النموذج متوقف"}
                  </Badge>
                </div>

                <div className="flex gap-2">
                  <Button size="sm" className="flex-1 h-8" onClick={() => openProject(p)} data-testid={`button-open-${p.id}`}>
                    <LayoutDashboard className="h-3.5 w-3.5 ml-1" />
                    فتح
                  </Button>
                  <Button size="sm" variant="outline" className="h-8 px-2"
                    onClick={() => window.open(`/p/${p.id}/register`, "_blank")}>
                    <ExternalLink className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    </Layout>
  );
}
