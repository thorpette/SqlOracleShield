import mongoose, { Document, Schema } from 'mongoose';

// Definir la interfaz para el documento de log
export interface ILog extends Document {
  projectId: mongoose.Types.ObjectId;
  userId: mongoose.Types.ObjectId;
  action: string;
  details?: Record<string, any>;
  timestamp: Date;
  level: 'info' | 'warning' | 'error';
}

// Crear el esquema para el modelo de log
const LogSchema = new Schema<ILog>(
  {
    projectId: {
      type: Schema.Types.ObjectId,
      ref: 'Project',
      required: [true, 'El proyecto es requerido'],
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es requerido'],
    },
    action: {
      type: String,
      required: [true, 'La acción es requerida'],
      trim: true,
    },
    details: {
      type: Object,
      default: {},
    },
    timestamp: {
      type: Date,
      default: Date.now,
    },
    level: {
      type: String,
      enum: {
        values: ['info', 'warning', 'error'],
        message: '{VALUE} no es un nivel válido',
      },
      default: 'info',
    },
  },
  {
    timestamps: false, // No necesitamos timestamps adicionales ya que tenemos 'timestamp'
  }
);

// Crear índices
LogSchema.index({ projectId: 1, timestamp: -1 });
LogSchema.index({ userId: 1 });
LogSchema.index({ level: 1 });

// Crear y exportar el modelo
export const Log = mongoose.model<ILog>('Log', LogSchema);

// Función para crear un log en la base de datos
export const createLog = async (
  projectId: mongoose.Types.ObjectId,
  userId: mongoose.Types.ObjectId,
  action: string,
  details?: Record<string, any>,
  level: 'info' | 'warning' | 'error' = 'info'
): Promise<ILog> => {
  try {
    return await Log.create({
      projectId,
      userId,
      action,
      details,
      level,
      timestamp: new Date(),
    });
  } catch (error) {
    console.error('Error al crear el log:', error);
    throw error;
  }
};