import { useState } from "react";
import { Link, useLocation } from "wouter";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { UserNav } from "./user-nav";
import {
  Menu,
  Home,
  Database,
  Table,
  Search,
  EyeOff,
  Save,
  GitMerge,
  LineChart,
  Settings,
  Users,
  MenuIcon,
  X
} from "lucide-react";

type NavItem = {
  name: string;
  path: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
};

export default function Sidebar() {
  const [isOpen, setIsOpen] = useState(false);
  const [location] = useLocation();
  const { user } = useAuth();
  const isAdmin = user?.role === "admin";

  const navItems: NavItem[] = [
    { name: "Inicio", path: "/", icon: <Home className="h-5 w-5" /> },
    { name: "Conexión", path: "/conexion", icon: <Database className="h-5 w-5" /> },
    { name: "Esquemas", path: "/esquemas", icon: <Table className="h-5 w-5" /> },
    { name: "Análisis", path: "/analisis", icon: <Search className="h-5 w-5" /> },
    { name: "Ofuscación", path: "/ofuscacion", icon: <EyeOff className="h-5 w-5" /> },
    { name: "Respaldo", path: "/respaldo", icon: <Save className="h-5 w-5" /> },
    { name: "Migración", path: "/migracion", icon: <GitMerge className="h-5 w-5" /> },
    { name: "Monitoreo", path: "/monitoreo", icon: <LineChart className="h-5 w-5" /> },
    { name: "Configuración", path: "/configuracion", icon: <Settings className="h-5 w-5" /> },
    { name: "Administración", path: "/admin", icon: <Users className="h-5 w-5" />, adminOnly: true },
  ];

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const isActive = (path: string) => {
    if (path === "/" && location === "/") return true;
    if (path !== "/" && location.startsWith(path)) return true;
    return false;
  };

  // Only display admin routes if user is admin
  const filteredNavItems = navItems.filter(item => !item.adminOnly || isAdmin);

  return (
    <>
      {/* Mobile menu button */}
      <div className="md:hidden absolute top-0 left-0 p-4 z-20">
        <Button variant="ghost" size="icon" onClick={toggleSidebar}>
          <MenuIcon className="h-6 w-6" />
        </Button>
      </div>

      {/* Overlay for mobile */}
      {isOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/50 z-30"
          onClick={() => setIsOpen(false)}
        />
      )}

      {/* Sidebar */}
      <div 
        className={`fixed inset-y-0 left-0 transform z-40 md:translate-x-0 transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full'
        } md:relative md:flex md:flex-col md:flex-shrink-0 bg-primary-800 w-64`}
      >
        {/* Close button - mobile only */}
        <div className="md:hidden absolute right-4 top-4">
          <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)} 
            className="text-white hover:bg-primary-700">
            <X className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex flex-col h-0 flex-1">
          <div className="flex-1 flex flex-col pt-5 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-4">
              <div className="flex items-center">
                <Database className="h-6 w-6 text-white mr-2" />
                <span className="text-white text-lg font-semibold">SQL Migrator</span>
              </div>
            </div>
            <nav className="mt-5 flex-1 px-2 space-y-1">
              {filteredNavItems.map((item) => (
                <Link 
                  key={item.path} 
                  href={item.path}
                  onClick={() => setIsOpen(false)}
                >
                  <a
                    className={`group flex items-center px-2 py-2 text-sm font-medium rounded-md ${
                      isActive(item.path)
                        ? "text-white bg-primary-900"
                        : "text-primary-100 hover:bg-primary-700"
                    }`}
                  >
                    <span className="mr-3 text-primary-300">{item.icon}</span>
                    {item.name}
                  </a>
                </Link>
              ))}
            </nav>
          </div>
          <div className="flex-shrink-0 flex border-t border-primary-700 p-4">
            <UserNav />
          </div>
        </div>
      </div>
    </>
  );
}
