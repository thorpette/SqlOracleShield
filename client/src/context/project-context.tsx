import { createContext, useContext, useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import type { Project } from "@shared/schema";
import type { ProjectSummary } from "@/lib/types";

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

const ProjectContext = createContext<ProjectContextType | undefined>(undefined);

export function ProjectProvider({ children }: { children: React.ReactNode }) {
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [recentProjects, setRecentProjects] = useState<ProjectSummary[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    fetchProjects();
  }, []);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", "/api/projects");
      const data = await res.json();
      setRecentProjects(data);
    } catch (error) {
      toast({
        title: "Error al cargar proyectos",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchProject = async (id: number): Promise<Project | null> => {
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/projects/${id}`);
      const data = await res.json();
      setCurrentProject(data);
      return data;
    } catch (error) {
      toast({
        title: "Error al cargar proyecto",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const createProject = async (project: Partial<Project>): Promise<Project | null> => {
    setIsLoading(true);
    try {
      const res = await apiRequest("POST", "/api/projects", project);
      const data = await res.json();
      await fetchProjects(); // Refresh project list
      toast({
        title: "Proyecto creado",
        description: `El proyecto ${data.name} ha sido creado con éxito.`,
      });
      return data;
    } catch (error) {
      toast({
        title: "Error al crear proyecto",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const updateProject = async (id: number, data: Partial<Project>): Promise<Project | null> => {
    setIsLoading(true);
    try {
      const res = await apiRequest("PATCH", `/api/projects/${id}`, data);
      const updatedProject = await res.json();
      
      // Update current project if it's the one being updated
      if (currentProject && currentProject.id === id) {
        setCurrentProject(updatedProject);
      }
      
      await fetchProjects(); // Refresh project list
      
      toast({
        title: "Proyecto actualizado",
        description: `El proyecto ${updatedProject.name} ha sido actualizado.`,
      });
      
      return updatedProject;
    } catch (error) {
      toast({
        title: "Error al actualizar proyecto",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
      return null;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteProject = async (id: number): Promise<boolean> => {
    setIsLoading(true);
    try {
      await apiRequest("DELETE", `/api/projects/${id}`);
      
      // Reset current project if it's the one being deleted
      if (currentProject && currentProject.id === id) {
        setCurrentProject(null);
      }
      
      await fetchProjects(); // Refresh project list
      
      toast({
        title: "Proyecto eliminado",
        description: "El proyecto ha sido eliminado con éxito.",
      });
      
      return true;
    } catch (error) {
      toast({
        title: "Error al eliminar proyecto",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ProjectContext.Provider
      value={{
        currentProject,
        recentProjects,
        isLoading,
        setCurrentProject,
        fetchProjects,
        fetchProject,
        createProject,
        updateProject,
        deleteProject,
      }}
    >
      {children}
    </ProjectContext.Provider>
  );
}

export function useProjectContext() {
  const context = useContext(ProjectContext);
  if (context === undefined) {
    throw new Error("useProjectContext must be used within a ProjectProvider");
  }
  return context;
}
