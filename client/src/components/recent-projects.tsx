import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/context/project-context";
import { Project } from "@shared/schema";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";
import { Check } from "lucide-react";

export function RecentProjects() {
  const [_, navigate] = useLocation();
  const { recentProjects, currentProject, setCurrentProject, isLoading } = useProjectContext();
  const [displayProjects, setDisplayProjects] = useState<Project[]>([]);

  useEffect(() => {
    if (recentProjects.length > 0) {
      // Mostrar hasta 5 proyectos recientes
      setDisplayProjects(recentProjects.slice(0, 5));
    }
  }, [recentProjects]);

  const handleSelectProject = (project: Project) => {
    setCurrentProject(project);
  };

  const formatDate = (date: Date) => {
    return formatDistanceToNow(new Date(date), {
      addSuffix: true,
      locale: es,
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Proyectos recientes</CardTitle>
        <Button variant="outline" size="sm" onClick={() => navigate("/admin/proyectos")}>
          Ver todos
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-6 text-center">
            <div className="inline-block h-8 w-8 animate-spin rounded-full border-4 border-solid border-current border-r-transparent align-[-0.125em] motion-reduce:animate-[spin_1.5s_linear_infinite]"></div>
            <p className="mt-2 text-sm text-gray-500">Cargando proyectos...</p>
          </div>
        ) : displayProjects.length > 0 ? (
          <div className="space-y-4">
            {displayProjects.map((project) => (
              <div 
                key={project.id} 
                className={`flex items-center justify-between p-3 rounded-lg border ${
                  currentProject?.id === project.id 
                    ? 'bg-blue-50 border-blue-200' 
                    : 'bg-white hover:bg-gray-50 border-gray-200'
                } cursor-pointer`}
                onClick={() => handleSelectProject(project)}
              >
                <div className="flex-1">
                  <div className="flex items-center">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900 truncate">
                        {project.name}
                      </p>
                      <p className="mt-1 text-xs text-gray-500">
                        Actualizado {formatDate(project.createdAt)}
                      </p>
                    </div>
                    <div className="ml-4 flex-shrink-0">
                      {currentProject?.id === project.id && (
                        <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
                          <Check className="mr-1 h-3 w-3" />
                          Seleccionado
                        </span>
                      )}
                    </div>
                  </div>
                  <div className="mt-2 text-xs">
                    <div className="flex gap-2 text-gray-500">
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {project.dbSourceType || "Sin conexión"}
                      </span>
                      <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                        {project.schema ? `${Object.keys(project.schema.tables).length} tablas` : "0 tablas"}
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-10 bg-gray-50 rounded-lg">
            <p className="text-gray-500 mb-4">No hay proyectos recientes</p>
            <Button onClick={() => navigate("/admin/proyectos")}>
              Crear nuevo proyecto
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
}