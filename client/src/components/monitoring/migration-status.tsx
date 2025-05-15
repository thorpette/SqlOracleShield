import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import { MigrationStatus as MigrationStatusType } from "@shared/schema";
import { Clock, Database, UploadCloud, Percent, FileBarChart } from "lucide-react";

interface MigrationStatusProps {
  status: MigrationStatusType | null;
  isLoading: boolean;
}

export function MigrationStatus({ status, isLoading }: MigrationStatusProps) {
  // Format time (seconds) to human readable format (hh:mm:ss)
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    
    const parts = [];
    if (hrs > 0) parts.push(`${hrs}h`);
    if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
    parts.push(`${secs}s`);
    
    return parts.join(' ');
  };

  if (isLoading && !status) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-20 w-full" />
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
          <Skeleton className="h-16 w-full" />
        </div>
      </div>
    );
  }

  if (!status) {
    return (
      <div className="text-center py-8 text-gray-500">
        No hay información disponible sobre el proceso de migración.
      </div>
    );
  }

  const { 
    status: migrationStatus, 
    progress
  } = status;

  const statusColors = {
    pending: "bg-yellow-100 text-yellow-800",
    in_progress: "bg-blue-100 text-blue-800",
    completed: "bg-green-100 text-green-800",
    error: "bg-red-100 text-red-800"
  };

  const statusLabels = {
    pending: "Pendiente",
    in_progress: "En progreso",
    completed: "Completado",
    error: "Error"
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center">
          <span className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-medium ${statusColors[migrationStatus]}`}>
            {statusLabels[migrationStatus]}
          </span>
        </div>
        
        {migrationStatus === 'in_progress' && (
          <div className="text-sm text-gray-500">
            Tiempo transcurrido: {formatTime(progress.elapsedTime)}
            {progress.estimatedTime > 0 && (
              <> • Tiempo estimado restante: {formatTime(progress.estimatedTime)}</>
            )}
          </div>
        )}
      </div>

      {migrationStatus !== 'pending' && (
        <>
          <div className="mb-4">
            <div className="flex justify-between mb-1">
              <span className="text-sm font-medium">Progreso total</span>
              <span className="text-sm font-medium">{progress.percentage}%</span>
            </div>
            <Progress value={progress.percentage} className="h-2" />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 mt-6">
            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <Database className="h-5 w-5 text-blue-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Tablas</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">
                  {progress.completedTables} / {progress.totalTables}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <FileBarChart className="h-5 w-5 text-purple-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Registros</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">
                  {progress.processedRecords.toLocaleString()}
                  {progress.totalRecords > 0 && (
                    <> / {progress.totalRecords.toLocaleString()}</>
                  )}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <UploadCloud className="h-5 w-5 text-green-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Tabla actual</span>
              </div>
              <div className="mt-2">
                <span className="text-lg font-semibold truncate block">
                  {progress.currentTable || "-"}
                </span>
              </div>
            </div>

            <div className="bg-gray-50 rounded-lg p-4">
              <div className="flex items-center">
                <Percent className="h-5 w-5 text-amber-600 mr-2" />
                <span className="text-sm font-medium text-gray-700">Porcentaje</span>
              </div>
              <div className="mt-2">
                <span className="text-2xl font-bold">
                  {progress.percentage}%
                </span>
              </div>
            </div>
          </div>
        </>
      )}

      {migrationStatus === 'pending' && (
        <div className="text-center py-8 flex flex-col items-center">
          <Clock className="h-12 w-12 text-gray-400 mb-4" />
          <p className="text-gray-500 mb-2">
            La migración está pendiente de iniciar.
          </p>
          <p className="text-sm text-gray-400">
            Inicie el proceso para comenzar la migración de datos.
          </p>
        </div>
      )}
    </div>
  );
}