'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { useUser } from '@/contexts/user-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Building, 
  Users, 
  CreditCard, 
  History,
  Plus, 
  Settings, 
  ChevronRight,
  Crown,
  Shield,
  User,
  ArrowLeft,
  Lock,
  Key,
  CheckCircle,
  MoreHorizontal,
  Zap,
  DollarSign,
  Mail,
  UserPlus,
  UserMinus,
  Trash2,
  Calendar,
  Clock,
  X
} from 'lucide-react'
import Link from 'next/link'
import type { AuthUser } from '@/types'

interface Organization {
  id: string
  name: string
  slug: string | null
  logoUrl?: string | null
  planType: string
  status: string
}

interface OrganizationMembership {
  id: string
  role: string
  status: string
  joinedAt: Date | null
  organization: Organization
}

interface User extends AuthUser {
  organizationMemberships: OrganizationMembership[]
}

export default function OrganizationsPage() {
  const router = useRouter()
  const { user, loading, error, selectedOrganization, setSelectedOrganization, refreshUser } = useUser()
  const [activeTab, setActiveTab] = useState('all')
  const [accessActiveSection, setAccessActiveSection] = useState('sessions')
  
  // Organization data state (local to this page)
  const [organizationData, setOrganizationData] = useState<any>({
    members: [],
    sessions: [],
    billing: null,
    usage: null,
    roles: {}
  })
  const [organizationLoading, setOrganizationLoading] = useState(false)
  
  // Modal states
  const [roleModalOpen, setRoleModalOpen] = useState(false)
  const [selectedRole, setSelectedRole] = useState<string>('')
  const [inviteModalOpen, setInviteModalOpen] = useState(false)
  const [roleChangeDropdownOpen, setRoleChangeDropdownOpen] = useState<string | null>(null)
  const [inviteLoading, setInviteLoading] = useState(false)
  const [inviteError, setInviteError] = useState<string | null>(null)
  const [isReInvite, setIsReInvite] = useState(false)
  const [previousOffboarding, setPreviousOffboarding] = useState<any>(null)
  const [inviteSuccess, setInviteSuccess] = useState<string | null>(null)
  
  // Offboard modal states
  const [offboardModalOpen, setOffboardModalOpen] = useState(false)
  const [memberToOffboard, setMemberToOffboard] = useState<any>(null)
  const [offboardLoading, setOffboardLoading] = useState(false)
  const [offboardReason, setOffboardReason] = useState('administrative_action')

  // Session permissions modal states
  const [permissionsModalOpen, setPermissionsModalOpen] = useState(false)
  const [selectedSession, setSelectedSession] = useState<any>(null)
  const [permissionsLoading, setPermissionsLoading] = useState(false)
  const [permissionsError, setPermissionsError] = useState<string | null>(null)
  const [sessionDropdownOpen, setSessionDropdownOpen] = useState<string | null>(null)
  
  // Session permissions form state
  const [accessMode, setAccessMode] = useState<'organization' | 'per_role' | 'per_user'>('organization')
  const [sessionRolePermissions, setSessionRolePermissions] = useState<{[key: string]: string}>({})
  const [userPermissions, setUserPermissions] = useState<Array<{user_id: string, permission: string}>>([])
  const [availableMembers, setAvailableMembers] = useState<any[]>([])

  // Helper function to format timestamps
  const formatTimestamp = (timestamp: string | Date) => {
    const date = new Date(timestamp)
    const now = new Date()
    const diffMs = now.getTime() - date.getTime()
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60))
    const diffDays = Math.floor(diffHours / 24)
    
    if (diffHours < 1) return 'Just now'
    if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`
    if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
    return date.toLocaleDateString()
  }

  // Modal handlers
  const openRoleModal = (role: string) => {
    setSelectedRole(role)
    setRoleModalOpen(true)
  }

  const closeRoleModal = () => {
    setRoleModalOpen(false)
    setSelectedRole('')
  }

  const openInviteModal = () => {
    setInviteModalOpen(true)
  }

  const closeInviteModal = () => {
    setInviteModalOpen(false)
    setInviteError(null)
    setInviteLoading(false)
    setInviteSuccess(null)
    setIsReInvite(false)
    setPreviousOffboarding(null)
  }

  // Check if current user can invite members (only owners and admins)
  const canInviteMembers = selectedOrganization && ['owner', 'admin'].includes(selectedOrganization.role)

  // Session permissions modal handlers
  const openPermissionsModal = async (session: any) => {
    setSelectedSession(session)
    setPermissionsModalOpen(true)
    setPermissionsLoading(true)
    setPermissionsError(null)

    try {
      // Load current permissions
      const [permissionsResponse, membersResponse] = await Promise.all([
        fetch(`/api/sessions/${session.uuid}/permissions`),
        fetch(`/api/organizations/${selectedOrganization?.organization.id}/members-for-permissions`)
      ])

      const permissionsData = await permissionsResponse.json()
      const membersData = await membersResponse.json()

      if (permissionsData.success) {
        const { permissions } = permissionsData
        setAccessMode(permissions.accessMode || 'organization')
        
        if (permissions.configuration?.role_permissions) {
          setSessionRolePermissions(permissions.configuration.role_permissions)
        } else {
          setSessionRolePermissions({})
        }

        if (permissions.configuration?.user_permissions) {
          setUserPermissions(permissions.configuration.user_permissions.map((up: any) => ({
            user_id: up.user_id,
            permission: up.permission
          })))
        } else {
          setUserPermissions([])
        }
      }

      if (membersData.success) {
        setAvailableMembers(membersData.members)
      }

    } catch (error) {
      console.error('❌ Error loading session permissions:', error)
      setPermissionsError('Failed to load session permissions')
    } finally {
      setPermissionsLoading(false)
    }
  }

  const closePermissionsModal = () => {
    setPermissionsModalOpen(false)
    setSelectedSession(null)
    setPermissionsError(null)
    setAccessMode('organization')
    setSessionRolePermissions({})
    setUserPermissions([])
    setAvailableMembers([])
  }

  const handlePermissionsSave = async () => {
    if (!selectedSession || !selectedOrganization) return

    setPermissionsLoading(true)
    setPermissionsError(null)

    try {
      const response = await fetch(`/api/sessions/${selectedSession.uuid}/permissions`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          accessMode,
          rolePermissions: accessMode === 'per_role' ? sessionRolePermissions : null,
          userPermissions: accessMode === 'per_user' ? userPermissions : null
        })
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update permissions')
      }

      console.log('✅ Session permissions updated successfully')
      closePermissionsModal()
      
      // Refresh organization data to show updated permissions
      await loadOrganizationData(selectedOrganization.organization)

    } catch (error: any) {
      console.error('❌ Error updating session permissions:', error)
      setPermissionsError(error.message || 'Failed to update permissions')
    } finally {
      setPermissionsLoading(false)
    }
  }

  // Handle role change
  const handleRoleChange = async (memberId: string, newRole: string) => {
    if (!selectedOrganization) return

    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.organization.id}/members/${memberId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ action: 'change_role', role: newRole }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to update role')
      }

      // Refresh organization data to show updated role
      await loadOrganizationData(selectedOrganization.organization)
      setRoleChangeDropdownOpen(null)
      
      console.log('✅ Role updated successfully')
    } catch (error: any) {
      console.error('❌ Failed to update role:', error)
      alert(`Failed to update role: ${error.message}`)
    }
  }

  // Handle offboard member
  const openOffboardModal = (member: any) => {
    setMemberToOffboard(member)
    setOffboardModalOpen(true)
    setRoleChangeDropdownOpen(null) // Close dropdown
  }

  const closeOffboardModal = () => {
    setOffboardModalOpen(false)
    setMemberToOffboard(null)
    setOffboardReason('administrative_action')
  }

  const handleOffboardConfirm = async () => {
    if (!selectedOrganization || !memberToOffboard) return

    setOffboardLoading(true)

    try {
      const response = await fetch(`/api/organizations/${selectedOrganization.organization.id}/members/${memberToOffboard.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          action: 'offboard', 
          reason: offboardReason 
        }),
      })

      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to offboard member')
      }

      // Refresh organization data to remove offboarded member
      await loadOrganizationData(selectedOrganization.organization)
      closeOffboardModal()
      
      console.log('✅ Member offboarded successfully:', data.message)
    } catch (error: any) {
      console.error('❌ Failed to offboard member:', error)
      alert(`Failed to offboard member: ${error.message}`)
    } finally {
      setOffboardLoading(false)
    }
  }

  const handleInviteSubmit = async (formData: FormData) => {
    if (!selectedOrganization) return

    setInviteLoading(true)
    setInviteError(null)

    try {
      const email = formData.get('email') as string
      const firstName = formData.get('firstName') as string
      const lastName = formData.get('lastName') as string
      const role = formData.get('role') as string
      const personalMessage = formData.get('personalMessage') as string

      const response = await fetch(`/api/organizations/${selectedOrganization.organization.id}/invitations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          email,
          firstName,
          lastName,
          role,
          personalMessage
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setInviteError(data.error || 'Failed to send invitation')
        return
      }

      // Handle re-invite information if present
      if (data.invitation?.isReInvite) {
        setIsReInvite(true)
        setPreviousOffboarding(data.invitation.previousOffboarding)
        setInviteSuccess(`Re-invitation sent successfully! This user was previously removed due to: ${data.invitation.previousOffboarding?.reason || 'unknown reason'}`)
        console.log('✅ Re-invite successful:', data.invitation.previousOffboarding)
      } else {
        setIsReInvite(false)
        setPreviousOffboarding(null)
        setInviteSuccess('Invitation sent successfully!')
      }

      // Refresh organization data to show the new pending invitation
      if (selectedOrganization) {
        loadOrganizationData(selectedOrganization.organization)
      }

      // Auto-close modal after showing success message
      setTimeout(() => {
        closeInviteModal()
      }, 3000)

    } catch (error) {
      setInviteError('Failed to send invitation')
      console.error('Error sending invitation:', error)
    } finally {
      setInviteLoading(false)
    }
  }

  const rolePermissions = {
    owner: { label: 'Owner', color: 'text-yellow-400' },
    admin: { label: 'Admin', color: 'text-blue-400' },
    member: { label: 'Member', color: 'text-green-400' },
    viewer: { label: 'Viewer', color: 'text-gray-400' },
    billing: { label: 'Billing', color: 'text-purple-400' }
  }

  // Keyboard shortcuts for organizations tabs
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.hasAttribute('contenteditable')
      )
      
      if (isInputFocused) return // Don't trigger shortcuts when typing
      
      // Organizations tab shortcuts
      const tabMap: { [key: string]: string } = {
        '1': 'all',
        '2': 'access',
        '3': 'billing',
        '4': 'history'
      }
      
      if (tabMap[event.key]) {
        event.preventDefault()
        setActiveTab(tabMap[event.key])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])


  // Organization switching functionality - updates global state only
  const switchToOrganization = (organization: Organization) => {
    console.log('🔄 Switching to organization:', organization.name)
    
    // Update global organization context - this will affect header and other components
    // The useEffect will automatically load the data when selectedOrganization changes
    setSelectedOrganization({
      id: organization.id,
      role: user?.organizationMemberships?.find(m => m.organization.id === organization.id)?.role || 'member',
      status: 'active',
      organization: {
        id: organization.id,
        name: organization.name,
        slug: organization.slug || null,
        logoUrl: organization.logoUrl || null,
        planType: organization.planType,
        status: organization.status
      },
      joinedAt: user?.organizationMemberships?.find(m => m.organization.id === organization.id)?.joinedAt || null
    })
    
    // Switch to access tab to show the organization data
    setActiveTab('access')
  }

  // Load organization data without changing the global state
  const loadOrganizationData = useCallback(async (organization: Organization) => {
    setOrganizationLoading(true)
    
    try {
      // Fetch real organization data from APIs
      const [sessionsResponse, membersResponse] = await Promise.all([
        fetch(`/api/organizations/${organization.id}/sessions`),
        fetch(`/api/organizations/${organization.id}/members`)
      ])
      
      const sessionsData = await sessionsResponse.json()
      const membersData = await membersResponse.json()
      
      if (!sessionsData.success || !membersData.success) {
        throw new Error('Failed to fetch organization data')
      }
      
      setOrganizationData({
        members: membersData.members || [],
        sessions: sessionsData.sessions || [],
        roles: membersData.roles || {},
        billing: null,
        usage: null
      })
      
      console.log('✅ Organization data loaded for:', organization.name, {
        sessions: sessionsData.sessions?.length || 0,
        members: membersData.members?.length || 0,
        roles: membersData.roles
      })
      
    } catch (error) {
      console.error('❌ Failed to load organization data:', error)
      // Fallback to empty data
      setOrganizationData({
        members: [],
        sessions: [],
        roles: {},
        billing: null,
        usage: null
      })
    } finally {
      setOrganizationLoading(false)
    }
  }, [])

  // Load organization data when selectedOrganization changes from global context
  useEffect(() => {
    if (selectedOrganization) {
      console.log('🔄 Loading data for selected organization:', selectedOrganization.organization.name)
      loadOrganizationData(selectedOrganization.organization)
    }
  }, [selectedOrganization, loadOrganizationData])

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Element
      
      if (roleChangeDropdownOpen && !target.closest('.role-dropdown-container')) {
        setRoleChangeDropdownOpen(null)
      }
      
      if (sessionDropdownOpen && !target.closest('.session-dropdown-container')) {
        setSessionDropdownOpen(null)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [roleChangeDropdownOpen, sessionDropdownOpen])

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'owner': return 'text-yellow-400'
      case 'admin': return 'text-blue-400'  
      case 'member': return 'text-green-400'
      case 'viewer': return 'text-gray-400'
      default: return 'text-gray-400'
    }
  }

  const getRoleIcon = (role: string) => {
    switch (role) {
      case 'owner': return <Crown className="w-4 h-4" />
      case 'admin': return <Shield className="w-4 h-4" />
      case 'member': return <User className="w-4 h-4" />
      case 'viewer': return <User className="w-4 h-4" />
      default: return <User className="w-4 h-4" />
    }
  }

  // Determine content based on state
  let content

  if (loading) {
    content = (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-white">Loading organizations...</div>
      </div>
    )
  } else if (error) {
    content = (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-400 mb-4">Failed to load user data</div>
          <div className="text-nexa-muted text-sm mb-4">{error}</div>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    )
  } else if (!user) {
    content = (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="text-red-400 mb-4">No user data available</div>
          <button 
            onClick={() => router.push('/auth/login')} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Go to Login
          </button>
        </div>
      </div>
    )
  } else {
    content = (
      <div className="nexa-background min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Tab Navigation Row */}
          <div className="flex items-end justify-between mb-0">
            {/* Left: Label + Tab Strip */}
            <div className="flex items-end gap-8">
              {/* Organizations Label */}
              <div className="flex items-center gap-2 text-white pb-3 ml-16">
                <Building className="w-4 h-4" />
                <span>Organizations</span>
              </div>
              
              {/* Main Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="all">
                    <Building className="w-4 h-4 mr-2" />
                    All
                  </TabsTrigger>
                  <TabsTrigger value="access">
                    <Users className="w-4 h-4 mr-2" />
                    Access
                  </TabsTrigger>
                  <TabsTrigger value="billing">
                    <CreditCard className="w-4 h-4 mr-2" />
                    Billing
                  </TabsTrigger>
                  <TabsTrigger value="history">
                    <History className="w-4 h-4 mr-2" />
                    History
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>

            {/* Right: Organization Pill */}
            {selectedOrganization && (
              <button 
                onClick={() => setActiveTab('all')}
                className="flex items-center gap-2 px-3 py-1 bg-blue-600/20 text-blue-400 rounded-full border border-blue-500/30 text-xs hover:bg-blue-600/30 transition-colors mb-3"
                title="Go to All Organizations"
              >
                <Building className="w-3 h-3" />
                <span>{selectedOrganization.organization.name}</span>
              </button>
            )}
          </div>

          {/* Content Card */}
          <Card variant="nexa" className="rounded-tr-none border-t border-nexa-border p-8 mt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              
              {/* All Organizations Tab Content */}
              <TabsContent value="all" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Your Organizations</h3>
                      <p className="text-nexa-muted">Manage your organization memberships and access</p>
                    </div>
                    <Link href="/organizations/create">
                      <Button className="flex items-center gap-2 bg-white hover:bg-gray-100 text-black border border-gray-300">
                        <Plus className="w-4 h-4" />
                        Create Organization
                      </Button>
                    </Link>
                  </div>

                  {user.organizationMemberships && user.organizationMemberships.length > 0 ? (
                    <div className="grid gap-4">
                      {user.organizationMemberships.map((membership) => (
                        <Card key={membership.id} className={`backdrop-blur-md bg-black p-6 transition-colors ${
                          selectedOrganization?.organization.id === membership.organization?.id 
                            ? 'border border-blue-500 bg-blue-500/5' 
                            : 'border border-slate-700/50 hover:border-slate-600/50'
                        }`}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center text-white font-bold text-xl shadow-lg">
                                {membership.organization?.name?.charAt(0).toUpperCase() || 'O'}
                              </div>
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-1">
                                  <h4 className="text-lg font-semibold text-white">
                                    {membership.organization?.name || 'Unknown Organization'}
                                  </h4>
                                  {membership.organization?.planType && (
                                    <span className="px-2 py-1 bg-blue-600/20 text-blue-400 text-xs font-medium rounded-full border border-blue-500/30">
                                      {membership.organization.planType.charAt(0).toUpperCase() + membership.organization.planType.slice(1)}
                                    </span>
                                  )}
                                  {selectedOrganization?.organization.id === membership.organization?.id && (
                                    <span className="px-2 py-1 bg-green-600/20 text-green-400 text-xs font-medium rounded-full border border-green-500/30">
                                      ACTIVE
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className={`flex items-center gap-1 ${getRoleColor(membership.role)}`}>
                                    {getRoleIcon(membership.role)}
                                    {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
                                  </span>
                                  <span className="text-nexa-muted">•</span>
                                  <span className="text-nexa-muted">
                                    Joined {membership.joinedAt ? new Date(membership.joinedAt).toLocaleDateString() : 'Unknown'}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center">
                              <Button 
                                variant="outline" 
                                size="sm"
                                className="bg-white/5 border-white/20 text-white hover:bg-white/10 hover:border-white/30"
                                onClick={() => {
                                  if (membership.organization) {
                                    switchToOrganization(membership.organization)
                                    setActiveTab('access') // Switch to access tab to show organization data
                                  }
                                }}
                                disabled={organizationLoading}
                              >
                                {organizationLoading && selectedOrganization?.id === membership.organization?.id ? (
                                  <div className="animate-spin w-4 h-4 border-2 border-white border-t-transparent rounded-full" />
                                ) : (
                                  <ChevronRight className="w-4 h-4" />
                                )}
                              </Button>
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card className="backdrop-blur-md bg-black border border-slate-700/50 p-8 text-center">
                      <Building className="w-16 h-16 text-nexa-muted mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-white mb-2">No Organizations</h4>
                      <p className="text-nexa-muted mb-6">
                        You're currently not a member of any organizations. Create one to collaborate with your team or join an existing organization.
                      </p>
                      <div className="flex justify-center gap-3">
                        <Link href="/organizations/create">
                          <Button className="bg-white hover:bg-gray-100 text-black border border-gray-300">
                            <Plus className="w-4 h-4 mr-2" />
                            Create Organization
                          </Button>
                        </Link>
                        <Button 
                          variant="outline" 
                          disabled
                          className="bg-white/5 border-white/20 text-white"
                        >
                          <Mail className="w-4 h-4 mr-2" />
                          Join Organization
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>

              {/* Access Management Tab Content */}
              <TabsContent value="access" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Shield className="h-6 w-6 text-white" />
                    <h3 className="text-lg font-semibold text-white">Access Management</h3>
                  </div>
                  
                  {/* Section Navigation */}
                  <div className="flex items-center gap-2 bg-white/5 p-2 rounded-lg border border-white/10">
                    {[
                      { id: 'sessions', label: 'Session Controls', icon: Lock },
                      { id: 'roles', label: 'Role Enforcement', icon: Key },
                      { id: 'members', label: 'Member Management', icon: Users }
                    ].map(section => {
                      const Icon = section.icon
                      const isActive = accessActiveSection === section.id
                      return (
                        <button
                          key={section.id}
                          onClick={() => setAccessActiveSection(section.id as any)}
                          className={`flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-md transition-all duration-200 ${
                            isActive 
                              ? 'bg-white text-black font-medium' 
                              : 'text-nexa-muted hover:text-white hover:bg-white/10'
                          }`}
                        >
                          <Icon className="h-4 w-4" />
                          <span className="text-sm">{section.label}</span>
                        </button>
                      )
                    })}
                  </div>

                  {/* Session Controls Section */}
                  {accessActiveSection === 'sessions' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-white">Session Access Controls</h4>
                          <p className="text-sm text-nexa-muted">Manage access to organization sessions and their collaborators</p>
                        </div>
                        <div className="flex gap-2">
                          {/* Bulk actions and export buttons removed as requested */}
                        </div>
                      </div>

                      {/* Sessions List */}
                      {selectedOrganization && organizationData.sessions.length > 0 ? (
                        <div className="backdrop-blur-md bg-black border border-slate-700/50 rounded-xl overflow-hidden">
                          <div className="overflow-x-auto">
                            <table className="w-full">
                              <thead className="border-b border-white/10">
                                <tr>
                                  <th className="text-left p-4 text-sm font-medium text-white">Session</th>
                                  <th className="text-left p-4 text-sm font-medium text-white">Created By</th>
                                  <th className="text-left p-4 text-sm font-medium text-white">Access Level</th>
                                  <th className="text-left p-4 text-sm font-medium text-white">Last Modified</th>
                                  <th className="text-left p-4 text-sm font-medium text-white">Actions</th>
                                </tr>
                              </thead>
                              <tbody>
                                {organizationData.sessions.map((session: any) => (
                                  <tr key={session.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                    <td className="p-4">
                                      <div>
                                        <div className="text-white text-sm font-medium">{session.title}</div>
                                      </div>
                                    </td>
                                    <td className="p-4">
                                      <div className="text-white text-sm">{session.createdBy?.name || 'Unknown'}</div>
                                    </td>
                                    <td className="p-4">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        session.accessLevel === 'public' ? 'bg-green-600/20 text-green-400' :
                                        session.accessLevel === 'organization' ? 'bg-blue-600/20 text-blue-400' :
                                        session.accessLevel === 'restricted' ? 'bg-yellow-600/20 text-yellow-400' :
                                        'bg-red-600/20 text-red-400'
                                      }`}>
                                        {session.accessLevel ? 
                                          session.accessLevel.charAt(0).toUpperCase() + session.accessLevel.slice(1) : 
                                          'Organization'
                                        }
                                      </span>
                                    </td>
                                    <td className="p-4">
                                      <div className="text-white text-sm">{formatTimestamp(session.lastModified || session.updatedAt || session.createdAt)}</div>
                                    </td>
                                    <td className="p-4">
                                      <div className="flex items-center justify-center relative session-dropdown-container">
                                        {canInviteMembers && (
                                          <>
                                            <button 
                                              onClick={() => setSessionDropdownOpen(sessionDropdownOpen === session.uuid ? null : session.uuid)}
                                              className="p-1 hover:bg-white/10 rounded text-nexa-muted hover:text-white transition-colors"
                                            >
                                              <MoreHorizontal className="h-4 w-4" />
                                            </button>
                                            
                                            {sessionDropdownOpen === session.uuid && (
                                              <div className="absolute right-0 top-8 bg-black border border-white/20 rounded-lg shadow-lg z-10 min-w-48">
                                                <div className="p-2">
                                                  <div className="text-xs text-nexa-muted mb-2">Session Actions</div>
                                                  <button
                                                    onClick={() => {
                                                      openPermissionsModal(session)
                                                      setSessionDropdownOpen(null)
                                                    }}
                                                    className="w-full text-left px-3 py-2 rounded text-sm text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                                                  >
                                                    <Lock className="h-4 w-4" />
                                                    Configure Access
                                                  </button>
                                                  <button
                                                    onClick={() => {
                                                      window.open(`/structuring?session=${session.uuid}`, '_blank')
                                                      setSessionDropdownOpen(null)
                                                    }}
                                                    className="w-full text-left px-3 py-2 rounded text-sm text-nexa-muted hover:text-white hover:bg-white/10 transition-colors flex items-center gap-2"
                                                  >
                                                    <Settings className="h-4 w-4" />
                                                    View Session
                                                  </button>
                                                </div>
                                              </div>
                                            )}
                                          </>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                            {/* Invisible spacer to prevent dropdown overflow scrolling */}
                            <div className="h-32 w-full"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="backdrop-blur-md bg-black border border-slate-700/50 rounded-xl p-8 text-center">
                          <Lock className="w-16 h-16 text-nexa-muted mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-white mb-2">
                            {selectedOrganization ? 'No Sessions Found' : 'Select Organization'}
                          </h4>
                          <p className="text-nexa-muted">
                            {selectedOrganization 
                              ? 'This organization has no sessions yet. Create some sessions to manage access controls.'
                              : 'Please select an organization from the "All" tab to view session access controls.'
                            }
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Role Enforcement Section */}
                  {accessActiveSection === 'roles' && (
                    <div className="space-y-6">
                      <div>
                        <h4 className="text-lg font-medium text-white">Role Distribution & Management</h4>
                        <p className="text-sm text-nexa-muted">View role distribution and manage permissions for each role type</p>
                      </div>
                      
                      {selectedOrganization ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                          {Object.entries(rolePermissions).map(([roleKey, roleInfo]) => {
                            const count = organizationData.roles[roleKey as keyof typeof organizationData.roles] || 0
                            const Icon = roleKey === 'owner' ? Crown : 
                                        roleKey === 'admin' ? Shield : 
                                        roleKey === 'billing' ? CreditCard : User
                            
                            return (
                              <Card 
                                key={roleKey} 
                                className="backdrop-blur-md bg-black border border-slate-700/50 p-6 hover:border-slate-600/50 transition-colors cursor-pointer"
                                onClick={() => openRoleModal(roleKey)}
                              >
                                <div className="flex items-center justify-between mb-4">
                                  <div className="flex items-center gap-3">
                                    <div className={`w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br ${
                                      roleKey === 'owner' ? 'from-yellow-500 to-amber-600' :
                                      roleKey === 'admin' ? 'from-blue-500 to-blue-600' :
                                      roleKey === 'member' ? 'from-green-500 to-green-600' :
                                      roleKey === 'viewer' ? 'from-gray-500 to-gray-600' :
                                      'from-purple-500 to-purple-600'
                                    }`}>
                                      <Icon className="w-5 h-5 text-white" />
                                    </div>
                                    <div>
                                      <h5 className="text-white font-medium">{roleInfo.label}</h5>
                                      <p className="text-nexa-muted text-xs">Role</p>
                                    </div>
                                  </div>
                                  <div className="text-right">
                                    <div className="text-2xl font-bold text-white">{count}</div>
                                    <div className="text-nexa-muted text-xs">users</div>
                                  </div>
                                </div>
                                
                                <div className="space-y-2">
                                  <div className="flex items-center justify-between text-sm">
                                    <span className="text-nexa-muted">Permissions</span>
                                    <span className={roleInfo.color}>
                                      {roleKey === 'owner' ? 'Full Access' :
                                       roleKey === 'admin' ? 'Management' :
                                       roleKey === 'member' ? 'Standard' :
                                       roleKey === 'viewer' ? 'Read Only' :
                                       'Billing Only'}
                                    </span>
                                  </div>
                                  
                                  {count > 0 ? (
                                    <button 
                                      onClick={() => openRoleModal(roleKey)}
                                      className="w-full mt-3 px-3 py-2 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-sm rounded-lg transition-all"
                                    >
                                      View {count} User{count === 1 ? '' : 's'}
                                    </button>
                                  ) : (
                                    <button 
                                      className="w-full mt-3 px-3 py-2 bg-black border border-white/10 text-nexa-muted text-sm rounded-lg cursor-default"
                                      disabled
                                    >
                                      No {roleInfo.label}s
                                    </button>
                                  )}
                                </div>
                              </Card>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="backdrop-blur-md bg-black border border-slate-700/50 rounded-xl p-8 text-center">
                          <Key className="w-16 h-16 text-nexa-muted mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-white mb-2">Select Organization</h4>
                          <p className="text-nexa-muted">
                            Please select an organization from the "All" tab to view role distribution and management options.
                          </p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Member Management Section */}
                  {accessActiveSection === 'members' && (
                    <div className="space-y-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="text-lg font-medium text-white">Member Management</h4>
                          <p className="text-sm text-nexa-muted">Add, remove, and manage organization members</p>
                        </div>
                        {canInviteMembers && (
                          <Button 
                            className="flex items-center gap-2 bg-white hover:bg-gray-100 text-black border border-gray-300"
                            onClick={openInviteModal}
                          >
                            <UserPlus className="w-4 h-4" />
                            Invite Member
                          </Button>
                        )}
                      </div>
                      
                      {/* Member List */}
                      {selectedOrganization && organizationData.members.length > 0 ? (
                        <div className="backdrop-blur-md bg-black border border-slate-700/50 rounded-xl overflow-hidden">
                          <div className="p-6">
                            <h5 className="text-white font-medium mb-4">
                              Organization Members ({organizationData.members.length})
                            </h5>
                            <div className="space-y-3">
                              {organizationData.members.map((user: any) => (
                                <div key={user.id} className="flex items-center justify-between py-3 px-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                                  <div className="flex items-center gap-3">
                                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                                      {user.name.split(' ').map((n: string) => n[0]).join('')}
                                    </div>
                                    <div>
                                      <div className="text-white text-sm font-medium">{user.name}</div>
                                      <div className="text-nexa-muted text-xs">
                                        {user.email} • Joined {new Date(user.joinedAt).toLocaleDateString()}
                                      </div>
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-4">
                                    <div className="flex items-center gap-1">
                                      {user.isOwner && <Crown className="h-3 w-3 text-yellow-400" />}
                                      <span className={`text-sm font-medium ${rolePermissions[user.role as keyof typeof rolePermissions]?.color || 'text-gray-400'}`}>
                                        {rolePermissions[user.role as keyof typeof rolePermissions]?.label || 'Unknown'}
                                      </span>
                                    </div>
                                    <div className="flex items-center justify-center relative role-dropdown-container">
                                      <button 
                                        onClick={() => setRoleChangeDropdownOpen(roleChangeDropdownOpen === user.id ? null : user.id)}
                                        className="p-1 hover:bg-white/10 rounded text-nexa-muted hover:text-white transition-colors"
                                      >
                                        <MoreHorizontal className="h-4 w-4" />
                                      </button>
                                      
                                      {roleChangeDropdownOpen === user.id && (
                                        <div className="absolute right-0 top-8 bg-black border border-white/20 rounded-lg shadow-lg z-10 min-w-40">
                                          <div className="p-2">
                                            <div className="text-xs text-nexa-muted mb-2">Member Actions</div>
                                            
                                            {/* Change Role Option */}
                                            <button
                                              onClick={(e) => {
                                                e.preventDefault();
                                                e.stopPropagation();
                                                // Could open a role change sub-menu or modal
                                                console.log('Change role for:', user.name)
                                                setRoleChangeDropdownOpen(null)
                                              }}
                                              className="w-full text-left px-2 py-1 rounded text-xs hover:bg-white/10 text-nexa-muted transition-colors flex items-center gap-2"
                                            >
                                              <Settings className="h-3 w-3" />
                                              Change Role
                                            </button>
                                            
                                            {/* Offboard option - only show if user has permission */}
                                            {(user.role !== 'owner' || selectedOrganization?.role === 'owner') && canInviteMembers && (
                                              <>
                                                <div className="border-t border-white/10 my-2"></div>
                                                <button
                                                  onClick={(e) => {
                                                    e.preventDefault();
                                                    e.stopPropagation();
                                                    openOffboardModal(user);
                                                  }}
                                                  className="w-full text-left px-2 py-1 rounded text-xs hover:bg-yellow-400/10 text-yellow-400 transition-colors flex items-center gap-2"
                                                >
                                                  <UserMinus className="h-3 w-3" />
                                                  Offboard Member
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              ))}
                            </div>
                            
                            {/* Invisible spacer to prevent dropdown overflow scrolling */}
                            <div className="h-48 w-full"></div>
                          </div>
                        </div>
                      ) : (
                        <div className="backdrop-blur-md bg-black border border-slate-700/50 rounded-xl p-8 text-center">
                          <Users className="w-16 h-16 text-nexa-muted mx-auto mb-4" />
                          <h4 className="text-lg font-semibold text-white mb-2">
                            {selectedOrganization ? 'No Members Found' : 'Select Organization'}
                          </h4>
                          <p className="text-nexa-muted">
                            {selectedOrganization 
                              ? 'This organization has no members yet. Invite some members to get started.'
                              : 'Please select an organization from the "All" tab to view and manage members.'
                            }
                          </p>
                          {selectedOrganization && canInviteMembers && (
                            <Button 
                              className="mt-4 bg-white hover:bg-gray-100 text-black border border-gray-300"
                              onClick={openInviteModal}
                            >
                              <UserPlus className="w-4 h-4 mr-2" />
                              Invite First Member
                            </Button>
                          )}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </TabsContent>

              {/* Billing Tab Content */}
              <TabsContent value="billing" className="mt-0">
                <div className="space-y-6">
                  {/* Current Plan */}
                  <Card className="backdrop-blur-md bg-black border border-slate-700/50 p-6">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <CreditCard className="w-5 h-5" />
                      Current Plan
                    </h4>
                    
                    <div className="flex justify-between items-start mb-6">
                      <div>
                        <h5 className="text-xl font-bold text-white mb-2">Professional Plan</h5>
                        <p className="text-nexa-muted">Perfect for growing teams and advanced projects</p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-white">$29<span className="text-sm text-nexa-muted">/month</span></div>
                        <div className="text-xs text-nexa-muted">Billed monthly</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-nexa-muted">Billing Cycle</span>
                        <span className="text-white">Monthly</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-nexa-muted">Next Billing Date</span>
                        <span className="text-white">March 15, 2024</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-nexa-muted">Payment Method</span>
                        <span className="text-white">•••• 4242</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-nexa-muted">Status</span>
                        <span className="text-green-400">Active</span>
                      </div>
                    </div>

                    <div className="flex gap-3">
                      <Button variant="outline" disabled>Change Plan</Button>
                      <Button variant="outline" disabled>Update Payment</Button>
                      <Button variant="outline" disabled>Cancel Subscription</Button>
                    </div>
                  </Card>

                  {/* Usage & Limits */}
                  <Card className="backdrop-blur-md bg-black border border-slate-700/50 p-6">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Usage & Limits
                    </h4>
                    
                    <div className="space-y-4">
                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-nexa-muted">AI Credits</span>
                          <span className="text-white">2,847 / 5,000</span>
                        </div>
                        <div className="w-full bg-nexa-border rounded-full h-2">
                          <div className="bg-blue-400 h-2 rounded-full" style={{width: '57%'}}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-nexa-muted">Storage</span>
                          <span className="text-white">1.2 GB / 10 GB</span>
                        </div>
                        <div className="w-full bg-nexa-border rounded-full h-2">
                          <div className="bg-green-400 h-2 rounded-full" style={{width: '12%'}}></div>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-nexa-muted">Team Members</span>
                          <span className="text-white">3 / 10</span>
                        </div>
                        <div className="w-full bg-nexa-border rounded-full h-2">
                          <div className="bg-purple-400 h-2 rounded-full" style={{width: '30%'}}></div>
                        </div>
                      </div>
                    </div>
                  </Card>

                  {/* Billing History */}
                  <Card className="backdrop-blur-md bg-black border border-slate-700/50 p-6">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <DollarSign className="w-5 h-5 text-green-400" />
                      Billing History
                    </h4>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between items-center py-3 border-b border-nexa-border/30">
                        <div>
                          <div className="text-white font-medium">Professional Plan</div>
                          <div className="text-nexa-muted text-sm">February 15, 2024</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white">$29.00</div>
                          <div className="text-green-400 text-sm">Paid</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-3 border-b border-nexa-border/30">
                        <div>
                          <div className="text-white font-medium">Professional Plan</div>
                          <div className="text-nexa-muted text-sm">January 15, 2024</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white">$29.00</div>
                          <div className="text-green-400 text-sm">Paid</div>
                        </div>
                      </div>

                      <div className="flex justify-between items-center py-3 border-b border-nexa-border/30">
                        <div>
                          <div className="text-white font-medium">Professional Plan</div>
                          <div className="text-nexa-muted text-sm">December 15, 2023</div>
                        </div>
                        <div className="text-right">
                          <div className="text-white">$29.00</div>
                          <div className="text-green-400 text-sm">Paid</div>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" className="w-full mt-4" disabled>
                      View All Invoices
                    </Button>
                  </Card>
                </div>
              </TabsContent>

              {/* History Tab Content */}
              <TabsContent value="history" className="mt-0">
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <History className="h-6 w-6 text-white" />
                    <h3 className="text-lg font-semibold text-white">Organization History</h3>
                  </div>
                  
                  <Card className="backdrop-blur-md bg-black border border-slate-700/50 p-8 text-center">
                    <Clock className="w-16 h-16 text-nexa-muted mx-auto mb-4" />
                    <h4 className="text-lg font-semibold text-white mb-2">Activity History</h4>
                    <p className="text-nexa-muted mb-6">
                      Organization activity history and audit trails will be available here. This includes member changes, permission updates, billing events, and more.
                    </p>
                    <div className="flex justify-center gap-3">
                      <Button 
                        variant="outline" 
                        disabled
                        className="bg-white/5 border-white/20 text-white"
                      >
                        <Calendar className="w-4 h-4 mr-2" />
                        View Audit Log
                      </Button>
                      <Button 
                        variant="outline" 
                        disabled
                        className="bg-white/5 border-white/20 text-white"
                      >
                        <DollarSign className="w-4 h-4 mr-2" />
                        Export Activity
                      </Button>
                    </div>
                  </Card>
                </div>
              </TabsContent>
              
            </Tabs>
          </Card>

          {/* Role Enforcement Modal */}
          {roleModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-black border border-slate-700/50 rounded-xl p-6 w-full max-w-lg mx-4 max-h-[80vh] flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {rolePermissions[selectedRole as keyof typeof rolePermissions]?.label} Users
              </h3>
              <button
                onClick={closeRoleModal}
                className="text-nexa-muted hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            <div className="space-y-3 overflow-y-auto flex-1">
              {organizationData.members
                .filter((member: any) => member.role === selectedRole)
                .map((member: any) => (
                  <div key={member.id} className="flex items-center gap-3 p-3 bg-white/5 rounded-lg border border-white/10">
                    <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center text-white text-sm font-medium">
                      {member.name.split(' ').map((n: string) => n[0]).join('')}
                    </div>
                    <div className="flex-1">
                      <div className="text-white text-sm font-medium">{member.name}</div>
                      <div className="text-nexa-muted text-xs">{member.email}</div>
                    </div>
                    <div className="flex items-center gap-2">
                      {member.isOwner && <Crown className="h-4 w-4 text-yellow-400" />}
                      <div className="relative role-dropdown-container">
                        <button 
                          onClick={() => setRoleChangeDropdownOpen(roleChangeDropdownOpen === member.id ? null : member.id)}
                          className="p-1 hover:bg-white/10 rounded text-nexa-muted hover:text-white transition-colors"
                        >
                          <MoreHorizontal className="h-4 w-4" />
                        </button>
                        
                        {roleChangeDropdownOpen === member.id && (
                          <div className="absolute right-0 top-8 bg-black border border-white/20 rounded-lg shadow-lg z-10 min-w-32">
                            <div className="p-2">
                              <div className="text-xs text-nexa-muted mb-2">Change Role</div>
                              {Object.entries(rolePermissions).map(([roleKey, roleInfo]) => (
                                <button
                                  key={roleKey}
                                  onClick={() => handleRoleChange(member.id, roleKey)}
                                  className={`w-full text-left px-2 py-1 rounded text-xs hover:bg-white/10 transition-colors ${
                                    member.role === roleKey ? 'text-white bg-white/5' : 'text-nexa-muted'
                                  }`}
                                  disabled={member.role === roleKey}
                                >
                                  {roleInfo.label}
                                </button>
                              ))}
                              
                              {/* Remove offboard option from Role Enforcement - will be moved to Member Management */}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              
              {organizationData.members.filter((member: any) => member.role === selectedRole).length === 0 && (
                <div className="text-center py-8">
                  <Users className="w-12 h-12 text-nexa-muted mx-auto mb-3" />
                  <p className="text-nexa-muted">No users with this role</p>
                </div>
              )}
              
              {/* Invisible spacer to prevent dropdown overflow scrolling */}
              <div className="h-40 w-full"></div>
            </div>
          </div>
        </div>
      )}

      {/* Invite Member Modal */}
      {inviteModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-slate-700/50 rounded-xl p-6 w-full max-w-lg mx-4">
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-lg font-semibold text-white">Invite New Member</h3>
              <button
                onClick={closeInviteModal}
                className="text-nexa-muted hover:text-white transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            
            {/* Error Message */}
            {inviteError && (
              <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-3 mb-4">
                <div className="flex items-center gap-2">
                  <X className="w-4 h-4 text-red-400" />
                  <span className="text-red-400 text-sm">{inviteError}</span>
                </div>
              </div>
            )}

            {/* Success Message with Re-invite Info */}
            {inviteSuccess && (
              <div className={`rounded-lg p-4 mb-4 ${
                isReInvite 
                  ? 'bg-yellow-500/10 border border-yellow-500/20' 
                  : 'bg-green-500/10 border border-green-500/20'
              }`}>
                <div className="flex items-start gap-3">
                  <div className={`w-5 h-5 flex-shrink-0 mt-0.5 ${
                    isReInvite ? 'text-yellow-400' : 'text-green-400'
                  }`}>
                    {isReInvite ? '🔄' : '✅'}
                  </div>
                  <div>
                    <div className={`font-medium mb-1 ${
                      isReInvite ? 'text-yellow-200' : 'text-green-200'
                    }`}>
                      {isReInvite ? 'Re-Invitation Sent!' : 'Invitation Sent!'}
                    </div>
                    <div className={`text-sm ${
                      isReInvite ? 'text-yellow-300/80' : 'text-green-300/80'
                    }`}>
                      {isReInvite && previousOffboarding ? (
                        <>
                          This user was previously removed on {' '}
                          {new Date(previousOffboarding.timestamp).toLocaleDateString()} {' '}
                          due to: <span className="font-medium">{previousOffboarding.reason}</span>
                          <br />
                          They will regain access to their previous data when they accept.
                        </>
                      ) : (
                        'The invitation has been sent to their email address.'
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <form 
              className="space-y-4" 
              action={handleInviteSubmit}
              onSubmit={(e) => {
                e.preventDefault()
                const formData = new FormData(e.currentTarget)
                handleInviteSubmit(formData)
              }}
            >
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Email Address *
                </label>
                <input
                  type="email"
                  name="email"
                  placeholder="colleague@company.com"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  required
                  disabled={inviteLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  First Name *
                </label>
                <input
                  type="text"
                  name="firstName"
                  placeholder="John"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  required
                  disabled={inviteLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Last Name *
                </label>
                <input
                  type="text"
                  name="lastName"
                  placeholder="Doe"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  required
                  disabled={inviteLoading}
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Role *
                </label>
                <select
                  name="role"
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  defaultValue="member"
                  disabled={inviteLoading}
                >
                  <option value="viewer">Viewer - Read-only access</option>
                  <option value="member">Member - Standard access</option>
                  <option value="admin">Admin - Full management access</option>
                  <option value="billing">Billing - Billing and usage access</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Personal Message (Optional)
                </label>
                <textarea
                  name="personalMessage"
                  placeholder="Welcome to our organization! We're excited to have you join our team."
                  rows={3}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400 resize-none"
                  disabled={inviteLoading}
                />
              </div>
              
              <div className="flex items-center gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={closeInviteModal}
                  className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                  disabled={inviteLoading}
                >
                  Cancel
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-white hover:bg-gray-100 text-black border border-gray-300"
                  disabled={inviteLoading || !selectedOrganization}
                >
                  {inviteLoading ? (
                    <div className="flex items-center gap-2">
                      <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                      <span>Sending...</span>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2">
                      <Mail className="w-4 h-4" />
                      <span>Send Invitation</span>
                    </div>
                  )}
                </Button>
              </div>
            </form>
          </div>
          </div>
          )}

        {/* Session Permissions Modal */}
        {permissionsModalOpen && selectedSession && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-black border border-slate-700/50 rounded-xl p-6 w-full max-w-2xl mx-4 max-h-[90vh] overflow-y-auto">
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h3 className="text-lg font-semibold text-white">Configure Session Access</h3>
                  <p className="text-sm text-nexa-muted mt-1">
                    {selectedSession.title || 'Untitled Session'}
                  </p>
                </div>
                <button
                  onClick={closePermissionsModal}
                  className="text-nexa-muted hover:text-white transition-colors"
                  disabled={permissionsLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              {permissionsError && (
                <div className="mb-4 p-3 bg-red-900/20 border border-red-500/50 rounded-lg text-red-200 text-sm">
                  {permissionsError}
                </div>
              )}

              {permissionsLoading ? (
                <div className="flex items-center justify-center py-8">
                  <div className="flex items-center gap-3 text-nexa-muted">
                    <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading permissions...</span>
                  </div>
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Access Mode Selection */}
                  <div>
                    <label className="block text-sm font-medium text-white mb-3">
                      Access Control Mode
                    </label>
                    <div className="grid grid-cols-1 gap-3">
                      <label className="flex items-start gap-3 p-4 border border-white/20 rounded-lg cursor-pointer hover:border-white/30 transition-colors">
                        <input
                          type="radio"
                          name="accessMode"
                          value="organization"
                          checked={accessMode === 'organization'}
                          onChange={(e) => setAccessMode(e.target.value as any)}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-white font-medium">Organization-wide Access (Default)</div>
                          <div className="text-sm text-nexa-muted">All organization members have access based on their role (Owner/Admin: Full, Member: Read/Write, Viewer: Read)</div>
                        </div>
                      </label>
                      
                      <label className="flex items-start gap-3 p-4 border border-white/20 rounded-lg cursor-pointer hover:border-white/30 transition-colors">
                        <input
                          type="radio"
                          name="accessMode"
                          value="per_role"
                          checked={accessMode === 'per_role'}
                          onChange={(e) => setAccessMode(e.target.value as any)}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-white font-medium">Per-Role Permissions</div>
                          <div className="text-sm text-nexa-muted">Configure custom permissions for each role in this session</div>
                        </div>
                      </label>
                      
                      <label className="flex items-start gap-3 p-4 border border-white/20 rounded-lg cursor-pointer hover:border-white/30 transition-colors">
                        <input
                          type="radio"
                          name="accessMode"
                          value="per_user"
                          checked={accessMode === 'per_user'}
                          onChange={(e) => setAccessMode(e.target.value as any)}
                          className="mt-1"
                        />
                        <div>
                          <div className="text-white font-medium">Per-User Permissions</div>
                          <div className="text-sm text-nexa-muted">Grant specific permissions to individual users. Only selected users will have access.</div>
                        </div>
                      </label>
                    </div>
                  </div>

                  {/* Per-Role Configuration */}
                  {accessMode === 'per_role' && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">
                        Role Permissions
                      </label>
                      <div className="space-y-3">
                        {['owner', 'admin', 'member', 'viewer', 'billing'].map((roleKey) => {
                          const roleLabels: {[key: string]: string} = {
                            owner: 'Owner',
                            admin: 'Admin', 
                            member: 'Member',
                            viewer: 'Viewer',
                            billing: 'Billing'
                          }
                          
                          return (
                            <div key={roleKey} className="flex items-center justify-between p-3 border border-white/20 rounded-lg">
                              <div className="flex items-center gap-3">
                                <div className={`w-3 h-3 rounded-full ${
                                  roleKey === 'owner' ? 'bg-yellow-400' :
                                  roleKey === 'admin' ? 'bg-blue-400' :
                                  roleKey === 'member' ? 'bg-green-400' :
                                  'bg-gray-400'
                                }`} />
                                <span className="text-white font-medium">{roleLabels[roleKey]}</span>
                              </div>
                              <select
                                value={sessionRolePermissions[roleKey] || 'none'}
                                onChange={(e) => setSessionRolePermissions(prev => ({
                                  ...prev,
                                  [roleKey]: e.target.value
                                }))}
                                className="bg-black border border-white/20 rounded px-3 py-1 text-white text-sm"
                              >
                                <option value="none">No Access</option>
                                <option value="read">Read Only</option>
                                <option value="write">Read & Write</option>
                                <option value="delete">Full Access</option>
                              </select>
                            </div>
                          )
                        })}
                      </div>
                    </div>
                  )}

                  {/* Per-User Configuration */}
                  {accessMode === 'per_user' && (
                    <div>
                      <label className="block text-sm font-medium text-white mb-3">
                        User Permissions
                      </label>
                      <div className="space-y-3">
                        {availableMembers.map((member) => {
                          const userPerm = userPermissions.find(up => up.user_id === member.id)
                          const hasPermission = !!userPerm
                          
                          return (
                            <div key={member.id} className="flex items-center justify-between p-3 border border-white/20 rounded-lg">
                              <div className="flex items-center gap-3">
                                <input
                                  type="checkbox"
                                  checked={hasPermission}
                                  onChange={(e) => {
                                    if (e.target.checked) {
                                      setUserPermissions(prev => [...prev, { user_id: member.id, permission: 'read' }])
                                    } else {
                                      setUserPermissions(prev => prev.filter(up => up.user_id !== member.id))
                                    }
                                  }}
                                  className="rounded"
                                />
                                <div>
                                  <div className="text-white font-medium">{member.fullName}</div>
                                  <div className="text-sm text-nexa-muted">{member.email}</div>
                                </div>
                              </div>
                              {hasPermission && (
                                <select
                                  value={userPerm.permission}
                                  onChange={(e) => setUserPermissions(prev => 
                                    prev.map(up => up.user_id === member.id 
                                      ? { ...up, permission: e.target.value }
                                      : up
                                    )
                                  )}
                                  className="bg-black border border-white/20 rounded px-3 py-1 text-white text-sm"
                                >
                                  <option value="read">Read Only</option>
                                  <option value="write">Read & Write</option>
                                  <option value="delete">Full Access</option>
                                </select>
                              )}
                            </div>
                          )
                        })}
                        
                        {availableMembers.length === 0 && (
                          <div className="text-center py-4 text-nexa-muted">
                            No organization members found
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Permission Notes */}
                  <div className="p-4 bg-blue-900/20 border border-blue-500/50 rounded-lg">
                    <div className="flex items-start gap-2">
                      <div className="w-4 h-4 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 mt-0.5">
                        <div className="w-2 h-2 bg-white rounded-full" />
                      </div>
                      <div className="text-sm text-blue-200">
                        <div className="font-medium mb-2">Permission Notes:</div>
                        <ul className="space-y-1 text-blue-300/80">
                          <li>• Session creator always has full access regardless of these settings</li>
                          <li>• Full Access includes delete permissions (write + delete)</li>
                          <li>• Read & Write allows viewing and editing (read + write)</li>
                          <li>• Read Only allows viewing but no changes (read only)</li>
                          <li>• In per-user mode, only selected users will have any access</li>
                        </ul>
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center gap-3 pt-4">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={closePermissionsModal}
                      className="flex-1 bg-white/5 border-white/20 text-white hover:bg-white/10"
                      disabled={permissionsLoading}
                    >
                      Cancel
                    </Button>
                    <Button
                      onClick={handlePermissionsSave}
                      className="flex-1 bg-white hover:bg-gray-100 text-black border border-gray-300"
                      disabled={permissionsLoading}
                    >
                      {permissionsLoading ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-black border-t-transparent rounded-full animate-spin" />
                          <span>Saving...</span>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4" />
                          <span>Save Permissions</span>
                        </div>
                      )}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Offboard Member Confirmation Modal */}
        {offboardModalOpen && memberToOffboard && (
          <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
            <div className="bg-black border border-slate-700/50 rounded-xl p-6 w-full max-w-lg mx-4">
              <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-yellow-500/20 flex items-center justify-center">
                    <UserMinus className="w-5 h-5 text-yellow-400" />
                  </div>
                  <div>
                    <h3 className="text-lg font-semibold text-white">Offboard Member</h3>
                    <p className="text-sm text-nexa-muted">Remove access to this organization</p>
                  </div>
                </div>
                <button
                  onClick={closeOffboardModal}
                  className="text-nexa-muted hover:text-white transition-colors"
                  disabled={offboardLoading}
                >
                  <X className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Member Info */}
                <div className="p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                      <span className="text-white text-sm font-medium">
                        {memberToOffboard.name?.charAt(0) || memberToOffboard.email?.charAt(0) || 'U'}
                      </span>
                    </div>
                    <div>
                      <div className="text-white font-medium">{memberToOffboard.name}</div>
                      <div className="text-nexa-muted text-sm">{memberToOffboard.email}</div>
                    </div>
                  </div>
                </div>

                {/* Warning Message */}
                <div className="p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
                  <div className="flex items-start gap-3">
                    <div className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5">⚠️</div>
                    <div className="text-sm">
                      <div className="text-yellow-200 font-medium mb-2">This action will:</div>
                      <ul className="space-y-1 text-yellow-300/80">
                        <li>• Remove access to this organization immediately</li>
                        <li>• Preserve their account and access to other organizations</li>
                        <li>• Keep complete audit trail for compliance</li>
                      </ul>
                    </div>
                  </div>
                </div>

                {/* Reason Selection */}
                <div>
                  <label className="block text-sm font-medium text-white mb-2">
                    Reason (Optional)
                  </label>
                  <select
                    value={offboardReason}
                    onChange={(e) => setOffboardReason(e.target.value)}
                    className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder:text-nexa-muted focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={offboardLoading}
                  >
                    <option value="administrative_action">Administrative Action</option>
                    <option value="voluntary_departure">Voluntary Departure</option>
                    <option value="role_restructure">Role Restructure</option>
                    <option value="security_concern">Security Concern</option>
                    <option value="policy_violation">Policy Violation</option>
                    <option value="other">Other</option>
                  </select>
                </div>

                {/* Action Buttons */}
                <div className="flex gap-3 pt-2">
                  <Button
                    variant="outline"
                    className="flex-1 bg-transparent border-white/20 text-white hover:bg-white/10"
                    onClick={closeOffboardModal}
                    disabled={offboardLoading}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1 bg-yellow-500 hover:bg-yellow-600 text-black font-medium"
                    onClick={handleOffboardConfirm}
                    disabled={offboardLoading}
                  >
                    {offboardLoading ? (
                      <div className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-black/30 border-t-black rounded-full animate-spin" />
                        <span>Offboarding...</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2">
                        <UserMinus className="w-4 h-4" />
                        <span>Offboard Member</span>
                      </div>
                    )}
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )}

        </div>
      </div>
    )
  }

  // Single DashboardLayout wrapper
  return (
    <DashboardLayout>
      {content}
    </DashboardLayout>
  )
}












