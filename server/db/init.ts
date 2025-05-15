import { connectToMongoDB } from './mongoose';
import { createDefaultAdminUser, createDefaultUser } from './models/user';
import { log } from '../vite';

// Función para inicializar la base de datos
export async function initializeDatabase(): Promise<void> {
  try {
    // Conectar a MongoDB
    await connectToMongoDB();
    
    // Crear usuarios predeterminados si no existen
    await createDefaultAdminUser();
    await createDefaultUser();
    
    log('Base de datos inicializada correctamente', 'mongodb');
  } catch (error) {
    log(`Error al inicializar la base de datos: ${error}`, 'mongodb');
    throw error;
  }
}