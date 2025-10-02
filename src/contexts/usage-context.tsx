'use client'

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react'
import { useUser } from '@/contexts/user-context'

export interface UsageData {
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  percentageUsed: number
  isNearLimit: boolean
  isOverLimit: boolean
  eventBreakdown: Record<string, { count: number; credits: number }>
  userBreakdown: Record<string, { count: number; credits: number }>
  dailyUsage: Array<{ date: string; credits: number }>
  topEvents: Array<{ eventType: string; credits: number; percentage: number }>
  usagePatterns?: {
    peakUsageDay: { date: string; credits: number } | null
    averageDailyUsage: number
    consistencyScore: number
  }
  warnings?: Array<{
    type: 'warning' | 'critical'
    message: string
    action: string
  }>
  projectedEndOfMonthUsage?: number
  willExceedLimit?: boolean
}

export interface UsageHistory {
  events: Array<{
    id: string
    eventType: string
    eventName: string
    category: string
    creditsConsumed: number
    user: { id: string; name: string; email: string }
    session: { id: number; uuid: string; title: string } | null
    eventData: any
    createdAt: string
    complexity: number
    endpoint: string
  }>
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  filters: {
    eventType?: string
    userId?: string
    startDate?: string
    endDate?: string
    category?: string
    minCredits?: string
    maxCredits?: string
    sessionId?: string
  }
  summary: {
    totalCredits: number
    totalEvents: number
    uniqueUsers: number
    dateRange: { start: string | null; end: string | null }
  }
}

interface UsageContextType {
  // Dashboard data
  usage: UsageData | null
  usageLoading: boolean
  usageError: string | null
  refreshUsage: () => Promise<void>

  // History data
  history: UsageHistory | null
  historyLoading: boolean
  historyError: string | null
  historyFilters: Record<string, string>
  setHistoryFilter: (key: string, value: string) => void
  clearHistoryFilters: () => void
  refreshHistory: () => Promise<void>
  loadHistoryPage: (page: number) => Promise<void>

  // Real-time updates
  lastUsageUpdate: Date | null
  enableRealTimeUpdates: boolean
  setEnableRealTimeUpdates: (enabled: boolean) => void
}

const UsageContext = createContext<UsageContextType>({
  usage: null,
  usageLoading: true,
  usageError: null,
  refreshUsage: async () => {},
  
  history: null,
  historyLoading: false,
  historyError: null,
  historyFilters: {},
  setHistoryFilter: () => {},
  clearHistoryFilters: () => {},
  refreshHistory: async () => {},
  loadHistoryPage: async () => {},

  lastUsageUpdate: null,
  enableRealTimeUpdates: false,
  setEnableRealTimeUpdates: () => {}
})

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const { selectedOrganization } = useUser()
  
  // Usage dashboard state
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [usageLoading, setUsageLoading] = useState(true)
  const [usageError, setUsageError] = useState<string | null>(null)
  
  // Usage history state
  const [history, setHistory] = useState<UsageHistory | null>(null)
  const [historyLoading, setHistoryLoading] = useState(false)
  const [historyError, setHistoryError] = useState<string | null>(null)
  const [historyFilters, setHistoryFilters] = useState<Record<string, string>>({})
  
  // Real-time update state
  const [lastUsageUpdate, setLastUsageUpdate] = useState<Date | null>(null)
  const [enableRealTimeUpdates, setEnableRealTimeUpdates] = useState(false)

  /**
   * Fetch usage dashboard data
   */
  const fetchUsage = useCallback(async () => {
    if (!selectedOrganization) {
      setUsage(null)
      setUsageLoading(false)
      return
    }

    try {
      setUsageLoading(true)
      setUsageError(null)

      const response = await fetch(`/api/organizations/${selectedOrganization.organization.id}/usage/dashboard`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage dashboard')
      }

      if (data.success && data.dashboard) {
        const dashboardData = data.dashboard
        
        // Transform dashboard data to UsageData format
        const usageData: UsageData = {
          totalCredits: dashboardData.overview.totalCredits,
          usedCredits: dashboardData.overview.usedCredits,
          remainingCredits: dashboardData.overview.remainingCredits,
          percentageUsed: dashboardData.overview.percentageUsed,
          isNearLimit: dashboardData.overview.isNearLimit,
          isOverLimit: dashboardData.overview.isOverLimit,
          eventBreakdown: dashboardData.events.breakdown,
          userBreakdown: dashboardData.users.breakdown,
          dailyUsage: dashboardData.analytics.dailyUsage,
          topEvents: dashboardData.events.topEvents,
          usagePatterns: dashboardData.analytics.usagePatterns,
          warnings: dashboardData.warnings,
          projectedEndOfMonthUsage: dashboardData.overview.projectedEndOfMonthUsage,
          willExceedLimit: dashboardData.overview.willExceedLimit
        }
        
        setUsage(usageData)
        setLastUsageUpdate(new Date())
      }
    } catch (err) {
      console.error('Error fetching usage:', err)
      setUsageError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setUsageLoading(false)
    }
  }, [selectedOrganization])

  /**
   * Fetch usage history data
   */
  const fetchHistory = useCallback(async (page = 1, filters = historyFilters) => {
    if (!selectedOrganization) {
      setHistory(null)
      return
    }

    try {
      setHistoryLoading(true)
      setHistoryError(null)

      // Build query parameters
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '50'
      })

      // Add filters
      Object.entries(filters).forEach(([key, value]) => {
        if (value && value.trim()) {
          params.append(key, value)
        }
      })

      const response = await fetch(
        `/api/organizations/${selectedOrganization.organization.id}/usage/history?${params}`
      )
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage history')
      }

      if (data.success) {
        setHistory(data)
      }
    } catch (err) {
      console.error('Error fetching usage history:', err)
      setHistoryError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setHistoryLoading(false)
    }
  }, [selectedOrganization, historyFilters])

  /**
   * Refresh usage dashboard
   */
  const refreshUsage = useCallback(async () => {
    await fetchUsage()
  }, [fetchUsage])

  /**
   * Refresh usage history
   */
  const refreshHistory = useCallback(async () => {
    await fetchHistory(1, historyFilters)
  }, [fetchHistory, historyFilters])

  /**
   * Load specific page of history
   */
  const loadHistoryPage = useCallback(async (page: number) => {
    await fetchHistory(page, historyFilters)
  }, [fetchHistory, historyFilters])

  /**
   * Set a history filter
   */
  const setHistoryFilter = useCallback((key: string, value: string) => {
    setHistoryFilters(prev => {
      const newFilters = { ...prev, [key]: value }
      // Auto-refresh history when filters change
      fetchHistory(1, newFilters)
      return newFilters
    })
  }, [fetchHistory])

  /**
   * Clear all history filters
   */
  const clearHistoryFilters = useCallback(() => {
    setHistoryFilters({})
    fetchHistory(1, {})
  }, [fetchHistory])

  // Initial data fetch when organization changes
  useEffect(() => {
    if (selectedOrganization) {
      fetchUsage()
    } else {
      setUsage(null)
      setHistory(null)
      setUsageLoading(false)
      setHistoryLoading(false)
    }
  }, [selectedOrganization, fetchUsage])

  // Real-time updates
  useEffect(() => {
    if (!enableRealTimeUpdates || !selectedOrganization) {
      return
    }

    const interval = setInterval(() => {
      fetchUsage()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [enableRealTimeUpdates, selectedOrganization, fetchUsage])

  // Clear errors when organization changes
  useEffect(() => {
    setUsageError(null)
    setHistoryError(null)
  }, [selectedOrganization])

  const contextValue: UsageContextType = {
    usage,
    usageLoading,
    usageError,
    refreshUsage,

    history,
    historyLoading,
    historyError,
    historyFilters,
    setHistoryFilter,
    clearHistoryFilters,
    refreshHistory,
    loadHistoryPage,

    lastUsageUpdate,
    enableRealTimeUpdates,
    setEnableRealTimeUpdates
  }

  return (
    <UsageContext.Provider value={contextValue}>
      {children}
    </UsageContext.Provider>
  )
}

export function useUsage() {
  const context = useContext(UsageContext)
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider')
  }
  return context
}

/**
 * Hook for just the usage dashboard data
 */
export function useUsageDashboard() {
  const { usage, usageLoading, usageError, refreshUsage, lastUsageUpdate } = useUsage()
  
  return {
    usage,
    loading: usageLoading,
    error: usageError,
    refresh: refreshUsage,
    lastUpdate: lastUsageUpdate
  }
}

/**
 * Hook for just the usage history data
 */
export function useUsageHistory() {
  const { 
    history, 
    historyLoading, 
    historyError, 
    historyFilters,
    setHistoryFilter,
    clearHistoryFilters,
    refreshHistory,
    loadHistoryPage
  } = useUsage()
  
  return {
    history,
    loading: historyLoading,
    error: historyError,
    filters: historyFilters,
    setFilter: setHistoryFilter,
    clearFilters: clearHistoryFilters,
    refresh: refreshHistory,
    loadPage: loadHistoryPage
  }
}





