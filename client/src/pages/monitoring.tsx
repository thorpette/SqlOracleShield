import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/context/project-context";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { LineChart, BarChart2, AlertCircle } from "lucide-react";
import { MigrationStatus } from "@/components/monitoring/migration-status";
import { MigrationStatus as MigrationStatusType } from "@shared/schema";

export default function Monitoring() {
  const { currentProject, updateProject } = useProjectContext();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [migrationStatus, setMigrationStatus] = useState<MigrationStatusType | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // If no project is selected, redirect to connection page
    if (!currentProject) {
      navigate("/conexion");
    } else if (currentProject.state === "migration" || currentProject.state === "completed") {
      // If migration is in progress or completed, fetch status
      fetchMigrationStatus();
      
      // Set up polling if migration is in progress
      let interval: NodeJS.Timeout | null = null;
      if (currentProject.state === "migration") {
        interval = setInterval(fetchMigrationStatus, 3000);
      }
      
      return () => {
        if (interval) clearInterval(interval);
      };
    }
  }, [currentProject, navigate]);

  const fetchMigrationStatus = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/projects/${currentProject.id}/migration/status`);
      if (res.ok) {
        const status = await res.json();
        setMigrationStatus(status);
        
        // If migration completed, update project state
        if (status.status === "completed" && currentProject.state !== "completed") {
          await updateProject(currentProject.id, { state: "completed" });
        }
      }
    } catch (error) {
      console.error("Error fetching migration status:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const startMigration = async () => {
    if (!currentProject) return;
    
    try {
      const res = await apiRequest("POST", `/api/projects/${currentProject.id}/migration/start`);
      if (res.ok) {
        const status = await res.json();
        setMigrationStatus(status);
        
        // Update project state to migration
        await updateProject(currentProject.id, { state: "migration" });
        
        toast({
          title: "Migración iniciada",
          description: "El proceso de migración ha comenzado correctamente"
        });
      }
    } catch (error) {
      toast({
        title: "Error al iniciar migración",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    }
  };

  const cancelMigration = async () => {
    if (!currentProject) return;
    
    try {
      const res = await apiRequest("POST", `/api/projects/${currentProject.id}/migration/cancel`);
      if (res.ok) {
        const status = await res.json();
        setMigrationStatus(status);
        
        toast({
          title: "Migración cancelada",
          description: "El proceso de migración ha sido cancelado"
        });
      }
    } catch (error) {
      toast({
        title: "Error al cancelar migración",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    }
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <div className="sm:flex sm:justify-between sm:items-baseline">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                Monitoreo
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Visualización en tiempo real del progreso de la migración
              </p>
            </div>
            {currentProject && (
              <div className="mt-4 sm:mt-0">
                <div className="flex space-x-3">
                  <span className="inline-flex items-center px-3 py-0.5 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                    Proyecto: <span className="font-bold ml-1">{currentProject.name}</span>
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>

        <div className="mt-8">
          {!currentProject ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <BarChart2 className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay un proyecto seleccionado
                </h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Seleccione un proyecto para ver el estado de la migración.
                </p>
                <Button onClick={() => navigate("/")}>
                  Ir a la página principal
                </Button>
              </CardContent>
            </Card>
          ) : currentProject.state !== "migration" && currentProject.state !== "completed" ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <LineChart className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay una migración en curso
                </h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Para monitorear la migración, primero debe configurar e iniciar el proceso de migración.
                </p>
                <Button onClick={() => navigate("/migracion")}>
                  Ir a configuración de migración
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Estado de la migración</CardTitle>
                    <div className="space-x-2">
                      {currentProject.state === "migration" && (
                        <Button variant="destructive" onClick={cancelMigration}>
                          Cancelar migración
                        </Button>
                      )}
                      {currentProject.mongodbUrl && currentProject.state !== "migration" && (
                        <Button onClick={startMigration}>
                          Iniciar migración
                        </Button>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <MigrationStatus 
                    status={migrationStatus} 
                    isLoading={isLoading} 
                  />
                </CardContent>
              </Card>

              {/* Error log section */}
              {migrationStatus?.errors && migrationStatus.errors.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-red-600">
                      <AlertCircle className="mr-2 h-5 w-5" />
                      Errores de migración
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-4">
                      {migrationStatus.errors.map((error, index) => (
                        <div key={index} className="bg-red-50 border border-red-200 rounded-md p-4">
                          <div className="flex">
                            <div className="ml-3">
                              <h3 className="text-sm font-medium text-red-800">
                                Error en tabla: {error.table}
                              </h3>
                              <div className="mt-2 text-sm text-red-700">
                                <p>{error.message}</p>
                              </div>
                              <div className="mt-1 text-xs text-red-500">
                                {new Date(error.timestamp).toLocaleString()}
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
