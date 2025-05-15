import { useEffect } from "react";
import { useLocation } from "wouter";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartGantt } from "lucide-react";
import { useProjectContext } from "@/context/project-context";
import { Skeleton } from "@/components/ui/skeleton";

// Helper function to get status badge color
const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "in_progress":
    case "migration":
    case "extraction":
      return "bg-yellow-100 text-yellow-800";
    case "error":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

// Helper function to translate status to Spanish
const translateStatus = (status: string) => {
  const statusMap: Record<string, string> = {
    "created": "Creado",
    "extraction": "Extracción",
    "analysis": "Análisis",
    "obfuscation": "Ofuscación",
    "backup": "Respaldo",
    "migration": "Migración",
    "completed": "Completado",
    "error": "Error"
  };
  
  return statusMap[status] || status;
};

export function RecentProjects() {
  const { recentProjects, fetchProjects, isLoading } = useProjectContext();
  const [_, navigate] = useLocation();

  useEffect(() => {
    fetchProjects();
  }, [fetchProjects]);

  const handleOpenProject = (id: number) => {
    navigate(`/projects/${id}`);
  };

  return (
    <Card className="w-full">
      <CardHeader className="border-b border-gray-200">
        <CardTitle>Proyectos recientes</CardTitle>
      </CardHeader>
      <CardContent className="px-4 py-5">
        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => (
              <div key={i} className="flex items-center space-x-4">
                <Skeleton className="h-12 w-12 rounded-md" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-[250px]" />
                  <Skeleton className="h-4 w-[200px]" />
                </div>
              </div>
            ))}
          </div>
        ) : recentProjects.length === 0 ? (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500">No hay proyectos recientes</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nombre</TableHead>
                  <TableHead>Base de datos</TableHead>
                  <TableHead>Estado</TableHead>
                  <TableHead>Última actividad</TableHead>
                  <TableHead className="text-right">Acciones</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recentProjects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell>
                      <div className="flex items-center">
                        <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-primary-100 rounded-md">
                          <ChartGantt className="h-5 w-5 text-primary-600" />
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{project.name}</div>
                          <div className="text-sm text-gray-500">{project.description}</div>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm text-gray-900">{project.dbSourceType}</div>
                      <div className="text-sm text-gray-500">{project.dbSourceName}</div>
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={getStatusBadgeStyle(project.state)}>
                        {translateStatus(project.state)}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-gray-500">
                      {project.lastActivity}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button 
                        variant="link" 
                        className="text-primary-600 hover:text-primary-900"
                        onClick={() => handleOpenProject(project.id)}
                      >
                        Abrir
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
