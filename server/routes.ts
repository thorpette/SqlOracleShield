import type { Express, Request, Response, NextFunction } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import session from "express-session";
import MemoryStore from "memorystore";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { User } from "@shared/schema";
import { hashPassword, comparePassword } from "./controllers/auth";

// Controllers
import * as authController from "./controllers/auth";
import * as projectsController from "./controllers/projects";
import * as connectionController from "./controllers/connection";
import * as schemaController from "./controllers/schema";
import * as analysisController from "./controllers/analysis";
import * as obfuscationController from "./controllers/obfuscation";
import * as migrationController from "./controllers/migration";
import * as settingsController from "./controllers/settings";

// Middleware
import { authenticateJWT, isAdmin } from "./middleware/auth";

export async function registerRoutes(app: Express): Promise<Server> {
  const httpServer = createServer(app);
  
  // Configure session
  const MemoryStoreSession = MemoryStore(session);
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "sql-migration-tool-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production", maxAge: 86400000 }, // 24 hours
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // prune expired entries every 24h
      }),
    })
  );

  // Initialize Passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure Passport
  passport.use(
    new LocalStrategy(
      { usernameField: "email" },
      async (email, password, done) => {
        try {
          const user = await storage.getUserByEmail(email);
          if (!user) {
            return done(null, false, { message: "Usuario no encontrado" });
          }

          const isMatch = await comparePassword(password, user.password);
          if (!isMatch) {
            return done(null, false, { message: "Contraseña incorrecta" });
          }

          return done(null, user);
        } catch (error) {
          return done(error);
        }
      }
    )
  );

  passport.serializeUser((user: Express.User, done) => {
    done(null, (user as User).id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (error) {
      done(error);
    }
  });

  // Error handler middleware
  const errorHandler = (
    err: any,
    req: Request,
    res: Response,
    next: NextFunction
  ) => {
    console.error(err.stack);
    const status = err.status || 500;
    res.status(status).json({
      message: err.message || "Error interno del servidor",
    });
  };

  // Auth routes
  app.post("/api/auth/login", authController.login);
  app.post("/api/auth/logout", authController.logout);
  app.get("/api/auth/me", authenticateJWT, authController.getCurrentUser);
  app.post("/api/auth/change-password", authenticateJWT, authController.changePassword);

  // User routes (admin only)
  app.get("/api/users", authenticateJWT, isAdmin, authController.getAllUsers);
  app.post("/api/users", authenticateJWT, isAdmin, authController.createUser);
  app.get("/api/users/:id", authenticateJWT, isAdmin, authController.getUser);
  app.patch("/api/users/:id", authenticateJWT, isAdmin, authController.updateUser);
  app.delete("/api/users/:id", authenticateJWT, isAdmin, authController.deleteUser);

  // Project routes
  app.get("/api/projects", authenticateJWT, projectsController.getAllProjects);
  app.post("/api/projects", authenticateJWT, projectsController.createProject);
  app.get("/api/projects/:id", authenticateJWT, projectsController.getProject);
  app.patch("/api/projects/:id", authenticateJWT, projectsController.updateProject);
  app.delete("/api/projects/:id", authenticateJWT, projectsController.deleteProject);

  // Connection routes
  app.post("/api/connection/test", authenticateJWT, connectionController.testConnection);
  app.post("/api/projects/:id/connection", authenticateJWT, connectionController.saveConnection);
  
  // Schema routes
  app.get("/api/projects/:id/schema", authenticateJWT, schemaController.getSchema);
  app.post("/api/projects/:id/schema/extract", authenticateJWT, schemaController.extractSchema);

  // Analysis routes
  app.get("/api/projects/:id/analysis", authenticateJWT, analysisController.getAnalysis);
  app.post("/api/projects/:id/analysis", authenticateJWT, analysisController.runAnalysis);
  app.get("/api/projects/:id/analysis/fields", authenticateJWT, analysisController.getSensitiveFields);

  // Obfuscation routes
  app.get("/api/projects/:id/obfuscation", authenticateJWT, obfuscationController.getObfuscationConfig);
  app.post("/api/projects/:id/obfuscation", authenticateJWT, obfuscationController.saveObfuscationConfig);

  // Backup routes
  app.get("/api/projects/:id/backups", authenticateJWT, migrationController.getBackups);
  app.post("/api/projects/:id/backups", authenticateJWT, migrationController.createBackup);
  app.get("/api/projects/:id/backups/:backupId/download", authenticateJWT, migrationController.downloadBackup);
  app.delete("/api/projects/:id/backups/:backupId", authenticateJWT, migrationController.deleteBackup);

  // Migration routes
  app.get("/api/projects/:id/migration", authenticateJWT, migrationController.getMigrationConfig);
  app.post("/api/projects/:id/migration", authenticateJWT, migrationController.saveMigrationConfig);
  app.get("/api/projects/:id/migration/status", authenticateJWT, migrationController.getMigrationStatus);
  app.post("/api/projects/:id/migration/start", authenticateJWT, migrationController.startMigration);
  app.post("/api/projects/:id/migration/cancel", authenticateJWT, migrationController.cancelMigration);

  // Settings routes
  app.get("/api/settings", authenticateJWT, settingsController.getSettings);
  app.patch("/api/settings", authenticateJWT, isAdmin, settingsController.updateSettings);
  app.patch("/api/settings/mongodb", authenticateJWT, isAdmin, settingsController.updateMongoDBSettings);
  app.post("/api/settings/mongodb/test", authenticateJWT, isAdmin, settingsController.testMongoDBConnection);

  // Error handler middleware should be last
  app.use(errorHandler);

  // Create default admin user if it doesn't exist
  try {
    const adminUser = await storage.getUserByEmail("admin@ejemplo.com");
    if (!adminUser) {
      const hashedPassword = await hashPassword("admin123");
      await storage.createUser({
        name: "Administrador",
        email: "admin@ejemplo.com",
        password: hashedPassword,
        role: "admin",
        lastLogin: null
      });
      console.log("Usuario administrador por defecto creado");
    }
    
    // También crear un usuario regular
    const regularUser = await storage.getUserByEmail("usuario@ejemplo.com");
    if (!regularUser) {
      const hashedPassword = await hashPassword("usuario123");
      await storage.createUser({
        name: "Usuario",
        email: "usuario@ejemplo.com",
        password: hashedPassword,
        role: "user",
        lastLogin: null
      });
      console.log("Usuario regular por defecto creado");
    }
  } catch (error) {
    console.error("Error creando usuarios por defecto:", error);
  }

  return httpServer;
}
