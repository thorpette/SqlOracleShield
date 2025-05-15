import { useQuery } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export function useAuth() {
  const { data: user, isLoading, error } = useQuery({
    queryKey: ['currentUser'],
    queryFn: async () => {
      try {
        const response = await apiRequest('/api/auth/me');
        if (!response.ok) {
          if (response.status === 401) {
            return null;
          }
          throw new Error('Error al obtener el usuario');
        }
        return await response.json();
      } catch (e) {
        return null;
      }
    }
  });

  return {
    user,
    isAuthenticated: !!user,
    isLoading,
    error
  };
}