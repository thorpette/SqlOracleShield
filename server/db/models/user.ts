import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcrypt';
import { log } from '../../vite';

// Definir la interfaz para el documento de usuario
export interface IUser extends Document {
  email: string;
  password: string;
  name: string;
  role: 'admin' | 'user';
  lastLogin?: Date;
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Crear el esquema para el modelo de usuario
const UserSchema = new Schema<IUser>(
  {
    email: {
      type: String,
      required: [true, 'El correo electrónico es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      validate: {
        validator: function(v: string) {
          return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
        },
        message: props => `${props.value} no es un correo electrónico válido`,
      },
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
      select: false, // No incluir en las consultas por defecto
    },
    name: {
      type: String,
      required: [true, 'El nombre es requerido'],
      trim: true,
    },
    role: {
      type: String,
      enum: {
        values: ['admin', 'user'],
        message: '{VALUE} no es un rol válido',
      },
      default: 'user',
    },
    lastLogin: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt
  }
);

// Hash de la contraseña antes de guardar
UserSchema.pre('save', async function(next) {
  const user = this;
  
  // Solo hash la contraseña si ha sido modificada o es nueva
  if (!user.isModified('password')) return next();
  
  try {
    // Generar salt
    const salt = await bcrypt.genSalt(10);
    
    // Hash de la contraseña
    const hash = await bcrypt.hash(user.password, salt);
    
    // Reemplazar la contraseña en texto plano con el hash
    user.password = hash;
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function(candidatePassword: string): Promise<boolean> {
  try {
    const userDoc = await User.findById(this._id).select('+password');
    if (!userDoc) return false;
    
    const hashedPassword = userDoc.get('password') as string;
    if (!hashedPassword) return false;
    
    return await bcrypt.compare(candidatePassword, hashedPassword);
  } catch (error) {
    console.error('Error al comparar contraseñas:', error);
    return false;
  }
};

// Crear índices
UserSchema.index({ email: 1 }, { unique: true });
UserSchema.index({ role: 1 });

// Crear y exportar el modelo
export const User = mongoose.model<IUser>('User', UserSchema);

// Función para crear el usuario administrador predeterminado
export const createDefaultAdminUser = async (): Promise<void> => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    if (adminCount === 0) {
      await User.create({
        email: 'admin@ejemplo.com',
        password: 'admin123',
        name: 'Administrador',
        role: 'admin',
      });
      
      log('Usuario administrador predeterminado creado', 'user-model');
    }
  } catch (error) {
    log(`Error al crear el usuario administrador predeterminado: ${error}`, 'user-model');
  }
};

// Función para crear el usuario normal predeterminado
export const createDefaultUser = async (): Promise<void> => {
  try {
    const userCount = await User.countDocuments({ role: 'user' });
    
    if (userCount === 0) {
      await User.create({
        email: 'usuario@ejemplo.com',
        password: 'usuario123',
        name: 'Usuario',
        role: 'user',
      });
      
      log('Usuario predeterminado creado', 'user-model');
    }
  } catch (error) {
    log(`Error al crear el usuario predeterminado: ${error}`, 'user-model');
  }
};