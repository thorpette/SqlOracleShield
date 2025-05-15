import { useEffect, useState } from "react";
import { useLocation } from "wouter";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { apiRequest } from "@/lib/queryClient";
import { useProjectContext } from "@/context/project-context";
import { Save, Lock, FileKey, Loader2, Download, Trash2 } from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { BackupData } from "@shared/schema";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default function Backup() {
  const { currentProject, updateProject } = useProjectContext();
  const { toast } = useToast();
  const [_, navigate] = useLocation();
  const [isLoading, setIsLoading] = useState(false);
  const [backups, setBackups] = useState<BackupData[]>([]);
  const [isCreatingBackup, setIsCreatingBackup] = useState(false);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [backupPassword, setBackupPassword] = useState("");

  useEffect(() => {
    // If no project is selected or project has no obfuscation config, redirect to obfuscation page
    if (!currentProject) {
      navigate("/conexion");
    } else if (!currentProject.schema) {
      navigate("/esquemas");
    } else {
      fetchBackups();
    }
  }, [currentProject, navigate]);

  const fetchBackups = async () => {
    if (!currentProject) return;

    setIsLoading(true);
    try {
      const res = await apiRequest("GET", `/api/projects/${currentProject.id}/backups`);
      const data = await res.json();
      setBackups(data);
    } catch (error) {
      // Don't show error if no backups exist yet
      console.log("No backups found or error:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const createBackup = async () => {
    if (!currentProject || !backupPassword) return;

    setIsCreatingBackup(true);
    try {
      const res = await apiRequest("POST", `/api/projects/${currentProject.id}/backups`, {
        password: backupPassword
      });
      
      if (res.ok) {
        const data = await res.json();
        // Update the project with backup information
        await updateProject(currentProject.id, { 
          backupKey: data.encryptionKey,
          backupPath: data.path,
          state: currentProject.state === "analysis" ? "backup" : currentProject.state
        });
        
        setBackupPassword("");
        setIsDialogOpen(false);
        await fetchBackups();
        
        toast({
          title: "Respaldo creado",
          description: "El respaldo ha sido creado exitosamente"
        });
      }
    } catch (error) {
      toast({
        title: "Error al crear respaldo",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    } finally {
      setIsCreatingBackup(false);
    }
  };

  const downloadBackup = async (backupId: string) => {
    if (!currentProject) return;

    try {
      const res = await apiRequest("GET", `/api/projects/${currentProject.id}/backups/${backupId}/download`);
      
      if (res.ok) {
        // Create a download link for the backup file
        const blob = await res.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `backup-${backupId}.zip`;
        document.body.appendChild(a);
        a.click();
        a.remove();
      }
    } catch (error) {
      toast({
        title: "Error al descargar respaldo",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    }
  };

  const deleteBackup = async (backupId: string) => {
    if (!currentProject) return;

    try {
      const res = await apiRequest("DELETE", `/api/projects/${currentProject.id}/backups/${backupId}`);
      
      if (res.ok) {
        await fetchBackups();
        toast({
          title: "Respaldo eliminado",
          description: "El respaldo ha sido eliminado exitosamente"
        });
      }
    } catch (error) {
      toast({
        title: "Error al eliminar respaldo",
        description: error instanceof Error ? error.message : "Error desconocido",
        variant: "destructive"
      });
    }
  };

  const formatSize = (bytes: number) => {
    if (bytes < 1024) return bytes + " B";
    else if (bytes < 1048576) return (bytes / 1024).toFixed(2) + " KB";
    else if (bytes < 1073741824) return (bytes / 1048576).toFixed(2) + " MB";
    else return (bytes / 1073741824).toFixed(2) + " GB";
  };

  const formatDate = (dateString: string) => {
    return format(new Date(dateString), "d 'de' MMMM 'de' yyyy, HH:mm", { locale: es });
  };

  return (
    <div className="py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
        <div className="pb-5 border-b border-gray-200">
          <div className="sm:flex sm:justify-between sm:items-baseline">
            <div className="flex-1 min-w-0">
              <h1 className="text-2xl font-semibold text-gray-900">
                Respaldo
              </h1>
              <p className="mt-1 text-sm text-gray-500">
                Creación y gestión de copias de seguridad encriptadas
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
          {!currentProject || !currentProject.schema ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Save className="h-16 w-16 text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  No hay datos para respaldar
                </h3>
                <p className="text-gray-500 text-center mb-6 max-w-md">
                  Para crear un respaldo, primero necesita extraer y configurar los datos.
                </p>
                <Button onClick={() => navigate("/esquemas")}>
                  Ir a extracción de esquema
                </Button>
              </CardContent>
            </Card>
          ) : (
            <>
              <Card className="mb-6">
                <CardHeader className="pb-3">
                  <div className="flex justify-between items-center">
                    <CardTitle>Respaldos encriptados</CardTitle>
                    <Button 
                      onClick={() => setIsDialogOpen(true)} 
                      className="flex items-center"
                    >
                      <Lock className="mr-2 h-4 w-4" />
                      Crear nuevo respaldo
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                      <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    </div>
                  ) : backups.length === 0 ? (
                    <div className="text-center py-8">
                      <FileKey className="mx-auto h-12 w-12 text-gray-400" />
                      <h3 className="mt-2 text-sm font-medium text-gray-900">No hay respaldos</h3>
                      <p className="mt-1 text-sm text-gray-500">
                        Aún no ha creado ningún respaldo encriptado.
                      </p>
                      <div className="mt-6">
                        <Button onClick={() => setIsDialogOpen(true)}>
                          Crear respaldo
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>ID</TableHead>
                          <TableHead>Fecha</TableHead>
                          <TableHead>Tablas</TableHead>
                          <TableHead>Registros</TableHead>
                          <TableHead>Tamaño</TableHead>
                          <TableHead className="text-right">Acciones</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {backups.map((backup) => (
                          <TableRow key={backup.id}>
                            <TableCell className="font-medium">{backup.id}</TableCell>
                            <TableCell>{formatDate(backup.timestamp)}</TableCell>
                            <TableCell>{backup.tables.length}</TableCell>
                            <TableCell>{backup.recordCount.toLocaleString()}</TableCell>
                            <TableCell>{formatSize(backup.size)}</TableCell>
                            <TableCell className="text-right">
                              <div className="flex justify-end space-x-2">
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => downloadBackup(backup.id)}
                                >
                                  <Download className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm"
                                  onClick={() => deleteBackup(backup.id)}
                                >
                                  <Trash2 className="h-4 w-4 text-red-500" />
                                </Button>
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Información de seguridad</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <Lock className="h-5 w-5 text-blue-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-blue-800">Encriptación segura</h3>
                          <div className="mt-2 text-sm text-blue-700">
                            <p>
                              Los respaldos se encriptan utilizando el algoritmo AES-256-GCM, 
                              que proporciona encriptación autenticada para proteger la integridad 
                              y confidencialidad de los datos.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="bg-yellow-50 border border-yellow-200 rounded-md p-4">
                      <div className="flex">
                        <div className="flex-shrink-0">
                          <FileKey className="h-5 w-5 text-yellow-400" />
                        </div>
                        <div className="ml-3">
                          <h3 className="text-sm font-medium text-yellow-800">Guarde su contraseña</h3>
                          <div className="mt-2 text-sm text-yellow-700">
                            <p>
                              La contraseña que utilice para crear el respaldo no se puede recuperar. 
                              Guárdela en un lugar seguro, ya que la necesitará para restaurar los datos.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </>
          )}
        </div>
      </div>

      {/* Create Backup Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Crear nuevo respaldo encriptado</DialogTitle>
            <DialogDescription>
              Ingrese una contraseña para encriptar el respaldo. Asegúrese de guardarla en un lugar seguro.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="backup-password">Contraseña de encriptación</Label>
              <Input
                id="backup-password"
                type="password"
                placeholder="Ingrese una contraseña segura"
                value={backupPassword}
                onChange={(e) => setBackupPassword(e.target.value)}
              />
              <p className="text-sm text-gray-500">
                Mínimo 8 caracteres. Recomendamos usar una combinación de letras, números y símbolos.
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
              Cancelar
            </Button>
            <Button 
              onClick={createBackup} 
              disabled={backupPassword.length < 8 || isCreatingBackup}
            >
              {isCreatingBackup ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creando respaldo...
                </>
              ) : (
                "Crear respaldo"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
