/**
 * React hook for organization preferences management
 * Handles fetching and updating preferences with proper state management
 */

import { useState, useEffect, useCallback } from 'react'
import { useUser } from '@/contexts/user-context'
import type { PreferenceData } from '@/lib/preferences/preferences-service'

export interface OrganizationPreference {
  id: string
  organizationId: string
  mainLogo: {
    data: string
    filename: string
    mimeType: string
    sizeBytes: number
  } | null
  secondLogo: {
    data: string
    filename: string
    mimeType: string
    sizeBytes: number
  } | null
  generalApproach: string
  structuring: {
    diagnose: string
    echo: string
    traceback: string
    solution: string
  }
  visuals: {
    ideation: string
    planning: string
    sketching: string
  }
  solutioning: {
    structure: string
    analysis: string
    stack: string
    enhance: string
    formatting: string
  }
  pushing: {
    structuringToVisuals: string
    visualsToSolutioning: string
    solutioningToSOW: string
    sowToLOE: string
  }
  changeHistory: Array<{
    timestamp: string
    userId: string
    field: string
    oldValue: any
    newValue: any
  }>
  createdAt: string
  updatedAt: string
  createdBy: string | null
  updatedBy: string | null
}

export function usePreferences() {
  const { selectedOrganization } = useUser()
  const [preferences, setPreferences] = useState<OrganizationPreference | null>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Fetch preferences from API
   */
  const fetchPreferences = useCallback(async () => {
    if (!selectedOrganization?.organization?.id) {
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/organizations/${selectedOrganization.organization.id}/preferences`)
      
      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to fetch preferences')
      }

      const data = await response.json()
      setPreferences(data)
    } catch (err) {
      console.error('Error fetching preferences:', err)
      setError(err instanceof Error ? err.message : 'Failed to fetch preferences')
    } finally {
      setLoading(false)
    }
  }, [selectedOrganization?.organization?.id])

  /**
   * Update preferences
   */
  const updatePreferences = useCallback(async (data: PreferenceData) => {
    if (!selectedOrganization?.organization?.id) {
      throw new Error('No organization selected')
    }

    try {
      setSaving(true)
      setError(null)

      const response = await fetch(`/api/organizations/${selectedOrganization.organization.id}/preferences`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(data),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to update preferences')
      }

      const result = await response.json()
      
      if (result.success) {
        setPreferences(result.data)
        return { success: true, data: result.data }
      } else {
        throw new Error(result.error || 'Update failed')
      }
    } catch (err) {
      console.error('Error updating preferences:', err)
      const errorMessage = err instanceof Error ? err.message : 'Failed to update preferences'
      setError(errorMessage)
      return { success: false, error: errorMessage }
    } finally {
      setSaving(false)
    }
  }, [selectedOrganization?.organization?.id])

  /**
   * Fetch on mount and when organization changes
   */
  useEffect(() => {
    fetchPreferences()
  }, [fetchPreferences])

  return {
    preferences,
    loading,
    saving,
    error,
    refetch: fetchPreferences,
    updatePreferences,
  }
}



