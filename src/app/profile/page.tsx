'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, User, Calendar, Shield, Building, Plus, Settings, Users, Crown, Mail, Globe, ChevronRight, Lightbulb, ChevronDown, CreditCard, DollarSign, Zap, Mic, Palette, Sliders } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import type { OrganizationMembership, Organization } from '@/types'
import { useUserRole } from '@/hooks/useUserRole'
import { useUser } from '@/contexts/user-context'

interface User {
  id: string
  email: string
  emailVerifiedAt: string | null
  firstName: string | null
  lastName: string | null
  fullName: string | null
  avatarUrl: string | null
  timezone: string
  locale: string
  loginCount: number
  profileData: {
    [key: string]: any
  } | null
  organizations: OrganizationMembership[]
  createdAt: string
  updatedAt: string
}

// Helper functions for role display
const getRoleColor = (role: string) => {
  switch (role) {
    case 'owner': return 'text-yellow-400'
    case 'admin': return 'text-blue-400'  
    case 'member': return 'text-green-400'
    case 'viewer': return 'text-gray-400'
    case 'billing': return 'text-purple-400'
    default: return 'text-gray-400'
  }
}

const getRoleIcon = (role: string) => {
  switch (role) {
    case 'owner': return <Crown className="w-4 h-4" />
    case 'admin': return <Shield className="w-4 h-4" />
    case 'member': return <User className="w-4 h-4" />
    case 'viewer': return <User className="w-4 h-4" />
    case 'billing': return <CreditCard className="w-4 h-4" />
    default: return <User className="w-4 h-4" />
  }
}

export default function ProfilePage() {
  const { canAccessOrganizations } = useUserRole()
  const { user: contextUser, selectedOrganization, setSelectedOrganization } = useUser()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [activeTab, setActiveTab] = useState('profile')
  
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    timezone: 'UTC',
    locale: 'en'
  })

  const [expandedSections, setExpandedSections] = useState({
    personal: false,
    account: false,
    preferences: false
  })

  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }

  useEffect(() => {
    fetchUserProfile()
  }, [])

  // Keyboard shortcuts for profile tabs
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
      
      // Profile tab shortcuts
      const tabMap: { [key: string]: string } = {
        '1': 'nexa',
        '2': 'profile',
        '3': 'organizations',
        '4': 'billing',
        '5': 'settings'
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

  const fetchUserProfile = async () => {
    try {
      const response = await fetch('/api/auth/me')
      if (response.ok) {
        const result = await response.json()
        if (result.success && result.user) {
          const userData = result.user
          setUser(userData)
          setFormData({
            firstName: userData.firstName || '',
            lastName: userData.lastName || '',
            timezone: userData.timezone || 'UTC',
            locale: userData.locale || 'en'
          })
        } else {
          setError('Failed to load profile')
        }
      } else {
        setError('Failed to load profile')
      }
    } catch (error: unknown) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    try {
      const response = await fetch('/api/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        setSuccess('Profile updated successfully!')
        fetchUserProfile() // Refresh user data
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to update profile')
      }
    } catch (error: unknown) {
      setError('Network error occurred')
    }
  }

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

  if (loading) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-white">Loading profile...</div>
        </div>
      </DashboardLayout>
    )
  }

  if (!user) {
    return (
      <DashboardLayout>
        <div className="flex items-center justify-center min-h-[400px]">
          <div className="text-red-400">Failed to load profile</div>
        </div>
      </DashboardLayout>
    )
  }

  return (
    <DashboardLayout>
      <div className="nexa-background nexa-page-wrapper p-6">
        <div className="max-w-6xl mx-auto">
          {/* Tab system with seamless folder-like design */}
          <Tabs defaultValue="profile" className="w-full">
            {/* Header row with Back link and Tabs */}
            <div className="flex items-end gap-8 mb-0">
              {/* Back link - positioned inline with tabs */}
              <Link 
                href="/dashboard"
                className="inline-flex items-center gap-2 text-white hover:text-nexa-accent transition-colors pb-3"
              >
                <ArrowLeft className="w-4 h-4" />
                Back to Dashboard
              </Link>

              {/* Tab strip closer to back link */}
              <TabsList className="mb-0">
                <TabsTrigger value="nexa" className="flex items-center gap-2 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 text-transparent bg-clip-text font-bold data-[state=active]:bg-gradient-to-r data-[state=active]:from-blue-400 data-[state=active]:via-purple-400 data-[state=active]:to-pink-400 data-[state=active]:text-transparent data-[state=active]:bg-clip-text">
                  <Settings className="w-4 h-4 text-blue-400" />
                  NEXA AI
                </TabsTrigger>
                <TabsTrigger value="profile" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Profile
                </TabsTrigger>
                {/* RBAC: Only show Organizations tab for Member/Viewer who can't access /organizations */}
                {!canAccessOrganizations && (
                  <TabsTrigger value="organizations" className="flex items-center gap-2">
                    <Building className="w-4 h-4" />
                    Organizations
                  </TabsTrigger>
                )}
                <TabsTrigger value="settings" className="flex items-center gap-2">
                  <Settings className="w-4 h-4" />
                  Settings
                </TabsTrigger>
              </TabsList>
            </div>

            {/* Card container with rounded corners and seamless tab integration */}
            <Card variant="nexa" className="border-t border-nexa-border p-8 mt-0 relative z-0">
              
              {/* NEXA AI Tab */}
              <TabsContent value="nexa" className="mt-0">
                <div className="text-center mb-8">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Settings className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-4">
                    NEXA AI Dashboard
                  </h3>
                  <p className="text-nexa-muted mb-8 max-w-2xl mx-auto">
                    Advanced AI-powered architecture solutions, real-time collaboration, and intelligent project management.
                  </p>
                </div>

                <div className="space-y-6">
                  {/* Usage Section */}
                  <Card variant="nexa" className="p-6">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Zap className="w-5 h-5 text-yellow-400" />
                      Usage & Credits
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <div className="text-center">
                        <div className="text-3xl font-bold text-blue-400 mb-2">2,847</div>
                        <div className="text-nexa-muted text-sm">AI Credits Remaining</div>
                        <div className="w-full bg-nexa-border rounded-full h-2 mt-2">
                          <div className="bg-blue-400 h-2 rounded-full" style={{width: '67%'}}></div>
                        </div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-green-400 mb-2">156</div>
                        <div className="text-nexa-muted text-sm">Sessions Created</div>
                        <div className="text-xs text-nexa-muted mt-1">This month</div>
                      </div>
                      <div className="text-center">
                        <div className="text-3xl font-bold text-purple-400 mb-2">42</div>
                        <div className="text-nexa-muted text-sm">PDF Exports</div>
                        <div className="text-xs text-nexa-muted mt-1">This month</div>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6 pt-6 border-t border-nexa-border">
                      <div className="flex justify-between items-center py-2">
                        <span className="text-nexa-muted">Plan Type</span>
                        <span className="text-white font-semibold">Professional</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-nexa-muted">Monthly Limit</span>
                        <span className="text-white">5,000 Credits</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-nexa-muted">Renewal Date</span>
                        <span className="text-white">March 15, 2024</span>
                      </div>
                      <div className="flex justify-between items-center py-2">
                        <span className="text-nexa-muted">Storage Used</span>
                        <span className="text-white">1.2 GB / 10 GB</span>
                      </div>
                    </div>
                  </Card>

                  {/* Features Section */}
                  <Card variant="nexa" className="p-6">
                    <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                      <Lightbulb className="w-5 h-5 text-blue-400" />
                      NEXA Features
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      <div className="p-4 border border-nexa-border rounded-lg hover:border-blue-400/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg flex items-center justify-center">
                            <Palette className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h5 className="text-white font-semibold">Magical Panel</h5>
                            <p className="text-nexa-muted text-xs">AI-powered interface</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Coming Soon
                        </Button>
                      </div>

                      <div className="p-4 border border-nexa-border rounded-lg hover:border-purple-400/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                            <Mic className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h5 className="text-white font-semibold">Voice</h5>
                            <p className="text-nexa-muted text-xs">Voice-to-architecture</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Coming Soon
                        </Button>
                      </div>

                      <div className="p-4 border border-nexa-border rounded-lg hover:border-pink-400/50 transition-colors">
                        <div className="flex items-center gap-3 mb-3">
                          <div className="w-10 h-10 bg-gradient-to-r from-pink-500 to-blue-500 rounded-lg flex items-center justify-center">
                            <Globe className="w-5 h-5 text-white" />
                          </div>
                          <div>
                            <h5 className="text-white font-semibold">Hyper Canvas</h5>
                            <p className="text-nexa-muted text-xs">Infinite workspace</p>
                          </div>
                        </div>
                        <Button variant="outline" size="sm" className="w-full" disabled>
                          Coming Soon
                        </Button>
                      </div>
                    </div>
                  </Card>

                  {/* Fine Tune Section */}
                  <Card variant="nexa" className="p-6">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
                          <Sliders className="w-6 h-6 text-white" />
                        </div>
                        <div>
                          <h4 className="text-lg font-semibold text-white">Fine tune your NEXA</h4>
                          <p className="text-nexa-muted text-sm">Customize AI behavior and preferences</p>
                        </div>
                      </div>
                      <Button variant="outline" disabled>
                        Configure
                      </Button>
                    </div>
                  </Card>
                </div>
              </TabsContent>

              {/* Profile Tab */}
              <TabsContent value="profile" className="mt-0">
                {/* Profile Header - Keep unchanged */}
                <div className="text-center mb-8 pb-8 border-b border-nexa-border">
                  <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-black">
                    {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                  </div>
                  <h2 className="text-2xl font-bold text-white mb-2">{user.fullName || 'Unnamed User'}</h2>
                  <p className="text-nexa-muted">{user.email}</p>
                </div>

                {/* Error/Success Messages */}
                {error && (
                  <Alert variant="nexaError" className="mb-6">
                    <AlertDescription>{error}</AlertDescription>
                  </Alert>
                )}

                {success && (
                  <Alert variant="nexaSuccess" className="mb-6">
                    <AlertDescription>{success}</AlertDescription>
                  </Alert>
                )}

                <div className="space-y-4">
                  {/* Section 1: Personal Information */}
                  <Card variant="nexa" className="overflow-hidden">
                    {/* Collapsed Header */}
                    <div 
                      className="p-6 cursor-pointer hover:bg-nexa-card/50 transition-colors"
                      onClick={() => toggleSection('personal')}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                          <User className="w-5 h-5" />
                          Personal Information
                        </h4>
                        <ChevronDown 
                          className={`w-5 h-5 text-nexa-muted transition-transform duration-200 ${
                            expandedSections.personal ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {expandedSections.personal && (
                      <div className="px-6 pb-6 border-t border-nexa-border">
                        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                              <Label htmlFor="firstName" className="text-nexa-muted">First Name</Label>
                              <Input
                                id="firstName"
                                type="text"
                                value={formData.firstName}
                                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                                className="mt-1"
                                placeholder="Enter your first name"
                              />
                            </div>
                            <div>
                              <Label htmlFor="lastName" className="text-nexa-muted">Last Name</Label>
                              <Input
                                id="lastName"
                                type="text"
                                value={formData.lastName}
                                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                                className="mt-1"
                                placeholder="Enter your last name"
                              />
                            </div>
                          </div>

                          <div className="flex justify-between items-center py-3 border-b border-nexa-border/30">
                            <div>
                              <div className="text-white font-medium">Email Address</div>
                              <div className="text-nexa-muted text-sm">{user.email}</div>
                            </div>
                            <Button variant="outline" size="sm" disabled>Change Email</Button>
                          </div>

                          <Button type="submit" className="w-full mt-6">
                            Update Personal Information
                          </Button>
                        </form>
                      </div>
                    )}
                  </Card>

                  {/* Section 2: Account Information */}
                  <Card variant="nexa" className="overflow-hidden">
                    {/* Collapsed Header */}
                    <div 
                      className="p-6 cursor-pointer hover:bg-nexa-card/50 transition-colors"
                      onClick={() => toggleSection('account')}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Shield className="w-5 h-5" />
                          Account Information
                        </h4>
                        <ChevronDown 
                          className={`w-5 h-5 text-nexa-muted transition-transform duration-200 ${
                            expandedSections.account ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {expandedSections.account && (
                      <div className="px-6 pb-6 border-t border-nexa-border">
                        <div className="space-y-4 mt-4">
                          <div className="flex justify-between py-3 border-b border-nexa-border/30">
                            <span className="text-nexa-muted">Account Status</span>
                            <span className="text-green-400">Active</span>
                          </div>

                          <div className="flex justify-between py-3 border-b border-nexa-border/30">
                            <span className="text-nexa-muted">Email Verification</span>
                            <span className={user.emailVerifiedAt ? "text-green-400" : "text-yellow-400"}>
                              {user.emailVerifiedAt ? "✓ Verified" : "⚠ Unverified"}
                            </span>
                          </div>

                        </div>
                      </div>
                    )}
                  </Card>

                  {/* Section 3: Profile Preferences */}
                  <Card variant="nexa" className="overflow-hidden">
                    {/* Collapsed Header */}
                    <div 
                      className="p-6 cursor-pointer hover:bg-nexa-card/50 transition-colors"
                      onClick={() => toggleSection('preferences')}
                    >
                      <div className="flex items-center justify-between">
                        <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Settings className="w-5 h-5" />
                          Profile Preferences
                        </h4>
                        <ChevronDown 
                          className={`w-5 h-5 text-nexa-muted transition-transform duration-200 ${
                            expandedSections.preferences ? 'rotate-180' : ''
                          }`}
                        />
                      </div>
                    </div>
                    
                    {/* Expanded Content */}
                    {expandedSections.preferences && (
                      <div className="px-6 pb-6 border-t border-nexa-border">
                        <div className="space-y-4 mt-4">

                          <div className="flex justify-between items-center py-3 border-b border-nexa-border/30">
                            <div>
                              <div className="text-white font-medium">Email Notifications</div>
                              <div className="text-nexa-muted text-sm">Receive updates about your account</div>
                            </div>
                            <Button variant="outline" size="sm" disabled>Configure</Button>
                          </div>

                          <Button className="w-full mt-6">
                            Save Preferences
                          </Button>
                        </div>
                      </div>
                    )}
                  </Card>
                </div>
              </TabsContent>


              {/* Organizations Tab - Only for Member/Viewer */}
              {!canAccessOrganizations && (
                <TabsContent value="organizations" className="mt-0">
                  <div className="space-y-6">
                    {/* Header with Read-Only Badge */}
                    <div className="flex justify-between items-center">
                      <div>
                        <h3 className="text-xl font-semibold text-white mb-2">Your Organizations</h3>
                        <p className="text-nexa-muted">Switch between organizations and view read-only information</p>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="px-3 py-1 bg-gray-500/20 text-gray-400 text-xs font-medium rounded-full border border-gray-500/30">
                          Read Only Access
                        </span>
                      </div>
                    </div>

                    {/* Organization Switcher */}
                    <Card variant="nexa" className="p-6">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Building className="w-5 h-5" />
                        Switch Organization
                      </h4>
                      <div className="grid gap-3">
                        {contextUser?.organizationMemberships?.map((membership) => (
                          <div key={membership.id} className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10 hover:bg-white/10 transition-colors">
                            <div className="flex items-center gap-3">
                              <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white font-bold">
                                {membership.organization.name.charAt(0)}
                              </div>
                              <div>
                                <div className="text-white font-medium">{membership.organization.name}</div>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className={`flex items-center gap-1 ${getRoleColor(membership.role)}`}>
                                    {getRoleIcon(membership.role)}
                                    {membership.role}
                                  </span>
                                  <span className="text-nexa-muted">•</span>
                                  <span className={`text-xs ${
                                    membership.organization.status === 'active' ? 'text-green-400' : 'text-yellow-400'
                                  }`}>
                                    {membership.organization.status}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <Button 
                              onClick={() => setSelectedOrganization(membership)}
                              variant={selectedOrganization?.id === membership.id ? "default" : "outline"}
                              size="sm"
                            >
                              {selectedOrganization?.id === membership.id ? 'Current' : 'Switch'}
                            </Button>
                          </div>
                        ))}
                      </div>
                    </Card>

                    {/* Organization Overview - Copy of All tab content */}
                    {selectedOrganization && (
                      <Card variant="nexa" className="p-6">
                        <div className="flex items-center justify-between mb-6">
                          <h4 className="text-lg font-semibold text-white flex items-center gap-2">
                            <Building className="w-5 h-5" />
                            Organization Overview
                          </h4>
                          <span className="px-2 py-1 bg-gray-500/20 text-gray-400 text-xs rounded-full">Read Only</span>
                        </div>
                        
                        {/* Organization Basic Info */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                          <div className="space-y-3">
                            <h5 className="text-md font-medium text-white">Organization Details</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-nexa-muted">Name:</span>
                                <span className="text-white">{selectedOrganization.organization.name}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-nexa-muted">Plan:</span>
                                <span className="text-white capitalize">{selectedOrganization.organization.planType}</span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-nexa-muted">Status:</span>
                                <span className={`${selectedOrganization.organization.status === 'active' ? 'text-green-400' : 'text-yellow-400'}`}>
                                  {selectedOrganization.organization.status}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-3">
                            <h5 className="text-md font-medium text-white">Your Role</h5>
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span className="text-nexa-muted">Role:</span>
                                <span className={`flex items-center gap-1 ${getRoleColor(selectedOrganization.role)}`}>
                                  {getRoleIcon(selectedOrganization.role)}
                                  {selectedOrganization.role}
                                </span>
                              </div>
                              <div className="flex justify-between">
                                <span className="text-nexa-muted">Joined:</span>
                                <span className="text-white">
                                  {selectedOrganization.joinedAt ? new Date(selectedOrganization.joinedAt).toLocaleDateString() : 'Unknown'}
                                </span>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Note about limited access */}
                        <div className="p-4 bg-blue-500/10 border border-blue-500/20 rounded-lg">
                          <div className="flex items-start gap-3">
                            <Shield className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
                            <div className="text-sm">
                              <div className="text-blue-200 font-medium mb-1">Limited Access</div>
                              <div className="text-blue-300/80">
                                As a {selectedOrganization.role}, you have read-only access to organization information. 
                                For full organization management, contact an administrator.
                              </div>
                            </div>
                          </div>
                        </div>
                      </Card>
                    )}
                  </div>
              </TabsContent>
              )}

              {/* Settings Tab */}
              <TabsContent value="settings" className="mt-0">
                <div className="space-y-8">
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-2">Account Settings</h3>
                    <p className="text-nexa-muted">Manage your account preferences and security settings</p>
                  </div>

                  <div className="grid gap-6">
                    {/* Security Section */}
                    <Card variant="nexa" className="p-6">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <Shield className="w-5 h-5" />
                        Security
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-nexa-border/30">
                          <div>
                            <div className="text-white font-medium">Password</div>
                            <div className="text-nexa-muted text-sm">Last updated recently</div>
                          </div>
                          <Link href="/profile/change-password">
                            <Button variant="outline" size="sm">Change Password</Button>
                          </Link>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-nexa-border/30">
                          <div>
                            <div className="text-white font-medium">Two-Factor Authentication</div>
                            <div className="text-nexa-muted text-sm">Not enabled</div>
                          </div>
                          <Button variant="outline" size="sm" disabled>Enable 2FA</Button>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <div>
                            <div className="text-white font-medium">Active Sessions</div>
                            <div className="text-nexa-muted text-sm">Manage your login sessions</div>
                          </div>
                          <Button variant="outline" size="sm" disabled>View Sessions</Button>
                        </div>
                      </div>
                    </Card>



                    {/* Danger Zone */}
                    <Card variant="nexa" className="p-6 border-red-500/20">
                      <h4 className="text-lg font-semibold text-red-400 mb-4">Danger Zone</h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-red-500/20">
                          <div>
                            <div className="text-white font-medium">Export Account Data</div>
                            <div className="text-nexa-muted text-sm">Download a copy of your account data</div>
                          </div>
                          <Button variant="outline" size="sm" disabled className="border-red-500/50 text-red-400">
                            Export Data
                          </Button>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <div>
                            <div className="text-red-400 font-medium">Delete Account</div>
                            <div className="text-nexa-muted text-sm">Permanently delete your account and all data</div>
                          </div>
                          <Button variant="outline" size="sm" disabled className="border-red-500/50 text-red-400">
                            Delete Account
                          </Button>
                        </div>
                      </div>
                    </Card>
                  </div>
                </div>
              </TabsContent>
            </Card>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}