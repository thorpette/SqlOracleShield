import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { User } from "@shared/schema";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

// Crear esquema de validación
const userSchema = z.object({
  fullName: z.string().min(3, "El nombre debe tener al menos 3 caracteres"),
  email: z.string().email("Debe ingresar un email válido"),
  employeeNumber: z.string().min(1, "El número de empleado es requerido"),
  role: z.enum(["admin", "user"], {
    required_error: "Debe seleccionar un rol",
  }),
  password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
});

interface UserFormProps {
  user?: User | null;
  onSuccess?: () => void;
}

export function UserForm({ user, onSuccess }: UserFormProps) {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  
  // Crear formulario con valores por defecto si existe un usuario
  const form = useForm<z.infer<typeof userSchema>>({
    resolver: zodResolver(
      // Si estamos editando, hacemos que la contraseña sea opcional
      user ? userSchema.omit({ password: true }).extend({
        password: z.string().min(6, "La contraseña debe tener al menos 6 caracteres").optional(),
      }) : userSchema
    ),
    defaultValues: {
      fullName: user?.fullName || "",
      email: user?.email || "",
      employeeNumber: user?.employeeNumber || "",
      role: user?.role as "admin" | "user" || "user",
      password: "",
    },
  });

  // Manejar envío del formulario
  const onSubmit = async (data: z.infer<typeof userSchema>) => {
    setIsLoading(true);
    
    try {
      // Si no hay contraseña y estamos editando, la eliminamos del objeto a enviar
      if (!data.password && user) {
        delete data.password;
      }
      
      // Si tenemos un usuario, actualizar; si no, crear uno nuevo
      const method = user ? "PATCH" : "POST";
      const endpoint = user ? `/api/users/${user.id}` : "/api/users";
      
      const res = await apiRequest(method, endpoint, data);
      
      if (res.ok) {
        toast({
          title: user ? "Usuario actualizado" : "Usuario creado",
          description: user 
            ? "El usuario ha sido actualizado exitosamente" 
            : "El nuevo usuario ha sido creado exitosamente",
        });
        
        if (onSuccess) {
          onSuccess();
        }
      } else {
        const errorData = await res.json();
        throw new Error(errorData.message || "Error al procesar el usuario");
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
          name="fullName"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Nombre completo</FormLabel>
              <FormControl>
                <Input placeholder="Nombre Apellido" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Correo electrónico</FormLabel>
              <FormControl>
                <Input placeholder="correo@ejemplo.com" type="email" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="employeeNumber"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Número de empleado</FormLabel>
              <FormControl>
                <Input placeholder="EMP12345" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="role"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Rol</FormLabel>
              <Select
                onValueChange={field.onChange}
                defaultValue={field.value}
              >
                <FormControl>
                  <SelectTrigger>
                    <SelectValue placeholder="Seleccione un rol" />
                  </SelectTrigger>
                </FormControl>
                <SelectContent>
                  <SelectItem value="user">Usuario</SelectItem>
                  <SelectItem value="admin">Administrador</SelectItem>
                </SelectContent>
              </Select>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <FormField
          control={form.control}
          name="password"
          render={({ field }) => (
            <FormItem>
              <FormLabel>{user ? "Nueva contraseña (opcional)" : "Contraseña"}</FormLabel>
              <FormControl>
                <Input placeholder="Contraseña" type="password" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />
        
        <div className="flex justify-end">
          <Button type="submit" disabled={isLoading}>
            {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {user ? "Actualizar" : "Crear"}
          </Button>
        </div>
      </form>
    </Form>
  );
}