import { Request, Response } from "express";
import { storage } from "../storage";
import { User, ObfuscationConfig } from "@shared/schema";

// Get obfuscation configuration
export const getObfuscationConfig = async (req: Request, res: Response) => {
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
    
    // Check if obfuscation config exists
    if (!project.obfuscationConfig) {
      return res.status(404).json({ message: "No hay configuración de ofuscación definida" });
    }
    
    res.json(project.obfuscationConfig);
  } catch (error) {
    console.error("Error al obtener configuración de ofuscación:", error);
    res.status(500).json({ 
      message: "Error al obtener configuración de ofuscación",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Save obfuscation configuration
export const saveObfuscationConfig = async (req: Request, res: Response) => {
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
    
    // Validate obfuscation config
    const obfuscationConfig: ObfuscationConfig = req.body;
    
    // Basic validation
    if (typeof obfuscationConfig !== 'object') {
      return res.status(400).json({ message: "Configuración de ofuscación inválida" });
    }
    
    // Check each table and column configuration
    for (const [tableName, tableConfig] of Object.entries(obfuscationConfig)) {
      // Skip empty table configs
      if (!tableConfig || Object.keys(tableConfig).length === 0) {
        continue;
      }
      
      // Check if table exists in schema
      if (!project.schema?.tables[tableName]) {
        return res.status(400).json({ 
          message: `La tabla '${tableName}' no existe en el esquema` 
        });
      }
      
      for (const [columnName, columnConfig] of Object.entries(tableConfig)) {
        // Check if column exists in schema
        const columnExists = project.schema?.tables[tableName].columns.some(
          col => col.name === columnName
        );
        
        if (!columnExists) {
          return res.status(400).json({ 
            message: `La columna '${columnName}' no existe en la tabla '${tableName}'` 
          });
        }
        
        // Check if method is valid
        const validMethods = ['hash', 'mask', 'random', 'shuffle', 'none'];
        if (!validMethods.includes(columnConfig.method)) {
          return res.status(400).json({ 
            message: `Método de ofuscación inválido: '${columnConfig.method}'` 
          });
        }
      }
    }
    
    // Update project with obfuscation config
    const updatedProject = await storage.updateProject(projectId, {
      obfuscationConfig,
      state: project.state === "analysis" ? "obfuscation" : project.state
    });
    
    // Log configuration
    await storage.createLog({
      projectId: projectId,
      type: "info",
      message: `Configuración de ofuscación guardada por ${user.fullName}`,
      details: `Configuradas ${Object.keys(obfuscationConfig).length} tablas`
    });
    
    res.json({ 
      message: "Configuración de ofuscación guardada correctamente",
      config: obfuscationConfig
    });
  } catch (error) {
    console.error("Error al guardar configuración de ofuscación:", error);
    res.status(500).json({ 
      message: "Error al guardar configuración de ofuscación",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};
