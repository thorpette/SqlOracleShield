import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Database,
  FileStack,
  BarChart2,
  ShieldAlert,
  HardDrive,
  ArrowLeftRight,
} from "lucide-react";

export type WorkflowStep = {
  name: string;
  icon: React.ReactNode;
  path: string;
  status: "completed" | "current" | "pending";
};

const defaultSteps: WorkflowStep[] = [
  {
    name: "Conexión",
    icon: <Database className="h-5 w-5" />,
    path: "/conexion",
    status: "current",
  },
  {
    name: "Esquemas",
    icon: <FileStack className="h-5 w-5" />,
    path: "/esquemas",
    status: "pending",
  },
  {
    name: "Análisis",
    icon: <BarChart2 className="h-5 w-5" />,
    path: "/analisis",
    status: "pending",
  },
  {
    name: "Ofuscación",
    icon: <ShieldAlert className="h-5 w-5" />,
    path: "/ofuscacion",
    status: "pending",
  },
  {
    name: "Respaldo",
    icon: <HardDrive className="h-5 w-5" />,
    path: "/respaldo",
    status: "pending",
  },
  {
    name: "Migración",
    icon: <ArrowLeftRight className="h-5 w-5" />,
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

  return (
    <Card>
      <CardHeader>
        <CardTitle>Flujo de trabajo</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="overflow-hidden">
            <nav aria-label="Progreso">
              <ol
                role="list"
                className="flex items-center justify-between gap-2 md:gap-4"
              >
                {steps.map((step, stepIdx) => (
                  <li
                    key={step.name}
                    className={cn(
                      stepIdx !== steps.length - 1 ? "flex-1" : "",
                      "relative"
                    )}
                  >
                    <div
                      className={cn(
                        "group flex w-full flex-col items-center"
                      )}
                    >
                      <span className="flex items-center">
                        <span
                          className={cn(
                            "flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full",
                            step.status === "completed"
                              ? "bg-green-100 group-hover:bg-green-200"
                              : step.status === "current"
                              ? "bg-blue-100 group-hover:bg-blue-200"
                              : "bg-gray-100 group-hover:bg-gray-200"
                          )}
                        >
                          <span
                            className={cn(
                              "h-8 w-8 flex items-center justify-center rounded-full",
                              step.status === "completed"
                                ? "text-green-600"
                                : step.status === "current"
                                ? "text-blue-600"
                                : "text-gray-500"
                            )}
                          >
                            {step.icon}
                          </span>
                        </span>
                        {stepIdx !== steps.length - 1 && (
                          <>
                            <span
                              className={cn(
                                "absolute left-[calc(50%+24px)] top-6 hidden h-0.5 w-[calc(50%-24px)] md:block",
                                step.status === "completed"
                                  ? "bg-green-600"
                                  : "bg-gray-300"
                              )}
                            />
                          </>
                        )}
                      </span>
                      <span className="mt-2 text-sm font-medium text-center">
                        {step.name}
                      </span>
                    </div>
                    
                    <div className="mt-2 flex justify-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => navigate(step.path)}
                        className={cn(
                          "text-xs",
                          step.status === "completed"
                            ? "text-green-600 hover:text-green-800"
                            : step.status === "current"
                            ? "text-blue-600 hover:text-blue-800"
                            : "text-gray-500 hover:text-gray-700"
                        )}
                      >
                        {step.status === "completed"
                          ? "Revisar"
                          : step.status === "current"
                          ? "Continuar"
                          : "Ver"}
                      </Button>
                    </div>
                  </li>
                ))}
              </ol>
            </nav>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}