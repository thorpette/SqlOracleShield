import { FC, useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useAuthContext } from '@/context/auth-context';
import { useIsMobile } from '@/hooks/use-mobile';
import { apiRequest } from '@/lib/queryClient';
import { Button } from '@/components/ui/button';
import { User } from '@shared/schema';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Home, 
  Server, 
  FileSearch, 
  BarChart, 
  ShieldAlert, 
  Archive, 
  ArrowLeftRight, 
  FileSpreadsheet, 
  Settings, 
  User as UserIcon, 
  Menu, 
  X, 
  LogOut 
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

// Tipo para los elementos del menú
interface MenuItem {
  label: string;
  icon: React.ReactNode;
  href: string;
  adminOnly?: boolean;
}

export function Sidebar() {
  const [location] = useLocation();
  const { user, logout } = useAuthContext();
  const isMobile = useIsMobile();
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  // Elementos del menú
  const menuItems: MenuItem[] = [
    { label: 'Inicio', icon: <Home className="h-5 w-5" />, href: '/' },
    { label: 'Conexiones', icon: <Server className="h-5 w-5" />, href: '/conexion' },
    { label: 'Esquemas', icon: <FileSearch className="h-5 w-5" />, href: '/esquemas' },
    { label: 'Análisis', icon: <BarChart className="h-5 w-5" />, href: '/analisis' },
    { label: 'Ofuscación', icon: <ShieldAlert className="h-5 w-5" />, href: '/ofuscacion' },
    { label: 'Respaldo', icon: <Archive className="h-5 w-5" />, href: '/respaldo' },
    { label: 'Migración', icon: <ArrowLeftRight className="h-5 w-5" />, href: '/migracion' },
    { label: 'Monitoreo', icon: <FileSpreadsheet className="h-5 w-5" />, href: '/monitoreo' },
    { label: 'Usuarios', icon: <UserIcon className="h-5 w-5" />, href: '/admin/usuarios', adminOnly: true },
    { label: 'Configuración', icon: <Settings className="h-5 w-5" />, href: '/configuracion' },
  ];

  // Filtrar elementos del menú basados en el rol del usuario
  const filteredMenuItems = menuItems.filter(item => {
    if (item.adminOnly && user?.role !== 'admin') {
      return false;
    }
    return true;
  });

  // Manejador para el cierre de sesión
  const handleLogout = () => {
    logout();
  };

  // Función para renderizar cada ítem del menú
  const renderMenuItem = (item: MenuItem) => {
    const isActive = location === item.href;
    
    return (
      <Link 
        key={item.href} 
        href={item.href}
        onClick={() => isMobile && setIsOpen(false)}
      >
        <Button
          variant="ghost"
          className={`w-full justify-start ${isActive ? 'bg-muted' : ''}`}
        >
          {item.icon}
          <span className="ml-2">{item.label}</span>
        </Button>
      </Link>
    );
  };

  // Renderizar el menú según si es móvil o desktop
  if (isMobile) {
    return (
      <>
        {/* Botón para abrir el menú en móvil */}
        <Button
          variant="ghost"
          size="icon"
          className="fixed top-4 left-4 z-50"
          onClick={() => setIsOpen(!isOpen)}
        >
          {isOpen ? (
            <X className="h-6 w-6" />
          ) : (
            <Menu className="h-6 w-6" />
          )}
        </Button>

        {/* Overlay del menú */}
        {isOpen && (
          <div
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-40"
            onClick={() => setIsOpen(false)}
          />
        )}

        {/* Menú lateral móvil */}
        <aside
          className={`fixed top-0 left-0 z-40 h-screen w-64 transform transition-transform duration-300 ease-in-out ${
            isOpen ? 'translate-x-0' : '-translate-x-full'
          } bg-card border-r`}
        >
          <div className="p-4 border-b flex items-center justify-between">
            <h1 className="text-xl font-bold">SQL Processor</h1>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
            </Button>
          </div>

          <ScrollArea className="h-[calc(100vh-4rem)]">
            <div className="px-2 py-4 space-y-1">
              {filteredMenuItems.map(renderMenuItem)}
            </div>
            
            <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
              <div className="flex items-center space-x-2 mb-4">
                <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
                  {user?.name.charAt(0).toUpperCase()}
                </div>
                <div>
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground">{user?.email}</p>
                </div>
              </div>
              <Button 
                variant="outline" 
                className="w-full" 
                onClick={handleLogout}
              >
                <LogOut className="h-4 w-4 mr-2" />
                Cerrar sesión
              </Button>
            </div>
          </ScrollArea>
        </aside>
      </>
    );
  }

  // Versión desktop
  return (
    <aside className="hidden sm:block w-64 bg-card border-r h-screen overflow-hidden">
      <div className="p-4 border-b">
        <h1 className="text-xl font-bold">SQL Processor</h1>
      </div>
      
      <ScrollArea className="h-[calc(100vh-4rem)]">
        <div className="px-2 py-4 space-y-1">
          {filteredMenuItems.map(renderMenuItem)}
        </div>
        
        <div className="absolute bottom-0 left-0 right-0 p-4 border-t">
          <div className="flex items-center space-x-2 mb-4">
            <div className="w-8 h-8 rounded-full bg-primary flex items-center justify-center text-primary-foreground">
              {user?.name.charAt(0).toUpperCase()}
            </div>
            <div>
              <p className="text-sm font-medium">{user?.name}</p>
              <p className="text-xs text-muted-foreground">{user?.email}</p>
            </div>
          </div>
          <Button 
            variant="outline" 
            className="w-full" 
            onClick={handleLogout}
          >
            <LogOut className="h-4 w-4 mr-2" />
            Cerrar sesión
          </Button>
        </div>
      </ScrollArea>
    </aside>
  );
}