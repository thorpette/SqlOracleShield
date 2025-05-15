import { Request, Response } from "express";
import { storage } from "../storage";
import { connectToDatabase, extractDatabaseSchema } from "../services/database";
import { DbConnection, User } from "@shared/schema";

// Get schema from project
export const getSchema = async (req: Request, res: Response) => {
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
    
    // Check if schema exists
    if (!project.schema) {
      return res.status(404).json({ message: "El esquema no ha sido extraído aún" });
    }
    
    res.json(project.schema);
  } catch (error) {
    console.error("Error al obtener esquema:", error);
    res.status(500).json({ 
      message: "Error al obtener esquema",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Extract schema from database
export const extractSchema = async (req: Request, res: Response) => {
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
    
    // Check if connection details exist
    if (!project.dbSourceType || !project.dbSourceHost || !project.dbSourcePort || !project.dbSourceName) {
      return res.status(400).json({ message: "Detalles de conexión incompletos" });
    }
    
    // Get settings for table limit
    const settings = await storage.getSettings();
    const tableLimit = settings?.tableLimit || 100;
    
    // Create connection object
    const connection: DbConnection = {
      type: project.dbSourceType as any,
      host: project.dbSourceHost,
      port: project.dbSourcePort,
      database: project.dbSourceName,
      user: req.body.user || "user", // These would normally be stored securely
      password: req.body.password || "password", // These would normally be stored securely
      maxRows: req.body.maxRows || 10,
      timeout: req.body.timeout || 30,
      ssl: req.body.ssl || false
    };
    
    // Connect to database
    const db = await connectToDatabase(connection);
    
    if (!db) {
      return res.status(500).json({ message: "Error al conectar a la base de datos" });
    }
    
    // Extract schema
    const schema = await extractDatabaseSchema(db, connection, tableLimit);
    
    // Update project with schema
    const updatedProject = await storage.updateProject(projectId, {
      schema,
      state: project.state === "created" ? "extraction" : project.state
    });
    
    // Log extraction
    await storage.createLog({
      projectId: projectId,
      type: "info",
      message: `Esquema extraído por ${user.fullName}`,
      details: `Extraídas ${Object.keys(schema.tables).length} tablas`
    });
    
    res.json({ 
      message: "Esquema extraído correctamente",
      tablesCount: Object.keys(schema.tables).length,
      relationsCount: schema.relations.length,
    });
  } catch (error) {
    console.error("Error al extraer esquema:", error);
    res.status(500).json({ 
      message: "Error al extraer esquema",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};
