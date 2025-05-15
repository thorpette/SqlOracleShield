import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useProjectContext } from "@/context/project-context";
import { DbConnection } from "@shared/schema";

import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Loader2 } from "lucide-react";

const connectionFormSchema = z.object({
  type: z.enum(["mysql", "postgresql", "sqlserver", "oracle"], {
    required_error: "Por favor seleccione un tipo de base de datos",
  }),
  host: z.string().min(1, "El host es requerido"),
  port: z.string().min(1, "El puerto es requerido"),
  database: z.string().min(1, "El nombre de la base de datos es requerido"),
  user: z.string().min(1, "El usuario es requerido"),
  password: z.string().min(1, "La contraseña es requerida"),
  ssl: z.boolean().default(false),
  timeout: z.string().regex(/^\d+$/, "Debe ser un número").default("30"),
  maxRows: z.string().regex(/^\d+$/, "Debe ser un número").default("10000"),
});

type ConnectionFormValues = z.infer<typeof connectionFormSchema>;

const defaultValues: Partial<ConnectionFormValues> = {
  type: "mysql",
  host: "localhost",
  port: "3306",
  ssl: false,
  timeout: "30",
  maxRows: "10000",
};

interface ConnectionFormProps {
  onSuccess?: () => void;
}

export function ConnectionForm({ onSuccess }: ConnectionFormProps) {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isTesting, setIsTesting] = useState<boolean>(false);
  const { toast } = useToast();
  const { currentProject, updateProject } = useProjectContext();

  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(connectionFormSchema),
    defaultValues: {
      ...defaultValues,
      // If we have a current project with connection details, use those
      ...(currentProject?.dbSourceType && {
        type: currentProject.dbSourceType as any,
        host: currentProject.dbSourceHost || "",
        port: currentProject.dbSourcePort || "",
        database: currentProject.dbSourceName || "",
      }),
    },
  });

  const onSubmit = async (data: ConnectionFormValues) => {
    if (!currentProject) {
      toast({
        title: "Error",
        description: "No hay un proyecto seleccionado",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    
    try {
      const connectionConfig: DbConnection = {
        type: data.type,
        host: data.host,
        port: data.port,
        user: data.user,
        password: data.password,
        database: data.database,
        ssl: data.ssl,
        timeout: parseInt(data.timeout),
        maxRows: parseInt(data.maxRows),
      };
      
      const res = await apiRequest(
        "POST", 
        `/api/projects/${currentProject.id}/connection`, 
        connectionConfig
      );
      
      if (res.ok) {
        await updateProject(currentProject.id, {
          dbSourceType: data.type,
          dbSourceHost: data.host,
          dbSourcePort: data.port,
          dbSourceName: data.database,
        });
        
        toast({
          title: "Conexión guardada",
          description: "Configuración de conexión guardada exitosamente",
        });
        
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const testConnection = async () => {
    const { isValid } = form.formState;
    
    if (!isValid) {
      form.trigger();
      return;
    }
    
    setIsTesting(true);
    const values = form.getValues();
    
    try {
      const connectionConfig: DbConnection = {
        type: values.type,
        host: values.host,
        port: values.port,
        user: values.user,
        password: values.password,
        database: values.database,
        ssl: values.ssl,
        timeout: parseInt(values.timeout),
        maxRows: parseInt(values.maxRows),
      };
      
      const res = await apiRequest("POST", "/api/connection/test", connectionConfig);
      
      if (res.ok) {
        toast({
          title: "Conexión exitosa",
          description: "La conexión a la base de datos se ha establecido correctamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: error instanceof Error ? error.message : "No se pudo conectar a la base de datos",
        variant: "destructive",
      });
    } finally {
      setIsTesting(false);
    }
  };

  const extractSchema = async () => {
    if (!currentProject) return;
    
    const { isValid } = form.formState;
    
    if (!isValid) {
      form.trigger();
      return;
    }
    
    setIsLoading(true);
    
    // First save the connection
    await onSubmit(form.getValues());
    
    try {
      const res = await apiRequest("POST", `/api/projects/${currentProject.id}/schema/extract`);
      
      if (res.ok) {
        toast({
          title: "Esquema extraído",
          description: "El esquema de la base de datos ha sido extraído exitosamente",
        });
        
        if (onSuccess) onSuccess();
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Update port based on database type selection
  const handleDbTypeChange = (value: string) => {
    const portMap: Record<string, string> = {
      mysql: "3306",
      postgresql: "5432",
      sqlserver: "1433",
      oracle: "1521",
    };
    
    form.setValue("port", portMap[value] || "");
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Configuración de conexión a base de datos SQL</CardTitle>
        <CardDescription>
          Ingrese los detalles de conexión para su base de datos de origen
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
            <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
              <FormField
                control={form.control}
                name="type"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Tipo de base de datos</FormLabel>
                    <Select
                      onValueChange={(value) => {
                        field.onChange(value);
                        handleDbTypeChange(value);
                      }}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Seleccione un tipo de base de datos" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="mysql">MySQL</SelectItem>
                        <SelectItem value="postgresql">PostgreSQL</SelectItem>
                        <SelectItem value="sqlserver">SQL Server</SelectItem>
                        <SelectItem value="oracle">Oracle</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="database"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Nombre de la base de datos</FormLabel>
                    <FormControl>
                      <Input placeholder="nombre_bd" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="host"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Host</FormLabel>
                    <FormControl>
                      <Input placeholder="localhost" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="port"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Puerto</FormLabel>
                    <FormControl>
                      <Input {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="user"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Usuario</FormLabel>
                    <FormControl>
                      <Input placeholder="root" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="password"
                render={({ field }) => (
                  <FormItem className="sm:col-span-3">
                    <FormLabel>Contraseña</FormLabel>
                    <FormControl>
                      <Input type="password" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="sm:col-span-6">
                <h4 className="text-sm font-medium text-gray-700 mb-1">Opciones avanzadas</h4>
                <div className="bg-gray-50 rounded-md p-4">
                  <FormField
                    control={form.control}
                    name="ssl"
                    render={({ field }) => (
                      <FormItem className="flex flex-row items-start space-x-3 space-y-0 mb-4">
                        <FormControl>
                          <Checkbox
                            checked={field.value}
                            onCheckedChange={field.onChange}
                          />
                        </FormControl>
                        <div className="space-y-1 leading-none">
                          <FormLabel>Usar SSL</FormLabel>
                          <FormDescription>
                            Habilitar conexión segura con SSL
                          </FormDescription>
                        </div>
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="timeout"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Timeout (seg)</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="maxRows"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Límite de filas</FormLabel>
                          <FormControl>
                            <Input type="number" {...field} />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end space-x-3">
              <Button 
                type="submit" 
                variant="outline"
                disabled={isLoading || isTesting}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Guardando...
                  </>
                ) : (
                  "Guardar configuración"
                )}
              </Button>
              <Button
                type="button"
                variant="outline"
                onClick={testConnection}
                disabled={isLoading || isTesting}
              >
                {isTesting ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Probando...
                  </>
                ) : (
                  "Probar conexión"
                )}
              </Button>
              <Button
                type="button"
                onClick={extractSchema}
                disabled={isLoading || isTesting}
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Procesando...
                  </>
                ) : (
                  "Conectar y extraer esquema"
                )}
              </Button>
            </div>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
