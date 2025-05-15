import mongoose, { Document, Schema } from 'mongoose';
import { hashPassword, comparePassword } from '../../controllers/auth';

// Definir la interfaz para el documento de usuario
export interface IUser extends Document {
  fullName: string;
  email: string;
  password: string;
  employeeNumber: string;
  role: 'admin' | 'user';
  createdAt: Date;
  updatedAt: Date;
  comparePassword(candidatePassword: string): Promise<boolean>;
}

// Crear el esquema para el modelo de usuario
const UserSchema = new Schema<IUser>(
  {
    fullName: {
      type: String,
      required: [true, 'El nombre completo es requerido'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'El correo electrónico es requerido'],
      unique: true,
      trim: true,
      lowercase: true,
      match: [/^\S+@\S+\.\S+$/, 'Por favor ingrese un correo electrónico válido'],
    },
    password: {
      type: String,
      required: [true, 'La contraseña es requerida'],
      minlength: [6, 'La contraseña debe tener al menos 6 caracteres'],
    },
    employeeNumber: {
      type: String,
      required: [true, 'El número de empleado es requerido'],
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
  },
  {
    timestamps: true, // Agrega createdAt y updatedAt
    toJSON: {
      transform: (_, ret) => {
        delete ret.password; // No incluir la contraseña en las respuestas JSON
        return ret;
      },
    },
  }
);

// Middleware pre-save para hash de contraseñas
UserSchema.pre('save', async function (next) {
  // Solo hashear la contraseña si se ha modificado o es nueva
  if (!this.isModified('password')) return next();
  
  try {
    this.password = await hashPassword(this.password);
    next();
  } catch (error) {
    next(error as Error);
  }
});

// Método para comparar contraseñas
UserSchema.methods.comparePassword = async function (candidatePassword: string): Promise<boolean> {
  return comparePassword(candidatePassword, this.password);
};

// Crear y exportar el modelo
export const User = mongoose.model<IUser>('User', UserSchema);

// Crear usuario admin por defecto si no existe
export const createDefaultAdminUser = async (): Promise<void> => {
  try {
    const adminCount = await User.countDocuments({ role: 'admin' });
    
    if (adminCount === 0) {
      await User.create({
        fullName: 'Administrador',
        email: 'admin@ejemplo.com',
        password: 'admin123',
        employeeNumber: 'ADMIN001',
        role: 'admin',
      });
      
      console.log('Usuario administrador predeterminado creado');
    }
  } catch (error) {
    console.error('Error al crear el usuario administrador predeterminado:', error);
  }
};

// También crear un usuario normal por defecto
export const createDefaultUser = async (): Promise<void> => {
  try {
    const regularUserExists = await User.findOne({ email: 'usuario@ejemplo.com' });
    
    if (!regularUserExists) {
      await User.create({
        fullName: 'Usuario Normal',
        email: 'usuario@ejemplo.com',
        password: 'usuario123',
        employeeNumber: 'USER001',
        role: 'user',
      });
      
      console.log('Usuario normal predeterminado creado');
    }
  } catch (error) {
    console.error('Error al crear el usuario normal predeterminado:', error);
  }
};