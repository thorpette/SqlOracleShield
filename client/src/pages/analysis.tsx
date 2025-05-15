import { useEffect } from "react";
import { SensitivityAnalysis } from "@/components/analysis/sensitivity-analysis";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectContext } from "@/context/project-context";
import { useLocation } from "wouter";
import { Search } from "lucide-react";

export default function Analysis() {
  const { currentProject } = useProjectContext();
  const [_, navigate] = useLocation();

  useEffect(() => {
    // If no project is selected or project has no schema, redirect to schemas page
    if (!currentProject || !currentProject.schema) {
      navigate("/esquemas");
    }
  }, [currentProject, navigate]);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <div className="sm:flex sm:justify-between sm:items-baseline">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                Análisis
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Analice la sensibilidad de los datos para identificar información que requiere ofuscación
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
          {!currentProject || !currentProject.schema ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Search className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay un esquema disponible
                </h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Para ejecutar un análisis de sensibilidad, primero necesita extraer el esquema de la base de datos.
                </p>
                <Button onClick={() => navigate("/esquemas")}>
                  Ir a extracción de esquema
                </Button>
              </CardContent>
            </Card>
          ) : (
            <SensitivityAnalysis />
          )}
        </div>
      </div>
    </div>
  );
}
