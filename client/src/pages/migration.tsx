import { useEffect } from "react";
import { useLocation } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/context/project-context";
import { GitMerge } from "lucide-react";
import { MigrationConfig } from "@/components/migration/migration-config";

export default function Migration() {
  const { currentProject } = useProjectContext();
  const [_, navigate] = useLocation();

  useEffect(() => {
    // If no project is selected or project has no backup, redirect to backup page
    if (!currentProject) {
      navigate("/conexion");
    } else if (!currentProject.schema) {
      navigate("/esquemas");
    } else if (!currentProject.backupKey) {
      navigate("/respaldo");
    }
  }, [currentProject, navigate]);

  const hasBackup = currentProject && currentProject.backupKey;

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <div className="sm:flex sm:justify-between sm:items-baseline">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                Migración
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Configure el proceso de migración de datos SQL a MongoDB
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
          {!hasBackup ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <GitMerge className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay un respaldo disponible
                </h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Para configurar la migración, primero necesita crear un respaldo encriptado de los datos.
                </p>
                <Button onClick={() => navigate("/respaldo")}>
                  Ir a creación de respaldo
                </Button>
              </CardContent>
            </Card>
          ) : (
            <MigrationConfig />
          )}
        </div>
      </div>
    </div>
  );
}
