import mongoose from 'mongoose';
import { log } from '../vite';

// URL predeterminada de MongoDB (local)
const DEFAULT_MONGODB_URI = 'mongodb://127.0.0.1:27017/sql-processor';

// Función para conectar a MongoDB
export async function connectToMongoDB(): Promise<mongoose.Connection> {
  try {
    // Utilizar la URL de MongoDB de las variables de entorno o la URL predeterminada
    const mongodbUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
    
    log('Conectando a MongoDB...', 'mongoose');
    
    // Configurar opciones de conexión
    await mongoose.connect(mongodbUri, {
      // Las opciones se definen automáticamente en mongoose 7+
    });
    
    log('Conexión a MongoDB establecida correctamente', 'mongoose');
    
    const db = mongoose.connection;
    
    // Manejar eventos de conexión
    db.on('error', (error) => {
      log(`Error en la conexión a MongoDB: ${error}`, 'mongoose');
    });
    
    db.on('disconnected', () => {
      log('Desconectado de MongoDB', 'mongoose');
    });
    
    return db;
  } catch (error) {
    log(`Error al conectar a MongoDB: ${error}`, 'mongoose');
    throw error;
  }
}

// Función para desconectar de MongoDB
export async function disconnectFromMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    log('Desconectado de MongoDB', 'mongoose');
  } catch (error) {
    log(`Error al desconectar de MongoDB: ${error}`, 'mongoose');
    throw error;
  }
}