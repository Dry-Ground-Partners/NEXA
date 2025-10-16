'use client'

import { useUsageDashboard } from '@/contexts/usage-context'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Zap, RefreshCw, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsageIndicatorProps {
  compact?: boolean
  showProgress?: boolean
  showWarnings?: boolean
  className?: string
}

export function UsageIndicator({ 
  compact = false, 
  showProgress = true,
  showWarnings = true,
  className 
}: UsageIndicatorProps) {
  const { usage, loading, error, refresh, lastUpdate } = useUsageDashboard()

  if (loading) {
    return (
      <div className={cn("flex items-center gap-2 text-nexa-muted", className)}>
        <RefreshCw className="h-4 w-4 animate-spin" />
        <span className="text-sm">Loading usage...</span>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("flex items-center gap-2 text-red-400", className)}>
        <AlertTriangle className="h-4 w-4" />
        <span className="text-sm">Error loading usage</span>
      </div>
    )
  }

  if (!usage) {
    return (
      <div className={cn("flex items-center gap-2 text-nexa-muted", className)}>
        <Zap className="h-4 w-4" />
        <span className="text-sm">No usage data</span>
      </div>
    )
  }

  const getStatusColor = () => {
    if (usage.isOverLimit) return 'text-red-400'
    if (usage.isNearLimit) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getProgressColor = () => {
    if (usage.isOverLimit) return 'bg-red-500'
    if (usage.isNearLimit) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  if (compact) {
    return (
      <div className={cn("flex items-center gap-2", className)}>
        <Zap className={cn("h-4 w-4", getStatusColor())} />
        <div className="flex items-center gap-1 text-sm">
          <span className="text-white font-medium">
            {usage.totalCredits === Infinity ? '∞' : usage.remainingCredits.toLocaleString()}
          </span>
          {usage.totalCredits !== Infinity && (
            <>
              <span className="text-nexa-muted">/</span>
              <span className="text-nexa-muted">{usage.totalCredits.toLocaleString()}</span>
            </>
          )}
        </div>
        {showWarnings && usage.isNearLimit && (
          <AlertTriangle className={cn("h-3 w-3", getStatusColor())} />
        )}
      </div>
    )
  }

  return (
    <div className={cn("space-y-3", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className={cn("h-4 w-4", getStatusColor())} />
          <span className="text-white text-sm font-medium">Credits</span>
          {showWarnings && usage.isNearLimit && (
            <AlertTriangle className={cn("h-4 w-4", getStatusColor())} />
          )}
        </div>
        <div className="flex items-center gap-2 text-sm">
          <span className="text-white font-medium">
            {usage.usedCredits.toLocaleString()}
          </span>
          <span className="text-nexa-muted">/</span>
          <span className="text-nexa-muted">
            {usage.totalCredits === Infinity ? '∞' : usage.totalCredits.toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* Progress Bar */}
      {showProgress && usage.totalCredits !== Infinity && (
        <div className="space-y-1">
          <Progress 
            value={Math.min(100, usage.percentageUsed)} 
            className="h-2"
          />
          <div className="flex justify-between text-xs">
            <span className="text-nexa-muted">
              {usage.percentageUsed.toFixed(1)}% used
            </span>
            <span className="text-nexa-muted">
              {usage.remainingCredits.toLocaleString()} remaining
            </span>
          </div>
        </div>
      )}
      
      {/* Warning Messages */}
      {showWarnings && (
        <div className="space-y-1">
          {usage.isOverLimit ? (
            <p className="text-red-400 text-xs">
              Over limit by {(usage.usedCredits - usage.totalCredits).toLocaleString()} credits
            </p>
          ) : usage.isNearLimit ? (
            <p className="text-yellow-400 text-xs">
              Approaching credit limit
            </p>
          ) : (
            <p className="text-green-400 text-xs">
              {usage.remainingCredits === Infinity 
                ? 'Unlimited usage available'
                : 'Credits available'
              }
            </p>
          )}
          
          {/* Projected usage warning */}
          {usage.willExceedLimit && (
            <p className="text-orange-400 text-xs flex items-center gap-1">
              <TrendingUp className="h-3 w-3" />
              Projected to exceed limit this month
            </p>
          )}
        </div>
      )}

      {/* Last Update */}
      {lastUpdate && (
        <p className="text-nexa-muted text-xs">
          Updated {lastUpdate.toLocaleTimeString()}
        </p>
      )}
    </div>
  )
}

/**
 * Compact usage badge for inline display
 */
export function UsageBadge({ className }: { className?: string }) {
  const { usage, loading } = useUsageDashboard()

  if (loading || !usage) {
    return (
      <div className={cn("inline-flex items-center gap-1 px-2 py-1 rounded-md bg-nexa-surface text-xs", className)}>
        <RefreshCw className="h-3 w-3 animate-spin" />
        <span>Loading</span>
      </div>
    )
  }

  const getVariant = () => {
    if (usage.isOverLimit) return 'bg-red-500/20 text-red-400 border-red-500/30'
    if (usage.isNearLimit) return 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30'
    return 'bg-green-500/20 text-green-400 border-green-500/30'
  }

  return (
    <div className={cn(
      "inline-flex items-center gap-1 px-2 py-1 rounded-md border text-xs font-medium",
      getVariant(),
      className
    )}>
      <Zap className="h-3 w-3" />
      <span>
        {usage.totalCredits === Infinity 
          ? `${usage.usedCredits.toLocaleString()} used`
          : `${usage.remainingCredits.toLocaleString()} left`
        }
      </span>
    </div>
  )
}

/**
 * Large usage display for dashboard cards
 */
export function UsageCard({ className }: { className?: string }) {
  const { usage, loading, error, refresh } = useUsageDashboard()

  if (loading) {
    return (
      <div className={cn("p-6 rounded-lg bg-nexa-surface border border-nexa-border", className)}>
        <div className="flex items-center justify-center h-24">
          <RefreshCw className="h-6 w-6 animate-spin text-nexa-muted" />
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("p-6 rounded-lg bg-nexa-surface border border-nexa-border", className)}>
        <div className="flex flex-col items-center justify-center h-24 space-y-2">
          <AlertTriangle className="h-6 w-6 text-red-400" />
          <p className="text-sm text-red-400">Failed to load usage</p>
          <button 
            onClick={refresh}
            className="text-xs text-nexa-accent hover:text-white transition-colors"
          >
            Retry
          </button>
        </div>
      </div>
    )
  }

  if (!usage) {
    return (
      <div className={cn("p-6 rounded-lg bg-nexa-surface border border-nexa-border", className)}>
        <div className="flex flex-col items-center justify-center h-24 space-y-2">
          <Zap className="h-6 w-6 text-nexa-muted" />
          <p className="text-sm text-nexa-muted">No usage data available</p>
        </div>
      </div>
    )
  }

  return (
    <div className={cn("p-6 rounded-lg bg-nexa-surface border border-nexa-border", className)}>
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-semibold text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-blue-400" />
            Credit Usage
          </h3>
          <button 
            onClick={refresh}
            className="text-nexa-muted hover:text-white transition-colors"
          >
            <RefreshCw className="h-4 w-4" />
          </button>
        </div>

        {/* Main Stats */}
        <div className="grid grid-cols-2 gap-4">
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {usage.usedCredits.toLocaleString()}
            </p>
            <p className="text-sm text-nexa-muted">Used</p>
          </div>
          <div className="text-center">
            <p className="text-2xl font-bold text-white">
              {usage.totalCredits === Infinity 
                ? '∞' 
                : usage.remainingCredits.toLocaleString()
              }
            </p>
            <p className="text-sm text-nexa-muted">Remaining</p>
          </div>
        </div>

        {/* Progress */}
        {usage.totalCredits !== Infinity && (
          <div className="space-y-2">
            <Progress 
              value={Math.min(100, usage.percentageUsed)} 
              className="h-3"
            />
            <div className="flex justify-between text-sm">
              <span className="text-nexa-muted">
                {usage.percentageUsed.toFixed(1)}% of monthly limit
              </span>
              <span className={cn(
                "font-medium",
                usage.isOverLimit ? 'text-red-400' : 
                usage.isNearLimit ? 'text-yellow-400' : 'text-green-400'
              )}>
                {usage.isOverLimit ? 'Over Limit' :
                 usage.isNearLimit ? 'Near Limit' : 'On Track'}
              </span>
            </div>
          </div>
        )}

        {/* Warnings */}
        {usage.warnings && usage.warnings.length > 0 && (
          <div className="space-y-1">
            {usage.warnings.map((warning, index) => (
              <div 
                key={index}
                className={cn(
                  "flex items-start gap-2 p-2 rounded text-xs",
                  warning.type === 'critical' 
                    ? 'bg-red-500/10 text-red-400' 
                    : 'bg-yellow-500/10 text-yellow-400'
                )}
              >
                <AlertTriangle className="h-3 w-3 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="font-medium">{warning.message}</p>
                  <p className="opacity-75">{warning.action}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}



















