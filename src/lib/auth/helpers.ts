import { getServerSession } from 'next-auth';
import { authOptions, type UserRole } from './config';

// Get the current session server-side
export async function getSession() {
  return await getServerSession(authOptions);
}

// Get the current user or throw an error
export async function getCurrentUser() {
  const session = await getSession();

  if (!session?.user) {
    // TEMPORARY: Return mock admin user for demo (login disabled)
    return {
      id: 'demo-admin',
      email: 'admin@demo.com',
      name: 'Demo Admin',
      role: 'SUPER_ADMIN' as UserRole,
      organizationId: null,
      isActive: true,
    };
  }

  return session.user;
}

// Check if user has required role
export function hasRole(userRole: UserRole, requiredRole: UserRole): boolean {
  const roleHierarchy: Record<UserRole, number> = {
    SUPER_ADMIN: 4,
    ORG_ADMIN: 3,
    VIEWER: 2,
    RESPONDENT: 1,
  };

  return roleHierarchy[userRole] >= roleHierarchy[requiredRole];
}

// Check if current user has required role
export async function requireRole(requiredRole: UserRole) {
  const user = await getCurrentUser();

  if (!hasRole(user.role, requiredRole)) {
    throw new Error('Forbidden: Insufficient permissions');
  }

  return user;
}

// Check if user is admin (ORG_ADMIN or SUPER_ADMIN)
export async function requireAdmin() {
  const user = await getCurrentUser();

  if (!hasRole(user.role, 'ORG_ADMIN')) {
    throw new Error('Forbidden: Admin access required');
  }

  return user;
}

// Check if user is super admin
export async function requireSuperAdmin() {
  const user = await getCurrentUser();

  if (user.role !== 'SUPER_ADMIN') {
    throw new Error('Forbidden: Super admin access required');
  }

  return user;
}
