import { useState } from "react";
import { useLocation } from "wouter";
import {
  LayoutDashboard, Users, Download, Settings, LogOut,
  Menu, ChevronLeft, ChevronRight, Activity,
} from "lucide-react";
import { ThemeToggle } from "./ThemeToggle";
import { LanguageToggle } from "./LanguageToggle";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/context/AuthContext";
import { useLang } from "@/context/LanguageContext";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/admin/dashboard",  icon: LayoutDashboard, label: "الرئيسية",  labelEn: "Dashboard",  adminOnly: false },
  { href: "/admin/employees",  icon: Users,            label: "الموظفون",  labelEn: "Employees",  adminOnly: false },
  { href: "/admin/export",     icon: Download,         label: "التصدير",   labelEn: "Export",     adminOnly: false },
  { href: "/admin/settings",   icon: Settings,         label: "الإعدادات", labelEn: "Settings",   adminOnly: true  },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const [location, nav] = useLocation();
  const { user, logout } = useAuth();
  const { lang } = useLang();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileOpen, setMobileOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
    nav("/admin/login");
  };

  const isAr = lang === "ar";

  const SidebarContent = () => (
    <div className="flex flex-col h-full">
      {/* Logo / Brand */}
      <div className={cn(
        "flex items-center gap-3 px-4 py-5 border-b border-slate-200 dark:border-slate-700/80",
        !sidebarOpen && "justify-center px-2"
      )}>
        <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-secondary flex items-center justify-center flex-shrink-0 shadow-md">
          <Activity className="h-5 w-5 text-white" />
        </div>
        {sidebarOpen && (
          <div className="min-w-0">
            <p className="text-sm font-bold text-slate-800 dark:text-slate-100 truncate leading-tight">
              {isAr ? "الكوادر الصحية" : "Health Staff"}
            </p>
            <p className="text-[11px] text-muted-foreground font-medium">منصة نواة</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 py-3 space-y-0.5 overflow-y-auto">
        {NAV.filter(item => !item.adminOnly || user?.role === "admin").map(item => {
          const isActive = location === item.href || location.startsWith(item.href + "/");
          return (
            <button
              key={item.href}
              onClick={() => { nav(item.href); setMobileOpen(false); }}
              className={cn(
                "w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all duration-150 relative",
                isActive
                  ? "bg-primary text-white shadow-sm"
                  : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700/60 hover:text-slate-900 dark:hover:text-slate-100",
                !sidebarOpen && "justify-center px-2"
              )}
              title={!sidebarOpen ? (isAr ? item.label : item.labelEn) : undefined}
              data-testid={`nav-${item.href.split("/").pop()}`}
            >
              <item.icon className="h-4.5 w-4.5 flex-shrink-0 h-[18px] w-[18px]" />
              {sidebarOpen && (
                <span>{isAr ? item.label : item.labelEn}</span>
              )}
              {isActive && sidebarOpen && (
                <span className="mr-auto w-1.5 h-1.5 rounded-full bg-white/60" />
              )}
            </button>
          );
        })}
      </nav>

      {/* Divider */}
      <div className="px-4 pb-1">
        <div className="h-px bg-slate-200 dark:bg-slate-700/80" />
      </div>

      {/* User section */}
      <div className={cn("p-3", !sidebarOpen && "flex justify-center")}>
        {sidebarOpen ? (
          <div className="space-y-2">
            <div className="flex items-center gap-2.5 px-2 py-1.5 rounded-xl bg-slate-50 dark:bg-slate-700/40">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center flex-shrink-0">
                <span className="text-white text-xs font-bold">
                  {user?.fullName?.[0] || "م"}
                </span>
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-slate-800 dark:text-slate-200 truncate leading-tight">
                  {user?.fullName}
                </p>
                <p className="text-[10px] text-muted-foreground font-medium">
                  {user?.role === "admin" ? "مدير النظام" : user?.role === "editor" ? "محرر" : "مشاهد"}
                </p>
              </div>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleLogout}
              className="w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-900/20 h-8 font-semibold"
              data-testid="button-logout"
            >
              <LogOut className="h-3.5 w-3.5 ml-2" />
              {isAr ? "تسجيل خروج" : "Logout"}
            </Button>
          </div>
        ) : (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={handleLogout}
            title="تسجيل خروج"
            className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
          >
            <LogOut className="h-4 w-4" />
          </Button>
        )}
      </div>

      {/* Developer credit */}
      {sidebarOpen && (
        <div className="px-3 pb-3">
          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-blue-50/60 dark:from-slate-700/40 dark:to-blue-900/20 border border-slate-200/70 dark:border-slate-600/40 px-3 py-2 text-center">
            <p className="text-[10px] font-semibold text-slate-500 dark:text-slate-400 leading-snug">
              تصميم وبرمجة
            </p>
            <p className="text-[11px] font-bold text-primary leading-snug mt-0.5">
              إبراهيم الصيداوي
            </p>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <div className="flex h-screen overflow-hidden bg-slate-50 dark:bg-slate-900/95">
      {/* Desktop Sidebar */}
      <aside className={cn(
        "hidden md:flex flex-col flex-shrink-0 bg-white dark:bg-slate-800 border-l border-slate-200 dark:border-slate-700/80 transition-all duration-300 relative sidebar shadow-sm",
        sidebarOpen ? "w-56" : "w-[60px]"
      )}>
        <SidebarContent />
        {/* Toggle collapse button */}
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={cn(
            "absolute -right-3 top-[72px] w-6 h-6 rounded-full bg-white dark:bg-slate-700",
            "border border-slate-200 dark:border-slate-600 flex items-center justify-center",
            "shadow-card hover:shadow-card-md transition-all duration-150 z-20",
            "hover:border-primary/40 hover:text-primary"
          )}
          data-testid="button-toggle-sidebar"
        >
          {sidebarOpen
            ? <ChevronRight className="h-3 w-3 text-slate-500" />
            : <ChevronLeft  className="h-3 w-3 text-slate-500" />
          }
        </button>
      </aside>

      {/* Mobile Overlay */}
      {mobileOpen && (
        <div className="md:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="relative w-60 bg-white dark:bg-slate-800 h-full shadow-2xl flex flex-col border-l border-slate-200 dark:border-slate-700">
            <SidebarContent />
          </aside>
        </div>
      )}

      {/* Main content area */}
      <div className="flex flex-col flex-1 overflow-hidden min-w-0">
        {/* Top bar */}
        <header className="bg-white dark:bg-slate-800 border-b border-slate-200 dark:border-slate-700/80 px-4 py-2.5 flex items-center justify-between flex-shrink-0 shadow-sm">
          <button
            onClick={() => setMobileOpen(true)}
            className="md:hidden p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
            data-testid="button-mobile-menu"
          >
            <Menu className="h-5 w-5" />
          </button>

          {/* Breadcrumb / current page */}
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {NAV.find(n => location === n.href || location.startsWith(n.href + "/"))?.label ?? "الإدارة"}
            </span>
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            <div className="hidden sm:flex items-center gap-2 ml-2">
              <div className="w-7 h-7 rounded-lg bg-gradient-to-br from-primary/80 to-secondary/80 flex items-center justify-center">
                <span className="text-white text-xs font-bold">{user?.fullName?.[0] || "م"}</span>
              </div>
              <div className="text-right">
                <p className="text-xs font-bold text-slate-700 dark:text-slate-300 leading-tight">
                  {user?.fullName}
                </p>
                <p className="text-[10px] text-muted-foreground">
                  {user?.role === "admin" ? "مدير النظام" : user?.role === "editor" ? "محرر" : "مشاهد"}
                </p>
              </div>
            </div>
            <div className="w-px h-6 bg-slate-200 dark:bg-slate-700 hidden sm:block" />
            <ThemeToggle />
            <LanguageToggle />
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
