import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Spinner } from "@/components/ui/spinner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { apiRequest } from "@/lib/queryClient";
import { useProjectContext } from "@/context/project-context";
import { Database, Table, ArrowRight, KeyRound, RefreshCw } from "lucide-react";
import { MigrationPlan, SchemaData } from "@shared/schema";

// Form schema for MongoDB connection
const mongoConnectionSchema = z.object({
  mongodbUri: z.string().min(1, "La URI de MongoDB es requerida").url("La URI de MongoDB debe ser una URL válida"),
  mongodbName: z.string().min(1, "El nombre de la base de datos es requerido"),
  batchSize: z.preprocess(
    (a) => parseInt(z.string().parse(a), 10),
    z.number().min(1).max(10000)
  ),
});

// Form schema for table mapping
const tableMappingSchema = z.object({
  tableName: z.string(),
  collectionName: z.string().min(1, "El nombre de la colección es requerido"),
  indices: z.array(z.string()).optional(),
  embedded: z.array(z.object({
    relatedTable: z.string(),
    relation: z.enum(["one_to_one", "one_to_many"]),
    fields: z.array(z.string())
  })).optional()
});

interface MigrationConfigProps {
  projectId: number;
  schema: SchemaData | undefined;
}

export function MigrationConfig({ projectId, schema }: MigrationConfigProps) {
  const { toast } = useToast();
  const { updateProject } = useProjectContext();
  const [isLoading, setIsLoading] = useState(false);
  const [isTestingConnection, setIsTestingConnection] = useState(false);
  const [savedConfig, setSavedConfig] = useState<MigrationPlan | null>(null);
  const [selectedTable, setSelectedTable] = useState<string>("");
  const [mappings, setMappings] = useState<Record<string, any>>({});

  // Form for MongoDB connection
  const connectionForm = useForm<z.infer<typeof mongoConnectionSchema>>({
    resolver: zodResolver(mongoConnectionSchema),
    defaultValues: {
      mongodbUri: "",
      mongodbName: "",
      batchSize: 100,
    },
  });

  // Fetch existing configuration if any
  useEffect(() => {
    const fetchConfig = async () => {
      if (!projectId) return;
      
      try {
        setIsLoading(true);
        const res = await apiRequest("GET", `/api/projects/${projectId}/migration/config`);
        
        if (res.ok) {
          const config = await res.json();
          setSavedConfig(config);
          
          // Set form values from saved config
          connectionForm.setValue("mongodbUri", config.destination.uri || "");
          connectionForm.setValue("mongodbName", config.destination.db || "");
          connectionForm.setValue("batchSize", config.batchSize || 100);
          
          if (config.mapping) {
            setMappings(config.mapping);
          }
        }
      } catch (error) {
        console.error("Error fetching migration config:", error);
      } finally {
        setIsLoading(false);
      }
    };
    
    fetchConfig();
  }, [projectId]);

  // Get table names from schema
  const tableNames = schema ? Object.keys(schema.tables) : [];
  
  // If no table is selected and we have tables, select the first one
  useEffect(() => {
    if (tableNames.length > 0 && !selectedTable) {
      setSelectedTable(tableNames[0]);
    }
  }, [tableNames, selectedTable]);

  // Get the columns for the selected table
  const tableColumns = selectedTable && schema?.tables[selectedTable]?.columns || [];
  
  // Get related tables based on schema relations
  const getRelatedTables = (tableName: string) => {
    if (!schema || !schema.relations) return [];
    
    return schema.relations
      .filter(rel => rel.sourceTable === tableName || rel.targetTable === tableName)
      .map(rel => rel.sourceTable === tableName ? rel.targetTable : rel.sourceTable);
  };
  
  const relatedTables = selectedTable ? getRelatedTables(selectedTable) : [];

  // Save connection configuration
  const onSaveConnection = async (data: z.infer<typeof mongoConnectionSchema>) => {
    if (!projectId) return;
    
    try {
      setIsLoading(true);
      
      // Create or update migration plan
      const migrationPlan: MigrationPlan = {
        destination: {
          uri: data.mongodbUri,
          db: data.mongodbName
        },
        mapping: mappings,
        batchSize: data.batchSize
      };
      
      const res = await apiRequest("POST", `/api/projects/${projectId}/migration/config`, migrationPlan);
      
      if (res.ok) {
        const config = await res.json();
        setSavedConfig(config);
        
        // Update project with MongoDB URL
        await updateProject(projectId, { 
          mongodbUrl: data.mongodbUri,
          mongodbName: data.mongodbName,
          state: "obfuscation" // Move to obfuscation state if not already
        });
        
        toast({
          title: "Configuración guardada",
          description: "La configuración de migración ha sido guardada exitosamente."
        });
      }
    } catch (error) {
      toast({
        title: "Error al guardar configuración",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Test MongoDB connection
  const testConnection = async () => {
    const { mongodbUri, mongodbName } = connectionForm.getValues();
    
    if (!mongodbUri || !mongodbName) {
      connectionForm.trigger(["mongodbUri", "mongodbName"]);
      return;
    }
    
    try {
      setIsTestingConnection(true);
      
      const res = await apiRequest("POST", "/api/settings/mongodb/test", {
        mongodbUri,
        mongodbName
      });
      
      if (res.ok) {
        toast({
          title: "Conexión exitosa",
          description: "La conexión a MongoDB fue establecida correctamente."
        });
      } else {
        const error = await res.json();
        toast({
          title: "Error de conexión",
          description: error.message || "No se pudo establecer conexión a MongoDB",
          variant: "destructive"
        });
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsTestingConnection(false);
    }
  };

  // Update table mapping
  const updateMapping = (tableName: string, changes: any) => {
    setMappings(prev => ({
      ...prev,
      [tableName]: {
        ...(prev[tableName] || {}),
        ...changes
      }
    }));
  };

  if (isLoading && !savedConfig) {
    return (
      <div className="flex justify-center items-center p-12">
        <Spinner className="h-8 w-8" />
        <span className="ml-2">Cargando configuración...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="connection" className="w-full">
        <TabsList className="mb-4">
          <TabsTrigger value="connection">Conexión MongoDB</TabsTrigger>
          <TabsTrigger value="mapping">Mapeo de tablas</TabsTrigger>
        </TabsList>
        
        <TabsContent value="connection">
          <Form {...connectionForm}>
            <form onSubmit={connectionForm.handleSubmit(onSaveConnection)} className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Database className="mr-2 h-5 w-5" />
                    Configuración de conexión MongoDB
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <FormField
                    control={connectionForm.control}
                    name="mongodbUri"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>URI de MongoDB</FormLabel>
                        <FormControl>
                          <div className="flex">
                            <Input {...field} placeholder="mongodb://usuario:contraseña@host:puerto" />
                            <Button 
                              type="button" 
                              variant="outline" 
                              className="ml-2" 
                              onClick={testConnection}
                              disabled={isTestingConnection}
                            >
                              {isTestingConnection ? <Spinner className="h-4 w-4 mr-2" /> : <RefreshCw className="h-4 w-4 mr-2" />}
                              Probar
                            </Button>
                          </div>
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={connectionForm.control}
                    name="mongodbName"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Nombre de la base de datos</FormLabel>
                        <FormControl>
                          <Input {...field} placeholder="nombre_de_la_db" />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                  
                  <FormField
                    control={connectionForm.control}
                    name="batchSize"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Tamaño de lote</FormLabel>
                        <FormControl>
                          <Input 
                            {...field} 
                            type="number" 
                            min="1" 
                            max="10000" 
                            placeholder="100" 
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </CardContent>
              </Card>
              
              <div className="flex justify-end">
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? <Spinner className="h-4 w-4 mr-2" /> : null}
                  Guardar configuración
                </Button>
              </div>
            </form>
          </Form>
        </TabsContent>
        
        <TabsContent value="mapping">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <Table className="mr-2 h-5 w-5" />
                Mapeo de tablas SQL a colecciones MongoDB
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {tableNames.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  No hay tablas disponibles. Asegúrese de haber extraído el esquema.
                </div>
              ) : (
                <>
                  <div className="flex space-x-4">
                    <div className="w-1/3 border rounded-md p-4">
                      <h3 className="text-sm font-medium mb-3">Tablas SQL</h3>
                      <div className="space-y-2 max-h-96 overflow-y-auto">
                        {tableNames.map(tableName => (
                          <div 
                            key={tableName}
                            className={`px-3 py-2 rounded-md cursor-pointer ${
                              selectedTable === tableName 
                                ? 'bg-primary text-primary-foreground' 
                                : 'hover:bg-muted'
                            }`}
                            onClick={() => setSelectedTable(tableName)}
                          >
                            {tableName}
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    <div className="w-2/3 border rounded-md p-4">
                      {selectedTable ? (
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <h3 className="text-sm font-medium">Configuración para tabla: <span className="font-bold">{selectedTable}</span></h3>
                          </div>
                          
                          <div className="space-y-4">
                            <div>
                              <label className="text-sm font-medium block mb-1">
                                Nombre de colección en MongoDB
                              </label>
                              <Input 
                                value={mappings[selectedTable]?.collection || ""}
                                onChange={(e) => updateMapping(selectedTable, { collection: e.target.value })}
                                placeholder={selectedTable.toLowerCase().replace(/\s/g, '_')}
                                className="w-full"
                              />
                            </div>
                            
                            <div>
                              <label className="text-sm font-medium block mb-1">
                                Índices
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {tableColumns.map(column => (
                                  <Button
                                    key={column.name}
                                    type="button"
                                    variant={
                                      mappings[selectedTable]?.indices?.includes(column.name)
                                        ? "default"
                                        : "outline"
                                    }
                                    size="sm"
                                    onClick={() => {
                                      const currentIndices = mappings[selectedTable]?.indices || [];
                                      const newIndices = currentIndices.includes(column.name)
                                        ? currentIndices.filter(i => i !== column.name)
                                        : [...currentIndices, column.name];
                                      
                                      updateMapping(selectedTable, { indices: newIndices });
                                    }}
                                    className="text-xs"
                                  >
                                    {column.isKey && <KeyRound className="h-3 w-3 mr-1" />}
                                    {column.name}
                                  </Button>
                                ))}
                              </div>
                            </div>
                            
                            {relatedTables.length > 0 && (
                              <div>
                                <label className="text-sm font-medium block mb-1">
                                  Tablas relacionadas (para incorporación)
                                </label>
                                
                                <div className="space-y-3">
                                  {relatedTables.map(relatedTable => {
                                    const embeddedConfig = mappings[selectedTable]?.embedded?.find(
                                      (e: any) => e.relatedTable === relatedTable
                                    );
                                    
                                    return (
                                      <div key={relatedTable} className="border rounded-md p-3">
                                        <div className="flex items-center justify-between mb-2">
                                          <span className="font-medium">{relatedTable}</span>
                                          
                                          <div className="flex items-center">
                                            <Switch 
                                              checked={!!embeddedConfig}
                                              onCheckedChange={(checked) => {
                                                const currentEmbedded = mappings[selectedTable]?.embedded || [];
                                                
                                                if (checked) {
                                                  const newEmbedded = [
                                                    ...currentEmbedded,
                                                    {
                                                      relatedTable,
                                                      relation: "one_to_many",
                                                      fields: []
                                                    }
                                                  ];
                                                  updateMapping(selectedTable, { embedded: newEmbedded });
                                                } else {
                                                  const newEmbedded = currentEmbedded.filter(
                                                    (e: any) => e.relatedTable !== relatedTable
                                                  );
                                                  updateMapping(selectedTable, { embedded: newEmbedded });
                                                }
                                              }}
                                              className="mr-2"
                                            />
                                            <span className="text-sm">Incorporar</span>
                                          </div>
                                        </div>
                                        
                                        {embeddedConfig && (
                                          <div className="space-y-2 pl-2 mt-3 border-l-2 border-gray-200">
                                            <div>
                                              <label className="text-xs font-medium block mb-1">
                                                Tipo de relación
                                              </label>
                                              <ToggleGroup 
                                                type="single" 
                                                value={embeddedConfig.relation}
                                                onValueChange={(value) => {
                                                  if (!value) return; // Don't allow deselection
                                                  
                                                  const currentEmbedded = mappings[selectedTable]?.embedded || [];
                                                  const newEmbedded = currentEmbedded.map((e: any) => 
                                                    e.relatedTable === relatedTable 
                                                      ? { ...e, relation: value } 
                                                      : e
                                                  );
                                                  
                                                  updateMapping(selectedTable, { embedded: newEmbedded });
                                                }}
                                              >
                                                <ToggleGroupItem value="one_to_one" size="sm">
                                                  Uno a uno
                                                </ToggleGroupItem>
                                                <ToggleGroupItem value="one_to_many" size="sm">
                                                  Uno a muchos
                                                </ToggleGroupItem>
                                              </ToggleGroup>
                                            </div>
                                          </div>
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              </div>
                            )}
                          </div>
                          
                          <div className="flex justify-end pt-2">
                            <Button 
                              onClick={async () => {
                                if (!projectId) return;
                                
                                try {
                                  setIsLoading(true);
                                  
                                  // Get current config
                                  const res = await apiRequest("GET", `/api/projects/${projectId}/migration/config`);
                                  
                                  if (res.ok) {
                                    const config = await res.json();
                                    
                                    // Update with current mappings
                                    const updatedConfig = {
                                      ...config,
                                      mapping: mappings
                                    };
                                    
                                    // Save updated config
                                    const saveRes = await apiRequest(
                                      "POST", 
                                      `/api/projects/${projectId}/migration/config`, 
                                      updatedConfig
                                    );
                                    
                                    if (saveRes.ok) {
                                      toast({
                                        title: "Configuración actualizada",
                                        description: "El mapeo de tablas ha sido actualizado correctamente."
                                      });
                                    }
                                  }
                                } catch (error) {
                                  toast({
                                    title: "Error al guardar mapeo",
                                    description: error instanceof Error ? error.message : "Error desconocido",
                                    variant: "destructive"
                                  });
                                } finally {
                                  setIsLoading(false);
                                }
                              }}
                              disabled={isLoading}
                            >
                              {isLoading ? <Spinner className="h-4 w-4 mr-2" /> : null}
                              Guardar mapeo
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="text-center py-12 text-gray-500">
                          Seleccione una tabla para configurar su mapeo
                        </div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}