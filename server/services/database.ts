import { DbConnection } from "@shared/schema";
import pg from "pg";
import mysql from "mysql2/promise";
import mssql from "mssql";

const PgClient = pg.Client;

// Test database connection
export async function testDatabaseConnection(connection: DbConnection): Promise<{ success: boolean; error?: string }> {
  try {
    switch (connection.type) {
      case "postgresql": {
        const client = new PgClient({
          host: connection.host,
          port: parseInt(connection.port),
          user: connection.user,
          password: connection.password,
          database: connection.database,
          ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: connection.timeout || 5000,
        });

        await client.connect();
        await client.query('SELECT 1');
        await client.end();
        return { success: true };
      }

      case "mysql": {
        const conn = await mysql.createConnection({
          host: connection.host,
          port: parseInt(connection.port),
          user: connection.user,
          password: connection.password,
          database: connection.database,
          ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
          connectTimeout: connection.timeout || 5000,
        });

        await conn.query('SELECT 1');
        await conn.end();
        return { success: true };
      }

      case "sqlserver": {
        const config = {
          server: connection.host,
          port: parseInt(connection.port),
          user: connection.user,
          password: connection.password,
          database: connection.database,
          options: {
            encrypt: connection.ssl || false,
            trustServerCertificate: true,
            connectTimeout: connection.timeout || 5000,
          }
        };
        const pool = await new mssql.ConnectionPool(config).connect();

        await pool.request().query('SELECT 1');
        await pool.close();
        return { success: true };
      }

      default:
        return { success: false, error: `Tipo de base de datos no soportado: ${connection.type}` };
    }
  } catch (error) {
    console.error("Error de conexión a base de datos:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Error desconocido"
    };
  }
}

// Connect to database and return client instance
export async function connectToDatabase(connection: DbConnection): Promise<any> {
  try {
    switch (connection.type) {
      case "postgresql": {
        const client = new PgClient({
          host: connection.host,
          port: parseInt(connection.port),
          user: connection.user,
          password: connection.password,
          database: connection.database,
          ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
          connectionTimeoutMillis: connection.timeout || 5000,
        });

        await client.connect();
        return client;
      }

      case "mysql": {
        const conn = await mysql.createConnection({
          host: connection.host,
          port: parseInt(connection.port),
          user: connection.user,
          password: connection.password,
          database: connection.database,
          ssl: connection.ssl ? { rejectUnauthorized: false } : undefined,
          connectTimeout: connection.timeout || 5000,
        });

        return conn;
      }

      case "sqlserver": {
        const config = {
          server: connection.host,
          port: parseInt(connection.port),
          user: connection.user,
          password: connection.password,
          database: connection.database,
          options: {
            encrypt: connection.ssl || false,
            trustServerCertificate: true,
            connectTimeout: connection.timeout || 5000,
          }
        };
        const pool = await new mssql.ConnectionPool(config).connect();

        return pool;
      }

      default:
        throw new Error(`Tipo de base de datos no soportado: ${connection.type}`);
    }
  } catch (error) {
    console.error("Error conectando a base de datos:", error);
    throw error;
  }
}