import { useState, useEffect } from "react";
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
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, Settings } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useProjectContext } from "@/context/project-context";
import { SensitiveField, AnalysisResult } from "@/lib/types";

export function SensitivityAnalysis() {
  const { currentProject, updateProject } = useProjectContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisResult, setAnalysisResult] = useState<AnalysisResult | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  useEffect(() => {
    if (currentProject?.id) {
      loadAnalysisResult();
    }
  }, [currentProject?.id]);
  
  const loadAnalysisResult = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/projects/${currentProject.id}/analysis`);
      const data = await res.json();
      setAnalysisResult(data);
    } catch (error) {
      // If analysis doesn't exist yet, don't show an error
      if (!(error instanceof Error && error.message.includes("404"))) {
        toast({
          title: "Error al cargar análisis",
          description: error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        });
      }
    } finally {
      setIsLoading(false);
    }
  };
  
  const runAnalysis = async () => {
    if (!currentProject) return;
    
    setIsAnalyzing(true);
    try {
      const res = await apiRequest("POST", `/api/projects/${currentProject.id}/analysis`);
      const data = await res.json();
      setAnalysisResult(data);
      
      // Update project status if needed
      if (currentProject.state === "extraction" || currentProject.state === "created") {
        await updateProject(currentProject.id, { state: "analysis" });
      }
      
      toast({
        title: "Análisis completado",
        description: "El análisis de sensibilidad de datos ha sido completado exitosamente",
      });
    } catch (error) {
      toast({
        title: "Error al ejecutar análisis",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsAnalyzing(false);
    }
  };
  
  // Filter fields based on active tab
  const getFilteredFields = () => {
    if (!analysisResult) return [];
    
    switch (activeTab) {
      case "critical":
        return analysisResult.fields.filter(f => f.score >= 90);
      case "moderate":
        return analysisResult.fields.filter(f => f.score >= 70 && f.score < 90);
      case "low":
        return analysisResult.fields.filter(f => f.score >= 50 && f.score < 70);
      case "safe":
        return analysisResult.fields.filter(f => f.score < 50);
      default:
        return analysisResult.fields;
    }
  };
  
  const getSensitivityColor = (score: number) => {
    if (score >= 90) return "bg-red-600";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 50) return "bg-blue-500";
    return "bg-green-500";
  };
  
  const getRecommendationBadgeStyle = (recommendation: string) => {
    switch (recommendation) {
      case "hash":
        return "bg-red-100 text-red-800";
      case "mask":
        return "bg-yellow-100 text-yellow-800";
      case "random":
        return "bg-blue-100 text-blue-800";
      case "shuffle":
        return "bg-indigo-100 text-indigo-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Análisis de sensibilidad de datos</CardTitle>
            {currentProject && (
              <p className="mt-1 text-sm text-gray-500">
                {currentProject.dbSourceType} - {currentProject.dbSourceName}
              </p>
            )}
          </div>
          <Button
            onClick={runAnalysis}
            disabled={isAnalyzing || !currentProject?.schema}
          >
            {isAnalyzing ? (
              <>
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                Analizando...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                {analysisResult ? "Reanalizar" : "Ejecutar análisis"}
              </>
            )}
          </Button>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        {isLoading ? (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {[...Array(4)].map((_, i) => (
                <Skeleton key={i} className="h-32 w-full" />
              ))}
            </div>
            <Skeleton className="h-8 w-full" />
            <div className="space-y-2">
              {[...Array(5)].map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          </div>
        ) : !analysisResult ? (
          <div className="text-center py-8">
            <div className="mx-auto h-12 w-12 text-gray-400">
              <RefreshCw className="h-full w-full" />
            </div>
            <h3 className="mt-2 text-sm font-medium text-gray-900">No hay análisis disponible</h3>
            <p className="mt-1 text-sm text-gray-500">
              Ejecute un análisis de sensibilidad para detectar campos que pueden contener información sensible.
            </p>
            <div className="mt-6">
              <Button 
                onClick={runAnalysis} 
                disabled={isAnalyzing || !currentProject?.schema}
              >
                {isAnalyzing ? "Analizando..." : "Ejecutar análisis"}
              </Button>
            </div>
          </div>
        ) : (
          <>
            {/* Summary Cards */}
            <div className="mb-6">
              <h4 className="text-lg font-medium text-gray-700 mb-2">Resumen</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                  <p className="text-sm font-medium text-red-800">Datos sensibles críticos</p>
                  <p className="mt-2 text-3xl font-bold text-red-600">{analysisResult.criticalCount}</p>
                  <p className="mt-1 text-sm text-red-700">Requieren atención inmediata</p>
                </div>
                <div className="bg-yellow-50 p-4 rounded-lg border border-yellow-200">
                  <p className="text-sm font-medium text-yellow-800">Datos moderadamente sensibles</p>
                  <p className="mt-2 text-3xl font-bold text-yellow-600">{analysisResult.moderateCount}</p>
                  <p className="mt-1 text-sm text-yellow-700">Se recomienda ofuscación</p>
                </div>
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-800">Posiblemente sensibles</p>
                  <p className="mt-2 text-3xl font-bold text-blue-600">{analysisResult.lowCount}</p>
                  <p className="mt-1 text-sm text-blue-700">Revisar manualmente</p>
                </div>
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-800">Datos no sensibles</p>
                  <p className="mt-2 text-3xl font-bold text-green-600">{analysisResult.safeCount}</p>
                  <p className="mt-1 text-sm text-green-700">No requieren ofuscación</p>
                </div>
              </div>
            </div>
            
            {/* Data Fields Table with Tabs */}
            <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
              <TabsList className="mb-4">
                <TabsTrigger value="all">Todos ({analysisResult.fields.length})</TabsTrigger>
                <TabsTrigger value="critical">Críticos ({analysisResult.criticalCount})</TabsTrigger>
                <TabsTrigger value="moderate">Moderados ({analysisResult.moderateCount})</TabsTrigger>
                <TabsTrigger value="low">Bajos ({analysisResult.lowCount})</TabsTrigger>
                <TabsTrigger value="safe">Seguros ({analysisResult.safeCount})</TabsTrigger>
              </TabsList>
              
              <TabsContent value={activeTab} className="mt-0">
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Tabla</TableHead>
                        <TableHead>Columna</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Sensibilidad</TableHead>
                        <TableHead>Recomendación</TableHead>
                        <TableHead className="text-right">Configurar</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {getFilteredFields().map((field: SensitiveField, index) => (
                        <TableRow key={`${field.table}-${field.column}-${index}`}>
                          <TableCell className="font-medium">{field.table}</TableCell>
                          <TableCell>{field.column}</TableCell>
                          <TableCell>{field.dataType}</TableCell>
                          <TableCell>
                            <div className="flex items-center">
                              <div className="w-16 bg-gray-200 rounded-full h-2.5">
                                <div className={`${getSensitivityColor(field.score)} h-2.5 rounded-full`} style={{ width: `${field.score}%` }}></div>
                              </div>
                              <span className="ml-2 text-sm font-medium text-gray-700">{field.score}</span>
                            </div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={getRecommendationBadgeStyle(field.recommendation)}>
                              {field.recommendation}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" onClick={() => {
                              // Navigate to obfuscation settings with pre-selected field
                              window.location.href = `/ofuscacion?table=${field.table}&column=${field.column}`;
                            }}>
                              <Settings className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      
                      {getFilteredFields().length === 0 && (
                        <TableRow>
                          <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                            No se encontraron campos en esta categoría
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </TabsContent>
            </Tabs>
          </>
        )}
      </CardContent>
    </Card>
  );
}
