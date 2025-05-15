import { MongoClient } from "mongodb";

// Test MongoDB connection
export async function testMongoDBConnection(
  uri: string,
  dbName: string
): Promise<{ success: boolean; error?: string }> {
  let client: MongoClient | null = null;
  
  try {
    client = new MongoClient(uri, {
      serverSelectionTimeoutMS: 5000
    });
    
    await client.connect();
    
    // Test connection by getting the database info
    const db = client.db(dbName);
    await db.command({ ping: 1 });
    
    return { success: true };
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  } finally {
    if (client) {
      await client.close();
    }
  }
}

// Get MongoDB client
export async function getMongoDBClient(
  uri: string
): Promise<MongoClient> {
  try {
    const client = new MongoClient(uri);
    await client.connect();
    return client;
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
    throw error;
  }
}