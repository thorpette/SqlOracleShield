import { Request, Response } from "express";
import { storage } from "../storage";
import { testDatabaseConnection, connectToDatabase } from "../services/database";
import { DbConnection, User } from "@shared/schema";

// Test database connection
export const testConnection = async (req: Request, res: Response) => {
  try {
    const connectionData: DbConnection = req.body;
    
    // Basic validation
    if (!connectionData.host || !connectionData.port || !connectionData.database || 
        !connectionData.user || !connectionData.password || !connectionData.type) {
      return res.status(400).json({ message: "Faltan datos de conexión requeridos" });
    }
    
    // Test connection
    const result = await testDatabaseConnection(connectionData);
    
    if (result.success) {
      res.json({ message: "Conexión exitosa" });
    } else {
      res.status(400).json({ message: `Error de conexión: ${result.error}` });
    }
  } catch (error) {
    console.error("Error al probar conexión:", error);
    res.status(500).json({ 
      message: "Error al probar conexión",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Save database connection to project
export const saveConnection = async (req: Request, res: Response) => {
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
    
    const connectionData: DbConnection = req.body;
    
    // Basic validation
    if (!connectionData.host || !connectionData.port || !connectionData.database || 
        !connectionData.user || !connectionData.password || !connectionData.type) {
      return res.status(400).json({ message: "Faltan datos de conexión requeridos" });
    }
    
    // Test connection before saving
    const testResult = await testDatabaseConnection(connectionData);
    
    if (!testResult.success) {
      return res.status(400).json({ message: `Error de conexión: ${testResult.error}` });
    }
    
    // Update project with connection details
    const updatedProject = await storage.updateProject(projectId, {
      dbSourceType: connectionData.type,
      dbSourceHost: connectionData.host,
      dbSourcePort: connectionData.port,
      dbSourceName: connectionData.database,
      state: project.state === "created" ? "extraction" : project.state
    });
    
    if (!updatedProject) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Log connection
    await storage.createLog({
      projectId: updatedProject.id,
      type: "info",
      message: `Conexión configurada por ${user.fullName}`,
      details: `Conectado a ${connectionData.type}://${connectionData.host}:${connectionData.port}/${connectionData.database}`
    });
    
    res.json({ 
      message: "Conexión guardada correctamente",
      project: updatedProject
    });
  } catch (error) {
    console.error("Error al guardar conexión:", error);
    res.status(500).json({ 
      message: "Error al guardar conexión",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};
