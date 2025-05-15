import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogHeader, 
  DialogTitle, 
  DialogTrigger,
  DialogFooter
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { useProjectContext } from "@/context/project-context";
import { useLocation } from "wouter";
import { EyeOff, Save, Search, Settings, Loader2 } from "lucide-react";
import { ObfuscationConfig as ObfuscationConfigType, SensitiveFieldData } from "@shared/schema";
import { SensitiveField } from "@/lib/types";

interface ObfuscationConfigProps {
  preSelectedTable?: string | null;
  preSelectedColumn?: string | null;
}

export function ObfuscationConfig({ preSelectedTable, preSelectedColumn }: ObfuscationConfigProps) {
  const { currentProject, updateProject } = useProjectContext();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [sensitiveFields, setSensitiveFields] = useState<SensitiveField[]>([]);
  const [obfuscationConfig, setObfuscationConfig] = useState<ObfuscationConfigType>({});
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  const [selectedColumn, setSelectedColumn] = useState<string | null>(null);
  const [settingsDialogOpen, setSettingsDialogOpen] = useState(false);
  const [methodParams, setMethodParams] = useState<Record<string, any>>({});
  const [filter, setFilter] = useState("");
  const [activeTab, setActiveTab] = useState("all");

  useEffect(() => {
    if (currentProject?.id) {
      loadSensitiveFields();
      loadObfuscationConfig();
    }
  }, [currentProject?.id]);

  useEffect(() => {
    // Set pre-selected table and column if provided
    if (preSelectedTable) {
      setSelectedTable(preSelectedTable);
      if (preSelectedColumn) {
        setSelectedColumn(preSelectedColumn);
      }
    }
  }, [preSelectedTable, preSelectedColumn]);

  const loadSensitiveFields = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/projects/${currentProject.id}/analysis/fields`);
      const data = await res.json();
      setSensitiveFields(data);
    } catch (error) {
      toast({
        title: "Error al cargar campos sensibles",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const loadObfuscationConfig = async () => {
    if (!currentProject) return;
    
    try {
      const res = await apiRequest("GET", `/api/projects/${currentProject.id}/obfuscation`);
      const data = await res.json();
      setObfuscationConfig(data || {});
    } catch (error) {
      // If obfuscation config doesn't exist yet, create an empty one
      if (error instanceof Error && error.message.includes("404")) {
        setObfuscationConfig({});
      } else {
        toast({
          title: "Error al cargar configuración de ofuscación",
          description: error instanceof Error ? error.message : "Error desconocido",
          variant: "destructive",
        });
      }
    }
  };

  const saveObfuscationConfig = async () => {
    if (!currentProject) return;
    
    setIsSaving(true);
    try {
      const res = await apiRequest(
        "POST", 
        `/api/projects/${currentProject.id}/obfuscation`, 
        obfuscationConfig
      );
      
      if (res.ok) {
        // Update project with obfuscation config
        await updateProject(currentProject.id, { 
          obfuscationConfig,
          state: currentProject.state === "analysis" ? "obfuscation" : currentProject.state
        });
        
        toast({
          title: "Configuración guardada",
          description: "La configuración de ofuscación ha sido guardada exitosamente"
        });
      }
    } catch (error) {
      toast({
        title: "Error al guardar configuración",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const openSettingsDialog = (table: string, column: string) => {
    setSelectedTable(table);
    setSelectedColumn(column);
    
    // Initialize method params from current config if it exists
    if (obfuscationConfig[table]?.[column]) {
      const currentConfig = obfuscationConfig[table][column];
      setMethodParams(currentConfig.parameters || {});
    } else {
      setMethodParams({});
    }
    
    setSettingsDialogOpen(true);
  };

  const handleMethodChange = (method: string) => {
    if (!selectedTable || !selectedColumn) return;
    
    // Update obfuscation config
    const newConfig = { ...obfuscationConfig };
    
    if (!newConfig[selectedTable]) {
      newConfig[selectedTable] = {};
    }
    
    newConfig[selectedTable][selectedColumn] = {
      method: method as 'hash' | 'mask' | 'random' | 'shuffle' | 'none',
      parameters: {}
    };
    
    setObfuscationConfig(newConfig);
    setMethodParams({});
  };

  const saveMethodSettings = () => {
    if (!selectedTable || !selectedColumn) return;
    
    // Update obfuscation config with parameters
    const newConfig = { ...obfuscationConfig };
    
    if (!newConfig[selectedTable]) {
      newConfig[selectedTable] = {};
    }
    
    if (!newConfig[selectedTable][selectedColumn]) {
      // This shouldn't happen, but just in case
      newConfig[selectedTable][selectedColumn] = {
        method: "none",
        parameters: {}
      };
    }
    
    newConfig[selectedTable][selectedColumn].parameters = methodParams;
    
    setObfuscationConfig(newConfig);
    setSettingsDialogOpen(false);
  };

  // Get method parameters based on method type
  const getMethodParamsForm = () => {
    if (!selectedTable || !selectedColumn) return null;
    
    const currentMethod = obfuscationConfig[selectedTable]?.[selectedColumn]?.method || "none";
    
    switch (currentMethod) {
      case "mask":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="keepStart">Caracteres a mantener al inicio</Label>
              <Input
                id="keepStart"
                type="number"
                min="0"
                value={methodParams.keepStart || "2"}
                onChange={(e) => setMethodParams({ ...methodParams, keepStart: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="keepEnd">Caracteres a mantener al final</Label>
              <Input
                id="keepEnd"
                type="number"
                min="0"
                value={methodParams.keepEnd || "2"}
                onChange={(e) => setMethodParams({ ...methodParams, keepEnd: parseInt(e.target.value) })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="maskChar">Carácter de enmascaramiento</Label>
              <Input
                id="maskChar"
                maxLength={1}
                value={methodParams.maskChar || "*"}
                onChange={(e) => setMethodParams({ ...methodParams, maskChar: e.target.value.charAt(0) || "*" })}
              />
            </div>
          </div>
        );
      case "random":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="preserveFormat">Preservar formato</Label>
              <Select
                value={methodParams.preserveFormat ? "true" : "false"}
                onValueChange={(value) => setMethodParams({ ...methodParams, preserveFormat: value === "true" })}
              >
                <SelectTrigger id="preserveFormat">
                  <SelectValue placeholder="Seleccione una opción" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="true">Sí</SelectItem>
                  <SelectItem value="false">No</SelectItem>
                </SelectContent>
              </Select>
              <p className="text-sm text-muted-foreground">
                Mantiene el mismo tipo de caracteres (letras, números, símbolos) en las mismas posiciones
              </p>
            </div>
          </div>
        );
      case "shuffle":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              El método de barajado reordena los caracteres del valor original.
              No requiere configuración adicional.
            </p>
          </div>
        );
      case "hash":
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="algorithm">Algoritmo de hash</Label>
              <Select
                value={methodParams.algorithm || "md5"}
                onValueChange={(value) => setMethodParams({ ...methodParams, algorithm: value })}
              >
                <SelectTrigger id="algorithm">
                  <SelectValue placeholder="Seleccione un algoritmo" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="md5">MD5</SelectItem>
                  <SelectItem value="sha1">SHA-1</SelectItem>
                  <SelectItem value="sha256">SHA-256</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        );
      case "none":
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              No se aplicará ofuscación a este campo. Los datos se mantendrán sin cambios.
            </p>
          </div>
        );
      default:
        return null;
    }
  };

  // Filter fields based on active tab and search input
  const getFilteredFields = () => {
    return sensitiveFields
      .filter(field => {
        const searchMatch = 
          field.table.toLowerCase().includes(filter.toLowerCase()) || 
          field.column.toLowerCase().includes(filter.toLowerCase());
        
        switch (activeTab) {
          case "critical":
            return searchMatch && field.score >= 90;
          case "moderate":
            return searchMatch && field.score >= 70 && field.score < 90;
          case "low":
            return searchMatch && field.score >= 50 && field.score < 70;
          case "safe":
            return searchMatch && field.score < 50;
          default:
            return searchMatch;
        }
      })
      .sort((a, b) => b.score - a.score);
  };

  const getSensitivityColor = (score: number) => {
    if (score >= 90) return "bg-red-600";
    if (score >= 70) return "bg-yellow-500";
    if (score >= 50) return "bg-blue-500";
    return "bg-green-500";
  };

  const getMethodBadgeStyle = (method: string) => {
    switch (method) {
      case "hash":
        return "bg-red-100 text-red-800";
      case "mask":
        return "bg-yellow-100 text-yellow-800";
      case "random":
        return "bg-blue-100 text-blue-800";
      case "shuffle":
        return "bg-indigo-100 text-indigo-800";
      case "none":
        return "bg-gray-100 text-gray-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const getMethodLabel = (method: string) => {
    switch (method) {
      case "hash":
        return "Hash";
      case "mask":
        return "Enmascaramiento";
      case "random":
        return "Aleatorización";
      case "shuffle":
        return "Barajado";
      case "none":
        return "Ninguno";
      default:
        return method;
    }
  };

  return (
    <>
      <Card>
        <CardHeader className="border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Configuración de ofuscación de datos</CardTitle>
              {currentProject && (
                <p className="mt-1 text-sm text-gray-500">
                  {currentProject.dbSourceType} - {currentProject.dbSourceName}
                </p>
              )}
            </div>
            <Button 
              onClick={saveObfuscationConfig} 
              disabled={isSaving || isLoading}
            >
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Guardando...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Guardar configuración
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent className="p-6">
          {isLoading ? (
            <div className="space-y-6">
              <Skeleton className="h-10 w-full" />
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-16 w-full" />
                ))}
              </div>
            </div>
          ) : sensitiveFields.length === 0 ? (
            <div className="text-center py-8">
              <EyeOff className="mx-auto h-12 w-12 text-gray-400" />
              <h3 className="mt-2 text-sm font-medium text-gray-900">No hay campos sensibles</h3>
              <p className="mt-1 text-sm text-gray-500">
                No se han detectado campos que requieran ofuscación. Ejecute un análisis de sensibilidad primero.
              </p>
              <div className="mt-6">
                <Button onClick={() => navigate("/analisis")}>
                  Ir a análisis de sensibilidad
                </Button>
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <div className="relative max-w-sm">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                    <Input
                      type="text"
                      placeholder="Buscar tablas o columnas..."
                      className="pl-9"
                      value={filter}
                      onChange={(e) => setFilter(e.target.value)}
                    />
                  </div>
                </div>

                <Tabs defaultValue="all" value={activeTab} onValueChange={setActiveTab}>
                  <TabsList className="mb-4">
                    <TabsTrigger value="all">Todos</TabsTrigger>
                    <TabsTrigger value="critical">Críticos</TabsTrigger>
                    <TabsTrigger value="moderate">Moderados</TabsTrigger>
                    <TabsTrigger value="low">Bajos</TabsTrigger>
                    <TabsTrigger value="safe">Seguros</TabsTrigger>
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
                            <TableHead>Método</TableHead>
                            <TableHead className="text-right">Configurar</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {getFilteredFields().map((field, index) => {
                            const currentMethod = obfuscationConfig[field.table]?.[field.column]?.method || "none";
                            
                            return (
                              <TableRow key={`${field.table}-${field.column}-${index}`}>
                                <TableCell className="font-medium">{field.table}</TableCell>
                                <TableCell>{field.column}</TableCell>
                                <TableCell>{field.dataType}</TableCell>
                                <TableCell>
                                  <div className="flex items-center">
                                    <div className="w-16 bg-gray-200 rounded-full h-2.5">
                                      <div 
                                        className={`${getSensitivityColor(field.score)} h-2.5 rounded-full`} 
                                        style={{ width: `${field.score}%` }}
                                      ></div>
                                    </div>
                                    <span className="ml-2 text-sm font-medium text-gray-700">{field.score}</span>
                                  </div>
                                </TableCell>
                                <TableCell>
                                  <Select
                                    value={currentMethod}
                                    onValueChange={(value) => {
                                      // Update obfuscation config
                                      const newConfig = { ...obfuscationConfig };
                                      
                                      if (!newConfig[field.table]) {
                                        newConfig[field.table] = {};
                                      }
                                      
                                      newConfig[field.table][field.column] = {
                                        method: value as any,
                                        parameters: {}
                                      };
                                      
                                      setObfuscationConfig(newConfig);
                                    }}
                                  >
                                    <SelectTrigger className="w-[180px]">
                                      <SelectValue>
                                        <Badge 
                                          variant="outline" 
                                          className={getMethodBadgeStyle(currentMethod)}
                                        >
                                          {getMethodLabel(currentMethod)}
                                        </Badge>
                                      </SelectValue>
                                    </SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="hash">Hash</SelectItem>
                                      <SelectItem value="mask">Enmascaramiento</SelectItem>
                                      <SelectItem value="random">Aleatorización</SelectItem>
                                      <SelectItem value="shuffle">Barajado</SelectItem>
                                      <SelectItem value="none">Ninguno</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </TableCell>
                                <TableCell className="text-right">
                                  <Button 
                                    variant="ghost" 
                                    size="sm"
                                    onClick={() => openSettingsDialog(field.table, field.column)}
                                    disabled={currentMethod === "none"}
                                  >
                                    <Settings className="h-4 w-4" />
                                  </Button>
                                </TableCell>
                              </TableRow>
                            );
                          })}
                          
                          {getFilteredFields().length === 0 && (
                            <TableRow>
                              <TableCell colSpan={6} className="text-center py-6 text-gray-500">
                                No se encontraron campos que coincidan con los criterios de búsqueda
                              </TableCell>
                            </TableRow>
                          )}
                        </TableBody>
                      </Table>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
              
              <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mt-8">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <EyeOff className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">Métodos de ofuscación disponibles</h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ul className="list-disc pl-5 space-y-1">
                        <li><strong>Hash:</strong> Genera un hash irreversible del valor original</li>
                        <li><strong>Enmascaramiento:</strong> Conserva caracteres iniciales y finales, reemplazando el resto con asteriscos</li>
                        <li><strong>Aleatorización:</strong> Genera valores aleatorios del mismo tipo de datos</li>
                        <li><strong>Barajado:</strong> Mezcla los caracteres del valor original</li>
                        <li><strong>Ninguno:</strong> Mantiene el valor original sin modificaciones</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Method Settings Dialog */}
      <Dialog open={settingsDialogOpen} onOpenChange={setSettingsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configuración de método de ofuscación</DialogTitle>
            <DialogDescription>
              {selectedTable && selectedColumn && (
                <span>
                  Configurar método para {selectedTable}.{selectedColumn}
                </span>
              )}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            {selectedTable && selectedColumn && (
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label>Método de ofuscación</Label>
                  <Select
                    value={obfuscationConfig[selectedTable]?.[selectedColumn]?.method || "none"}
                    onValueChange={handleMethodChange}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Seleccione un método" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="hash">Hash</SelectItem>
                      <SelectItem value="mask">Enmascaramiento</SelectItem>
                      <SelectItem value="random">Aleatorización</SelectItem>
                      <SelectItem value="shuffle">Barajado</SelectItem>
                      <SelectItem value="none">Ninguno</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="border-t border-gray-200 pt-4">
                  <h4 className="text-sm font-medium mb-2">Parámetros del método</h4>
                  {getMethodParamsForm()}
                </div>
              </div>
            )}
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setSettingsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={saveMethodSettings}>
              Guardar configuración
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
