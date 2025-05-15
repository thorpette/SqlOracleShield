import { Request, Response } from "express";
import { storage } from "../storage";
import { User } from "@shared/schema";
import { testMongoDBConnection } from "../services/mongodb";

// Get global settings
export const getSettings = async (req: Request, res: Response) => {
  try {
    const settings = await storage.getSettings();
    
    if (!settings) {
      return res.status(404).json({ message: "Configuración no encontrada" });
    }
    
    res.json(settings);
  } catch (error) {
    console.error("Error al obtener configuración:", error);
    res.status(500).json({ 
      message: "Error al obtener configuración",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Update general settings
export const updateSettings = async (req: Request, res: Response) => {
  try {
    // Only admin can update settings
    const user = req.user as User;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "No tienes permiso para modificar la configuración" });
    }
    
    const { tableLimit, batchSize, connectionTimeout, debugMode } = req.body;
    
    // Validate settings
    if (tableLimit !== undefined && (isNaN(tableLimit) || tableLimit < 1)) {
      return res.status(400).json({ message: "El límite de tablas debe ser un número mayor que 0" });
    }
    
    if (batchSize !== undefined && (isNaN(batchSize) || batchSize < 10)) {
      return res.status(400).json({ message: "El tamaño de lote debe ser un número mayor que 10" });
    }
    
    if (connectionTimeout !== undefined && (isNaN(connectionTimeout) || connectionTimeout < 1)) {
      return res.status(400).json({ message: "El timeout de conexión debe ser un número mayor que 0" });
    }
    
    // Update settings
    const updateData: any = {};
    
    if (tableLimit !== undefined) updateData.tableLimit = parseInt(tableLimit);
    if (batchSize !== undefined) updateData.batchSize = parseInt(batchSize);
    if (connectionTimeout !== undefined) updateData.connectionTimeout = parseInt(connectionTimeout);
    if (debugMode !== undefined) updateData.debugMode = debugMode;
    
    const updatedSettings = await storage.updateSettings(updateData);
    
    if (!updatedSettings) {
      return res.status(404).json({ message: "Configuración no encontrada" });
    }
    
    res.json(updatedSettings);
  } catch (error) {
    console.error("Error al actualizar configuración:", error);
    res.status(500).json({ 
      message: "Error al actualizar configuración",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Update MongoDB settings
export const updateMongoDBSettings = async (req: Request, res: Response) => {
  try {
    // Only admin can update settings
    const user = req.user as User;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "No tienes permiso para modificar la configuración" });
    }
    
    const { mongodbUri, mongodbName } = req.body;
    
    // Validate settings
    if (!mongodbUri) {
      return res.status(400).json({ message: "La URI de MongoDB es requerida" });
    }
    
    if (!mongodbName) {
      return res.status(400).json({ message: "El nombre de la base de datos es requerido" });
    }
    
    // Update settings
    const updatedSettings = await storage.updateSettings({
      mongodbUri,
      mongodbName
    });
    
    if (!updatedSettings) {
      return res.status(404).json({ message: "Configuración no encontrada" });
    }
    
    res.json(updatedSettings);
  } catch (error) {
    console.error("Error al actualizar configuración de MongoDB:", error);
    res.status(500).json({ 
      message: "Error al actualizar configuración de MongoDB",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};

// Test MongoDB connection
export const testMongoDBConnection = async (req: Request, res: Response) => {
  try {
    const { mongodbUri, mongodbName } = req.body;
    
    // Validate settings
    if (!mongodbUri) {
      return res.status(400).json({ message: "La URI de MongoDB es requerida" });
    }
    
    if (!mongodbName) {
      return res.status(400).json({ message: "El nombre de la base de datos es requerido" });
    }
    
    // Test connection
    const result = await testMongoDBConnection(mongodbUri, mongodbName);
    
    if (result.success) {
      res.json({ message: "Conexión exitosa a MongoDB" });
    } else {
      res.status(400).json({ message: `Error de conexión: ${result.error}` });
    }
  } catch (error) {
    console.error("Error al probar conexión a MongoDB:", error);
    res.status(500).json({ 
      message: "Error al probar conexión a MongoDB",
      error: error instanceof Error ? error.message : "Error desconocido"
    });
  }
};
