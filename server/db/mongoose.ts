import mongoose from 'mongoose';
import { log } from '../vite';

// Connection URL
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/sqlprocessor';

// Connect to MongoDB
export async function connectToMongoDB(): Promise<mongoose.Connection> {
  try {
    log('Conectando a MongoDB...', 'mongoose');
    await mongoose.connect(MONGODB_URI);
    log('Conexión a MongoDB establecida con éxito', 'mongoose');
    return mongoose.connection;
  } catch (error) {
    log(`Error conectando a MongoDB: ${error}`, 'mongoose');
    throw error;
  }
}

// Disconnect from MongoDB
export async function disconnectFromMongoDB(): Promise<void> {
  try {
    await mongoose.disconnect();
    log('Desconexión de MongoDB exitosa', 'mongoose');
  } catch (error) {
    log(`Error al desconectar de MongoDB: ${error}`, 'mongoose');
    throw error;
  }
}

// Handle MongoDB connection events
mongoose.connection.on('connected', () => {
  log('MongoDB conectado', 'mongoose');
});

mongoose.connection.on('error', (err) => {
  log(`Error de conexión a MongoDB: ${err}`, 'mongoose');
});

mongoose.connection.on('disconnected', () => {
  log('MongoDB desconectado', 'mongoose');
});

// Handle process termination
process.on('SIGINT', async () => {
  await mongoose.disconnect();
  log('Aplicación terminada, MongoDB desconectado', 'mongoose');
  process.exit(0);
});