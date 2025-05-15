import { useEffect } from "react";
import { Link, useLocation } from "wouter";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/hooks/use-auth";
import { Users, Database, ChevronRight } from "lucide-react";

export default function AdminDashboard() {
  const { user } = useAuth();
  const [_, navigate] = useLocation();

  useEffect(() => {
    // Redirect if not admin
    if (user && user.role !== "admin") {
      navigate("/");
    }
  }, [user, navigate]);

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <h1 className="text-2xl font-semibold text-gray-900">
            Administración
          </h1>
          <p className="mt-1 text-sm text-gray-500">
            Gestión de usuarios y proyectos del sistema
          </p>
        </div>

        <div className="mt-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
            {/* Usuarios */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Users className="mr-2 h-5 w-5" />
                  Gestión de Usuarios
                </CardTitle>
                <CardDescription>
                  Administre los usuarios que tienen acceso al sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Añadir, editar y eliminar usuarios del sistema. Configure niveles de acceso y asignación a proyectos.
                  </p>
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/admin/usuarios">
                      <span className="flex items-center">
                        Administrar usuarios
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Proyectos */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Database className="mr-2 h-5 w-5" />
                  Gestión de Proyectos
                </CardTitle>
                <CardDescription>
                  Administre los proyectos de migración
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <p className="text-sm text-gray-500">
                    Crear, editar y eliminar proyectos. Asigne usuarios a proyectos y configure los permisos.
                  </p>
                  <Button asChild className="w-full sm:w-auto">
                    <Link href="/admin/proyectos">
                      <span className="flex items-center">
                        Administrar proyectos
                        <ChevronRight className="ml-2 h-4 w-4" />
                      </span>
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Estadísticas */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Estadísticas del sistema</CardTitle>
                <CardDescription>
                  Visión general de la actividad del sistema
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                    <p className="text-sm font-medium text-primary-800">Total de usuarios</p>
                    <p className="mt-2 text-3xl font-bold text-primary-600">--</p>
                    <p className="mt-1 text-sm text-primary-700">Usuarios activos en el sistema</p>
                  </div>
                  <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                    <p className="text-sm font-medium text-primary-800">Total de proyectos</p>
                    <p className="mt-2 text-3xl font-bold text-primary-600">--</p>
                    <p className="mt-1 text-sm text-primary-700">Proyectos en la plataforma</p>
                  </div>
                  <div className="bg-primary-50 p-4 rounded-lg border border-primary-200">
                    <p className="text-sm font-medium text-primary-800">Migraciones completadas</p>
                    <p className="mt-2 text-3xl font-bold text-primary-600">--</p>
                    <p className="mt-1 text-sm text-primary-700">Procesos finalizados con éxito</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
