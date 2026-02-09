// Authentication and authorization types
import { User as SupabaseUser } from '@supabase/supabase-js';

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
  USER = 'user' // Renamed from VIEWER to USER - read-only user
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
  actions: ('create' | 'read' | 'update' | 'delete')[];
}

export interface RolePermissions {
  [UserRole.ADMIN]: Permission[];
  [UserRole.USER]: Permission[];
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
  [UserRole.USER]: [
    { resource: 'parties', actions: ['read'] },
    { resource: 'banners', actions: ['read'] },
    { resource: 'export', actions: ['read'] }
  ]
};

// Helper function to check permissions
export function hasPermission(
  role: UserRole,
  resource: string,
  action: 'create' | 'read' | 'update' | 'delete'
): boolean {
  const permissions = PERMISSIONS[role];
  const resourcePermission = permissions.find(p => p.resource === resource);
  return resourcePermission?.actions.includes(action) ?? false;
}

export interface UserRoleData {
  id: string;
  user_id: string;
  role: UserRole;
  created_at: string;
  updated_at: string;
}

export interface TempPassword {
  id: string;
  user_id: string;
  temp_password: string;
  expires_at: string;
  is_used: boolean;
  created_at: string;
}