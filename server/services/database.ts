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

// Extract database schema function
export async function extractDatabaseSchema(
  client: any,
  connection: DbConnection,
  tableLimit: number = 100
): Promise<any> {
  try {
    const schemas: any = { tables: {}, relations: [] };
    
    switch (connection.type) {
      case "postgresql": {
        // Get all tables in the public schema
        const tablesResult = await client.query(
          `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
           LIMIT $1`,
          [tableLimit]
        );
        
        // Extract columns for each table and sample data
        for (const table of tablesResult.rows) {
          const tableName = table.table_name;
          
          // Get columns
          const columnsResult = await client.query(
            `SELECT column_name, data_type, is_nullable, 
                   CASE WHEN column_name IN (
                     SELECT constraint_column_usage.column_name FROM information_schema.table_constraints
                     INNER JOIN information_schema.constraint_column_usage USING (constraint_name)
                     WHERE table_constraints.constraint_type = 'PRIMARY KEY' 
                     AND constraint_column_usage.table_name = $1
                   ) THEN true ELSE false END as is_key,
                   CASE WHEN data_type = 'character varying' 
                     THEN character_maximum_length ELSE null END as max_length
            FROM information_schema.columns
            WHERE table_name = $1`,
            [tableName]
          );
          
          // Get sample data
          const sampleDataResult = await client.query(
            `SELECT * FROM "${tableName}" LIMIT $1`,
            [connection.maxRows || 10]
          );
          
          // Build column metadata
          const columns = columnsResult.rows.map((col: any) => ({
            name: col.column_name,
            dataType: col.data_type,
            nullable: col.is_nullable === 'YES',
            isKey: col.is_key,
            maxLength: col.max_length,
          }));
          
          // Add table to schema
          schemas.tables[tableName] = {
            columns,
            sampleData: sampleDataResult.rows,
          };
        }
        
        // Get foreign key relationships
        const relationsResult = await client.query(
          `SELECT 
            tc.constraint_name,
            tc.table_name as source_table, 
            kcu.column_name as source_column, 
            ccu.table_name AS target_table, 
            ccu.column_name AS target_column
          FROM information_schema.table_constraints tc
          JOIN information_schema.key_column_usage kcu
            ON tc.constraint_name = kcu.constraint_name
            AND tc.table_schema = kcu.table_schema
          JOIN information_schema.constraint_column_usage ccu
            ON ccu.constraint_name = tc.constraint_name
            AND ccu.table_schema = tc.table_schema
          WHERE tc.constraint_type = 'FOREIGN KEY'`
        );
        
        // Build relations
        schemas.relations = relationsResult.rows.map((rel: any) => ({
          sourceTable: rel.source_table,
          sourceColumn: rel.source_column,
          targetTable: rel.target_table,
          targetColumn: rel.target_column,
        }));
        
        break;
      }
      
      case "mysql": {
        // Get database name
        const dbName = connection.database;
        
        // Get all tables
        const [tablesResult] = await client.query(
          `SELECT table_name FROM information_schema.tables 
           WHERE table_schema = ? AND table_type = 'BASE TABLE'
           LIMIT ?`,
          [dbName, tableLimit]
        );
        
        // Extract columns for each table and sample data
        for (const table of tablesResult) {
          const tableName = table.table_name;
          
          // Get columns
          const [columnsResult] = await client.query(
            `SELECT column_name, data_type, is_nullable, 
                   IF(column_key = 'PRI', true, false) as is_key,
                   character_maximum_length as max_length
            FROM information_schema.columns
            WHERE table_schema = ? AND table_name = ?`,
            [dbName, tableName]
          );
          
          // Get sample data
          const [sampleDataResult] = await client.query(
            `SELECT * FROM \`${tableName}\` LIMIT ?`,
            [connection.maxRows || 10]
          );
          
          // Build column metadata
          const columns = columnsResult.map((col: any) => ({
            name: col.column_name,
            dataType: col.data_type,
            nullable: col.is_nullable === 'YES',
            isKey: col.is_key,
            maxLength: col.max_length,
          }));
          
          // Add table to schema
          schemas.tables[tableName] = {
            columns,
            sampleData: sampleDataResult,
          };
        }
        
        // Get foreign key relationships
        const [relationsResult] = await client.query(
          `SELECT 
            table_name as source_table,
            column_name as source_column,
            referenced_table_name as target_table,
            referenced_column_name as target_column
          FROM information_schema.key_column_usage
          WHERE referenced_table_schema = ? 
            AND referenced_table_name IS NOT NULL`,
          [dbName]
        );
        
        // Build relations
        schemas.relations = relationsResult.map((rel: any) => ({
          sourceTable: rel.source_table,
          sourceColumn: rel.source_column,
          targetTable: rel.target_table,
          targetColumn: rel.target_column,
        }));
        
        break;
      }
      
      case "sqlserver": {
        // Get all tables
        const tablesResult = await client.request()
          .input('limit', mssql.Int, tableLimit)
          .query(
            `SELECT TOP (@limit) TABLE_NAME as table_name 
             FROM INFORMATION_SCHEMA.TABLES 
             WHERE TABLE_TYPE = 'BASE TABLE'`
          );
        
        // Extract columns for each table and sample data
        for (const table of tablesResult.recordset) {
          const tableName = table.table_name;
          
          // Get columns
          const columnsResult = await client.request()
            .input('tableName', mssql.VarChar, tableName)
            .query(
              `SELECT 
                c.COLUMN_NAME as column_name, 
                c.DATA_TYPE as data_type, 
                c.IS_NULLABLE as is_nullable,
                CASE WHEN pk.COLUMN_NAME IS NOT NULL THEN 1 ELSE 0 END as is_key,
                c.CHARACTER_MAXIMUM_LENGTH as max_length
              FROM INFORMATION_SCHEMA.COLUMNS c
              LEFT JOIN (
                SELECT ku.TABLE_CATALOG, ku.TABLE_SCHEMA, ku.TABLE_NAME, ku.COLUMN_NAME
                FROM INFORMATION_SCHEMA.TABLE_CONSTRAINTS tc
                JOIN INFORMATION_SCHEMA.KEY_COLUMN_USAGE ku 
                  ON tc.CONSTRAINT_TYPE = 'PRIMARY KEY' 
                  AND tc.CONSTRAINT_NAME = ku.CONSTRAINT_NAME
              ) pk 
              ON c.TABLE_CATALOG = pk.TABLE_CATALOG
                AND c.TABLE_SCHEMA = pk.TABLE_SCHEMA
                AND c.TABLE_NAME = pk.TABLE_NAME
                AND c.COLUMN_NAME = pk.COLUMN_NAME
              WHERE c.TABLE_NAME = @tableName`
            );
          
          // Get sample data
          const sampleDataResult = await client.request()
            .input('tableName', mssql.VarChar, tableName)
            .input('maxRows', mssql.Int, connection.maxRows || 10)
            .query(`SELECT TOP (@maxRows) * FROM [${tableName}]`);
          
          // Build column metadata
          const columns = columnsResult.recordset.map((col: any) => ({
            name: col.column_name,
            dataType: col.data_type,
            nullable: col.is_nullable === 'YES',
            isKey: !!col.is_key,
            maxLength: col.max_length,
          }));
          
          // Add table to schema
          schemas.tables[tableName] = {
            columns,
            sampleData: sampleDataResult.recordset,
          };
        }
        
        // Get foreign key relationships
        const relationsResult = await client.request().query(
          `SELECT 
            obj.name AS FK_NAME,
            sch.name AS source_schema,
            tab1.name AS source_table,
            col1.name AS source_column,
            sch2.name AS target_schema,
            tab2.name AS target_table,
            col2.name AS target_column
          FROM sys.foreign_key_columns fkc
          INNER JOIN sys.objects obj ON obj.object_id = fkc.constraint_object_id
          INNER JOIN sys.tables tab1 ON tab1.object_id = fkc.parent_object_id
          INNER JOIN sys.schemas sch ON tab1.schema_id = sch.schema_id
          INNER JOIN sys.columns col1 ON col1.column_id = fkc.parent_column_id AND col1.object_id = tab1.object_id
          INNER JOIN sys.tables tab2 ON tab2.object_id = fkc.referenced_object_id
          INNER JOIN sys.schemas sch2 ON tab2.schema_id = sch2.schema_id
          INNER JOIN sys.columns col2 ON col2.column_id = fkc.referenced_column_id AND col2.object_id = tab2.object_id`
        );
        
        // Build relations
        schemas.relations = relationsResult.recordset.map((rel: any) => ({
          sourceTable: rel.source_table,
          sourceColumn: rel.source_column,
          targetTable: rel.target_table,
          targetColumn: rel.target_column,
        }));
        
        break;
      }
      
      default:
        throw new Error(`Tipo de base de datos no soportado: ${connection.type}`);
    }
    
    return schemas;
  } catch (error) {
    console.error("Error extracting database schema:", error);
    throw error;
  }
}