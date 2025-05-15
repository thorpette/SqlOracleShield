// Additional types that are not defined in schema.ts

export interface UserCredentials {
  email: string;
  password: string;
}

export interface AuthResponse {
  user: {
    id: number;
    fullName: string;
    employeeNumber: string;
    email: string;
    role: string;
  };
  token?: string;
}

export interface ApiError {
  message: string;
  details?: string;
}

// Analysis types
export interface SensitiveField {
  table: string;
  column: string;
  dataType: string;
  score: number;
  recommendation: string;
  reasons: string[];
}

export interface AnalysisResult {
  criticalCount: number;
  moderateCount: number;
  lowCount: number;
  safeCount: number;
  fields: SensitiveField[];
}

// Dashboard/summary types
export interface ProjectSummary {
  id: number;
  name: string;
  code: string;
  description: string;
  dbSourceType: string;
  dbSourceName: string;
  state: string;
  lastActivity: string;
  userCount: number;
}

// Navigation types
export interface NavigationItem {
  name: string;
  path: string;
  icon: string;
}

// Workflow step
export interface WorkflowStep {
  name: string;
  icon: string;
  path: string;
  status: 'completed' | 'current' | 'pending';
}
