import { MongoClient, Db } from 'mongodb';
import { log } from '../vite';

// Interfaz para la configuración de MongoDB
export interface MongoDBConfig {
  uri: string;
  dbName: string;
}

// Función para probar la conexión a MongoDB
export async function testMongoDBConnection(
  uri: string,
  dbName: string
): Promise<{ success: boolean; error?: string }> {
  let client: MongoClient | null = null;
  
  try {
    log(`Probando conexión a MongoDB: ${uri}, DB: ${dbName}`, 'mongodb-service');
    
    // Crear una nueva instancia del cliente de MongoDB
    client = new MongoClient(uri);
    
    // Conectar al servidor
    await client.connect();
    
    // Intentar acceder a la base de datos
    const db = client.db(dbName);
    
    // Verificar que podemos acceder a las colecciones
    const collections = await db.listCollections().toArray();
    
    log(`Conexión exitosa. Colecciones disponibles: ${collections.length}`, 'mongodb-service');
    
    return { success: true };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    log(`Error al conectar a MongoDB: ${errorMessage}`, 'mongodb-service');
    
    return { 
      success: false,
      error: `Error al conectar a MongoDB: ${errorMessage}`
    };
  } finally {
    // Cerrar la conexión si se estableció
    if (client) {
      await client.close();
    }
  }
}

// Función para obtener un cliente MongoDB
export async function getMongoDBClient(
  uri: string,
  dbName: string
): Promise<{ client: MongoClient; db: Db }> {
  try {
    // Crear una nueva instancia del cliente de MongoDB
    const client = new MongoClient(uri);
    
    // Conectar al servidor
    await client.connect();
    
    // Acceder a la base de datos
    const db = client.db(dbName);
    
    return { client, db };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
    log(`Error al obtener cliente MongoDB: ${errorMessage}`, 'mongodb-service');
    throw error;
  }
}