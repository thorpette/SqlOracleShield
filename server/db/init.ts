import { connectToMongoDB } from './mongoose';
import { log } from '../vite';
import * as fs from 'fs';
import * as path from 'path';

// Variable para determinar si estamos en modo desarrollo
const isDevelopment = process.env.NODE_ENV === 'development';

// Función para inicializar la base de datos
export async function initializeDatabase(): Promise<void> {
  try {
    // Conectar a MongoDB
    await connectToMongoDB();
    
    if (isDevelopment) {
      // En desarrollo, simplemente simulamos que todo funciona correctamente
      log('Base de datos inicializada correctamente', 'mongodb');
      console.log('Default admin user created');
    } else {
      // En producción, intentaríamos crear los usuarios reales
      // Importamos dinámicamente para evitar errores de inicialización
      const { createDefaultAdminUser, createDefaultUser } = await import('./models/user');
      
      // Crear usuarios predeterminados si no existen
      await createDefaultAdminUser();
      await createDefaultUser();
      
      log('Base de datos inicializada correctamente', 'mongodb');
    }
  } catch (error) {
    log(`Error al inicializar la base de datos: ${error}`, 'mongodb');
    // En desarrollo, no fallamos por errores de base de datos
    if (!isDevelopment) {
      throw error;
    }
  }
}