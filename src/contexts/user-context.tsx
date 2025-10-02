'use client'

import React, { createContext, useContext, useEffect, useState, useRef } from 'react'
import { getErrorMessage } from '@/lib/utils'

interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  avatarUrl: string | null
  status: string
  emailVerifiedAt: Date | null
  profileData: any
  organizationMemberships?: {
    id: string
    role: string
    status: string
    organization: {
      id: string
      name: string
      slug: string | null
      logoUrl: string | null
      planType: string
      status: string
    }
    joinedAt: Date | null
  }[]
}

type OrganizationMembership = {
  id: string
  role: string
  status: string
  organization: {
    id: string
    name: string
    slug: string | null
    logoUrl: string | null
    planType: string
    status: string
  }
  joinedAt: Date | null
}

interface UserContextType {
  user: User | null
  loading: boolean
  error: string | null
  selectedOrganization: OrganizationMembership | null
  setSelectedOrganization: (org: OrganizationMembership | null) => void
  refreshUser: () => Promise<void>
}

const UserContext = createContext<UserContextType>({
  user: null,
  loading: true,
  error: null,
  selectedOrganization: null,
  setSelectedOrganization: () => {},
  refreshUser: async () => {},
})

export function UserProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [selectedOrganization, setSelectedOrganization] = useState<OrganizationMembership | null>(null)
  const hasAutoSelected = useRef(false)

  const fetchUser = async () => {
    try {
      setLoading(true)
      setError(null)
      
      const response = await fetch('/api/auth/me')
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch user')
      }

      if (data.success) {
        setUser(data.user)
        // Auto-selection will be handled by useEffect
      } else {
        setUser(null)
        setSelectedOrganization(null)
        hasAutoSelected.current = false
      }
    } catch (err) {
      console.error('Error fetching user:', err)
      setError(getErrorMessage(err))
      setUser(null)
      setSelectedOrganization(null)
      hasAutoSelected.current = false
    } finally {
      setLoading(false)
    }
  }

  const refreshUser = async () => {
    await fetchUser()
  }

  // Handle organization selection changes
  const handleSetSelectedOrganization = (org: OrganizationMembership | null) => {
    setSelectedOrganization(org)
    
    // Store selected org in localStorage for persistence
    if (org) {
      localStorage.setItem('selectedOrganizationId', org.organization.id)
    } else {
      localStorage.removeItem('selectedOrganizationId')
    }
  }

  useEffect(() => {
    fetchUser()
  }, [])

  // Restore selected organization from localStorage after user is loaded
  useEffect(() => {
    if (user && user.organizationMemberships && user.organizationMemberships.length > 0 && !selectedOrganization && !hasAutoSelected.current) {
      hasAutoSelected.current = true
      
      const savedOrgId = localStorage.getItem('selectedOrganizationId')
      
      if (savedOrgId) {
        const savedOrg = user.organizationMemberships.find(m => m.organization.id === savedOrgId)
        if (savedOrg) {
          setSelectedOrganization(savedOrg)
          return
        }
      }
      
      // Fallback to auto-select if no saved org or saved org not found
      const activeOrgs = user.organizationMemberships.filter(m => m.status === 'active')
      if (activeOrgs.length > 0) {
        const priorityOrg = activeOrgs.find(m => m.role === 'owner' || m.role === 'admin') || activeOrgs[0]
        setSelectedOrganization(priorityOrg)
      }
    }
  }, [user])

  return (
    <UserContext.Provider 
      value={{ 
        user, 
        loading, 
        error, 
        selectedOrganization, 
        setSelectedOrganization: handleSetSelectedOrganization,
        refreshUser 
      }}
    >
      {children}
    </UserContext.Provider>
  )
}

export function useUser() {
  const context = useContext(UserContext)
  if (!context) {
    throw new Error('useUser must be used within a UserProvider')
  }
  return context
}
