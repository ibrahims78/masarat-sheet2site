import { useEffect } from "react";
import { Switch, Route, useLocation, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { ThemeProvider } from "next-themes";
import { LanguageProvider } from "@/context/LanguageContext";
import { AuthProvider, useAuth } from "@/context/AuthContext";
import { queryClient } from "@/lib/queryClient";
import { Loader2 } from "lucide-react";

// Pages
import { Setup } from "@/pages/Setup";
import { Register } from "@/pages/Register";
import { EditForm } from "@/pages/EditForm";
import { AdminRegister } from "@/pages/AdminRegister";
import { Login } from "@/pages/admin/Login";
import { Dashboard } from "@/pages/admin/Dashboard";
import { EmployeeList } from "@/pages/admin/EmployeeList";
import { EmployeeDetails } from "@/pages/admin/EmployeeDetails";
import { EmployeeEdit } from "@/pages/admin/EmployeeEdit";
import { AdminAddEmployee } from "@/pages/admin/AdminAddEmployee";
import { Export } from "@/pages/admin/Export";
import { Settings } from "@/pages/admin/Settings";

const ROLE_LEVEL: Record<string, number> = { viewer: 1, editor: 2, admin: 3 };

function ProtectedRoute({ children, minRole = "viewer" }: { children: React.ReactNode; minRole?: "admin" | "editor" | "viewer" }) {
  const { user, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-10 w-10 animate-spin text-[#1d4ed8]" />
      </div>
    );
  }

  if (!user) return <Redirect to="/admin/login" />;
  if ((ROLE_LEVEL[user.role] || 0) < (ROLE_LEVEL[minRole] || 0)) return <Redirect to="/admin/dashboard" />;

  return <>{children}</>;
}

function SetupCheck({ children }: { children: React.ReactNode }) {
  const [location, nav] = useLocation();

  useEffect(() => {
    if (location === "/setup") return;
    fetch("/api/auth/setup-required", { credentials: "include" })
      .then(r => r.json())
      .then(d => { if (d.required) nav("/setup"); });
  }, []);

  return <>{children}</>;
}

function AppRoutes() {
  return (
    <SetupCheck>
      <Switch>
        {/* Public */}
        <Route path="/" component={() => <Redirect to="/admin/login" />} />
        <Route path="/setup" component={Setup} />
        <Route path="/register" component={Register} />
        <Route path="/edit/:token" component={EditForm} />
        <Route path="/admin/register/:token" component={AdminRegister} />

        {/* Admin Auth */}
        <Route path="/admin/login" component={Login} />
        <Route path="/admin" component={() => <Redirect to="/admin/dashboard" />} />

        {/* Protected Admin */}
        <Route path="/admin/dashboard">
          <ProtectedRoute><Dashboard /></ProtectedRoute>
        </Route>
        <Route path="/admin/employees">
          <ProtectedRoute><EmployeeList /></ProtectedRoute>
        </Route>
        <Route path="/admin/employees/new">
          <ProtectedRoute minRole="editor"><AdminAddEmployee /></ProtectedRoute>
        </Route>
        <Route path="/admin/employees/:id/edit">
          <ProtectedRoute minRole="editor"><EmployeeEdit /></ProtectedRoute>
        </Route>
        <Route path="/admin/employees/:id">
          <ProtectedRoute><EmployeeDetails /></ProtectedRoute>
        </Route>
        <Route path="/admin/export">
          <ProtectedRoute><Export /></ProtectedRoute>
        </Route>
        <Route path="/admin/settings">
          <ProtectedRoute minRole="admin"><Settings /></ProtectedRoute>
        </Route>

        {/* 404 */}
        <Route component={() => (
          <div className="min-h-screen flex items-center justify-center text-muted-foreground">
            <div className="text-center">
              <h1 className="text-6xl font-bold text-slate-200 dark:text-slate-700 mb-4">404</h1>
              <p className="text-slate-500">الصفحة غير موجودة</p>
              <a href="/register" className="mt-4 inline-block text-[#1d4ed8] hover:underline">العودة للرئيسية</a>
            </div>
          </div>
        )} />
      </Switch>
    </SetupCheck>
  );
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider attribute="class" defaultTheme="light" enableSystem={false}>
        <LanguageProvider>
          <AuthProvider>
            <AppRoutes />
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}
