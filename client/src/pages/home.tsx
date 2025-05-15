import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Database, Table, Search, EyeOff, Save, GitMerge } from "lucide-react";
import { WorkflowSteps } from "@/components/workflow-steps";
import { RecentProjects } from "@/components/recent-projects";
import { useProjectContext } from "@/context/project-context";
import { useLocation } from "wouter";

export default function Home() {
  const { currentProject } = useProjectContext();
  const [_, navigate] = useLocation();

  const getSummaryCards = () => {
    const cards = [
      {
        title: "Conexión",
        icon: <Database className="h-6 w-6" />,
        status: currentProject?.dbSourceType ? "Conectado a " + currentProject.dbSourceType : "No conectado",
        action: "Configurar conexión",
        path: "/conexion",
        disabled: false,
        color: currentProject?.dbSourceType ? "primary" : "gray",
      },
      {
        title: "Esquemas",
        icon: <Table className="h-6 w-6" />,
        status: currentProject?.schema ? `${Object.keys(currentProject.schema.tables).length} tablas` : "0 tablas",
        action: "Extraer esquema",
        path: "/esquemas",
        disabled: !currentProject?.dbSourceType,
        color: currentProject?.schema ? "primary" : "gray",
      },
      {
        title: "Análisis",
        icon: <Search className="h-6 w-6" />,
        status: "Pendiente",
        action: "Analizar datos",
        path: "/analisis",
        disabled: !currentProject?.schema,
        color: "gray",
      },
    ];

    return cards;
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <div className="sm:flex sm:justify-between sm:items-baseline">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                Inicio
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Herramienta para migrar bases de datos SQL a MongoDB con capacidades de ofuscación
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
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2 xl:grid-cols-3">
            {/* Workflow Card - Full width */}
            <div className="col-span-1 lg:col-span-2 xl:col-span-3">
              <WorkflowSteps />
            </div>

            {/* Status Cards */}
            {getSummaryCards().map((card, index) => (
              <Card key={index} className="overflow-hidden">
                <CardContent className="p-0">
                  <div className="p-5">
                    <div className="flex items-center">
                      <div className={`flex-shrink-0 rounded-md p-3 bg-${card.color}-100 text-${card.color}-600`}>
                        {card.icon}
                      </div>
                      <div className="ml-5 w-0 flex-1">
                        <dl>
                          <dt className="text-sm font-medium text-gray-500 truncate">
                            {card.title}
                          </dt>
                          <dd>
                            <div className="text-lg font-medium text-gray-900">
                              {card.status}
                            </div>
                          </dd>
                        </dl>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 px-5 py-3">
                    <div className="text-sm">
                      <Button
                        variant="link"
                        className={card.disabled ? "text-gray-500 cursor-not-allowed" : "text-primary-600 hover:text-primary-800"}
                        disabled={card.disabled}
                        onClick={() => navigate(card.path)}
                      >
                        {card.action}
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}

            {/* Recent Projects - Full width */}
            <div className="col-span-1 lg:col-span-2 xl:col-span-3">
              <RecentProjects />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
