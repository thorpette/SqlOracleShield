import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Project } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Crear esquema de validación
const projectSchema = z.object({
  name: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  code: z.string().min(2, "El código debe tener al menos 2 caracteres").max(10, "El código no debe exceder 10 caracteres"),
  description: z.string().optional(),
});

interface ProjectFormProps {
  project?: Project | null;
  onSuccess?: () => void;
}

export function ProjectForm({ project, onSuccess }: ProjectFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Crear formulario
  const form = useForm<z.infer<typeof projectSchema>>({
    resolver: zodResolver(projectSchema),
    defaultValues: {
      name: project?.name || "",
      code: project?.code || "",
      description: project?.description || "",
    },
  });

  // Manejar envío del formulario
  const onSubmit = async (data: z.infer<typeof projectSchema>) => {
    setIsLoading(true);
    
    try {
      // Si tenemos un proyecto, actualizar; si no, crear uno nuevo
      const method = project ? "PATCH" : "POST";
      const endpoint = project ? `/api/projects/${project.id}` : "/api/projects";
      
      const res = await apiRequest(method, endpoint, data);
      
      if (res.ok) {
        toast({
          title: project ? "Proyecto actualizado" : "Proyecto creado",
          description: project 
            ? "El proyecto ha sido actualizado exitosamente" 
            : "El nuevo proyecto ha sido creado exitosamente",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al procesar el proyecto");
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

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <FormField
          control={form.control}
          name="name"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre del proyecto</FormLabel>
              <FormControl>
                <Input placeholder="Escriba el nombre del proyecto" {...field} />
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
              <FormLabel>Código del proyecto</FormLabel>
              <FormControl>
                <Input placeholder="Código único (ej. PRJ001)" {...field} />
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
                <Textarea 
                  placeholder="Descripción del proyecto" 
                  className="resize-none" 
                  rows={3} 
                  {...field} 
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {project ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}