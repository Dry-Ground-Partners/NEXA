'use client'

import { useUserRole, UserRole } from '@/hooks/useUserRole'

interface RoleGateProps {
  /** Array of roles that can see this content */
  allowedRoles?: UserRole[]
  /** Array of roles that are explicitly denied (takes precedence) */
  deniedRoles?: UserRole[]
  /** Specific permission check function */
  requirePermission?: (role: UserRole | null) => boolean
  /** What to render if access is denied */
  fallback?: React.ReactNode
  /** The content to protect */
  children: React.ReactNode
  /** Additional debugging info */
  debugLabel?: string
}

/**
 * RoleGate component for protecting UI elements based on user roles
 * 
 * Usage examples:
 * <RoleGate allowedRoles={['owner', 'billing']}>
 *   <BillingTab />
 * </RoleGate>
 * 
 * <RoleGate deniedRoles={['member', 'viewer']}>
 *   <OrganizationManagement />
 * </RoleGate>
 * 
 * <RoleGate requirePermission={(role) => role === 'owner'}>
 *   <OwnerOnlyContent />
 * </RoleGate>
 */
export function RoleGate({ 
  allowedRoles = [], 
  deniedRoles = [],
  requirePermission,
  fallback = null, 
  children,
  debugLabel 
}: RoleGateProps) {
  const { role } = useUserRole()
  
  // If we have a custom permission function, use that
  if (requirePermission) {
    const hasPermission = requirePermission(role)
    if (!hasPermission) {
      if (debugLabel && process.env.NODE_ENV === 'development') {
        console.log(`🚫 RoleGate[${debugLabel}]: Access denied for role "${role}" (custom permission)`)
      }
      return <>{fallback}</>
    }
    return <>{children}</>
  }
  
  // Check denied roles first (takes precedence)
  if (deniedRoles.length > 0 && role && deniedRoles.includes(role)) {
    if (debugLabel && process.env.NODE_ENV === 'development') {
      console.log(`🚫 RoleGate[${debugLabel}]: Access denied for role "${role}" (explicitly denied)`)
    }
    return <>{fallback}</>
  }
  
  // Check allowed roles
  if (allowedRoles.length > 0) {
    const hasAllowedRole = role && allowedRoles.includes(role)
    if (!hasAllowedRole) {
      if (debugLabel && process.env.NODE_ENV === 'development') {
        console.log(`🚫 RoleGate[${debugLabel}]: Access denied for role "${role}" (not in allowed roles: ${allowedRoles.join(', ')})`)
      }
      return <>{fallback}</>
    }
  }
  
  // Access granted
  if (debugLabel && process.env.NODE_ENV === 'development') {
    console.log(`✅ RoleGate[${debugLabel}]: Access granted for role "${role}"`)
  }
  
  return <>{children}</>
}

/**
 * Convenience components for common role checks
 */
export function OwnerOnly({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={['owner']} fallback={fallback} debugLabel="OwnerOnly">
      {children}
    </RoleGate>
  )
}

export function AdminOrOwner({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={['owner', 'admin']} fallback={fallback} debugLabel="AdminOrOwner">
      {children}
    </RoleGate>
  )
}

export function BillingAccess({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGate allowedRoles={['owner', 'billing']} fallback={fallback} debugLabel="BillingAccess">
      {children}
    </RoleGate>
  )
}

export function NoMemberViewer({ children, fallback = null }: { children: React.ReactNode, fallback?: React.ReactNode }) {
  return (
    <RoleGate deniedRoles={['member', 'viewer']} fallback={fallback} debugLabel="NoMemberViewer">
      {children}
    </RoleGate>
  )
}






