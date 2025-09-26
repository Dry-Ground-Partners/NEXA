'use client'

import React, { useEffect, useState } from 'react'
import { useSearchParams } from 'next/navigation'
import { useSessionAccess } from '@/hooks/useSessionAccess'
import { Loader2, Lock, AlertTriangle } from 'lucide-react'

interface SessionAccessWrapperProps {
  children: React.ReactNode
  sessionType: 'structuring' | 'visuals' | 'solutioning' | 'sow' | 'loe'
  onSessionIdChange?: (sessionId: string | null) => void
  onAccessStateChange?: (canWrite: boolean) => void
}

/**
 * Session Access Wrapper Component
 * 
 * Provides access control for session pages by:
 * 1. Extracting session ID from URL params
 * 2. Checking user's access permissions
 * 3. Displaying loading/error states
 * 4. Providing access state to child components
 */
export function SessionAccessWrapper({ 
  children, 
  sessionType, 
  onSessionIdChange,
  onAccessStateChange 
}: SessionAccessWrapperProps) {
  const searchParams = useSearchParams()
  const [sessionId, setSessionId] = useState<string | null>(null)
  
  // Extract session ID from URL parameters
  useEffect(() => {
    const sessionParam = searchParams.get('session')
    setSessionId(sessionParam)
    onSessionIdChange?.(sessionParam)
  }, [searchParams, onSessionIdChange])

  // Check access permissions
  const accessState = useSessionAccess(sessionId || undefined)

  // Notify parent component of access state changes
  useEffect(() => {
    onAccessStateChange?.(accessState.canWrite)
  }, [accessState.canWrite, onAccessStateChange])

  // Loading state
  if (accessState.loading) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center">
          <Loader2 className="h-8 w-8 animate-spin text-blue-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">
            {sessionId ? 'Checking Access Permissions' : 'Loading Session'}
          </h2>
          <p className="text-nexa-muted">
            {sessionId ? 'Verifying your access to this session...' : 'Preparing your workspace...'}
          </p>
        </div>
      </div>
    )
  }

  // Error state
  if (accessState.error) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <AlertTriangle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Error</h2>
          <p className="text-nexa-muted mb-4">{accessState.error}</p>
          <button
            onClick={() => window.location.href = '/grid'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return to Grid
          </button>
        </div>
      </div>
    )
  }

  // Access denied state (shouldn't reach here due to redirect in hook, but safety net)
  if (sessionId && !accessState.canRead) {
    return (
      <div className="min-h-screen bg-black flex items-center justify-center">
        <div className="text-center max-w-md">
          <Lock className="h-12 w-12 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-white mb-2">Access Denied</h2>
          <p className="text-nexa-muted mb-4">
            You don't have permission to access this {sessionType} session.
          </p>
          <button
            onClick={() => window.location.href = '/grid'}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors"
          >
            Return to Grid
          </button>
        </div>
      </div>
    )
  }

  // Success state - render children with access context
  return (
    <SessionAccessContext.Provider value={accessState}>
      {children}
    </SessionAccessContext.Provider>
  )
}

// Context for child components to access session permissions
const SessionAccessContext = React.createContext<{
  loading: boolean
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  error: string | null
  sessionId: string | null
}>({
  loading: false,
  canRead: false,
  canWrite: false,
  canDelete: false,
  error: null,
  sessionId: null
})

export function useSessionAccessContext() {
  return React.useContext(SessionAccessContext)
}

/**
 * Read-only Banner Component
 * Shows when user has read-only access to a session
 */
export function ReadOnlyBanner() {
  const { canWrite, canRead, sessionId } = useSessionAccessContext()

  if (!sessionId || !canRead || canWrite) {
    return null // Don't show banner for new sessions or when user has write access
  }

  return (
    <div className="bg-orange-900/20 border border-orange-500/50 text-orange-200 px-4 py-3 rounded-lg mb-4">
      <div className="flex items-center gap-2">
        <Lock className="h-4 w-4" />
        <span className="font-medium">Read-Only Access</span>
        <span className="text-orange-300/80">•</span>
        <span className="text-sm">You can view this session but cannot make changes</span>
      </div>
    </div>
  )
}


