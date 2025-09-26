'use client'

import { useState } from 'react'
import { useUserRole } from '@/hooks/useUserRole'
import { useUser } from '@/contexts/user-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Shield, 
  Eye, 
  EyeOff, 
  User, 
  Crown, 
  CreditCard,
  Building,
  Settings
} from 'lucide-react'

/**
 * Debug panel for RBAC testing in development
 * Shows current role, permissions, and allows role simulation
 */
export function RoleDebugPanel() {
  const [isVisible, setIsVisible] = useState(false)
  const { selectedOrganization } = useUser()
  const {
    role,
    isOwner,
    isAdmin,
    isMember,
    isViewer,
    isBilling,
    canAccessOrganizations,
    canSeeBilling,
    canSeeAccess,
    canSeeRoleManagement,
    canSeeMemberManagement
  } = useUserRole()

  // Only show in development
  if (process.env.NODE_ENV !== 'development') {
    return null
  }

  const getRoleIcon = (roleName: string) => {
    switch (roleName) {
      case 'owner': return <Crown className="w-4 h-4 text-yellow-400" />
      case 'admin': return <Shield className="w-4 h-4 text-blue-400" />
      case 'billing': return <CreditCard className="w-4 h-4 text-purple-400" />
      case 'member': return <User className="w-4 h-4 text-green-400" />
      case 'viewer': return <Eye className="w-4 h-4 text-gray-400" />
      default: return <User className="w-4 h-4 text-gray-400" />
    }
  }

  const getRoleColor = (roleName: string) => {
    switch (roleName) {
      case 'owner': return 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30'
      case 'admin': return 'bg-blue-500/20 text-blue-300 border-blue-500/30'
      case 'billing': return 'bg-purple-500/20 text-purple-300 border-purple-500/30'
      case 'member': return 'bg-green-500/20 text-green-300 border-green-500/30'
      case 'viewer': return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
      default: return 'bg-gray-500/20 text-gray-300 border-gray-500/30'
    }
  }

  const permissions = [
    { name: 'Access Organizations', value: canAccessOrganizations, description: 'Can view /organizations page' },
    { name: 'See Billing', value: canSeeBilling, description: 'Can see billing tab and data' },
    { name: 'See Access', value: canSeeAccess, description: 'Can see access management tab' },
    { name: 'Role Management', value: canSeeRoleManagement, description: 'Can manage user roles' },
    { name: 'Member Management', value: canSeeMemberManagement, description: 'Can invite/remove members' }
  ]

  if (!isVisible) {
    return (
      <div className="fixed bottom-4 right-4 z-50">
        <Button
          onClick={() => setIsVisible(true)}
          variant="outline"
          size="sm"
          className="bg-black/80 border-blue-500/50 text-blue-300 hover:bg-blue-500/20"
        >
          <Shield className="w-4 h-4 mr-2" />
          RBAC Debug
        </Button>
      </div>
    )
  }

  return (
    <div className="fixed bottom-4 right-4 z-50 w-80">
      <Card className="bg-black/90 border border-blue-500/50 backdrop-blur-sm">
        <div className="p-4">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">RBAC Debug Panel</span>
            </div>
            <Button
              onClick={() => setIsVisible(false)}
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0"
            >
              <EyeOff className="w-4 h-4" />
            </Button>
          </div>

          {/* Current Role */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">Current Role</div>
            <div className="flex items-center gap-2">
              {role && getRoleIcon(role)}
              <span className={`px-2 py-1 rounded-md text-xs font-medium border ${getRoleColor(role || '')}`}>
                {role || 'No Role'}
              </span>
            </div>
            {selectedOrganization && (
              <div className="text-xs text-gray-400 mt-1">
                in {selectedOrganization.organization.name}
              </div>
            )}
          </div>

          {/* Role Checks */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">Role Checks</div>
            <div className="grid grid-cols-2 gap-1 text-xs">
              <div className={`flex items-center gap-1 ${isOwner ? 'text-yellow-400' : 'text-gray-500'}`}>
                <Crown className="w-3 h-3" />
                Owner: {isOwner ? '✓' : '✗'}
              </div>
              <div className={`flex items-center gap-1 ${isAdmin ? 'text-blue-400' : 'text-gray-500'}`}>
                <Shield className="w-3 h-3" />
                Admin: {isAdmin ? '✓' : '✗'}
              </div>
              <div className={`flex items-center gap-1 ${isBilling ? 'text-purple-400' : 'text-gray-500'}`}>
                <CreditCard className="w-3 h-3" />
                Billing: {isBilling ? '✓' : '✗'}
              </div>
              <div className={`flex items-center gap-1 ${isMember ? 'text-green-400' : 'text-gray-500'}`}>
                <User className="w-3 h-3" />
                Member: {isMember ? '✓' : '✗'}
              </div>
              <div className={`flex items-center gap-1 ${isViewer ? 'text-gray-400' : 'text-gray-500'}`}>
                <Eye className="w-3 h-3" />
                Viewer: {isViewer ? '✓' : '✗'}
              </div>
            </div>
          </div>

          {/* Permissions */}
          <div className="mb-4">
            <div className="text-xs text-gray-400 mb-2">Permissions</div>
            <div className="space-y-1">
              {permissions.map((permission) => (
                <div
                  key={permission.name}
                  className="flex items-center justify-between text-xs"
                  title={permission.description}
                >
                  <span className="text-gray-300">{permission.name}</span>
                  <span className={permission.value ? 'text-green-400' : 'text-red-400'}>
                    {permission.value ? '✓' : '✗'}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Current Page Info */}
          <div className="text-xs text-gray-400">
            <div className="flex items-center gap-1 mb-1">
              <Building className="w-3 h-3" />
              Page: {typeof window !== 'undefined' ? window.location.pathname : 'Unknown'}
            </div>
            <div className="flex items-center gap-1">
              <Settings className="w-3 h-3" />
              Env: {process.env.NODE_ENV}
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
