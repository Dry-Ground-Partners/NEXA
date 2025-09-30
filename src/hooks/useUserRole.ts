'use client'

import { useUser } from '@/contexts/user-context'

export type UserRole = 'owner' | 'admin' | 'member' | 'viewer' | 'billing'

export function useUserRole() {
  const { selectedOrganization } = useUser()
  const role = selectedOrganization?.role as UserRole | null
  
  return {
    role,
    isOwner: role === 'owner',
    isAdmin: role === 'admin', 
    isMember: role === 'member',
    isViewer: role === 'viewer',
    isBilling: role === 'billing',
    
    // Combined checks for RBAC requirements
    canAccessOrganizations: ['owner', 'admin', 'billing'].includes(role || ''),
    canSeeBilling: ['owner', 'billing'].includes(role || ''),
    canSeeAccess: ['owner', 'admin'].includes(role || ''),
    canSeeRoleManagement: role === 'owner',
    canSeeMemberManagement: role === 'owner',
    
    // Utility methods
    hasAnyRole: (roles: UserRole[]) => roles.includes(role as UserRole),
    hasRole: (targetRole: UserRole) => role === targetRole
  }
}



