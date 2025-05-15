import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import { storage } from '../storage';
import { log } from '../vite';

// Función para hash de contraseñas
export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

// Función para comparar contraseñas
export async function comparePassword(password: string, storedHash: string): Promise<boolean> {
  return bcrypt.compare(password, storedHash);
}

// Manejador para login
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;
    
    if (!email || !password) {
      return res.status(400).json({ 
        message: 'Se requiere correo electrónico y contraseña' 
      });
    }
    
    // Buscar usuario por email
    const user = await storage.getUserByEmail(email);
    
    if (!user) {
      return res.status(401).json({ 
        message: 'Credenciales inválidas' 
      });
    }
    
    // En desarrollo, aceptamos cualquier contraseña para mayor facilidad de prueba
    const isPasswordValid = process.env.NODE_ENV === 'development' || 
                           await comparePassword(password, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Credenciales inválidas' 
      });
    }
    
    // Actualizar último login
    await storage.updateUser(user.id, { 
      lastLogin: new Date() 
    });
    
    // Establecer sesión de usuario
    if (req.session) {
      req.session.userId = user.id;
      req.session.userRole = user.role;
    }
    
    // Devolver usuario sin contraseña
    const { password: _, ...userWithoutPassword } = user;
    
    return res.status(200).json({
      message: 'Inicio de sesión exitoso',
      user: userWithoutPassword
    });
  } catch (error) {
    log(`Error en login: ${error}`, 'auth-controller');
    return res.status(500).json({ 
      message: 'Error al iniciar sesión' 
    });
  }
};

// Manejador para logout
export const logout = (req: Request, res: Response) => {
  if (req.session) {
    req.session.destroy((err) => {
      if (err) {
        return res.status(500).json({ 
          message: 'Error al cerrar sesión' 
        });
      }
      
      res.clearCookie('connect.sid');
      return res.status(200).json({ 
        message: 'Sesión cerrada correctamente' 
      });
    });
  } else {
    return res.status(200).json({ 
      message: 'No hay sesión activa' 
    });
  }
};

// Manejador para obtener el usuario actual
export const getCurrentUser = async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'No autenticado' 
      });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      if (req.session) {
        req.session.destroy(() => {});
      }
      return res.status(401).json({ 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Devolver usuario sin contraseña
    const { password, ...userWithoutPassword } = user;
    
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    log(`Error al obtener usuario actual: ${error}`, 'auth-controller');
    return res.status(500).json({ 
      message: 'Error al obtener información del usuario' 
    });
  }
};

// Manejador para cambiar contraseña
export const changePassword = async (req: Request, res: Response) => {
  try {
    const userId = req.session?.userId;
    
    if (!userId) {
      return res.status(401).json({ 
        message: 'No autenticado' 
      });
    }
    
    const { currentPassword, newPassword } = req.body;
    
    if (!currentPassword || !newPassword) {
      return res.status(400).json({ 
        message: 'Se requiere contraseña actual y nueva contraseña' 
      });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Verificar contraseña actual
    const isPasswordValid = process.env.NODE_ENV === 'development' || 
                           await comparePassword(currentPassword, user.password);
    
    if (!isPasswordValid) {
      return res.status(401).json({ 
        message: 'Contraseña actual incorrecta' 
      });
    }
    
    // Hash de la nueva contraseña
    const hashedPassword = await hashPassword(newPassword);
    
    // Actualizar contraseña
    await storage.updateUser(userId, { password: hashedPassword });
    
    return res.status(200).json({ 
      message: 'Contraseña actualizada correctamente' 
    });
  } catch (error) {
    log(`Error al cambiar contraseña: ${error}`, 'auth-controller');
    return res.status(500).json({ 
      message: 'Error al cambiar la contraseña' 
    });
  }
};

// Manejador para obtener todos los usuarios (solo admin)
export const getAllUsers = async (req: Request, res: Response) => {
  try {
    if (req.session?.userRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Acceso denegado' 
      });
    }
    
    const users = await storage.getAllUsers();
    
    // Remover contraseñas de los usuarios
    const usersWithoutPasswords = users.map(user => {
      const { password, ...userWithoutPassword } = user;
      return userWithoutPassword;
    });
    
    return res.status(200).json(usersWithoutPasswords);
  } catch (error) {
    log(`Error al obtener usuarios: ${error}`, 'auth-controller');
    return res.status(500).json({ 
      message: 'Error al obtener usuarios' 
    });
  }
};

// Manejador para crear usuario (solo admin)
export const createUser = async (req: Request, res: Response) => {
  try {
    if (req.session?.userRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Acceso denegado' 
      });
    }
    
    const { email, name, password, role } = req.body;
    
    if (!email || !name || !password) {
      return res.status(400).json({ 
        message: 'Se requieren todos los campos' 
      });
    }
    
    // Verificar si el email ya existe
    const existingUser = await storage.getUserByEmail(email);
    
    if (existingUser) {
      return res.status(400).json({ 
        message: 'El correo electrónico ya está en uso' 
      });
    }
    
    // Hash de la contraseña
    const hashedPassword = await hashPassword(password);
    
    // Crear usuario
    const newUser = await storage.createUser({
      email,
      name,
      password: hashedPassword,
      role: role || 'user',
      lastLogin: null
    });
    
    // Devolver usuario sin contraseña
    const { password: _, ...userWithoutPassword } = newUser;
    
    return res.status(201).json(userWithoutPassword);
  } catch (error) {
    log(`Error al crear usuario: ${error}`, 'auth-controller');
    return res.status(500).json({ 
      message: 'Error al crear usuario' 
    });
  }
};

// Manejador para obtener un usuario específico (solo admin)
export const getUser = async (req: Request, res: Response) => {
  try {
    if (req.session?.userRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Acceso denegado' 
      });
    }
    
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        message: 'ID de usuario inválido' 
      });
    }
    
    const user = await storage.getUser(userId);
    
    if (!user) {
      return res.status(404).json({ 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Devolver usuario sin contraseña
    const { password, ...userWithoutPassword } = user;
    
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    log(`Error al obtener usuario: ${error}`, 'auth-controller');
    return res.status(500).json({ 
      message: 'Error al obtener información del usuario' 
    });
  }
};

// Manejador para actualizar usuario
export const updateUser = async (req: Request, res: Response) => {
  try {
    const sessionUserId = req.session?.userId;
    const sessionUserRole = req.session?.userRole;
    
    if (!sessionUserId) {
      return res.status(401).json({ 
        message: 'No autenticado' 
      });
    }
    
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        message: 'ID de usuario inválido' 
      });
    }
    
    // Solo admin puede actualizar otros usuarios
    if (sessionUserId !== userId && sessionUserRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Acceso denegado' 
      });
    }
    
    const { name, email, role } = req.body;
    
    // Solo admin puede cambiar roles
    if (role && sessionUserRole !== 'admin') {
      return res.status(403).json({ 
        message: 'No tiene permisos para cambiar el rol' 
      });
    }
    
    // Verificar si existe el usuario
    const existingUser = await storage.getUser(userId);
    
    if (!existingUser) {
      return res.status(404).json({ 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Si se cambia el email, verificar que no esté en uso
    if (email && email !== existingUser.email) {
      const userWithEmail = await storage.getUserByEmail(email);
      
      if (userWithEmail && userWithEmail.id !== userId) {
        return res.status(400).json({ 
          message: 'El correo electrónico ya está en uso' 
        });
      }
    }
    
    // Actualizar usuario
    const updatedUser = await storage.updateUser(userId, {
      ...(name && { name }),
      ...(email && { email }),
      ...(role && { role })
    });
    
    if (!updatedUser) {
      return res.status(500).json({ 
        message: 'Error al actualizar usuario' 
      });
    }
    
    // Devolver usuario sin contraseña
    const { password, ...userWithoutPassword } = updatedUser;
    
    return res.status(200).json(userWithoutPassword);
  } catch (error) {
    log(`Error al actualizar usuario: ${error}`, 'auth-controller');
    return res.status(500).json({ 
      message: 'Error al actualizar usuario' 
    });
  }
};

// Manejador para eliminar usuario (solo admin)
export const deleteUser = async (req: Request, res: Response) => {
  try {
    if (req.session?.userRole !== 'admin') {
      return res.status(403).json({ 
        message: 'Acceso denegado' 
      });
    }
    
    const userId = parseInt(req.params.id);
    
    if (isNaN(userId)) {
      return res.status(400).json({ 
        message: 'ID de usuario inválido' 
      });
    }
    
    // Verificar si existe el usuario
    const existingUser = await storage.getUser(userId);
    
    if (!existingUser) {
      return res.status(404).json({ 
        message: 'Usuario no encontrado' 
      });
    }
    
    // Evitar eliminar al último administrador
    if (existingUser.role === 'admin') {
      const allUsers = await storage.getAllUsers();
      const adminCount = allUsers.filter(user => user.role === 'admin').length;
      
      if (adminCount <= 1) {
        return res.status(400).json({ 
          message: 'No se puede eliminar el último administrador' 
        });
      }
    }
    
    // Eliminar usuario
    const deleted = await storage.deleteUser(userId);
    
    if (!deleted) {
      return res.status(500).json({ 
        message: 'Error al eliminar usuario' 
      });
    }
    
    return res.status(200).json({ 
      message: 'Usuario eliminado correctamente' 
    });
  } catch (error) {
    log(`Error al eliminar usuario: ${error}`, 'auth-controller');
    return res.status(500).json({ 
      message: 'Error al eliminar usuario' 
    });
  }
};