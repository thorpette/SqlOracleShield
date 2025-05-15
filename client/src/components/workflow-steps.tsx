import { useLocation } from "wouter";
import { 
  Database, 
  Table, 
  Search, 
  Eye, 
  Save, 
  GitMerge 
} from "lucide-react";
import { cn } from "@/lib/utils";

export type WorkflowStep = {
  name: string;
  icon: React.ReactNode;
  path: string;
  status: "completed" | "current" | "pending";
};

const defaultSteps: WorkflowStep[] = [
  {
    name: "Conexión",
    icon: <Database className="h-4 w-4" />,
    path: "/conexion",
    status: "current",
  },
  {
    name: "Esquemas",
    icon: <Table className="h-4 w-4" />,
    path: "/esquemas",
    status: "pending",
  },
  {
    name: "Análisis",
    icon: <Search className="h-4 w-4" />,
    path: "/analisis",
    status: "pending",
  },
  {
    name: "Ofuscación",
    icon: <Eye className="h-4 w-4" />,
    path: "/ofuscacion",
    status: "pending",
  },
  {
    name: "Respaldo",
    icon: <Save className="h-4 w-4" />,
    path: "/respaldo",
    status: "pending",
  },
  {
    name: "Migración",
    icon: <GitMerge className="h-4 w-4" />,
    path: "/migracion",
    status: "pending",
  },
];

interface WorkflowStepsProps {
  steps?: WorkflowStep[];
  currentStep?: number;
}

export function WorkflowSteps({ steps = defaultSteps, currentStep }: WorkflowStepsProps) {
  const [_, navigate] = useLocation();

  // If currentStep is provided, update step statuses
  const workflowSteps = currentStep !== undefined
    ? steps.map((step, index) => ({
        ...step,
        status: 
          index < currentStep 
            ? "completed" 
            : index === currentStep 
              ? "current" 
              : "pending",
      }))
    : steps;

  return (
    <div className="bg-white shadow rounded-lg overflow-hidden">
      <div className="px-4 py-5 sm:px-6 bg-white border-b border-gray-200">
        <h3 className="text-lg leading-6 font-medium text-gray-900">
          Flujo de trabajo recomendado
        </h3>
      </div>
      <div className="px-4 py-5 sm:p-6">
        <ol className="flex flex-col md:flex-row md:items-center md:justify-between relative">
          <div className="hidden md:block absolute top-1/2 left-0 right-0 h-0.5 bg-gray-200 -translate-y-1/2 z-0"></div>
          
          {workflowSteps.map((step, index) => (
            <li 
              key={step.path} 
              className="flex flex-col items-center relative z-10 mb-4 md:mb-0"
              onClick={() => navigate(step.path)}
            >
              <div 
                className={cn(
                  "flex items-center justify-center h-10 w-10 rounded-full border-2 border-white cursor-pointer",
                  {
                    "bg-primary-100 text-primary-600": step.status === "current",
                    "bg-primary-600 text-white": step.status === "completed",
                    "bg-gray-100 text-gray-500": step.status === "pending",
                  }
                )}
              >
                {step.icon}
              </div>
              <div 
                className={cn(
                  "mt-2 text-sm font-medium text-center",
                  {
                    "text-gray-900": step.status === "current",
                    "text-primary-600": step.status === "completed",
                    "text-gray-500": step.status === "pending",
                  }
                )}
              >
                {step.name}
              </div>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
