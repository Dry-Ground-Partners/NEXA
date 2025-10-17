'use client'

import React from 'react'
import { useSessionAccessContext } from './session-access-wrapper'
import { useCanWrite } from '@/hooks/useSessionAccess'
import { Save, Lock, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'

interface ProtectedSaveButtonProps {
  sessionId?: string
  onSave: () => Promise<void> | void
  saving?: boolean
  disabled?: boolean
  className?: string
  children?: React.ReactNode
  showReadOnlyMessage?: boolean
}

/**
 * Protected Save Button Component
 * 
 * A save button that:
 * 1. Checks write permissions before allowing saves
 * 2. Shows appropriate loading/disabled states
 * 3. Displays read-only messages when appropriate
 * 4. Handles access denied scenarios gracefully
 */
export function ProtectedSaveButton({
  sessionId,
  onSave,
  saving = false,
  disabled = false,
  className = '',
  children,
  showReadOnlyMessage = true
}: ProtectedSaveButtonProps) {
  const accessContext = useSessionAccessContext()
  const { canWrite: directCanWrite, checking } = useCanWrite(sessionId)
  
  // Use context if available (from SessionAccessWrapper), otherwise use direct check
  const canWrite = accessContext.sessionId ? accessContext.canWrite : directCanWrite
  const isLoading = accessContext.loading || checking || saving

  const handleSave = async () => {
    if (!canWrite || isLoading || disabled) {
      return
    }

    try {
      await onSave()
    } catch (error: unknown) {
      console.error('❌ Save operation failed:', error)
      // You could add toast notification here
    }
  }

  // Show loading state
  if (isLoading) {
    return (
      <Button 
        disabled 
        className={`flex items-center gap-2 ${className}`}
      >
        <Loader2 className="h-4 w-4 animate-spin" />
        {saving ? 'Saving...' : 'Checking Access...'}
      </Button>
    )
  }

  // Show read-only state
  if (!canWrite && sessionId) {
    return (
      <div className="flex flex-col items-end gap-2">
        <Button 
          disabled 
          className={`flex items-center gap-2 ${className}`}
          title="You don't have permission to save changes to this session"
        >
          <Lock className="h-4 w-4" />
          {children || 'Read Only'}
        </Button>
        {showReadOnlyMessage && (
          <p className="text-xs text-orange-400">
            You don't have write access to this session
          </p>
        )}
      </div>
    )
  }

  // Show active save button
  return (
    <Button 
      onClick={handleSave}
      disabled={disabled || isLoading}
      className={`flex items-center gap-2 ${className}`}
    >
      <Save className="h-4 w-4" />
      {children || (saving ? 'Saving...' : 'Save')}
    </Button>
  )
}

/**
 * Auto-Save Status Component
 * Shows auto-save status with access control awareness
 */
interface AutoSaveStatusProps {
  sessionId?: string
  lastSaved?: string | Date
  hasUnsavedChanges?: boolean
  autoSaveEnabled?: boolean
}

export function AutoSaveStatus({
  sessionId,
  lastSaved,
  hasUnsavedChanges = false,
  autoSaveEnabled = true
}: AutoSaveStatusProps) {
  const accessContext = useSessionAccessContext()
  const { canWrite } = useCanWrite(sessionId)
  
  // Use context if available, otherwise use direct check
  const userCanWrite = accessContext.sessionId ? accessContext.canWrite : canWrite

  if (!sessionId) {
    return (
      <div className="text-xs text-nexa-muted">
        New session - not saved yet
      </div>
    )
  }

  if (!userCanWrite) {
    return (
      <div className="flex items-center gap-2 text-xs text-orange-400">
        <Lock className="h-3 w-3" />
        Read-only session
      </div>
    )
  }

  if (hasUnsavedChanges) {
    return (
      <div className="text-xs text-yellow-400">
        {autoSaveEnabled ? 'Auto-saving...' : 'Unsaved changes'}
      </div>
    )
  }

  if (lastSaved) {
    const saveTime = typeof lastSaved === 'string' ? new Date(lastSaved) : lastSaved
    const timeAgo = Math.floor((Date.now() - saveTime.getTime()) / 1000)
    
    let timeText = 'just now'
    if (timeAgo > 60) {
      const minutes = Math.floor(timeAgo / 60)
      timeText = `${minutes}m ago`
    } else if (timeAgo > 5) {
      timeText = `${timeAgo}s ago`
    }

    return (
      <div className="text-xs text-green-400">
        Saved {timeText}
      </div>
    )
  }

  return (
    <div className="text-xs text-nexa-muted">
      Not saved
    </div>
  )
}



























