import { useEffect, useState } from "react";
import { useLocation, useSearch } from "wouter";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useProjectContext } from "@/context/project-context";
import { EyeOff } from "lucide-react";
import { ObfuscationConfig } from "@/components/obfuscation/obfuscation-config";

export default function Obfuscation() {
  const { currentProject } = useProjectContext();
  const [_, navigate] = useLocation();
  const search = useSearch();
  
  // Parse query params for pre-selected table/column
  const params = new URLSearchParams(search);
  const preSelectedTable = params.get("table");
  const preSelectedColumn = params.get("column");

  useEffect(() => {
    // If no project is selected or project has no analysis, redirect to analysis page
    if (!currentProject) {
      navigate("/conexion");
    } else if (!currentProject.schema) {
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
                Ofuscación
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Configure métodos de ofuscación para campos que contienen información sensible
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
                <EyeOff className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay datos para configurar
                </h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Para configurar la ofuscación, primero necesita analizar la sensibilidad de los datos.
                </p>
                <Button onClick={() => navigate("/analisis")}>
                  Ir a análisis de sensibilidad
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ObfuscationConfig 
              preSelectedTable={preSelectedTable} 
              preSelectedColumn={preSelectedColumn} 
            />
          )}
        </div>
      </div>
    </div>
  );
}
