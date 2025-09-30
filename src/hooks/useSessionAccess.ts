import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'

export interface SessionAccessState {
  loading: boolean
  canRead: boolean
  canWrite: boolean
  canDelete: boolean
  error: string | null
  sessionId: string | null
}

export function useSessionAccess(sessionId?: string) {
  const router = useRouter()
  const [accessState, setAccessState] = useState<SessionAccessState>({
    loading: true,
    canRead: false,
    canWrite: false,
    canDelete: false,
    error: null,
    sessionId: sessionId || null
  })

  useEffect(() => {
    if (!sessionId) {
      setAccessState(prev => ({
        ...prev,
        loading: false,
        canRead: true, // Allow access to create new sessions
        canWrite: true,
        canDelete: false,
        sessionId: null
      }))
      return
    }

    const checkAccess = async () => {
      try {
        setAccessState(prev => ({ ...prev, loading: true, error: null }))

        // Check read access first - if this fails, user can't access the session at all
        const response = await fetch(`/api/sessions/${sessionId}/access-check`)
        const data = await response.json()

        if (!response.ok) {
          if (response.status === 401) {
            // User not authenticated - redirect to login
            router.push('/auth/login')
            return
          } else if (response.status === 403) {
            // User lacks access - redirect to grid with error
            router.push('/grid?error=access_denied')
            return
          } else {
            throw new Error(data.error || 'Failed to check session access')
          }
        }

        if (!data.success) {
          throw new Error(data.error || 'Failed to check session access')
        }

        setAccessState(prev => ({
          ...prev,
          loading: false,
          canRead: data.canRead,
          canWrite: data.canWrite,
          canDelete: data.canDelete,
          sessionId,
          error: null
        }))

        // If user can't read the session, redirect them
        if (!data.canRead) {
          console.log('🔒 Access denied: User lacks read permission, redirecting to grid')
          router.push('/grid?error=access_denied')
        }

      } catch (error) {
        console.error('❌ Error checking session access:', error)
        setAccessState(prev => ({
          ...prev,
          loading: false,
          error: error instanceof Error ? error.message : 'Failed to check access',
          canRead: false,
          canWrite: false,
          canDelete: false
        }))
      }
    }

    checkAccess()
  }, [sessionId, router])

  return accessState
}

/**
 * Hook for components that need to check write access before save operations
 */
export function useCanWrite(sessionId?: string) {
  const [canWrite, setCanWrite] = useState<boolean>(false)
  const [checking, setChecking] = useState<boolean>(false)

  const checkWriteAccess = async () => {
    if (!sessionId) {
      return true // New sessions can always be written to
    }

    try {
      setChecking(true)
      const response = await fetch(`/api/sessions/${sessionId}/access-check`)
      const data = await response.json()

      if (response.ok && data.success) {
        setCanWrite(data.canWrite)
        return data.canWrite
      } else {
        setCanWrite(false)
        return false
      }
    } catch (error) {
      console.error('❌ Error checking write access:', error)
      setCanWrite(false)
      return false
    } finally {
      setChecking(false)
    }
  }

  useEffect(() => {
    checkWriteAccess()
  }, [sessionId])

  return {
    canWrite,
    checking,
    checkWriteAccess
  }
}







