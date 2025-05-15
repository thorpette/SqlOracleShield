import { Request, Response, NextFunction } from "express";
import { User } from "@shared/schema";

// Middleware to check if user is authenticated
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  if (req.isAuthenticated()) {
    return next();
  }
  
  return res.status(401).json({ message: "No autenticado" });
};

// Middleware to check if user is admin
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  if (!req.isAuthenticated() || !req.user) {
    return res.status(401).json({ message: "No autenticado" });
  }
  
  const user = req.user as User;
  
  if (user.role !== "admin") {
    return res.status(403).json({ message: "No autorizado. Se requiere rol de administrador" });
  }
  
  return next();
};
