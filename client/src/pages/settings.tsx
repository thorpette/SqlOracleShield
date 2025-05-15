import { useEffect, useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { Setting } from "@shared/schema";
import { useAuth } from "@/hooks/use-auth";
import { Lock, Settings as SettingsIcon, Save, Database, Loader2 } from "lucide-react";

const generalSettingsSchema = z.object({
  tableLimit: z.coerce.number().min(1, "Debe ser al menos 1"),
  batchSize: z.coerce.number().min(10, "Debe ser al menos 10"),
  connectionTimeout: z.coerce.number().min(1, "Debe ser al menos 1"),
  debugMode: z.boolean().default(false),
});

const mongodbSettingsSchema = z.object({
  mongodbUri: z.string().min(1, "La URI de MongoDB es requerida"),
  mongodbName: z.string().min(1, "El nombre de la base de datos es requerido"),
});

const securitySettingsSchema = z.object({
  currentPassword: z.string().min(1, "La contraseña actual es requerida"),
  newPassword: z.string().min(6, "La nueva contraseña debe tener al menos 6 caracteres"),
  confirmPassword: z.string().min(6, "Confirme la nueva contraseña"),
}).refine((data) => data.newPassword === data.confirmPassword, {
  message: "Las contraseñas no coinciden",
  path: ["confirmPassword"],
});

export default function Settings() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [settings, setSettings] = useState<Setting | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  // General settings form
  const generalForm = useForm<z.infer<typeof generalSettingsSchema>>({
    resolver: zodResolver(generalSettingsSchema),
    defaultValues: {
      tableLimit: 100,
      batchSize: 1000,
      connectionTimeout: 30,
      debugMode: false,
    },
  });

  // MongoDB settings form
  const mongodbForm = useForm<z.infer<typeof mongodbSettingsSchema>>({
    resolver: zodResolver(mongodbSettingsSchema),
    defaultValues: {
      mongodbUri: "",
      mongodbName: "",
    },
  });

  // Security settings form
  const securityForm = useForm<z.infer<typeof securitySettingsSchema>>({
    resolver: zodResolver(securitySettingsSchema),
    defaultValues: {
      currentPassword: "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const res = await apiRequest("GET", "/api/settings");
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
        
        // Update form values
        generalForm.reset({
          tableLimit: data.tableLimit,
          batchSize: data.batchSize,
          connectionTimeout: data.connectionTimeout,
          debugMode: data.debugMode,
        });
        
        mongodbForm.reset({
          mongodbUri: data.mongodbUri || "",
          mongodbName: data.mongodbName || "",
        });
      }
    } catch (error) {
      toast({
        title: "Error al cargar configuración",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveGeneralSettings = async (data: z.infer<typeof generalSettingsSchema>) => {
    setIsSaving(true);
    try {
      const res = await apiRequest("PATCH", "/api/settings", data);
      if (res.ok) {
        toast({
          title: "Configuración guardada",
          description: "La configuración general ha sido actualizada exitosamente",
        });
        await fetchSettings();
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

  const saveMongoDBSettings = async (data: z.infer<typeof mongodbSettingsSchema>) => {
    setIsSaving(true);
    try {
      const res = await apiRequest("PATCH", "/api/settings/mongodb", data);
      if (res.ok) {
        toast({
          title: "Configuración guardada",
          description: "La configuración de MongoDB ha sido actualizada exitosamente",
        });
        await fetchSettings();
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

  const changePassword = async (data: z.infer<typeof securitySettingsSchema>) => {
    setIsSaving(true);
    try {
      const res = await apiRequest("POST", "/api/auth/change-password", {
        currentPassword: data.currentPassword,
        newPassword: data.newPassword,
      });
      
      if (res.ok) {
        toast({
          title: "Contraseña actualizada",
          description: "Su contraseña ha sido actualizada exitosamente",
        });
        securityForm.reset({
          currentPassword: "",
          newPassword: "",
          confirmPassword: "",
        });
      }
    } catch (error) {
      toast({
        title: "Error al cambiar contraseña",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  const testMongoDBConnection = async () => {
    const { mongodbUri, mongodbName } = mongodbForm.getValues();
    
    if (!mongodbUri || !mongodbName) {
      toast({
        title: "Error de validación",
        description: "Debe proporcionar la URI y el nombre de la base de datos",
        variant: "destructive",
      });
      return;
    }
    
    setIsSaving(true);
    try {
      const res = await apiRequest("POST", "/api/settings/mongodb/test", {
        mongodbUri,
        mongodbName,
      });
      
      if (res.ok) {
        toast({
          title: "Conexión exitosa",
          description: "La conexión a MongoDB se ha establecido correctamente",
        });
      }
    } catch (error) {
      toast({
        title: "Error de conexión",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive",
      });
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-6">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
          <div className="pb-5 border-b border-gray-200">
            <h1 className="text-2xl font-semibold text-gray-900">
              Configuración
            </h1>
          </div>
          <div className="flex justify-center items-center py-8">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">
            Configuración
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestione la configuración global del sistema
          </p>
        </div>

        <div className="mt-8">
          <Tabs defaultValue="general">
            <TabsList className="mb-6">
              <TabsTrigger value="general" className="flex items-center">
                <SettingsIcon className="mr-2 h-4 w-4" />
                General
              </TabsTrigger>
              <TabsTrigger value="mongodb" className="flex items-center">
                <Database className="mr-2 h-4 w-4" />
                MongoDB
              </TabsTrigger>
              <TabsTrigger value="security" className="flex items-center">
                <Lock className="mr-2 h-4 w-4" />
                Seguridad
              </TabsTrigger>
            </TabsList>
            
            {/* General Settings */}
            <TabsContent value="general">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración general</CardTitle>
                  <CardDescription>
                    Configure los parámetros generales del sistema
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...generalForm}>
                    <form onSubmit={generalForm.handleSubmit(saveGeneralSettings)} className="space-y-6">
                      <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
                        <FormField
                          control={generalForm.control}
                          name="tableLimit"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Límite de tablas</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormDescription>
                                Número máximo de tablas a extraer por defecto
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={generalForm.control}
                          name="batchSize"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Tamaño de lote</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormDescription>
                                Número de registros a procesar por lote durante la migración
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={generalForm.control}
                          name="connectionTimeout"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Timeout de conexión (segundos)</FormLabel>
                              <FormControl>
                                <Input type="number" {...field} />
                              </FormControl>
                              <FormDescription>
                                Tiempo máximo de espera para conexiones a bases de datos
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={generalForm.control}
                          name="debugMode"
                          render={({ field }) => (
                            <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                              <div className="space-y-0.5">
                                <FormLabel className="text-base">
                                  Modo debug
                                </FormLabel>
                                <FormDescription>
                                  Habilitar logging detallado para diagnóstico
                                </FormDescription>
                              </div>
                              <FormControl>
                                <Switch
                                  checked={field.value}
                                  onCheckedChange={field.onChange}
                                />
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button type="submit" disabled={isSaving}>
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
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* MongoDB Settings */}
            <TabsContent value="mongodb">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de MongoDB</CardTitle>
                  <CardDescription>
                    Configure la conexión a MongoDB para el almacenamiento de datos
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...mongodbForm}>
                    <form onSubmit={mongodbForm.handleSubmit(saveMongoDBSettings)} className="space-y-6">
                      <FormField
                        control={mongodbForm.control}
                        name="mongodbUri"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>URI de MongoDB</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="mongodb://usuario:contraseña@host:puerto" />
                            </FormControl>
                            <FormDescription>
                              URI de conexión a MongoDB (ejemplo: mongodb://localhost:27017)
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <FormField
                        control={mongodbForm.control}
                        name="mongodbName"
                        render={({ field }) => (
                          <FormItem>
                            <FormLabel>Nombre de base de datos</FormLabel>
                            <FormControl>
                              <Input {...field} placeholder="migration_tool" />
                            </FormControl>
                            <FormDescription>
                              Nombre de la base de datos en MongoDB para almacenar datos migrados
                            </FormDescription>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      
                      <div className="flex space-x-3">
                        <Button type="submit" disabled={isSaving}>
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
                        <Button type="button" variant="outline" onClick={testMongoDBConnection} disabled={isSaving}>
                          Probar conexión
                        </Button>
                      </div>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
            
            {/* Security Settings */}
            <TabsContent value="security">
              <Card>
                <CardHeader>
                  <CardTitle>Configuración de seguridad</CardTitle>
                  <CardDescription>
                    Actualice su contraseña y ajustes de seguridad
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Form {...securityForm}>
                    <form onSubmit={securityForm.handleSubmit(changePassword)} className="space-y-6">
                      <div className="space-y-4">
                        <h3 className="text-lg font-medium">Cambiar contraseña</h3>
                        <Separator />
                        
                        <FormField
                          control={securityForm.control}
                          name="currentPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Contraseña actual</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={securityForm.control}
                          name="newPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Nueva contraseña</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormDescription>
                                Mínimo 6 caracteres
                              </FormDescription>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                        
                        <FormField
                          control={securityForm.control}
                          name="confirmPassword"
                          render={({ field }) => (
                            <FormItem>
                              <FormLabel>Confirmar nueva contraseña</FormLabel>
                              <FormControl>
                                <Input type="password" {...field} />
                              </FormControl>
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </div>
                      
                      <Button type="submit" disabled={isSaving}>
                        {isSaving ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            Actualizando...
                          </>
                        ) : (
                          "Cambiar contraseña"
                        )}
                      </Button>
                    </form>
                  </Form>
                </CardContent>
              </Card>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}
