import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useAuth } from "@/hooks/use-auth";
import { Project } from "@shared/schema";
import { ProjectForm } from "@/components/admin/project-form";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Edit, Trash, Plus, Loader2, Database } from "lucide-react";

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

// Helper function to get status badge color
const getStatusBadgeStyle = (status: string) => {
  switch (status) {
    case "completed":
      return "bg-green-100 text-green-800";
    case "migration":
    case "backup":
    case "extraction":
    case "analysis":
    case "obfuscation":
      return "bg-yellow-100 text-yellow-800";
    case "error":
      return "bg-red-100 text-red-800";
    default:
      return "bg-gray-100 text-gray-800";
  }
};

export default function AdminProjects() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProject, setSelectedProject] = useState<Project | null>(null);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deleteProjectId, setDeleteProjectId] = useState<number | null>(null);

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== "admin") {
      navigate("/");
    } else {
      fetchProjects();
    }
  }, [user, navigate]);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", "/api/projects");
      const data = await res.json();
      setProjects(data);
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

  const handleEdit = (project: Project) => {
    setSelectedProject(project);
    setEditDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedProject(null);
    setCreateDialogOpen(true);
  };

  const handleDelete = (projectId: number) => {
    setDeleteProjectId(projectId);
    setDeleteDialogOpen(true);
  };

  const confirmDelete = async () => {
    if (!deleteProjectId) return;
    
    try {
      const res = await apiRequest("DELETE", `/api/projects/${deleteProjectId}`);
      if (res.ok) {
        toast({
          title: "Proyecto eliminado",
          description: "El proyecto ha sido eliminado exitosamente",
        });
        fetchProjects();
      }
    } catch (error) {
      toast({
        title: "Error al eliminar proyecto",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setDeleteProjectId(null);
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <div className="sm:flex sm:justify-between sm:items-baseline">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                Gestión de Proyectos
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Administre los proyectos de migración
              </p>
            </div>
            <div className="mt-4 sm:mt-0">
              <Button onClick={handleCreate}>
                <Plus className="mr-2 h-4 w-4" />
                Nuevo proyecto
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <Card>
            <CardHeader>
              <CardTitle>Proyectos del sistema</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center items-center py-8">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Proyecto</TableHead>
                      <TableHead>Código</TableHead>
                      <TableHead>Base de datos</TableHead>
                      <TableHead>Estado</TableHead>
                      <TableHead className="text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {projects.map((project) => (
                      <TableRow key={project.id}>
                        <TableCell>
                          <div className="flex items-center">
                            <div className="h-10 w-10 flex-shrink-0 flex items-center justify-center bg-primary-100 rounded-md">
                              <Database className="h-5 w-5 text-primary-600" />
                            </div>
                            <div className="ml-4">
                              <div className="font-medium">{project.name}</div>
                              <div className="text-sm text-gray-500">{project.description}</div>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>{project.code}</TableCell>
                        <TableCell>
                          {project.dbSourceType ? (
                            <>
                              <div>{project.dbSourceType}</div>
                              <div className="text-sm text-gray-500">{project.dbSourceName}</div>
                            </>
                          ) : (
                            <span className="text-gray-500">No configurada</span>
                          )}
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={getStatusBadgeStyle(project.state)}
                          >
                            {translateStatus(project.state)}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end space-x-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleEdit(project)}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(project.id)}
                            >
                              <Trash className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    
                    {projects.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="text-center py-6 text-gray-500">
                          No hay proyectos disponibles
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Edit Project Dialog */}
      <Dialog open={editDialogOpen} onOpenChange={setEditDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Editar proyecto</DialogTitle>
            <DialogDescription>
              Modifique la información del proyecto
            </DialogDescription>
          </DialogHeader>
          <ProjectForm 
            project={selectedProject} 
            onSuccess={() => {
              setEditDialogOpen(false);
              fetchProjects();
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear nuevo proyecto</DialogTitle>
            <DialogDescription>
              Ingrese la información del nuevo proyecto
            </DialogDescription>
          </DialogHeader>
          <ProjectForm 
            onSuccess={() => {
              setCreateDialogOpen(false);
              fetchProjects();
            }} 
          />
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>¿Está seguro?</AlertDialogTitle>
            <AlertDialogDescription>
              Esta acción no se puede deshacer. El proyecto será eliminado permanentemente del sistema 
              junto con todos sus datos, esquemas y configuraciones.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} className="bg-red-600 hover:bg-red-700">
              Eliminar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
