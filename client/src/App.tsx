import { Switch, Route } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "./context/auth-context";
import { ProjectProvider } from "./context/project-context";
import { ThemeProvider } from "./context/theme-context";

// Components & Layout
import NotFound from "@/pages/not-found";
import { LoginForm } from "@/components/auth/login-form";
import { Sidebar } from "@/components/layout/sidebar";

// Pages
import Home from "@/pages/home";
import Connection from "@/pages/connection";
import Schemas from "@/pages/schemas";
import Analysis from "@/pages/analysis";
import Obfuscation from "@/pages/obfuscation";
import Backup from "@/pages/backup";
import Migration from "@/pages/migration";
import Monitoring from "@/pages/monitoring";
import Settings from "@/pages/settings";
import AdminDashboard from "@/pages/admin/index";
import AdminUsers from "@/pages/admin/users";
import AdminProjects from "@/pages/admin/projects";

// Hooks
import { useAuth } from "@/hooks/use-auth";

// Protected Route Component
function ProtectedRoute({ component: Component, adminOnly = false }: 
  { component: React.ComponentType, adminOnly?: boolean }) {
  const { user, isAuthenticated, isLoading } = useAuth();
  
  if (isLoading) {
    return <div className="h-screen w-full flex items-center justify-center">
      <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
    </div>;
  }
  
  if (!isAuthenticated) {
    return <LoginForm />;
  }
  
  if (adminOnly && user?.role !== "admin") {
    return <div className="p-8">
      <h1 className="text-2xl font-bold">Acceso no autorizado</h1>
      <p className="mt-2">No tienes permisos para acceder a esta sección.</p>
    </div>;
  }
  
  return (
    <div className="h-screen flex overflow-hidden bg-gray-100">
      <Sidebar />
      <div className="flex flex-col w-0 flex-1 overflow-hidden">
        <main className="flex-1 relative z-0 overflow-y-auto focus:outline-none">
          <Component />
        </main>
      </div>
    </div>
  );
}

function Router() {
  return (
    <Switch>
      <Route path="/login" component={() => <LoginForm />} />
      <Route path="/" component={() => <ProtectedRoute component={Home} />} />
      <Route path="/conexion" component={() => <ProtectedRoute component={Connection} />} />
      <Route path="/esquemas" component={() => <ProtectedRoute component={Schemas} />} />
      <Route path="/analisis" component={() => <ProtectedRoute component={Analysis} />} />
      <Route path="/ofuscacion" component={() => <ProtectedRoute component={Obfuscation} />} />
      <Route path="/respaldo" component={() => <ProtectedRoute component={Backup} />} />
      <Route path="/migracion" component={() => <ProtectedRoute component={Migration} />} />
      <Route path="/monitoreo" component={() => <ProtectedRoute component={Monitoring} />} />
      <Route path="/configuracion" component={() => <ProtectedRoute component={Settings} />} />
      <Route path="/admin" component={() => <ProtectedRoute component={AdminDashboard} adminOnly={true} />} />
      <Route path="/admin/usuarios" component={() => <ProtectedRoute component={AdminUsers} adminOnly={true} />} />
      <Route path="/admin/proyectos" component={() => <ProtectedRoute component={AdminProjects} adminOnly={true} />} />
      <Route component={NotFound} />
    </Switch>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ThemeProvider>
        <AuthProvider>
          <ProjectProvider>
            <TooltipProvider>
              <Toaster />
              <Router />
            </TooltipProvider>
          </ProjectProvider>
        </AuthProvider>
      </ThemeProvider>
    </QueryClientProvider>
  );
}

export default App;
