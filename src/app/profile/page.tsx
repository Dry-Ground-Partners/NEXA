'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { ArrowLeft, User, Calendar, Shield, Building, Plus, Settings, Users, Crown, Mail, Globe, ChevronRight, Lightbulb } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import type { OrganizationMembership, Organization } from '@/types'

interface User {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  profileData: {
    company?: string
    [key: string]: any
  } | null
  organizations: OrganizationMembership[]
  createdAt: string
  updatedAt: string
}

export default function ProfilePage() {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  
  const [formData, setFormData] = useState({
    fullName: '',
    company: ''
  })

  useEffect(() => {
    fetchUserProfile()
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
            fullName: userData.fullName || '',
            company: userData.profileData?.company || ''
          })
        } else {
          setError('Failed to load profile')
        }
      } else {
        setError('Failed to load profile')
      }
    } catch (error) {
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
    } catch (error) {
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
      <div className="nexa-background min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Tab system with seamless folder-like design */}
          <Tabs defaultValue="account" className="w-full">
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
                <TabsTrigger value="account" className="flex items-center gap-2">
                  <User className="w-4 h-4" />
                  Account
                </TabsTrigger>
                <TabsTrigger value="organizations" className="flex items-center gap-2">
                  <Building className="w-4 h-4" />
                  Organizations
                </TabsTrigger>
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
                <div className="text-center py-12">
                  <div className="w-24 h-24 bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-6">
                    <Settings className="w-12 h-12 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold bg-gradient-to-r from-blue-400 via-purple-400 to-pink-400 text-transparent bg-clip-text mb-4">
                    NEXA AI Dashboard
                  </h3>
                  <p className="text-nexa-muted mb-8 max-w-2xl mx-auto">
                    Advanced AI-powered architecture solutions, real-time collaboration, and intelligent project management. 
                    Experience the future of enterprise architecture with NEXA's cutting-edge capabilities.
                  </p>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-4xl mx-auto">
                    <Card variant="nexa" className="p-6 text-center">
                      <div className="w-12 h-12 bg-blue-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Lightbulb className="w-6 h-6 text-blue-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-2">AI Solutions</h4>
                      <p className="text-nexa-muted text-sm">Intelligent architecture recommendations</p>
                    </Card>
                    <Card variant="nexa" className="p-6 text-center">
                      <div className="w-12 h-12 bg-purple-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Users className="w-6 h-6 text-purple-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-2">Team Collaboration</h4>
                      <p className="text-nexa-muted text-sm">Real-time project coordination</p>
                    </Card>
                    <Card variant="nexa" className="p-6 text-center">
                      <div className="w-12 h-12 bg-pink-500/20 rounded-lg flex items-center justify-center mx-auto mb-4">
                        <Globe className="w-6 h-6 text-pink-400" />
                      </div>
                      <h4 className="text-white font-semibold mb-2">Enterprise Scale</h4>
                      <p className="text-nexa-muted text-sm">Multi-organization management</p>
                    </Card>
                  </div>
                </div>
              </TabsContent>

              {/* Account Tab */}
              <TabsContent value="account" className="mt-0">
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Profile Header */}
                  <div className="lg:col-span-2 text-center mb-8 pb-8 border-b border-nexa-border">
                    <div className="w-20 h-20 bg-white rounded-full flex items-center justify-center mx-auto mb-4 text-2xl font-bold text-black">
                      {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <h2 className="text-2xl font-bold text-white mb-2">{user.fullName || 'Unnamed User'}</h2>
                    <p className="text-nexa-muted">{user.email}</p>
                  </div>

                  {/* Left Column - Editable Profile */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-6 pb-3 border-b border-nexa-border">
                      Profile Information
                    </h3>

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

                    <form onSubmit={handleSubmit} className="space-y-6">
                      <div>
                        <Label htmlFor="fullName" className="text-nexa-muted">Full Name</Label>
                        <Input
                          id="fullName"
                          type="text"
                          value={formData.fullName}
                          onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                          className="mt-2"
                          placeholder="Enter your full name"
                        />
                      </div>

                      <div>
                        <Label htmlFor="company" className="text-nexa-muted">Company</Label>
                        <Input
                          id="company"
                          type="text"
                          value={formData.company}
                          onChange={(e) => setFormData({ ...formData, company: e.target.value })}
                          className="mt-2"
                          placeholder="Enter your company name"
                        />
                      </div>

                      <div className="flex gap-3">
                        <Button type="submit" className="flex-1">
                          Update Profile
                        </Button>
                        <Link href="/profile/change-password">
                          <Button variant="outline" className="flex-1">
                            Change Password
                          </Button>
                        </Link>
                      </div>
                    </form>
                  </div>

                  {/* Right Column - Account Information */}
                  <div>
                    <h3 className="text-xl font-semibold text-white mb-6 pb-3 border-b border-nexa-border">
                      Account Information
                    </h3>

                    <div className="space-y-4">
                      <div className="flex justify-between py-3 border-b border-nexa-border/30">
                        <span className="text-nexa-muted">Email</span>
                        <span className="text-white">{user.email}</span>
                      </div>

                      <div className="flex justify-between py-3 border-b border-nexa-border/30">
                        <span className="text-nexa-muted">Account Created</span>
                        <span className="text-white">
                          {new Date(user.createdAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      <div className="flex justify-between py-3 border-b border-nexa-border/30">
                        <span className="text-nexa-muted">Last Updated</span>
                        <span className="text-white">
                          {new Date(user.updatedAt).toLocaleDateString('en-US', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </span>
                      </div>

                      <div className="flex justify-between py-3 border-b border-nexa-border/30">
                        <span className="text-nexa-muted">Account Status</span>
                        <span className="text-green-400">Active</span>
                      </div>

                      <div className="flex justify-between py-3">
                        <span className="text-nexa-muted">Organizations</span>
                        <span className="text-white">{user.organizations?.length || 0}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Organizations Tab */}
              <TabsContent value="organizations" className="mt-0">
                <div className="space-y-6">
                  <div className="flex justify-between items-center">
                    <div>
                      <h3 className="text-xl font-semibold text-white mb-2">Your Organizations</h3>
                      <p className="text-nexa-muted">Manage your organization memberships and create new organizations</p>
                    </div>
                    <Link href="/organizations/create">
                      <Button className="flex items-center gap-2">
                        <Plus className="w-4 h-4" />
                        Create Organization
                      </Button>
                    </Link>
                  </div>

                  {user.organizations && user.organizations.length > 0 ? (
                    <div className="grid gap-4">
                      {user.organizations.map((membership) => (
                        <Card key={membership.id} variant="nexa" className="p-6">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-4">
                              <div className="w-12 h-12 bg-nexa-accent rounded-lg flex items-center justify-center text-black font-bold">
                                {membership.organization?.name?.charAt(0).toUpperCase() || 'O'}
                              </div>
                              <div>
                                <h4 className="text-lg font-semibold text-white">
                                  {membership.organization?.name || 'Unknown Organization'}
                                </h4>
                                <div className="flex items-center gap-2 text-sm">
                                  <span className={`flex items-center gap-1 ${getRoleColor(membership.role)}`}>
                                    {getRoleIcon(membership.role)}
                                    {membership.role.charAt(0).toUpperCase() + membership.role.slice(1)}
                                  </span>
                                  <span className="text-nexa-muted">•</span>
                                  <span className="text-nexa-muted">
                                    Joined {new Date(membership.joinedAt || membership.createdAt).toLocaleDateString()}
                                  </span>
                                </div>
                              </div>
                            </div>
                            <div className="flex items-center gap-2">
                              <Button variant="outline" size="sm">
                                <Settings className="w-4 h-4" />
                              </Button>
                              <ChevronRight className="w-5 h-5 text-nexa-muted" />
                            </div>
                          </div>
                        </Card>
                      ))}
                    </div>
                  ) : (
                    <Card variant="nexa" className="p-8 text-center">
                      <Building className="w-16 h-16 text-nexa-muted mx-auto mb-4" />
                      <h4 className="text-lg font-semibold text-white mb-2">No Organizations</h4>
                      <p className="text-nexa-muted mb-6">
                        You're currently not a member of any organizations. Create one to collaborate with your team or join an existing organization.
                      </p>
                      <div className="flex justify-center gap-3">
                        <Link href="/organizations/create">
                          <Button>
                            <Plus className="w-4 h-4 mr-2" />
                            Create Organization
                          </Button>
                        </Link>
                        <Button variant="outline" disabled>
                          <Mail className="w-4 h-4 mr-2" />
                          Join Organization
                        </Button>
                      </div>
                    </Card>
                  )}
                </div>
              </TabsContent>

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

                    {/* Preferences Section */}
                    <Card variant="nexa" className="p-6">
                      <h4 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                        <User className="w-5 h-5" />
                        Preferences
                      </h4>
                      <div className="space-y-4">
                        <div className="flex justify-between items-center py-3 border-b border-nexa-border/30">
                          <div>
                            <div className="text-white font-medium">Language</div>
                            <div className="text-nexa-muted text-sm">English (US)</div>
                          </div>
                          <Button variant="outline" size="sm" disabled>Change</Button>
                        </div>
                        <div className="flex justify-between items-center py-3 border-b border-nexa-border/30">
                          <div>
                            <div className="text-white font-medium">Time Zone</div>
                            <div className="text-nexa-muted text-sm">UTC</div>
                          </div>
                          <Button variant="outline" size="sm" disabled>Change</Button>
                        </div>
                        <div className="flex justify-between items-center py-3">
                          <div>
                            <div className="text-white font-medium">Email Notifications</div>
                            <div className="text-nexa-muted text-sm">Enabled</div>
                          </div>
                          <Button variant="outline" size="sm" disabled>Configure</Button>
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