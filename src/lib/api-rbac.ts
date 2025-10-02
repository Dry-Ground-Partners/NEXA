import { NextRequest } from 'next/server'
import { verifyAuth, User } from '@/lib/auth'

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer' | 'billing'

export interface UserRoleInfo {
  role: UserRole | null
  organizationId: string | null
  userId: string | null
  user: User | null
}

/**
 * Get user's role in a specific organization from API request
 */
export async function getUserRoleFromRequest(
  request: NextRequest, 
  organizationId?: string
): Promise<UserRoleInfo> {
  try {
    const user = await verifyAuth(request)
    
    if (!user) {
      return { role: null, organizationId: null, userId: null, user: null }
    }

    // If organizationId not provided, try to get from headers or use selected org
    let targetOrgId = organizationId
    
    if (!targetOrgId) {
      // Try to get from X-Organization-Id header
      targetOrgId = request.headers.get('x-organization-id') || undefined
      
      // Fallback to first active organization if still not found
      if (!targetOrgId && user.organizationMemberships && user.organizationMemberships.length > 0) {
        const activeOrg = user.organizationMemberships.find(m => m.status === 'active')
        targetOrgId = activeOrg?.organization.id
      }
    }

    if (!targetOrgId) {
      return { role: null, organizationId: null, userId: user.id, user }
    }

    // Debug: Log membership data
    console.log('🔍 RBAC Debug - Looking for org:', targetOrgId)
    console.log('🔍 RBAC Debug - User memberships:', user.organizationMemberships?.map(m => ({
      orgId: m.organization.id,
      role: m.role,
      status: m.status
    })))

    // Find user's membership in the target organization
    const membership = user.organizationMemberships?.find(
      m => m.organization.id === targetOrgId && m.status === 'active'
    )

    console.log('🔍 RBAC Debug - Found membership:', membership ? { role: membership.role, status: membership.status } : null)

    return {
      role: membership?.role as UserRole || null,
      organizationId: targetOrgId,
      userId: user.id,
      user
    }
  } catch (error: unknown) {
    console.error('Error getting user role from request:', error)
    return { role: null, organizationId: null, userId: null, user: null }
  }
}

/**
 * Check if user has any of the specified roles
 */
export function hasAnyRole(userRole: UserRole | null, allowedRoles: UserRole[]): boolean {
  return userRole ? allowedRoles.includes(userRole) : false
}

/**
 * Check if user has a specific role
 */
export function hasRole(userRole: UserRole | null, requiredRole: UserRole): boolean {
  return userRole === requiredRole
}

/**
 * Permission checking functions based on RBAC requirements
 */
export function canAccessOrganizations(role: UserRole | null): boolean {
  return hasAnyRole(role, ['owner', 'admin', 'billing'])
}

export function canSeeBilling(role: UserRole | null): boolean {
  return hasAnyRole(role, ['owner', 'billing'])
}

export function canSeeAccess(role: UserRole | null): boolean {
  return hasAnyRole(role, ['owner', 'admin'])
}

export function canSeeRoleManagement(role: UserRole | null): boolean {
  return hasRole(role, 'owner')
}

export function canSeeMemberManagement(role: UserRole | null): boolean {
  return hasRole(role, 'owner')
}

/**
 * Higher-order function to require specific roles for API endpoints
 */
export function requireRoles(allowedRoles: UserRole[]) {
  return async (request: NextRequest, organizationId?: string): Promise<UserRoleInfo | null> => {
    const roleInfo = await getUserRoleFromRequest(request, organizationId)
    
    if (!roleInfo.role || !hasAnyRole(roleInfo.role, allowedRoles)) {
      return null
    }
    
    return roleInfo
  }
}

/**
 * Higher-order function to require specific permissions for API endpoints
 */
export function requirePermission(permissionCheck: (role: UserRole | null) => boolean) {
  return async (request: NextRequest, organizationId?: string): Promise<UserRoleInfo | null> => {
    const roleInfo = await getUserRoleFromRequest(request, organizationId)
    
    if (!permissionCheck(roleInfo.role)) {
      return null
    }
    
    return roleInfo
  }
}

/**
 * Predefined permission requirements for common use cases
 */
export const requireOrganizationAccess = requirePermission(canAccessOrganizations)
export const requireBillingAccess = requirePermission(canSeeBilling)
export const requireAccessManagement = requirePermission(canSeeAccess)
export const requireRoleManagement = requirePermission(canSeeRoleManagement)
export const requireMemberManagement = requirePermission(canSeeMemberManagement)




