import { Request, Response, NextFunction } from 'express';

// Middleware para verificar autenticación
export const authenticateJWT = (req: Request, res: Response, next: NextFunction) => {
  // Verificar si hay una sesión de usuario
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  
  next();
};

// Middleware para verificar rol de administrador
export const isAdmin = (req: Request, res: Response, next: NextFunction) => {
  // Verificar si hay una sesión de usuario
  if (!req.session?.userId) {
    return res.status(401).json({ message: 'No autenticado' });
  }
  
  // Verificar si el usuario es administrador
  if (req.session?.userRole !== 'admin') {
    return res.status(403).json({ message: 'Acceso denegado' });
  }
  
  next();
};