import { pgTable, text, serial, integer, boolean, json, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// User table schema
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").notNull().default("user"), // admin or user
  lastLogin: timestamp("last_login"),
});

export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
});

// Projects table schema
export const projects = pgTable("projects", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  code: text("code").notNull().unique(),
  description: text("description"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  dbSourceType: text("db_source_type"),
  dbSourceHost: text("db_source_host"),
  dbSourcePort: text("db_source_port"),
  dbSourceName: text("db_source_name"),
  dbDestUri: text("db_dest_uri"),
  dbDestName: text("db_dest_name"),
  schema: json("schema").$type<SchemaData>(),
  obfuscationConfig: json("obfuscation_config").$type<ObfuscationConfig>(),
  backupKey: text("backup_key"),
  backupPath: text("backup_path"),
  state: text("state").default("created").notNull(), // created, extraction, analysis, obfuscation, backup, migration, completed
  mongodbUrl: text("mongodb_url"),
});

export const insertProjectSchema = createInsertSchema(projects).omit({
  id: true,
  createdAt: true,
  schema: true,
  obfuscationConfig: true,
  backupKey: true,
  backupPath: true,
});

// Project users junction table
export const projectUsers = pgTable("project_users", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").notNull().references(() => projects.id),
  userId: integer("user_id").notNull().references(() => users.id),
});

export const insertProjectUserSchema = createInsertSchema(projectUsers).omit({
  id: true,
});

// Logs table schema
export const logs = pgTable("logs", {
  id: serial("id").primaryKey(),
  projectId: integer("project_id").references(() => projects.id),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
  type: text("type").notNull(), // info, warning, error
  message: text("message").notNull(),
  details: text("details"),
});

export const insertLogSchema = createInsertSchema(logs).omit({
  id: true,
  timestamp: true,
});

// Settings table schema
export const settings = pgTable("settings", {
  id: serial("id").primaryKey(),
  mongodbUri: text("mongodb_uri"),
  mongodbName: text("mongodb_name"),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
  tableLimit: integer("table_limit").default(100),
  batchSize: integer("batch_size").default(1000),
  connectionTimeout: integer("connection_timeout").default(30),
  debugMode: boolean("debug_mode").default(false),
});

export const insertSettingsSchema = createInsertSchema(settings).omit({
  id: true,
  updatedAt: true,
});

// Types for complex JSON structures
export type ColumnData = {
  name: string;
  dataType: string;
  nullable: boolean;
  isKey: boolean;
  maxLength?: number;
};

export type SampleData = Record<string, any>[];

export type TableData = {
  columns: ColumnData[];
  sampleData: SampleData;
};

export type RelationData = {
  sourceTable: string;
  sourceColumn: string;
  targetTable: string;
  targetColumn: string;
};

export type SchemaData = {
  tables: Record<string, TableData>;
  relations: RelationData[];
};

export type SensitiveFieldData = {
  score: number;
  reasons: string[];
  recommendation: string;
};

export type ObfuscationConfig = {
  [table: string]: {
    [column: string]: {
      method: 'hash' | 'mask' | 'random' | 'shuffle' | 'none';
      parameters?: Record<string, any>;
    };
  };
};

export type BackupData = {
  id: string;
  timestamp: string;
  tables: string[];
  recordCount: number;
  size: number;
  encryptionKey: string;
};

export type MigrationPlan = {
  destination: {
    uri: string;
    db: string;
  };
  mapping: {
    [sqlTable: string]: {
      collection: string;
      indices: string[];
      embedded: {
        [relatedTable: string]: {
          relation: 'one_to_one' | 'one_to_many';
          fields: string[];
        };
      };
    };
  };
  batchSize: number;
};

export type MigrationStatus = {
  status: 'pending' | 'in_progress' | 'completed' | 'error';
  progress: {
    totalTables: number;
    completedTables: number;
    processedRecords: number;
    totalRecords: number;
    currentTable: string;
    percentage: number;
    elapsedTime: number;
    estimatedTime: number;
  };
  errors: {
    table: string;
    message: string;
    timestamp: string;
  }[];
};

export type DbConnection = {
  host: string;
  port: string;
  user: string;
  password: string;
  database: string;
  type: 'mysql' | 'postgresql' | 'sqlserver' | 'oracle';
  ssl?: boolean;
  timeout?: number;
  maxRows?: number;
  options?: Record<string, any>;
};

// Export types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

export type Project = typeof projects.$inferSelect;
export type InsertProject = z.infer<typeof insertProjectSchema>;

export type ProjectUser = typeof projectUsers.$inferSelect;
export type InsertProjectUser = z.infer<typeof insertProjectUserSchema>;

export type Log = typeof logs.$inferSelect;
export type InsertLog = z.infer<typeof insertLogSchema>;

export type Setting = typeof settings.$inferSelect;
export type InsertSetting = z.infer<typeof insertSettingsSchema>;
