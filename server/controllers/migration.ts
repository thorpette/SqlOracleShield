import { Request, Response } from "express";
import { storage } from "../storage";
import { User, BackupData, MigrationStatus } from "@shared/schema";
import { testMongoDBConnection } from "../services/mongodb";
import crypto from "crypto";
import path from "path";
import fs from "fs";
import { promisify } from "util";
import { obfuscateData } from "../services/obfuscation";

// Create encryption key from password
const deriveEncryptionKey = async (password: string, salt: Buffer): Promise<Buffer> => {
  return new Promise((resolve, reject) => {
    crypto.scrypt(password, salt, 32, (err, key) => {
      if (err) reject(err);
      resolve(key);
    });
  });
};

// Encrypt data
const encryptData = async (data: string, password: string): Promise<{ iv: string, encryptedData: string, salt: string }> => {
  const salt = crypto.randomBytes(16);
  const key = await deriveEncryptionKey(password, salt);
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(data, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  return {
    iv: iv.toString('hex'),
    encryptedData: encrypted,
    salt: salt.toString('hex')
  };
};

// Mock backups for demonstration
const mockBackups: Record<string, BackupData> = {};

// Get all backups for a project
export const getBackups = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Check if user has access to the project
    const user = req.user as User;
    if (user.role !== "admin") {
      const projectUsers = await storage.getProjectUsers(projectId);
      const userIds = projectUsers.map(u => u.id);
      
      if (!userIds.includes(user.id)) {
        return res.status(403).json({ message: "No tienes permiso para acceder a este proyecto" });
      }
    }
    
    // Get backups for project (mock implementation)
    const backups = Object.values(mockBackups).filter(b => b.id.startsWith(`${projectId}-`));
    
    res.json(backups);
  } catch (error) {
    console.error("Error al obtener respaldos:", error);
    res.status(500).json({ 
      message: "Error al obtener respaldos",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Create backup for a project
export const createBackup = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Check if user has access to the project
    const user = req.user as User;
    if (user.role !== "admin") {
      const projectUsers = await storage.getProjectUsers(projectId);
      const userIds = projectUsers.map(u => u.id);
      
      if (!userIds.includes(user.id)) {
        return res.status(403).json({ message: "No tienes permiso para modificar este proyecto" });
      }
    }
    
    // Check if schema exists
    if (!project.schema) {
      return res.status(400).json({ message: "El esquema no ha sido extraído aún" });
    }
    
    // Get password from request
    const { password } = req.body;
    
    if (!password || password.length < 8) {
      return res.status(400).json({ 
        message: "La contraseña debe tener al menos 8 caracteres" 
      });
    }
    
    // Generate a unique backup ID
    const backupId = `${projectId}-${Date.now()}`;
    
    // Get tables from schema
    const tables = Object.keys(project.schema.tables);
    
    // Mock backup creation
    const encryptionKey = crypto.randomBytes(16).toString('hex');
    
    const backupData: BackupData = {
      id: backupId,
      timestamp: new Date().toISOString(),
      tables,
      recordCount: 1000, // Mock record count
      size: 1024 * 1024, // Mock size (1MB)
      encryptionKey // Mock encryption key
    };
    
    // Store backup info
    mockBackups[backupId] = backupData;
    
    // Update project with backup path and key (in a real implementation, would be stored securely)
    const updatedProject = await storage.updateProject(projectId, {
      backupKey: encryptionKey,
      backupPath: `/backups/${backupId}.zip`,
      state: project.state === "obfuscation" ? "backup" : project.state
    });
    
    // Log backup creation
    await storage.createLog({
      projectId: projectId,
      type: "info",
      message: `Respaldo creado por ${user.fullName}`,
      details: `Respaldo ${backupId} con ${tables.length} tablas`
    });
    
    res.json({ 
      message: "Respaldo creado correctamente",
      backupId,
      encryptionKey,
      path: `/backups/${backupId}.zip`
    });
  } catch (error) {
    console.error("Error al crear respaldo:", error);
    res.status(500).json({ 
      message: "Error al crear respaldo",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Download backup
export const downloadBackup = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const backupId = req.params.backupId;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Check if user has access to the project
    const user = req.user as User;
    if (user.role !== "admin") {
      const projectUsers = await storage.getProjectUsers(projectId);
      const userIds = projectUsers.map(u => u.id);
      
      if (!userIds.includes(user.id)) {
        return res.status(403).json({ message: "No tienes permiso para acceder a este proyecto" });
      }
    }
    
    // Check if backup exists
    const backup = mockBackups[backupId];
    
    if (!backup) {
      return res.status(404).json({ message: "Respaldo no encontrado" });
    }
    
    // In a real implementation, would stream the backup file
    // For this demo, create a dummy file with backup info
    const backupInfo = JSON.stringify(backup, null, 2);
    
    // Send file as downloadable attachment
    res.setHeader('Content-Type', 'application/zip');
    res.setHeader('Content-Disposition', `attachment; filename="${backupId}.zip"`);
    res.send(backupInfo);
  } catch (error) {
    console.error("Error al descargar respaldo:", error);
    res.status(500).json({ 
      message: "Error al descargar respaldo",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Delete backup
export const deleteBackup = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    const backupId = req.params.backupId;
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Check if user has access to the project
    const user = req.user as User;
    if (user.role !== "admin") {
      const projectUsers = await storage.getProjectUsers(projectId);
      const userIds = projectUsers.map(u => u.id);
      
      if (!userIds.includes(user.id)) {
        return res.status(403).json({ message: "No tienes permiso para modificar este proyecto" });
      }
    }
    
    // Check if backup exists
    if (!mockBackups[backupId]) {
      return res.status(404).json({ message: "Respaldo no encontrado" });
    }
    
    // Delete backup
    delete mockBackups[backupId];
    
    // Log backup deletion
    await storage.createLog({
      projectId: projectId,
      type: "info",
      message: `Respaldo eliminado por ${user.fullName}`,
      details: `Respaldo ${backupId}`
    });
    
    res.json({ message: "Respaldo eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar respaldo:", error);
    res.status(500).json({ 
      message: "Error al eliminar respaldo",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Mock migration status storage
const migrationStatuses: Record<number, MigrationStatus> = {};

// Get migration configuration
export const getMigrationConfig = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Check if user has access to the project
    const user = req.user as User;
    if (user.role !== "admin") {
      const projectUsers = await storage.getProjectUsers(projectId);
      const userIds = projectUsers.map(u => u.id);
      
      if (!userIds.includes(user.id)) {
        return res.status(403).json({ message: "No tienes permiso para acceder a este proyecto" });
      }
    }
    
    // In a real implementation, would retrieve migration config from storage
    // For this demo, return a mock migration config
    const migrationConfig = {
      destination: {
        uri: project.mongodbUrl || "mongodb://localhost:27017",
        db: project.dbDestName || "migration_db"
      },
      mapping: {}
    };
    
    // Add a mapping for each table in the schema
    if (project.schema) {
      for (const tableName of Object.keys(project.schema.tables)) {
        migrationConfig.mapping[tableName] = {
          collection: tableName,
          indices: [],
          embedded: {}
        };
      }
    }
    
    res.json(migrationConfig);
  } catch (error) {
    console.error("Error al obtener configuración de migración:", error);
    res.status(500).json({ 
      message: "Error al obtener configuración de migración",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Save migration configuration
export const saveMigrationConfig = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Check if user has access to the project
    const user = req.user as User;
    if (user.role !== "admin") {
      const projectUsers = await storage.getProjectUsers(projectId);
      const userIds = projectUsers.map(u => u.id);
      
      if (!userIds.includes(user.id)) {
        return res.status(403).json({ message: "No tienes permiso para modificar este proyecto" });
      }
    }
    
    // Get migration config from request
    const { destination, mapping } = req.body;
    
    // Basic validation
    if (!destination || !destination.uri || !destination.db) {
      return res.status(400).json({ 
        message: "La configuración de destino es inválida" 
      });
    }
    
    // Test MongoDB connection
    const connectionResult = await testMongoDBConnection(destination.uri, destination.db);
    
    if (!connectionResult.success) {
      return res.status(400).json({ 
        message: `Error de conexión a MongoDB: ${connectionResult.error}` 
      });
    }
    
    // Update project with MongoDB URL and database name
    const updatedProject = await storage.updateProject(projectId, {
      mongodbUrl: destination.uri,
      dbDestName: destination.db
    });
    
    // Log migration configuration
    await storage.createLog({
      projectId: projectId,
      type: "info",
      message: `Configuración de migración guardada por ${user.fullName}`,
      details: `Destino: ${destination.uri}/${destination.db}`
    });
    
    res.json({ 
      message: "Configuración de migración guardada correctamente"
    });
  } catch (error) {
    console.error("Error al guardar configuración de migración:", error);
    res.status(500).json({ 
      message: "Error al guardar configuración de migración",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Get migration status
export const getMigrationStatus = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Check if user has access to the project
    const user = req.user as User;
    if (user.role !== "admin") {
      const projectUsers = await storage.getProjectUsers(projectId);
      const userIds = projectUsers.map(u => u.id);
      
      if (!userIds.includes(user.id)) {
        return res.status(403).json({ message: "No tienes permiso para acceder a este proyecto" });
      }
    }
    
    // Get migration status or create a default one
    let status = migrationStatuses[projectId];
    
    if (!status) {
      status = {
        status: project.state === "migration" ? "in_progress" : "pending",
        progress: {
          totalTables: project.schema ? Object.keys(project.schema.tables).length : 0,
          completedTables: 0,
          processedRecords: 0,
          totalRecords: 1000, // Mock value
          currentTable: "",
          percentage: 0,
          elapsedTime: 0,
          estimatedTime: 0
        },
        errors: []
      };
      
      migrationStatuses[projectId] = status;
    }
    
    res.json(status);
  } catch (error) {
    console.error("Error al obtener estado de migración:", error);
    res.status(500).json({ 
      message: "Error al obtener estado de migración",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Start migration
export const startMigration = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Check if user has access to the project
    const user = req.user as User;
    if (user.role !== "admin") {
      const projectUsers = await storage.getProjectUsers(projectId);
      const userIds = projectUsers.map(u => u.id);
      
      if (!userIds.includes(user.id)) {
        return res.status(403).json({ message: "No tienes permiso para modificar este proyecto" });
      }
    }
    
    // Check if backup exists
    if (!project.backupKey) {
      return res.status(400).json({ 
        message: "Debe crear un respaldo antes de iniciar la migración" 
      });
    }
    
    // Check if MongoDB connection is configured
    if (!project.mongodbUrl || !project.dbDestName) {
      return res.status(400).json({ 
        message: "La conexión a MongoDB no está configurada" 
      });
    }
    
    // Create initial migration status
    const totalTables = project.schema ? Object.keys(project.schema.tables).length : 0;
    
    const migrationStatus: MigrationStatus = {
      status: "in_progress",
      progress: {
        totalTables,
        completedTables: 0,
        processedRecords: 0,
        totalRecords: 1000, // Mock value
        currentTable: project.schema ? Object.keys(project.schema.tables)[0] : "",
        percentage: 0,
        elapsedTime: 0,
        estimatedTime: totalTables * 10 // Mock estimation (10 seconds per table)
      },
      errors: []
    };
    
    migrationStatuses[projectId] = migrationStatus;
    
    // Update project state
    await storage.updateProject(projectId, { state: "migration" });
    
    // Log migration start
    await storage.createLog({
      projectId: projectId,
      type: "info",
      message: `Migración iniciada por ${user.fullName}`,
      details: `Total de tablas: ${totalTables}`
    });
    
    // In a real implementation, would start a background migration process
    // For demo purposes, simulate migration progress with a background process
    simulateMigrationProgress(projectId, project);
    
    res.json(migrationStatus);
  } catch (error) {
    console.error("Error al iniciar migración:", error);
    res.status(500).json({ 
      message: "Error al iniciar migración",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Cancel migration
export const cancelMigration = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Check if user has access to the project
    const user = req.user as User;
    if (user.role !== "admin") {
      const projectUsers = await storage.getProjectUsers(projectId);
      const userIds = projectUsers.map(u => u.id);
      
      if (!userIds.includes(user.id)) {
        return res.status(403).json({ message: "No tienes permiso para modificar este proyecto" });
      }
    }
    
    // Get migration status
    const status = migrationStatuses[projectId];
    
    if (!status || status.status !== "in_progress") {
      return res.status(400).json({ 
        message: "No hay una migración en curso para cancelar" 
      });
    }
    
    // Update migration status
    status.status = "pending";
    
    // Update project state
    await storage.updateProject(projectId, { state: "backup" });
    
    // Log migration cancellation
    await storage.createLog({
      projectId: projectId,
      type: "warning",
      message: `Migración cancelada por ${user.fullName}`,
      details: `Progreso: ${status.progress.percentage}%`
    });
    
    res.json({ 
      message: "Migración cancelada correctamente",
      status
    });
  } catch (error) {
    console.error("Error al cancelar migración:", error);
    res.status(500).json({ 
      message: "Error al cancelar migración",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Simulate migration progress for demo purposes
const simulateMigrationProgress = (projectId: number, project: any) => {
  if (!project.schema) return;
  
  const status = migrationStatuses[projectId];
  if (!status || status.status !== "in_progress") return;
  
  const tables = Object.keys(project.schema.tables);
  const totalTables = tables.length;
  const totalRecords = 1000; // Mock value
  let currentTableIndex = 0;
  let processedRecords = 0;
  let startTime = Date.now();
  
  const updateInterval = setInterval(async () => {
    if (!migrationStatuses[projectId] || migrationStatuses[projectId].status !== "in_progress") {
      clearInterval(updateInterval);
      return;
    }
    
    // Calculate progress
    const elapsedTime = (Date.now() - startTime) / 1000;
    const recordsPerSecond = processedRecords / (elapsedTime || 1);
    const remainingRecords = totalRecords - processedRecords;
    const estimatedTimeRemaining = remainingRecords / (recordsPerSecond || 1);
    
    // Update records for current table
    const progressIncrement = Math.min(50, totalRecords - processedRecords);
    processedRecords += progressIncrement;
    
    // Check if current table is complete
    if (processedRecords >= totalRecords && currentTableIndex < totalTables - 1) {
      currentTableIndex++;
      processedRecords = 0;
      
      // Log table completion
      await storage.createLog({
        projectId: projectId,
        type: "info",
        message: `Tabla ${tables[currentTableIndex - 1]} migrada`,
        details: `Registros: ${totalRecords}`
      });
    }
    
    // Calculate overall progress
    const completedTables = Math.min(currentTableIndex, totalTables);
    const percentage = Math.floor(
      ((completedTables * totalRecords + processedRecords) / (totalTables * totalRecords)) * 100
    );
    
    // Update migration status
    migrationStatuses[projectId] = {
      ...migrationStatuses[projectId],
      progress: {
        totalTables,
        completedTables,
        processedRecords,
        totalRecords: totalRecords * totalTables,
        currentTable: tables[currentTableIndex],
        percentage,
        elapsedTime: Math.floor(elapsedTime),
        estimatedTime: Math.ceil(estimatedTimeRemaining)
      }
    };
    
    // Check if migration is complete
    if (completedTables >= totalTables && processedRecords >= totalRecords) {
      migrationStatuses[projectId].status = "completed";
      
      // Log migration completion
      await storage.createLog({
        projectId: projectId,
        type: "info",
        message: "Migración completada",
        details: `Tiempo total: ${Math.floor(elapsedTime)} segundos`
      });
      
      // Update project state
      await storage.updateProject(projectId, { state: "completed" });
      
      clearInterval(updateInterval);
    }
  }, 1000);
};
