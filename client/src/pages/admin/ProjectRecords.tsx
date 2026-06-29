import { useState, useEffect } from "react";
import { useParams, useLocation } from "wouter";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Layout } from "@/components/Layout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { apiRequest } from "@/lib/queryClient";
import { Plus, Search, Trash2, Eye, Edit, Loader2, ChevronRight, ChevronLeft, Users } from "lucide-react";
import type { ProjectRecord, ProjectField } from "@shared/schema";

interface RecordsResponse { data: ProjectRecord[]; total: number; page: number; limit: number; }

export function ProjectRecords() {
  const { id } = useParams<{ id: string }>();
  const [, nav] = useLocation();
  const qc = useQueryClient();
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const limit = 20;

  useEffect(() => {
    const t = setTimeout(() => { setDebouncedSearch(search); setPage(1); }, 400);
    return () => clearTimeout(t);
  }, [search]);

  const { data, isLoading } = useQuery<RecordsResponse>({
    queryKey: ["/api/projects", id, "records", page, debouncedSearch],
    queryFn: () => fetch(`/api/projects/${id}/records?page=${page}&limit=${limit}&search=${encodeURIComponent(debouncedSearch)}`, { credentials: "include" }).then(r => r.json()),
  });

  const { data: fields = [] } = useQuery<ProjectField[]>({
    queryKey: ["/api/projects", id, "fields"],
    queryFn: () => fetch(`/api/projects/${id}/fields`, { credentials: "include" }).then(r => r.json()),
  });

  const deleteMut = useMutation({
    mutationFn: (recordId: string) => apiRequest("DELETE", `/api/projects/${id}/records/${recordId}`),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/projects", id, "records"] }); },
  });

  const bulkDeleteMut = useMutation({
    mutationFn: (ids: string[]) => apiRequest("POST", `/api/projects/${id}/records/bulk-delete`, { ids }),
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["/api/projects", id, "records"] }); setSelected(new Set()); },
  });

  const previewFields = fields.slice(0, 4);
  const total = data?.total || 0;
  const totalPages = Math.ceil(total / limit);

  const toggleSelect = (rid: string) => {
    const s = new Set(selected);
    s.has(rid) ? s.delete(rid) : s.add(rid);
    setSelected(s);
  };

  return (
    <Layout projectId={id}>
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-800 dark:text-slate-100">السجلات</h1>
            <p className="text-xs text-muted-foreground">{total} سجل إجمالاً</p>
          </div>
          <Button size="sm" onClick={() => nav(`/admin/projects/${id}/records/new`)} data-testid="button-add-record">
            <Plus className="h-4 w-4 ml-1" />
            إضافة سجل
          </Button>
        </div>

        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="بحث..." className="pr-9" data-testid="input-search" />
          </div>
          {selected.size > 0 && (
            <Button variant="destructive" size="sm" onClick={() => bulkDeleteMut.mutate([...selected])} disabled={bulkDeleteMut.isPending}>
              <Trash2 className="h-4 w-4 ml-1" />
              حذف ({selected.size})
            </Button>
          )}
        </div>

        <Card className="overflow-hidden">
          {isLoading ? (
            <div className="flex justify-center py-16"><Loader2 className="h-7 w-7 animate-spin text-primary" /></div>
          ) : !data?.data?.length ? (
            <div className="text-center py-16 text-muted-foreground">
              <Users className="h-10 w-10 mx-auto mb-3 opacity-30" />
              <p className="text-sm">لا توجد سجلات{search && " مطابقة للبحث"}</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                    <th className="px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground w-10">
                      <input type="checkbox"
                        checked={selected.size === data.data.length && data.data.length > 0}
                        onChange={e => setSelected(e.target.checked ? new Set(data.data.map(r => r.id)) : new Set())}
                        className="rounded"
                      />
                    </th>
                    <th className="px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground">#</th>
                    {previewFields.map(f => (
                      <th key={f.id} className="px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground">{f.label}</th>
                    ))}
                    <th className="px-3 py-2.5 text-right font-semibold text-xs text-muted-foreground">التاريخ</th>
                    <th className="px-3 py-2.5 w-24" />
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-700/50">
                  {data.data.map(record => {
                    const rdata = record.data as Record<string, any>;
                    return (
                      <tr key={record.id} className="hover:bg-slate-50/80 dark:hover:bg-slate-800/30 transition-colors" data-testid={`row-record-${record.id}`}>
                        <td className="px-3 py-2.5">
                          <input type="checkbox" checked={selected.has(record.id)} onChange={() => toggleSelect(record.id)} className="rounded" />
                        </td>
                        <td className="px-3 py-2.5 text-xs text-muted-foreground font-mono">{record.sequentialNumber}</td>
                        {previewFields.map(f => (
                          <td key={f.id} className="px-3 py-2.5 text-xs max-w-[150px] truncate">{String(rdata[f.key] ?? "—")}</td>
                        ))}
                        <td className="px-3 py-2.5 text-xs text-muted-foreground">
                          {record.submittedAt ? new Date(record.submittedAt).toLocaleDateString("ar") : "—"}
                        </td>
                        <td className="px-3 py-2.5">
                          <div className="flex gap-1 justify-end">
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => nav(`/admin/projects/${id}/records/${record.id}`)} data-testid={`button-view-${record.id}`}>
                              <Eye className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => nav(`/admin/projects/${id}/records/${record.id}/edit`)} data-testid={`button-edit-${record.id}`}>
                              <Edit className="h-3.5 w-3.5" />
                            </Button>
                            <Button variant="ghost" size="icon" className="h-7 w-7 text-red-400 hover:text-red-600" onClick={() => deleteMut.mutate(record.id)} data-testid={`button-delete-${record.id}`}>
                              <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        {totalPages > 1 && (
          <div className="flex items-center justify-between text-sm">
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
              <ChevronRight className="h-4 w-4" />
            </Button>
            <span className="text-muted-foreground text-xs">صفحة {page} من {totalPages}</span>
            <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>
    </Layout>
  );
}
