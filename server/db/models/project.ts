import mongoose, { Document, Schema } from 'mongoose';
import { SchemaData, ObfuscationConfig } from '@shared/schema';

// Definir la interfaz para el documento de proyecto
export interface IProject extends Document {
  name: string;
  code: string;
  description?: string;
  createdAt: Date;
  updatedAt: Date;
  userId: mongoose.Types.ObjectId;
  dbSourceType?: string;
  dbSourceHost?: string;
  dbSourcePort?: string;
  dbSourceName?: string;
  dbSourceUser?: string;
  dbSourcePassword?: string;
  dbSourceOptions?: Record<string, any>;
  schemaData?: SchemaData;
  obfuscationConfig?: ObfuscationConfig;
  dbDestUri?: string;
  dbDestName?: string;
  mongodbUrl?: string;
  mongodbName?: string;
}

// Crear el esquema para el modelo de proyecto
const ProjectSchema = new Schema<IProject>(
  {
    name: {
      type: String,
      required: [true, 'El nombre del proyecto es requerido'],
      trim: true,
    },
    code: {
      type: String,
      required: [true, 'El código del proyecto es requerido'],
      trim: true,
      unique: true,
    },
    description: {
      type: String,
      trim: true,
    },
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'El usuario es requerido'],
    },
    dbSourceType: String,
    dbSourceHost: String,
    dbSourcePort: String,
    dbSourceName: String,
    dbSourceUser: String,
    dbSourcePassword: {
      type: String,
      select: false, // No incluir en las consultas por defecto
    },
    dbSourceOptions: {
      type: Object,
      default: {},
    },
    schemaData: {
      type: Object,
      default: null,
    },
    obfuscationConfig: {
      type: Object,
      default: null,
    },
    dbDestUri: String,
    dbDestName: String,
    mongodbUrl: String,
    mongodbName: String,
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt
  }
);

// Crear índices
ProjectSchema.index({ name: 1, userId: 1 });
ProjectSchema.index({ code: 1 }, { unique: true });

// Método para generar un código único basado en el nombre
ProjectSchema.pre('save', async function(next) {
  if (this.isNew && !this.code) {
    // Generar código basado en el nombre (letras mayúsculas y números)
    const baseCode = this.name
      .toUpperCase()
      .replace(/[^A-Z0-9]/g, '')
      .substring(0, 5);
    
    // Añadir un número aleatorio para asegurar unicidad
    const randomNum = Math.floor(1000 + Math.random() * 9000);
    this.code = `${baseCode}${randomNum}`;
  }
  next();
});

// Crear y exportar el modelo
export const Project = mongoose.model<IProject>('Project', ProjectSchema);

// Exportar una función para crear un proyecto de ejemplo
export const createDefaultProject = async (userId: mongoose.Types.ObjectId): Promise<void> => {
  try {
    const projectCount = await Project.countDocuments({ userId });
    
    if (projectCount === 0) {
      await Project.create({
        name: 'Proyecto de Demostración',
        code: 'DEMO1000',
        description: 'Un proyecto de ejemplo para mostrar las capacidades de la herramienta',
        userId,
      });
      
      console.log('Proyecto predeterminado creado');
    }
  } catch (error) {
    console.error('Error al crear el proyecto predeterminado:', error);
  }
};