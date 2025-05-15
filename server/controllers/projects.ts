import { Request, Response } from "express";
import { storage } from "../storage";
import { z } from "zod";
import { insertProjectSchema, InsertProject, Project, User } from "@shared/schema";

// Get all projects
export const getAllProjects = async (req: Request, res: Response) => {
  try {
    let projects: Project[];
    const user = req.user as User;
    
    // If admin, return all projects, otherwise return only user's projects
    if (user.role === "admin") {
      projects = await storage.getAllProjects();
    } else {
      projects = await storage.getUserProjects(user.id);
    }
    
    // Format projects for client-side consumption
    const formattedProjects = projects.map(project => {
      const lastActivity = new Date(project.createdAt).toLocaleDateString();
      
      return {
        id: project.id,
        name: project.name,
        code: project.code,
        description: project.description || "",
        dbSourceType: project.dbSourceType || "",
        dbSourceName: project.dbSourceName || "",
        state: project.state,
        lastActivity: lastActivity,
        userCount: 1 // Placeholder for actual user count calculation
      };
    });
    
    res.json(formattedProjects);
  } catch (error) {
    console.error("Error al obtener proyectos:", error);
    res.status(500).json({ message: "Error al obtener proyectos" });
  }
};

// Get project by ID
export const getProject = async (req: Request, res: Response) => {
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
    
    res.json(project);
  } catch (error) {
    console.error("Error al obtener proyecto:", error);
    res.status(500).json({ message: "Error al obtener proyecto" });
  }
};

// Create project
export const createProject = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const projectData = insertProjectSchema.parse(req.body);
    
    // Check if project code already exists
    const allProjects = await storage.getAllProjects();
    const existingProject = allProjects.find(p => p.code === projectData.code);
    
    if (existingProject) {
      return res.status(409).json({ message: "El código del proyecto ya está en uso" });
    }
    
    // Create project
    const newProject = await storage.createProject(projectData);
    
    // Add current user to project
    const user = req.user as User;
    await storage.addUserToProject(newProject.id, user.id);
    
    // Log creation
    await storage.createLog({
      projectId: newProject.id,
      type: "info",
      message: `Proyecto creado por ${user.fullName}`,
      details: JSON.stringify(newProject)
    });
    
    res.status(201).json(newProject);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Datos de proyecto inválidos",
        errors: error.errors 
      });
    }
    
    console.error("Error al crear proyecto:", error);
    res.status(500).json({ message: "Error al crear proyecto" });
  }
};

// Update project
export const updateProject = async (req: Request, res: Response) => {
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
    
    // Prepare update data
    const updateData: Partial<Project> = {};
    
    // Only allow updating certain fields
    if (req.body.name !== undefined) updateData.name = req.body.name;
    if (req.body.code !== undefined) updateData.code = req.body.code;
    if (req.body.description !== undefined) updateData.description = req.body.description;
    if (req.body.dbSourceType !== undefined) updateData.dbSourceType = req.body.dbSourceType;
    if (req.body.dbSourceHost !== undefined) updateData.dbSourceHost = req.body.dbSourceHost;
    if (req.body.dbSourcePort !== undefined) updateData.dbSourcePort = req.body.dbSourcePort;
    if (req.body.dbSourceName !== undefined) updateData.dbSourceName = req.body.dbSourceName;
    if (req.body.dbDestUri !== undefined) updateData.dbDestUri = req.body.dbDestUri;
    if (req.body.dbDestName !== undefined) updateData.dbDestName = req.body.dbDestName;
    if (req.body.schema !== undefined) updateData.schema = req.body.schema;
    if (req.body.obfuscationConfig !== undefined) updateData.obfuscationConfig = req.body.obfuscationConfig;
    if (req.body.backupKey !== undefined) updateData.backupKey = req.body.backupKey;
    if (req.body.backupPath !== undefined) updateData.backupPath = req.body.backupPath;
    if (req.body.state !== undefined) updateData.state = req.body.state;
    if (req.body.mongodbUrl !== undefined) updateData.mongodbUrl = req.body.mongodbUrl;
    
    // Check if code is being changed and if it already exists
    if (updateData.code && updateData.code !== project.code) {
      const allProjects = await storage.getAllProjects();
      const existingProject = allProjects.find(p => p.code === updateData.code);
      
      if (existingProject) {
        return res.status(409).json({ message: "El código del proyecto ya está en uso" });
      }
    }
    
    // Update project
    const updatedProject = await storage.updateProject(projectId, updateData);
    
    if (!updatedProject) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Log update
    await storage.createLog({
      projectId: updatedProject.id,
      type: "info",
      message: `Proyecto actualizado por ${user.fullName}`,
      details: JSON.stringify(updateData)
    });
    
    res.json(updatedProject);
  } catch (error) {
    console.error("Error al actualizar proyecto:", error);
    res.status(500).json({ message: "Error al actualizar proyecto" });
  }
};

// Delete project
export const deleteProject = async (req: Request, res: Response) => {
  try {
    const projectId = parseInt(req.params.id);
    
    if (isNaN(projectId)) {
      return res.status(400).json({ message: "ID de proyecto inválido" });
    }
    
    const project = await storage.getProject(projectId);
    
    if (!project) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    // Only admins can delete projects
    const user = req.user as User;
    if (user.role !== "admin") {
      return res.status(403).json({ message: "No tienes permiso para eliminar proyectos" });
    }
    
    const success = await storage.deleteProject(projectId);
    
    if (!success) {
      return res.status(404).json({ message: "Proyecto no encontrado" });
    }
    
    res.json({ message: "Proyecto eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar proyecto:", error);
    res.status(500).json({ message: "Error al eliminar proyecto" });
  }
};
