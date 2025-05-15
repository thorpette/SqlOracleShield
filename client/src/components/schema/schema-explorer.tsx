import { useState, useEffect } from "react";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { TableIcon, RefreshCw, Search } from "lucide-react";
import { useProjectContext } from "@/context/project-context";
import { ColumnData, TableData, SchemaData } from "@shared/schema";

export function SchemaExplorer() {
  const { currentProject, updateProject } = useProjectContext();
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [schema, setSchema] = useState<SchemaData | null>(null);
  const [filter, setFilter] = useState("");
  const [selectedTable, setSelectedTable] = useState<string | null>(null);
  
  useEffect(() => {
    if (currentProject?.schema) {
      setSchema(currentProject.schema);
      // Select the first table by default if available
      const tableNames = Object.keys(currentProject.schema.tables);
      if (tableNames.length > 0 && !selectedTable) {
        setSelectedTable(tableNames[0]);
      }
    }
  }, [currentProject]);

  const loadSchema = async () => {
    if (!currentProject) return;
    
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/projects/${currentProject.id}/schema`);
      const schemaData = await res.json();
      setSchema(schemaData);
      
      // Select the first table by default if available
      const tableNames = Object.keys(schemaData.tables);
      if (tableNames.length > 0) {
        setSelectedTable(tableNames[0]);
      }
      
      // Update project context with schema data
      await updateProject(currentProject.id, { schema: schemaData });
      
      toast({
        title: "Esquema cargado",
        description: `Se han cargado ${Object.keys(schemaData.tables).length} tablas`,
      });
    } catch (error) {
      toast({
        title: "Error al cargar esquema",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const refreshSchema = async () => {
    if (!currentProject) return;
    
    setIsRefreshing(true);
    try {
      const res = await apiRequest("POST", `/api/projects/${currentProject.id}/schema/extract`);
      if (res.ok) {
        // Reload the schema after extraction
        await loadSchema();
      }
    } catch (error) {
      toast({
        title: "Error al actualizar esquema",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsRefreshing(false);
    }
  };

  // Filter tables based on search input
  const filteredTables = schema ? 
    Object.entries(schema.tables)
      .filter(([tableName]) => 
        tableName.toLowerCase().includes(filter.toLowerCase())
      )
      .sort(([a], [b]) => a.localeCompare(b))
    : [];

  // Get the currently selected table data
  const selectedTableData = selectedTable && schema ? 
    schema.tables[selectedTable] : null;

  return (
    <Card>
      <CardHeader className="border-b border-gray-200">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle>Explorador de esquema</CardTitle>
            {currentProject && (
              <p className="mt-1 text-sm text-gray-500">
                {currentProject.dbSourceType} - {currentProject.dbSourceName}
              </p>
            )}
          </div>
          <div className="flex space-x-3">
            <div className="relative">
              <Input
                placeholder="Filtrar tablas..."
                value={filter}
                onChange={(e) => setFilter(e.target.value)}
                className="pl-8"
              />
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-gray-400" />
            </div>
            <Button
              size="sm"
              onClick={refreshSchema}
              disabled={isRefreshing || !currentProject}
            >
              {isRefreshing ? (
                <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Actualizar
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0">
        <div className="grid grid-cols-1 lg:grid-cols-4">
          {/* Table List Sidebar */}
          <div className="lg:col-span-1 border-r border-gray-200 p-4 h-[calc(100vh-16rem)] overflow-y-auto">
            <h4 className="text-lg font-medium text-gray-700 mb-4">Tablas</h4>
            
            {isLoading ? (
              <div className="space-y-2">
                {[...Array(5)].map((_, i) => (
                  <Skeleton key={i} className="h-10 w-full" />
                ))}
              </div>
            ) : !schema ? (
              <div className="text-center py-8">
                <TableIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">No hay esquema</h3>
                <p className="mt-1 text-sm text-gray-500">
                  Aún no se ha extraído el esquema de la base de datos.
                </p>
                <div className="mt-6">
                  <Button onClick={loadSchema} disabled={!currentProject}>
                    Cargar esquema
                  </Button>
                </div>
              </div>
            ) : filteredTables.length === 0 ? (
              <p className="text-center text-gray-500 py-4">No se encontraron tablas</p>
            ) : (
              <div className="space-y-1">
                {filteredTables.map(([tableName, tableData]) => (
                  <Button
                    key={tableName}
                    variant="ghost"
                    className={`w-full justify-between ${
                      selectedTable === tableName 
                        ? "bg-gray-100 text-gray-900" 
                        : "text-gray-600 hover:bg-gray-50"
                    }`}
                    onClick={() => setSelectedTable(tableName)}
                  >
                    <div className="flex items-center">
                      <TableIcon className="mr-2 h-4 w-4 text-gray-400" />
                      <span className="truncate">{tableName}</span>
                    </div>
                    <span className="text-xs text-gray-500">
                      ({tableData.columns.length})
                    </span>
                  </Button>
                ))}
              </div>
            )}
          </div>

          {/* Table Details */}
          <div className="lg:col-span-3 p-6">
            {isLoading ? (
              <div className="space-y-4">
                <Skeleton className="h-8 w-1/3" />
                <Skeleton className="h-4 w-1/4" />
                <div className="mt-6">
                  <Skeleton className="h-10 w-full" />
                  <div className="mt-2 space-y-2">
                    {[...Array(5)].map((_, i) => (
                      <Skeleton key={i} className="h-12 w-full" />
                    ))}
                  </div>
                </div>
              </div>
            ) : selectedTable && selectedTableData ? (
              <>
                <div className="border-b border-gray-200 pb-4 mb-4">
                  <h4 className="text-lg font-medium text-gray-700 mb-2">
                    Estructura de tabla: {selectedTable}
                  </h4>
                  <p className="text-sm text-gray-500">
                    {selectedTableData.columns.length} columnas
                  </p>
                </div>
                
                {/* Columns Table */}
                <div className="overflow-x-auto mb-6">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Columna</TableHead>
                        <TableHead>Tipo</TableHead>
                        <TableHead>Nullable</TableHead>
                        <TableHead>Clave</TableHead>
                        <TableHead>Longitud</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedTableData.columns.map((column: ColumnData) => (
                        <TableRow key={column.name}>
                          <TableCell className="font-medium">{column.name}</TableCell>
                          <TableCell>{column.dataType}</TableCell>
                          <TableCell>
                            <span className={column.nullable ? "text-green-500" : "text-red-500"}>
                              {column.nullable ? "YES" : "NO"}
                            </span>
                          </TableCell>
                          <TableCell>
                            {column.isKey ? (
                              <Badge variant="outline" className="bg-green-100 text-green-800">
                                Primary
                              </Badge>
                            ) : (
                              "-"
                            )}
                          </TableCell>
                          <TableCell>{column.maxLength || "-"}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
                
                {/* Sample Data */}
                <div className="border-t border-b border-gray-200 py-4 my-4">
                  <h4 className="text-lg font-medium text-gray-700 mb-2">Datos de muestra</h4>
                  <p className="text-sm text-gray-500">
                    Mostrando {selectedTableData.sampleData.length} registros
                  </p>
                </div>
                
                {selectedTableData.sampleData.length > 0 ? (
                  <div className="overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          {Object.keys(selectedTableData.sampleData[0]).map((key) => (
                            <TableHead key={key}>{key}</TableHead>
                          ))}
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {selectedTableData.sampleData.map((row, rowIndex) => (
                          <TableRow key={rowIndex}>
                            {Object.values(row).map((value, index) => (
                              <TableCell key={index}>
                                {value === null
                                  ? <span className="text-gray-400">NULL</span>
                                  : String(value)}
                              </TableCell>
                            ))}
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                ) : (
                  <p className="text-center text-gray-500 py-4">No hay datos de muestra disponibles</p>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <TableIcon className="mx-auto h-12 w-12 text-gray-400" />
                <h3 className="mt-2 text-sm font-medium text-gray-900">
                  Seleccione una tabla
                </h3>
                <p className="mt-1 text-sm text-gray-500">
                  Seleccione una tabla de la lista para ver sus detalles
                </p>
              </div>
            )}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
