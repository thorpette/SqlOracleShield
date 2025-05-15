import { connectToMongoDB } from './mongoose';
import { log } from '../vite';
import { storage } from '../storage';
import { hashPassword } from '../controllers/auth';

// Variable para determinar si estamos en modo desarrollo
const isDevelopment = process.env.NODE_ENV === 'development';

// Función para inicializar la base de datos
export async function initializeDatabase(): Promise<void> {
  try {
    // Conectar a MongoDB
    await connectToMongoDB();
    
    // Para desarrollo, usamos MemStorage para crear los usuarios predeterminados
    // En producción, usaríamos MongoDB pero necesitamos configurarlo bien primero
    try {
      // Revisar si ya existe un usuario admin
      const adminUser = await storage.getUserByEmail('admin@ejemplo.com');
      
      if (!adminUser) {
        // Crear usuario admin
        const hashedPassword = await hashPassword('admin123');
        await storage.createUser({
          name: 'Administrador',
          email: 'admin@ejemplo.com',
          password: hashedPassword,
          role: 'admin',
          lastLogin: null
        });
        log('Usuario administrador predeterminado creado', 'storage');
      }
      
      // Revisar si ya existe un usuario regular
      const regularUser = await storage.getUserByEmail('usuario@ejemplo.com');
      
      if (!regularUser) {
        // Crear usuario regular
        const hashedPassword = await hashPassword('usuario123');
        await storage.createUser({
          name: 'Usuario',
          email: 'usuario@ejemplo.com',
          password: hashedPassword,
          role: 'user',
          lastLogin: null
        });
        log('Usuario regular predeterminado creado', 'storage');
      }
    } catch (userError) {
      // Manejar errores al crear usuarios pero continuar con la inicialización
      log(`Error al crear usuarios predeterminados: ${userError}`, 'storage');
    }
    
    log('Base de datos inicializada correctamente', 'mongodb');
  } catch (error) {
    log(`Error al inicializar la base de datos: ${error}`, 'mongodb');
    // En desarrollo, no fallamos por errores de base de datos
    if (!isDevelopment) {
      throw error;
    }
  }
}