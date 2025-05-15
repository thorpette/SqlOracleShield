import { useEffect } from "react";
import { SchemaExplorer } from "@/components/schema/schema-explorer";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectContext } from "@/context/project-context";
import { useLocation } from "wouter";
import { TableIcon } from "lucide-react";

export default function Schemas() {
  const { currentProject } = useProjectContext();
  const [_, navigate] = useLocation();

  useEffect(() => {
    // If no project is selected or project has no DB connection, redirect to connection page
    if (!currentProject || !currentProject.dbSourceType) {
      navigate("/conexion");
    }
  }, [currentProject, navigate]);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <div className="sm:flex sm:justify-between sm:items-baseline">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                Esquemas
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Explore la estructura de la base de datos y visualice los datos de muestra
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
          {!currentProject || !currentProject.dbSourceType ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <TableIcon className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay una conexión configurada
                </h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Para explorar el esquema, primero necesita configurar una conexión a la base de datos.
                </p>
                <Button onClick={() => navigate("/conexion")}>
                  Ir a configuración de conexión
                </Button>
              </CardContent>
            </Card>
          ) : (
            <SchemaExplorer />
          )}
        </div>
      </div>
    </div>
  );
}
