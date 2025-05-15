import { Request, Response } from "express";
import { storage } from "../storage";
import { analyzeTableSensitivity } from "../services/obfuscation";
import { User, SensitiveFieldData } from "@shared/schema";

// Get analysis results
export const getAnalysis = async (req: Request, res: Response) => {
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
    
    // Get sensitive fields from all tables
    const sensitiveFields = await getSensitiveFields(req, res);
    
    if (!sensitiveFields) {
      return; // Error already handled in getSensitiveFields
    }
    
    // Count fields by sensitivity level
    const criticalCount = sensitiveFields.filter(f => f.score >= 90).length;
    const moderateCount = sensitiveFields.filter(f => f.score >= 70 && f.score < 90).length;
    const lowCount = sensitiveFields.filter(f => f.score >= 50 && f.score < 70).length;
    const safeCount = sensitiveFields.filter(f => f.score < 50).length;
    
    // Return analysis results
    const analysisResult = {
      criticalCount,
      moderateCount,
      lowCount,
      safeCount,
      fields: sensitiveFields
    };
    
    res.json(analysisResult);
  } catch (error) {
    console.error("Error al obtener análisis:", error);
    res.status(500).json({ 
      message: "Error al obtener análisis",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Run sensitivity analysis
export const runAnalysis = async (req: Request, res: Response) => {
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
    
    // Run analysis on each table's columns
    const schema = project.schema;
    const sensitiveFields = [];
    
    for (const [tableName, tableData] of Object.entries(schema.tables)) {
      for (const column of tableData.columns) {
        // Analyze column sensitivity
        const { score, reasons, recommendation } = analyzeTableSensitivity(
          tableName, 
          column.name, 
          column.dataType, 
          tableData.sampleData
        );
        
        sensitiveFields.push({
          table: tableName,
          column: column.name,
          dataType: column.dataType,
          score,
          recommendation,
          reasons
        });
      }
    }
    
    // Count fields by sensitivity level
    const criticalCount = sensitiveFields.filter(f => f.score >= 90).length;
    const moderateCount = sensitiveFields.filter(f => f.score >= 70 && f.score < 90).length;
    const lowCount = sensitiveFields.filter(f => f.score >= 50 && f.score < 70).length;
    const safeCount = sensitiveFields.filter(f => f.score < 50).length;
    
    // Update project state
    if (project.state === "extraction") {
      await storage.updateProject(projectId, { state: "analysis" });
    }
    
    // Log analysis
    await storage.createLog({
      projectId: projectId,
      type: "info",
      message: `Análisis de sensibilidad ejecutado por ${user.fullName}`,
      details: `Campos sensibles: ${criticalCount} críticos, ${moderateCount} moderados, ${lowCount} bajos, ${safeCount} seguros`
    });
    
    // Return analysis results
    const analysisResult = {
      criticalCount,
      moderateCount,
      lowCount,
      safeCount,
      fields: sensitiveFields
    };
    
    res.json(analysisResult);
  } catch (error) {
    console.error("Error al ejecutar análisis:", error);
    res.status(500).json({ 
      message: "Error al ejecutar análisis",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Get sensitive fields
export const getSensitiveFields = async (req: Request, res: Response) => {
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
    
    // Get all sensitive fields
    const schema = project.schema;
    const sensitiveFields = [];
    
    for (const [tableName, tableData] of Object.entries(schema.tables)) {
      for (const column of tableData.columns) {
        // Analyze column sensitivity
        const { score, reasons, recommendation } = analyzeTableSensitivity(
          tableName, 
          column.name, 
          column.dataType, 
          tableData.sampleData
        );
        
        sensitiveFields.push({
          table: tableName,
          column: column.name,
          dataType: column.dataType,
          score,
          recommendation,
          reasons
        });
      }
    }
    
    // Sort by sensitivity score (descending)
    sensitiveFields.sort((a, b) => b.score - a.score);
    
    if (res) {
      res.json(sensitiveFields);
    }
    
    return sensitiveFields;
  } catch (error) {
    console.error("Error al obtener campos sensibles:", error);
    if (res) {
      res.status(500).json({ 
        message: "Error al obtener campos sensibles",
        error: error instanceof Error ? error.message : "Error desconocido"
      });
    }
    return null;
  }
};
