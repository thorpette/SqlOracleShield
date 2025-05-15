import { Request, Response } from "express";
import { storage } from "../storage";
import passport from "passport";
import { z } from "zod";
import { insertUserSchema, User } from "@shared/schema";
import crypto from "crypto";
import util from "util";

// Convert callback-based functions to promise-based functions
const scrypt = util.promisify(crypto.scrypt);

// Hash password
export async function hashPassword(password: string): Promise<string> {
  const salt = crypto.randomBytes(16).toString("hex");
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  return `${salt}:${derivedKey.toString("hex")}`;
}

// Compare password
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  const [salt, key] = storedHash.split(":");
  const derivedKey = await scrypt(password, salt, 64) as Buffer;
  return key === derivedKey.toString("hex");
}

// Login controller
export const login = (req: Request, res: Response) => {
  passport.authenticate("local", (err: Error, user: User, info: any) => {
    if (err) {
      return res.status(500).json({ message: "Error en el servidor" });
    }
    
    if (!user) {
      return res.status(401).json({ message: info.message || "Credenciales inválidas" });
    }
    
    req.login(user, (err) => {
      if (err) {
        return res.status(500).json({ message: "Error al iniciar sesión" });
      }
      
      // Return user info without password
      const { password, ...userInfo } = user;
      return res.json({ user: userInfo });
    });
  })(req, res);
};

// Logout controller
export const logout = (req: Request, res: Response) => {
  req.logout((err) => {
    if (err) {
      return res.status(500).json({ message: "Error al cerrar sesión" });
    }
    
    res.json({ message: "Sesión cerrada correctamente" });
  });
};

// Get current user controller
export const getCurrentUser = (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }
  
  // Return user info without password
  const { password, ...userInfo } = req.user as User;
  res.json({ user: userInfo });
};

// Change password controller
export const changePassword = async (req: Request, res: Response) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }
  
  const { currentPassword, newPassword } = req.body;
  
  if (!currentPassword || !newPassword) {
    return res.status(400).json({ message: "Faltan datos requeridos" });
  }
  
  try {
    const user = await storage.getUser((req.user as User).id);
    
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    // Verify current password
    const isMatch = await comparePassword(currentPassword, user.password);
    
    if (!isMatch) {
      return res.status(401).json({ message: "Contraseña actual incorrecta" });
    }
    
    // Hash new password
    const hashedPassword = await hashPassword(newPassword);
    
    // Update user
    await storage.updateUser(user.id, { password: hashedPassword });
    
    res.json({ message: "Contraseña actualizada correctamente" });
  } catch (error) {
    console.error("Error al cambiar contraseña:", error);
    res.status(500).json({ message: "Error al cambiar contraseña" });
  }
};

// Get all users (admin only)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    const users = await storage.getAllUsers();
    
    // Remove passwords from response
    const sanitizedUsers = users.map(({ password, ...user }) => user);
    
    res.json(sanitizedUsers);
  } catch (error) {
    console.error("Error al obtener usuarios:", error);
    res.status(500).json({ message: "Error al obtener usuarios" });
  }
};

// Create user (admin only)
export const createUser = async (req: Request, res: Response) => {
  try {
    // Validate request body
    const validatedData = insertUserSchema.parse(req.body);
    
    // Check if user already exists
    const existingUser = await storage.getUserByEmail(validatedData.email);
    
    if (existingUser) {
      return res.status(409).json({ message: "El correo electrónico ya está en uso" });
    }
    
    // Hash password
    const hashedPassword = await hashPassword(validatedData.password);
    
    // Create user
    const newUser = await storage.createUser({
      ...validatedData,
      password: hashedPassword,
    });
    
    // Remove password from response
    const { password, ...userInfo } = newUser;
    
    res.status(201).json(userInfo);
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ 
        message: "Datos de usuario inválidos",
        errors: error.errors 
      });
    }
    
    console.error("Error al crear usuario:", error);
    res.status(500).json({ message: "Error al crear usuario" });
  }
};

// Get user by ID (admin only)
export const getUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    // Remove password from response
    const { password, ...userInfo } = user;
    
    res.json(userInfo);
  } catch (error) {
    console.error("Error al obtener usuario:", error);
    res.status(500).json({ message: "Error al obtener usuario" });
  }
};

// Update user (admin only)
export const updateUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    // Prepare update data
    const updateData: Partial<User> = {};
    
    if (req.body.fullName) updateData.fullName = req.body.fullName;
    if (req.body.employeeNumber) updateData.employeeNumber = req.body.employeeNumber;
    if (req.body.email) updateData.email = req.body.email;
    if (req.body.role) updateData.role = req.body.role;
    
    // If password is provided, hash it
    if (req.body.password) {
      updateData.password = await hashPassword(req.body.password);
    }
    
    // Update user
    const updatedUser = await storage.updateUser(userId, updateData);
    
    if (!updatedUser) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    // Remove password from response
    const { password, ...userInfo } = updatedUser;
    
    res.json(userInfo);
  } catch (error) {
    console.error("Error al actualizar usuario:", error);
    res.status(500).json({ message: "Error al actualizar usuario" });
  }
};

// Delete user (admin only)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ message: "ID de usuario inválido" });
    }
    
    // Prevent deleting admin user with ID 1
    if (userId === 1) {
      return res.status(403).json({ message: "No se puede eliminar el usuario administrador predeterminado" });
    }
    
    const success = await storage.deleteUser(userId);
    
    if (!success) {
      return res.status(404).json({ message: "Usuario no encontrado" });
    }
    
    res.json({ message: "Usuario eliminado correctamente" });
  } catch (error) {
    console.error("Error al eliminar usuario:", error);
    res.status(500).json({ message: "Error al eliminar usuario" });
  }
};
