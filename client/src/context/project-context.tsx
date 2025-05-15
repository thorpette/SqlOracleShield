import React, { createContext, useState, useContext, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';
import { Project } from '@shared/schema';
import { apiRequest } from '@/lib/queryClient';

// Tipo para el resumen de proyectos (vista previa)
export interface ProjectSummary {
  id: number;
  name: string;
  description: string | null;
  createdAt: Date;
}

interface ProjectContextType {
  currentProject: Project | null;
  recentProjects: ProjectSummary[];
  isLoading: boolean;
  setCurrentProject: (project: Project | null) => void;
  fetchProjects: () => Promise<void>;
  fetchProject: (id: number) => Promise<Project | null>;
  createProject: (project: Partial<Project>) => Promise<Project | null>;
  updateProject: (id: number, data: Partial<Project>) => Promise<Project | null>;
  deleteProject: (id: number) => Promise<boolean>;
}

const defaultProjectContext: ProjectContextType = {
  currentProject: null,
  recentProjects: [],
  isLoading: false,
  setCurrentProject: () => {},
  fetchProjects: async () => {},
  fetchProject: async () => null,
  createProject: async () => null,
  updateProject: async () => null,
  deleteProject: async () => false,
};

const ProjectContext = createContext<ProjectContextType>(defaultProjectContext);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Obtener lista de proyectos
  const fetchProjects = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/projects');
      
      if (!response.ok) {
        throw new Error('Error al obtener proyectos');
      }
      
      const data = await response.json();
      setRecentProjects(data);
      return data;
    } catch (error: any) {
      console.error('Error fetching projects:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudieron cargar los proyectos',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Obtener un proyecto específico
  const fetchProject = useCallback(async (id: number): Promise<Project | null> => {
    setIsLoading(true);
    try {
      const response = await apiRequest(`/api/projects/${id}`);
      
      if (!response.ok) {
        throw new Error('Error al obtener el proyecto');
      }
      
      const data = await response.json();
      return data;
    } catch (error: any) {
      console.error(`Error fetching project ${id}:`, error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo cargar el proyecto',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [toast]);

  // Crear un nuevo proyecto
  const createProject = useCallback(async (projectData: Partial<Project>): Promise<Project | null> => {
    setIsLoading(true);
    try {
      const response = await apiRequest('/api/projects', {
        method: 'POST',
        body: JSON.stringify(projectData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al crear el proyecto');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Proyecto creado',
        description: `${data.name} ha sido creado exitosamente`,
      });
      
      // Actualizar la lista de proyectos recientes
      await fetchProjects();
      
      return data;
    } catch (error: any) {
      console.error('Error creating project:', error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo crear el proyecto',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [fetchProjects, toast]);

  // Actualizar un proyecto existente
  const updateProject = useCallback(async (id: number, projectData: Partial<Project>): Promise<Project | null> => {
    setIsLoading(true);
    try {
      const response = await apiRequest(`/api/projects/${id}`, {
        method: 'PATCH',
        body: JSON.stringify(projectData),
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al actualizar el proyecto');
      }
      
      const data = await response.json();
      
      toast({
        title: 'Proyecto actualizado',
        description: `${data.name} ha sido actualizado exitosamente`,
      });
      
      // Si el proyecto actual es el que se está actualizando, actualizar el estado
      if (currentProject && currentProject.id === id) {
        setCurrentProject(data);
      }
      
      // Actualizar la lista de proyectos recientes
      await fetchProjects();
      
      return data;
    } catch (error: any) {
      console.error(`Error updating project ${id}:`, error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo actualizar el proyecto',
        variant: 'destructive',
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, fetchProjects, toast]);

  // Eliminar un proyecto
  const deleteProject = useCallback(async (id: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      const response = await apiRequest(`/api/projects/${id}`, {
        method: 'DELETE',
      });
      
      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Error al eliminar el proyecto');
      }
      
      toast({
        title: 'Proyecto eliminado',
        description: 'El proyecto ha sido eliminado exitosamente',
      });
      
      // Si el proyecto actual es el que se está eliminando, resetear el estado
      if (currentProject && currentProject.id === id) {
        setCurrentProject(null);
      }
      
      // Actualizar la lista de proyectos recientes
      await fetchProjects();
      
      return true;
    } catch (error: any) {
      console.error(`Error deleting project ${id}:`, error);
      toast({
        title: 'Error',
        description: error.message || 'No se pudo eliminar el proyecto',
        variant: 'destructive',
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  }, [currentProject, fetchProjects, toast]);

  const value = {
    currentProject,
    recentProjects,
    isLoading,
    setCurrentProject,
    fetchProjects,
    fetchProject,
    createProject,
    updateProject,
    deleteProject,
  };

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error('useProjectContext debe usarse dentro de un ProjectProvider');
  }
  return context;
}