// Authentication and authorization types

export interface User {
  id: string;
  email: string;
  name?: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export enum UserRole {
  ADMIN = 'admin',
  EDITOR = 'editor',
  VIEWER = 'viewer'
}

export interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface SignUpData {
  email: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  user: User;
  access_token: string;
  refresh_token: string;
}

export interface Permission {
  resource: string;
  actions: string[];
}

export interface RolePermissions {
  [UserRole.ADMIN]: Permission[];
  [UserRole.EDITOR]: Permission[];
  [UserRole.VIEWER]: Permission[];
}

// Permission constants
export const PERMISSIONS: RolePermissions = {
  [UserRole.ADMIN]: [
    { resource: 'parties', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'banners', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'users', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'audit_logs', actions: ['read'] },
    { resource: 'export', actions: ['read'] }
  ],
  [UserRole.EDITOR]: [
    { resource: 'parties', actions: ['read'] },
    { resource: 'banners', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'export', actions: ['read'] }
  ],
  [UserRole.VIEWER]: [
    { resource: 'parties', actions: ['read'] },
    { resource: 'banners', actions: ['read'] },
    { resource: 'export', actions: ['read'] }
  ]
};