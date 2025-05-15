import { 
  users, 
  projects, 
  projectUsers, 
  logs, 
  settings,
  type User, 
  type InsertUser, 
  type Project, 
  type InsertProject, 
  type ProjectUser, 
  type InsertProjectUser, 
  type Log, 
  type InsertLog, 
  type Setting, 
  type InsertSetting, 
  type SchemaData, 
  type ObfuscationConfig, 
  type MigrationStatus
} from "@shared/schema";

// Define storage interface
export interface IStorage {
  // User operations
  getUser(id: number): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, userData: Partial<User>): Promise<User | undefined>;
  deleteUser(id: number): Promise<boolean>;

  // Project operations
  getProject(id: number): Promise<Project | undefined>;
  getAllProjects(): Promise<Project[]>;
  getUserProjects(userId: number): Promise<Project[]>;
  createProject(project: InsertProject): Promise<Project>;
  updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined>;
  deleteProject(id: number): Promise<boolean>;

  // Project user operations
  getProjectUsers(projectId: number): Promise<User[]>;
  addUserToProject(projectId: number, userId: number): Promise<ProjectUser>;
  removeUserFromProject(projectId: number, userId: number): Promise<boolean>;

  // Log operations
  getProjectLogs(projectId: number): Promise<Log[]>;
  createLog(log: InsertLog): Promise<Log>;

  // Settings operations
  getSettings(): Promise<Setting | undefined>;
  updateSettings(settingData: Partial<Setting>): Promise<Setting | undefined>;
}

// In-memory storage implementation
export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private projects: Map<number, Project>;
  private projectUsers: Map<number, ProjectUser>;
  private logs: Map<number, Log>;
  private settings: Setting | undefined;
  private currentUserId: number;
  private currentProjectId: number;
  private currentProjectUserId: number;
  private currentLogId: number;

  constructor() {
    this.users = new Map();
    this.projects = new Map();
    this.projectUsers = new Map();
    this.logs = new Map();
    this.currentUserId = 1;
    this.currentProjectId = 1;
    this.currentProjectUserId = 1;
    this.currentLogId = 1;

    // Initialize default settings
    this.settings = {
      id: 1,
      mongodbUri: "mongodb://localhost:27017",
      mongodbName: "migration_tool",
      updatedAt: new Date(),
      tableLimit: 100,
      batchSize: 1000,
      connectionTimeout: 30,
      debugMode: false
    };
  }

  // User methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(userData: InsertUser): Promise<User> {
    const id = this.currentUserId++;
    const user: User = { ...userData, id };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, userData: Partial<User>): Promise<User | undefined> {
    const existingUser = this.users.get(id);
    if (!existingUser) {
      return undefined;
    }
    
    const updatedUser = { ...existingUser, ...userData };
    this.users.set(id, updatedUser);
    return updatedUser;
  }

  async deleteUser(id: number): Promise<boolean> {
    return this.users.delete(id);
  }

  // Project methods
  async getProject(id: number): Promise<Project | undefined> {
    return this.projects.get(id);
  }

  async getAllProjects(): Promise<Project[]> {
    return Array.from(this.projects.values());
  }

  async getUserProjects(userId: number): Promise<Project[]> {
    const projectIds = Array.from(this.projectUsers.values())
      .filter((pu) => pu.userId === userId)
      .map((pu) => pu.projectId);
    
    return Array.from(this.projects.values())
      .filter((project) => projectIds.includes(project.id));
  }

  async createProject(projectData: InsertProject): Promise<Project> {
    const id = this.currentProjectId++;
    const project: Project = { 
      ...projectData, 
      id, 
      createdAt: new Date(),
      schema: undefined,
      obfuscationConfig: undefined,
      backupKey: undefined,
      backupPath: undefined
    };
    this.projects.set(id, project);
    return project;
  }

  async updateProject(id: number, projectData: Partial<Project>): Promise<Project | undefined> {
    const existingProject = this.projects.get(id);
    if (!existingProject) {
      return undefined;
    }
    
    const updatedProject = { ...existingProject, ...projectData };
    this.projects.set(id, updatedProject);
    return updatedProject;
  }

  async deleteProject(id: number): Promise<boolean> {
    // Delete project users first
    for (const [puId, pu] of this.projectUsers.entries()) {
      if (pu.projectId === id) {
        this.projectUsers.delete(puId);
      }
    }
    
    // Delete project logs
    for (const [logId, log] of this.logs.entries()) {
      if (log.projectId === id) {
        this.logs.delete(logId);
      }
    }
    
    return this.projects.delete(id);
  }

  // Project user methods
  async getProjectUsers(projectId: number): Promise<User[]> {
    const userIds = Array.from(this.projectUsers.values())
      .filter((pu) => pu.projectId === projectId)
      .map((pu) => pu.userId);
    
    return Array.from(this.users.values())
      .filter((user) => userIds.includes(user.id));
  }

  async addUserToProject(projectId: number, userId: number): Promise<ProjectUser> {
    const id = this.currentProjectUserId++;
    const projectUser: ProjectUser = { id, projectId, userId };
    this.projectUsers.set(id, projectUser);
    return projectUser;
  }

  async removeUserFromProject(projectId: number, userId: number): Promise<boolean> {
    for (const [id, pu] of this.projectUsers.entries()) {
      if (pu.projectId === projectId && pu.userId === userId) {
        return this.projectUsers.delete(id);
      }
    }
    return false;
  }

  // Log methods
  async getProjectLogs(projectId: number): Promise<Log[]> {
    return Array.from(this.logs.values())
      .filter((log) => log.projectId === projectId)
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  async createLog(logData: InsertLog): Promise<Log> {
    const id = this.currentLogId++;
    const log: Log = { 
      ...logData, 
      id, 
      timestamp: new Date() 
    };
    this.logs.set(id, log);
    return log;
  }

  // Settings methods
  async getSettings(): Promise<Setting | undefined> {
    return this.settings;
  }

  async updateSettings(settingData: Partial<Setting>): Promise<Setting | undefined> {
    if (!this.settings) {
      return undefined;
    }
    
    this.settings = { 
      ...this.settings, 
      ...settingData, 
      updatedAt: new Date() 
    };
    
    return this.settings;
  }
}

// Export storage instance
export const storage = new MemStorage();
