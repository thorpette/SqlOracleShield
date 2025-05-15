import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { ConnectionForm } from "@/components/connection/connection-form";
import { Card, CardContent } from "@/components/ui/card";
import { useProjectContext } from "@/context/project-context";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Database } from "lucide-react";

const createProjectSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  code: z.string().min(2, "El código debe tener al menos 2 caracteres"),
  description: z.string().optional(),
});

export default function Connection() {
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const { currentProject, createProject, fetchProjects, isLoading } = useProjectContext();
  const { toast } = useToast();
  const [_, navigate] = useLocation();

  const form = useForm<z.infer<typeof createProjectSchema>>({
    resolver: zodResolver(createProjectSchema),
    defaultValues: {
      name: "",
      code: "",
      description: "",
    },
  });

  useEffect(() => {
    // Load projects on component mount
    fetchProjects();
  }, [fetchProjects]);

  const onCreateProject = async (data: z.infer<typeof createProjectSchema>) => {
    try {
      const newProject = await createProject({
        name: data.name,
        code: data.code,
        description: data.description || "",
        state: "created",
      });
      
      if (newProject) {
        setCreateDialogOpen(false);
        form.reset();
        toast({
          title: "Proyecto creado",
          description: `El proyecto ${newProject.name} ha sido creado exitosamente.`,
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Hubo un problema al crear el proyecto",
        variant: "destructive",
      });
    }
  };

  const handleConnectionSuccess = () => {
    // Optionally redirect to the schema page
    navigate("/esquemas");
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <div className="sm:flex sm:justify-between sm:items-baseline">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                Conexión
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Configure la conexión a su base de datos SQL de origen
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
          {!currentProject ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Database className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No hay un proyecto seleccionado</h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Para configurar una conexión, primero necesita crear o seleccionar un proyecto.
                </p>
                <Button onClick={() => setCreateDialogOpen(true)}>
                  Crear nuevo proyecto
                </Button>
              </CardContent>
            </Card>
          ) : (
            <ConnectionForm onSuccess={handleConnectionSuccess} />
          )}
        </div>
      </div>

      {/* Create Project Dialog */}
      <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo proyecto</DialogTitle>
            <DialogDescription>
              Ingrese la información básica para su nuevo proyecto de migración.
            </DialogDescription>
          </DialogHeader>
          
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onCreateProject)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre del proyecto</FormLabel>
                    <FormControl>
                      <Input placeholder="Migración Principal" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Código</FormLabel>
                    <FormControl>
                      <Input placeholder="MP001" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Descripción</FormLabel>
                    <FormControl>
                      <Input placeholder="Descripción del proyecto" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setCreateDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button type="submit" disabled={isLoading}>
                  {isLoading ? "Creando..." : "Crear proyecto"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
