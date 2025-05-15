import { useState } from "react";
import { useLocation, Link } from "wouter";
import { useAuth } from "@/hooks/use-auth";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  Database,
  BarChart2,
  ShieldAlert,
  HardDrive,
  ArrowLeftRight,
  Settings,
  PieChart,
  FileStack,
  Home,
  Users,
  Layers3,
  Menu,
  X,
  LogOut,
} from "lucide-react";

interface SidebarItemProps {
  href: string;
  icon: React.ReactNode;
  children: React.ReactNode;
  isActive?: boolean;
  onClick?: () => void;
}

function SidebarItem({
  href,
  icon,
  children,
  isActive,
  onClick,
}: SidebarItemProps) {
  return (
    <Link href={href}>
      <Button
        variant="ghost"
        className={cn(
          "w-full justify-start gap-2 pl-2",
          isActive
            ? "bg-gray-100 text-gray-900"
            : "text-gray-600 hover:text-gray-900"
        )}
        onClick={onClick}
      >
        {icon}
        <span>{children}</span>
      </Button>
    </Link>
  );
}

export default function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuth();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);

  const toggleSidebar = () => {
    setIsOpen(!isOpen);
  };

  const closeSidebar = () => {
    if (isMobile) {
      setIsOpen(false);
    }
  };

  // Menú principal
  const mainMenu = [
    {
      href: "/",
      icon: <Home size={20} />,
      label: "Inicio",
    },
    {
      href: "/conexion",
      icon: <Database size={20} />,
      label: "Conexión",
    },
    {
      href: "/esquemas",
      icon: <FileStack size={20} />,
      label: "Esquemas",
    },
    {
      href: "/analisis",
      icon: <BarChart2 size={20} />,
      label: "Análisis",
    },
    {
      href: "/ofuscacion",
      icon: <ShieldAlert size={20} />,
      label: "Ofuscación",
    },
    {
      href: "/respaldo",
      icon: <HardDrive size={20} />,
      label: "Respaldo",
    },
    {
      href: "/migracion",
      icon: <ArrowLeftRight size={20} />,
      label: "Migración",
    },
    {
      href: "/monitoreo",
      icon: <PieChart size={20} />,
      label: "Monitoreo",
    },
    {
      href: "/configuracion",
      icon: <Settings size={20} />,
      label: "Configuración",
    },
  ];

  // Menú administrativo (solo visible para administradores)
  const adminMenu = [
    {
      href: "/admin",
      icon: <Layers3 size={20} />,
      label: "Panel Admin",
    },
    {
      href: "/admin/usuarios",
      icon: <Users size={20} />,
      label: "Usuarios",
    },
    {
      href: "/admin/proyectos",
      icon: <FileStack size={20} />,
      label: "Proyectos",
    },
  ];

  return (
    <>
      {isMobile && (
        <div className="fixed top-0 left-0 right-0 z-10 flex items-center justify-between bg-white border-b p-4">
          <h1 className="text-xl font-bold">SQL Processor</h1>
          <Button variant="ghost" size="icon" onClick={toggleSidebar}>
            <Menu size={24} />
          </Button>
        </div>
      )}

      <div
        className={cn(
          "bg-white z-40 h-screen",
          isMobile
            ? cn(
                "fixed top-0 left-0 w-64 shadow-lg transition-transform duration-300 transform",
                isOpen ? "translate-x-0" : "-translate-x-full"
              )
            : "w-64 border-r border-gray-200"
        )}
      >
        <div className="flex flex-col h-full">
          <div className="p-4 border-b">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">SQL Processor</h2>
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleSidebar}
                  className="lg:hidden"
                >
                  <X size={18} />
                </Button>
              )}
            </div>
            {user && (
              <div className="mt-2 text-sm text-gray-600 truncate">
                {user.fullName}
              </div>
            )}
          </div>

          <div className="flex-1 overflow-y-auto py-2">
            <nav className="space-y-1 px-2">
              {mainMenu.map((item) => (
                <SidebarItem
                  key={item.href}
                  href={item.href}
                  icon={item.icon}
                  isActive={location === item.href}
                  onClick={closeSidebar}
                >
                  {item.label}
                </SidebarItem>
              ))}
            </nav>

            {user?.role === "admin" && (
              <>
                <div className="px-4 py-2 mt-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Administración
                </div>
                <nav className="space-y-1 px-2">
                  {adminMenu.map((item) => (
                    <SidebarItem
                      key={item.href}
                      href={item.href}
                      icon={item.icon}
                      isActive={location === item.href}
                      onClick={closeSidebar}
                    >
                      {item.label}
                    </SidebarItem>
                  ))}
                </nav>
              </>
            )}
          </div>

          <div className="p-4 border-t">
            <Button
              variant="ghost"
              className="w-full justify-start gap-2 text-red-600 hover:text-red-700 hover:bg-red-50"
              onClick={() => {
                logout();
                closeSidebar();
              }}
            >
              <LogOut size={20} />
              <span>Cerrar sesión</span>
            </Button>
          </div>
        </div>
      </div>

      {isMobile && isOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-30"
          onClick={toggleSidebar}
        />
      )}
    </>
  );
}