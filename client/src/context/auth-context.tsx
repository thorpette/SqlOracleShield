import React, { createContext, useState, useCallback, useContext, useEffect } from 'react';
import { useToast } from '@/hooks/use-toast';
import { queryClient } from '@/lib/queryClient';
import { User } from '@shared/schema';

// Tipos para el contexto
interface UserCredentials {
  email: string;
  password: string;
}

interface AuthResponse {
  user: User;
  success: boolean;
  message?: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (credentials: UserCredentials) => Promise<boolean>;
  logout: () => void;
}

// Valor predeterminado para el contexto
const defaultAuthContext: AuthContextType = {
  user: null,
  isAuthenticated: false,
  isLoading: true,
  login: async () => false,
  logout: () => {},
};

// Crear el contexto
const AuthContext = createContext<AuthContextType>(defaultAuthContext);

// Proveedor del contexto
export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Efecto para cargar el usuario actual
  useEffect(() => {
    const getCurrentUser = async () => {
      try {
        const res = await fetch('/api/auth/me');
        if (res.ok) {
          const data = await res.json();
          setUser(data);
        }
      } catch (error) {
        console.error('Error al obtener el usuario actual:', error);
      } finally {
        setIsLoading(false);
      }
    };

    getCurrentUser();
  }, []);

  // Función para iniciar sesión
  const login = async (credentials: UserCredentials): Promise<boolean> => {
    setIsLoading(true);
    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(credentials),
      });

      const data: AuthResponse = await res.json();

      if (res.ok && data.success) {
        setUser(data.user);
        queryClient.invalidateQueries({ queryKey: ['currentUser'] });
        toast({
          title: '¡Bienvenido!',
          description: `Has iniciado sesión como ${data.user.name}`,
        });
        return true;
      } else {
        toast({
          title: 'Error de inicio de sesión',
          description: data.message || 'Credenciales incorrectas',
          variant: 'destructive',
        });
        return false;
      }
    } catch (error) {
      console.error('Error en el inicio de sesión:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al intentar iniciar sesión',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  // Función para cerrar sesión
  const logout = useCallback(async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
      setUser(null);
      queryClient.clear();
      toast({
        title: 'Sesión cerrada',
        description: 'Has cerrado sesión correctamente',
      });
    } catch (error) {
      console.error('Error al cerrar sesión:', error);
      toast({
        title: 'Error',
        description: 'Ocurrió un error al intentar cerrar sesión',
        variant: 'destructive',
      });
    }
  }, [toast]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuthContext() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuthContext debe usarse dentro de un AuthProvider');
  }
  return context;
}