'use client'

import { useState } from 'react'
import { useUsageDashboard } from '@/contexts/usage-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { 
  Zap, 
  TrendingUp, 
  Users, 
  Calendar,
  RefreshCw,
  AlertTriangle,
  BarChart3,
  PieChart,
  Activity,
  Target,
  Clock,
  ArrowUp,
  ArrowDown,
  Minus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsageDashboardProps {
  className?: string
}

export function UsageDashboard({ className }: UsageDashboardProps) {
  const { usage, loading, error, refresh, lastUpdate } = useUsageDashboard()
  const [selectedTab, setSelectedTab] = useState('overview')

  if (loading) {
    return (
      <div className={cn("space-y-6", className)}>
        <div className="flex items-center justify-center py-12">
          <div className="flex flex-col items-center gap-4">
            <RefreshCw className="h-8 w-8 animate-spin text-nexa-muted" />
            <p className="text-nexa-muted">Loading usage dashboard...</p>
          </div>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card variant="nexa" className="p-8">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Usage Data</h3>
              <p className="text-nexa-muted mb-4">{error}</p>
              <Button variant="nexa" onClick={refresh}>
                <RefreshCw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  if (!usage) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card variant="nexa" className="p-8">
          <div className="flex flex-col items-center gap-4">
            <Zap className="h-8 w-8 text-nexa-muted" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">No Usage Data Available</h3>
              <p className="text-nexa-muted">Start using AI features to see your usage statistics.</p>
            </div>
          </div>
        </Card>
      </div>
    )
  }

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Usage Dashboard</h2>
          <p className="text-nexa-muted">
            Monitor your AI credit consumption and usage patterns
          </p>
        </div>
        <div className="flex items-center gap-4">
          {lastUpdate && (
            <p className="text-sm text-nexa-muted">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </p>
          )}
          <Button variant="outline" onClick={refresh}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <UsageOverviewCard
          title="Total Credits"
          value={usage.totalCredits === Infinity ? '∞' : usage.totalCredits.toLocaleString()}
          icon={<Target className="h-6 w-6 text-blue-400" />}
          subtitle="Monthly allocation"
        />
        
        <UsageOverviewCard
          title="Used Credits"
          value={usage.usedCredits.toLocaleString()}
          icon={<TrendingUp className="h-6 w-6 text-green-400" />}
          subtitle={`${usage.percentageUsed.toFixed(1)}% of limit`}
          trend={usage.percentageUsed >= 80 ? 'warning' : 'normal'}
        />
        
        <UsageOverviewCard
          title="Remaining"
          value={usage.totalCredits === Infinity ? '∞' : usage.remainingCredits.toLocaleString()}
          icon={<Zap className="h-6 w-6 text-purple-400" />}
          subtitle="Credits available"
          trend={usage.isNearLimit ? 'warning' : 'normal'}
        />
        
        <UsageOverviewCard
          title="Efficiency"
          value={`${((usage.usagePatterns?.consistencyScore || 0)).toFixed(0)}%`}
          icon={<Activity className="h-6 w-6 text-yellow-400" />}
          subtitle="Usage consistency"
        />
      </div>

      {/* Usage Progress */}
      {usage.totalCredits !== Infinity && (
        <Card variant="nexa" className="p-6">
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white">Monthly Usage Progress</h3>
              <div className="text-sm text-nexa-muted">
                {usage.usedCredits.toLocaleString()} / {usage.totalCredits.toLocaleString()} credits
              </div>
            </div>
            
            <Progress value={Math.min(100, usage.percentageUsed)} className="h-4" />
            
            <div className="flex justify-between text-sm">
              <span className="text-nexa-muted">
                {usage.percentageUsed.toFixed(1)}% used
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

            {/* Projected usage */}
            {usage.projectedEndOfMonthUsage && (
              <div className="pt-2 border-t border-nexa-border">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-nexa-muted">Projected end-of-month usage:</span>
                  <span className={cn(
                    "font-medium",
                    usage.willExceedLimit ? 'text-red-400' : 'text-white'
                  )}>
                    {usage.projectedEndOfMonthUsage.toLocaleString()} credits
                  </span>
                </div>
              </div>
            )}
          </div>
        </Card>
      )}

      {/* Warnings */}
      {usage.warnings && usage.warnings.length > 0 && (
        <div className="space-y-2">
          {usage.warnings.map((warning, index) => (
            <Card 
              key={index}
              variant="nexa" 
              className={cn(
                "p-4 border-l-4",
                warning.type === 'critical' 
                  ? 'border-l-red-500 bg-red-500/5' 
                  : 'border-l-yellow-500 bg-yellow-500/5'
              )}
            >
              <div className="flex items-start gap-3">
                <AlertTriangle className={cn(
                  "h-5 w-5 mt-0.5",
                  warning.type === 'critical' ? 'text-red-400' : 'text-yellow-400'
                )} />
                <div>
                  <h4 className="font-semibold text-white">{warning.message}</h4>
                  <p className="text-sm text-nexa-muted mt-1">{warning.action}</p>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Detailed Analytics Tabs */}
      <Tabs value={selectedTab} onValueChange={setSelectedTab}>
        <TabsList>
          <TabsTrigger value="overview">
            <BarChart3 className="h-4 w-4 mr-2" />
            Overview
          </TabsTrigger>
          <TabsTrigger value="events">
            <PieChart className="h-4 w-4 mr-2" />
            By Event Type
          </TabsTrigger>
          <TabsTrigger value="users">
            <Users className="h-4 w-4 mr-2" />
            By User
          </TabsTrigger>
          <TabsTrigger value="timeline">
            <Calendar className="h-4 w-4 mr-2" />
            Timeline
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview">
          <UsageOverviewTab usage={usage} />
        </TabsContent>

        <TabsContent value="events">
          <UsageEventBreakdown usage={usage} />
        </TabsContent>

        <TabsContent value="users">
          <UsageUserBreakdown usage={usage} />
        </TabsContent>

        <TabsContent value="timeline">
          <UsageTimeline usage={usage} />
        </TabsContent>
      </Tabs>
    </div>
  )
}

/**
 * Overview card component
 */
function UsageOverviewCard({ 
  title, 
  value, 
  subtitle, 
  icon, 
  trend = 'normal' 
}: {
  title: string
  value: string
  subtitle: string
  icon: React.ReactNode
  trend?: 'normal' | 'warning' | 'success'
}) {
  return (
    <Card variant="nexa" className="p-4">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <p className="text-sm text-nexa-muted">{title}</p>
          <p className={cn(
            "text-2xl font-bold",
            trend === 'warning' ? 'text-yellow-400' :
            trend === 'success' ? 'text-green-400' : 'text-white'
          )}>
            {value}
          </p>
          <p className="text-xs text-nexa-muted">{subtitle}</p>
        </div>
        <div className="flex-shrink-0">
          {icon}
        </div>
      </div>
    </Card>
  )
}

/**
 * Overview tab content
 */
function UsageOverviewTab({ usage }: { usage: any }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      <Card variant="nexa" className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Top Events</h3>
        <div className="space-y-3">
          {usage.topEvents.slice(0, 5).map((event: any, index: number) => (
            <div key={event.eventType} className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={cn(
                  "w-2 h-2 rounded-full",
                  index === 0 ? 'bg-blue-400' :
                  index === 1 ? 'bg-green-400' :
                  index === 2 ? 'bg-yellow-400' :
                  index === 3 ? 'bg-purple-400' : 'bg-gray-400'
                )} />
                <span className="text-sm text-white capitalize">
                  {event.eventType.replace(/_/g, ' ')}
                </span>
              </div>
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {event.credits.toLocaleString()}
                </div>
                <div className="text-xs text-nexa-muted">
                  {event.percentage.toFixed(1)}%
                </div>
              </div>
            </div>
          ))}
        </div>
      </Card>

      <Card variant="nexa" className="p-6">
        <h3 className="text-lg font-semibold text-white mb-4">Usage Patterns</h3>
        <div className="space-y-4">
          {usage.usagePatterns?.peakUsageDay && (
            <div className="flex items-center justify-between">
              <span className="text-sm text-nexa-muted">Peak Usage Day</span>
              <div className="text-right">
                <div className="text-sm font-medium text-white">
                  {new Date(usage.usagePatterns.peakUsageDay.date).toLocaleDateString()}
                </div>
                <div className="text-xs text-nexa-muted">
                  {usage.usagePatterns.peakUsageDay.credits.toLocaleString()} credits
                </div>
              </div>
            </div>
          )}
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-nexa-muted">Daily Average</span>
            <div className="text-sm font-medium text-white">
              {(usage.usagePatterns?.averageDailyUsage || 0).toFixed(0)} credits/day
            </div>
          </div>
          
          <div className="flex items-center justify-between">
            <span className="text-sm text-nexa-muted">Consistency Score</span>
            <div className="text-sm font-medium text-white">
              {(usage.usagePatterns?.consistencyScore || 0).toFixed(0)}%
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

/**
 * Event breakdown tab content
 */
function UsageEventBreakdown({ usage }: { usage: any }) {
  return (
    <Card variant="nexa" className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Usage by Event Type</h3>
      <div className="space-y-3">
        {Object.entries(usage.eventBreakdown).map(([eventType, data]: [string, any]) => (
          <div key={eventType} className="flex items-center justify-between py-2 border-b border-nexa-border last:border-b-0">
            <div>
              <p className="text-sm font-medium text-white capitalize">
                {eventType.replace(/_/g, ' ')}
              </p>
              <p className="text-xs text-nexa-muted">{data.count} calls</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {data.credits.toLocaleString()} credits
              </p>
              <p className="text-xs text-nexa-muted">
                {usage.usedCredits > 0 ? ((data.credits / usage.usedCredits) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * User breakdown tab content
 */
function UsageUserBreakdown({ usage }: { usage: any }) {
  return (
    <Card variant="nexa" className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Usage by User</h3>
      <div className="space-y-3">
        {Object.entries(usage.userBreakdown).map(([userName, data]: [string, any]) => (
          <div key={userName} className="flex items-center justify-between py-2 border-b border-nexa-border last:border-b-0">
            <div>
              <p className="text-sm font-medium text-white">{userName}</p>
              <p className="text-xs text-nexa-muted">{data.count} actions</p>
            </div>
            <div className="text-right">
              <p className="text-sm font-medium text-white">
                {data.credits.toLocaleString()} credits
              </p>
              <p className="text-xs text-nexa-muted">
                {usage.usedCredits > 0 ? ((data.credits / usage.usedCredits) * 100).toFixed(1) : 0}%
              </p>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}

/**
 * Timeline tab content
 */
function UsageTimeline({ usage }: { usage: any }) {
  return (
    <Card variant="nexa" className="p-6">
      <h3 className="text-lg font-semibold text-white mb-4">Daily Usage Timeline</h3>
      <div className="space-y-2">
        {usage.dailyUsage.slice(-14).map((day: any) => {
          const maxCredits = Math.max(...usage.dailyUsage.map((d: any) => d.credits))
          const percentage = maxCredits > 0 ? (day.credits / maxCredits) * 100 : 0
          
          return (
            <div key={day.date} className="flex items-center gap-4">
              <div className="w-20 text-xs text-nexa-muted">
                {new Date(day.date).toLocaleDateString('en-US', { 
                  month: 'short', 
                  day: 'numeric' 
                })}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-1">
                  <div className="w-full bg-nexa-border rounded-full h-2">
                    <div 
                      className="bg-blue-400 h-2 rounded-full" 
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                </div>
              </div>
              <div className="w-16 text-right text-sm text-white">
                {day.credits.toLocaleString()}
              </div>
            </div>
          )
        })}
      </div>
    </Card>
  )
}





