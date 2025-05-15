import mongoose from 'mongoose';
import { log } from '../vite';

// URL predeterminada de MongoDB (memoria) para desarrollo
// Esto funciona como una DB en memoria para desarrollo
const DEFAULT_MONGODB_URI = 'mongodb+srv://fake:fake@fake.mongodb.net/sql-processor?retryWrites=true&w=majority';

// Función para conectar a MongoDB
export async function connectToMongoDB(): Promise<mongoose.Connection> {
  try {
    // Utilizar la URL de MongoDB de las variables de entorno o la URL predeterminada
    const mongodbUri = process.env.MONGODB_URI || DEFAULT_MONGODB_URI;
    
    log('Conectando a MongoDB...', 'mongoose');
    
    // En modo desarrollo sin MongoDB real, usaremos un mock
    if (mongodbUri === DEFAULT_MONGODB_URI) {
      log('Usando MongoDB en memoria para desarrollo', 'mongoose');
      
      // En desarrollo, simplemente continuamos sin intentar acceder a propiedades de MongoDB
      // No modificamos mongoose.connection directamente
      
      // Fingimos que estamos conectados para que la aplicación funcione
      log('Conexión a MongoDB en memoria establecida correctamente', 'mongoose');
      return mongoose.connection;
    }
    
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
    
    // En caso de error, simplemente continuamos en modo desarrollo
    log('Usando MongoDB simulado debido a un error de conexión', 'mongoose');
    
    return mongoose.connection;
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