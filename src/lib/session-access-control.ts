import { PrismaClient } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'

const prisma = new PrismaClient()

export type AccessLevel = 'none' | 'read' | 'write' | 'delete'

export interface AccessControlConfig {
  nexa_access_control: {
    version: string
    type: 'organization' | 'per_role' | 'per_user'
    created_by: string
    created_at: string
    role_permissions?: {
      owner?: AccessLevel
      admin?: AccessLevel 
      member?: AccessLevel
      viewer?: AccessLevel
      billing?: AccessLevel
    }
    user_permissions?: Array<{
      user_id: string
      permission: AccessLevel
      granted_by: string
      granted_at: string
    }>
  }
}

/**
 * Core Session Access Control Service
 * Implements granular permission evaluation with hierarchy: delete > write > read
 */
export class SessionAccessControlService {
  
  /**
   * Evaluate session access for the current user
   * @param sessionId Session UUID
   * @returns AccessLevel for the current user
   */
  async evaluateSessionAccess(sessionId: string): Promise<AccessLevel> {
    try {
      const user = await getCurrentUser()
      if (!user) {
        console.log('🔒 Access denied: No authenticated user')
        return 'none'
      }

      // Get session with organization membership info
      const sessionData = await prisma.aIArchitectureSession.findFirst({
        where: { 
          uuid: sessionId,
          deletedAt: null
        },
        include: {
          organization: {
            include: {
              memberships: {
                where: { 
                  userId: user.id, 
                  status: 'active'
                }
              }
            }
          }
        }
      })

      if (!sessionData) {
        console.log('🔒 Access denied: Session not found')
        return 'none'
      }

      // Check if user has membership in the organization
      const userMembership = sessionData.organization.memberships[0]
      if (!userMembership) {
        console.log('🔒 Access denied: Not a member of the organization')
        return 'none'
      }

      // Session creator always has full access (delete permission)
      if (sessionData.userId === user.id) {
        console.log('✅ Creator access: Full delete permission')
        return 'delete'
      }

      // Check for granular access control configuration  
      const accessControl = (sessionData as any).accessPermissions
      
      if (!accessControl?.nexa_access_control) {
        // No granular permissions configured - use organization-level access
        console.log('📋 Using organization-level access based on role:', userMembership.role)
        return this.getOrganizationAccess(userMembership.role)
      }

      // Evaluate granular access control
      const config = accessControl as AccessControlConfig
      console.log('🔍 Evaluating granular access control:', config.nexa_access_control.type)

      switch (config.nexa_access_control.type) {
        case 'per_role':
          return this.getRoleAccess(userMembership.role, config.nexa_access_control.role_permissions)

        case 'per_user':
          return this.getUserAccess(user.id, config.nexa_access_control.user_permissions)

        default:
          // Fallback to organization access
          return this.getOrganizationAccess(userMembership.role)
      }

    } catch (error) {
      console.error('❌ Error evaluating session access:', error)
      return 'none'
    }
  }

  /**
   * Get default organization-level access based on role
   */
  private getOrganizationAccess(role: string): AccessLevel {
    const defaultAccess: Record<string, AccessLevel> = {
      owner: 'delete',
      admin: 'delete', 
      member: 'write',
      viewer: 'read',
      billing: 'read'
    }

    return defaultAccess[role] || 'none'
  }

  /**
   * Get access level based on per-role configuration
   */
  private getRoleAccess(
    userRole: string, 
    rolePermissions?: AccessControlConfig['nexa_access_control']['role_permissions']
  ): AccessLevel {
    if (!rolePermissions) {
      return this.getOrganizationAccess(userRole)
    }

    const permission = rolePermissions[userRole as keyof typeof rolePermissions]
    
    if (permission) {
      console.log(`✅ Role-based access (${userRole}):`, permission)
      return permission
    }

    console.log(`⚠️  No role permission found for ${userRole}, denying access`)
    return 'none'
  }

  /**
   * Get access level based on per-user configuration
   */
  private getUserAccess(
    userId: string,
    userPermissions?: AccessControlConfig['nexa_access_control']['user_permissions']
  ): AccessLevel {
    if (!userPermissions) {
      console.log('⚠️  No user permissions configured in per-user mode')
      return 'none'
    }

    const userPermission = userPermissions.find(p => p.user_id === userId)
    
    if (userPermission) {
      console.log(`✅ User-specific access:`, userPermission.permission)
      return userPermission.permission
    }

    // In per-user mode, only explicitly granted users have access
    console.log('⚠️  User not explicitly granted access in per-user mode')
    return 'none'
  }

  /**
   * Check if user has at least the required access level
   */
  hasAccess(currentLevel: AccessLevel, requiredLevel: AccessLevel): boolean {
    const hierarchy: Record<AccessLevel, number> = {
      none: 0,
      read: 1,
      write: 2, 
      delete: 3
    }

    return hierarchy[currentLevel] >= hierarchy[requiredLevel]
  }

  /**
   * Check if user can read the session
   */
  async canRead(sessionId: string): Promise<boolean> {
    const access = await this.evaluateSessionAccess(sessionId)
    return this.hasAccess(access, 'read')
  }

  /**
   * Check if user can write/save to the session  
   */
  async canWrite(sessionId: string): Promise<boolean> {
    const access = await this.evaluateSessionAccess(sessionId)
    return this.hasAccess(access, 'write')
  }

  /**
   * Check if user can delete the session
   */
  async canDelete(sessionId: string): Promise<boolean> {
    const access = await this.evaluateSessionAccess(sessionId)
    return this.hasAccess(access, 'delete')
  }

  /**
   * Get all sessions the user has read access to within an organization
   */
  async getAccessibleSessions(organizationId: string): Promise<string[]> {
    try {
      const user = await getCurrentUser()
      if (!user) return []

      // Get all sessions in the organization
      const sessions = await prisma.aIArchitectureSession.findMany({
        where: {
          organizationId,
          deletedAt: null
        },
        select: {
          uuid: true
        }
      })

      // Filter sessions based on access
      const accessibleSessions: string[] = []
      
      for (const session of sessions) {
        if (await this.canRead(session.uuid)) {
          accessibleSessions.push(session.uuid)
        }
      }

      return accessibleSessions

    } catch (error) {
      console.error('❌ Error getting accessible sessions:', error)
      return []
    }
  }
}

// Export singleton instance
export const sessionAccessControl = new SessionAccessControlService()
