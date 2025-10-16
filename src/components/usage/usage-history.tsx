'use client'

import { useState } from 'react'
import { useUsageHistory } from '@/contexts/usage-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { 
  RefreshCw, 
  Search, 
  Filter, 
  X,
  ChevronLeft,
  ChevronRight,
  Calendar,
  User,
  Zap,
  ExternalLink,
  AlertTriangle
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface UsageHistoryProps {
  className?: string
}

export function UsageHistory({ className }: UsageHistoryProps) {
  const { 
    history, 
    loading, 
    error, 
    filters, 
    setFilter, 
    clearFilters, 
    refresh, 
    loadPage 
  } = useUsageHistory()

  const [showFilters, setShowFilters] = useState(false)

  if (error) {
    return (
      <div className={cn("space-y-6", className)}>
        <Card variant="nexa" className="p-8">
          <div className="flex flex-col items-center gap-4">
            <AlertTriangle className="h-8 w-8 text-red-400" />
            <div className="text-center">
              <h3 className="text-lg font-semibold text-white mb-2">Failed to Load Usage History</h3>
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

  return (
    <div className={cn("space-y-6", className)}>
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white">Usage History</h2>
          <p className="text-nexa-muted">
            Detailed log of all AI feature usage and credit consumption
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button 
            variant="outline" 
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
          </Button>
          <Button variant="outline" onClick={refresh} disabled={loading}>
            <RefreshCw className={cn("h-4 w-4 mr-2", loading && "animate-spin")} />
            Refresh
          </Button>
        </div>
      </div>

      {/* Filters */}
      {showFilters && (
        <Card variant="nexa" className="p-4">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Event Type
              </label>
              <Select 
                value={filters.eventType || ''} 
                onValueChange={(value) => setFilter('eventType', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All events" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All events</SelectItem>
                  <SelectItem value="structuring_diagnose">Structuring Diagnose</SelectItem>
                  <SelectItem value="structuring_generate_solution">Structuring Solution</SelectItem>
                  <SelectItem value="visuals_planning">Visuals Planning</SelectItem>
                  <SelectItem value="visuals_sketch">Visuals Sketch</SelectItem>
                  <SelectItem value="solutioning_structure_solution">Solutioning Structure</SelectItem>
                  <SelectItem value="solutioning_ai_enhance">Solutioning Enhance</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Category
              </label>
              <Select 
                value={filters.category || ''} 
                onValueChange={(value) => setFilter('category', value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All categories" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">All categories</SelectItem>
                  <SelectItem value="ai_analysis">AI Analysis</SelectItem>
                  <SelectItem value="ai_visual">AI Visual</SelectItem>
                  <SelectItem value="ai_enhancement">AI Enhancement</SelectItem>
                  <SelectItem value="data_transfer">Data Transfer</SelectItem>
                  <SelectItem value="formatting">Formatting</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                Start Date
              </label>
              <Input
                type="date"
                value={filters.startDate || ''}
                onChange={(e) => setFilter('startDate', e.target.value)}
                className="bg-nexa-surface border-nexa-border"
              />
            </div>

            <div>
              <label className="text-sm font-medium text-white mb-2 block">
                End Date
              </label>
              <Input
                type="date"
                value={filters.endDate || ''}
                onChange={(e) => setFilter('endDate', e.target.value)}
                className="bg-nexa-surface border-nexa-border"
              />
            </div>
          </div>
          
          <div className="flex items-center justify-between mt-4">
            <div className="flex items-center gap-4">
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Min Credits
                </label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minCredits || ''}
                  onChange={(e) => setFilter('minCredits', e.target.value)}
                  className="bg-nexa-surface border-nexa-border w-24"
                />
              </div>
              <div>
                <label className="text-sm font-medium text-white mb-2 block">
                  Max Credits
                </label>
                <Input
                  type="number"
                  placeholder="∞"
                  value={filters.maxCredits || ''}
                  onChange={(e) => setFilter('maxCredits', e.target.value)}
                  className="bg-nexa-surface border-nexa-border w-24"
                />
              </div>
            </div>
            
            <Button variant="outline" onClick={clearFilters}>
              <X className="h-4 w-4 mr-2" />
              Clear Filters
            </Button>
          </div>
        </Card>
      )}

      {/* Summary */}
      {history?.summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card variant="nexa" className="p-4">
            <div className="flex items-center gap-3">
              <Zap className="h-6 w-6 text-blue-400" />
              <div>
                <p className="text-sm text-nexa-muted">Total Credits</p>
                <p className="text-lg font-bold text-white">
                  {history.summary.totalCredits.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          
          <Card variant="nexa" className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-green-400" />
              <div>
                <p className="text-sm text-nexa-muted">Total Events</p>
                <p className="text-lg font-bold text-white">
                  {history.summary.totalEvents.toLocaleString()}
                </p>
              </div>
            </div>
          </Card>
          
          <Card variant="nexa" className="p-4">
            <div className="flex items-center gap-3">
              <User className="h-6 w-6 text-purple-400" />
              <div>
                <p className="text-sm text-nexa-muted">Unique Users</p>
                <p className="text-lg font-bold text-white">
                  {history.summary.uniqueUsers}
                </p>
              </div>
            </div>
          </Card>
          
          <Card variant="nexa" className="p-4">
            <div className="flex items-center gap-3">
              <Calendar className="h-6 w-6 text-yellow-400" />
              <div>
                <p className="text-sm text-nexa-muted">Date Range</p>
                <p className="text-sm font-medium text-white">
                  {history.summary.dateRange.start 
                    ? `${new Date(history.summary.dateRange.start).toLocaleDateString()} - ${new Date(history.summary.dateRange.end!).toLocaleDateString()}`
                    : 'No data'
                  }
                </p>
              </div>
            </div>
          </Card>
        </div>
      )}

      {/* History Table */}
      <Card variant="nexa" className="overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-nexa-muted" />
            <span className="ml-2 text-nexa-muted">Loading history...</span>
          </div>
        ) : !history?.events || history.events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12">
            <Calendar className="h-8 w-8 text-nexa-muted mb-3" />
            <h3 className="text-lg font-semibold text-white mb-2">No Usage History</h3>
            <p className="text-nexa-muted">
              {Object.keys(filters).length > 0 
                ? 'No events match your current filters.'
                : 'Start using AI features to see your usage history here.'
              }
            </p>
          </div>
        ) : (
          <>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-nexa-surface border-b border-nexa-border">
                  <tr>
                    <th className="text-left p-4 text-sm font-medium text-nexa-muted">
                      Event
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-nexa-muted">
                      User
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-nexa-muted">
                      Session
                    </th>
                    <th className="text-right p-4 text-sm font-medium text-nexa-muted">
                      Credits
                    </th>
                    <th className="text-left p-4 text-sm font-medium text-nexa-muted">
                      Time
                    </th>
                    <th className="text-center p-4 text-sm font-medium text-nexa-muted">
                      Details
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {history.events.map((event) => (
                    <UsageHistoryRow key={event.id} event={event} />
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {history.pagination && (
              <div className="flex items-center justify-between p-4 border-t border-nexa-border">
                <div className="text-sm text-nexa-muted">
                  Showing {((history.pagination.page - 1) * history.pagination.limit) + 1} to{' '}
                  {Math.min(history.pagination.page * history.pagination.limit, history.pagination.total)} of{' '}
                  {history.pagination.total} events
                </div>
                
                <div className="flex items-center gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!history.pagination.hasPrev}
                    onClick={() => loadPage(history.pagination.page - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  
                  <span className="text-sm text-white px-3">
                    Page {history.pagination.page} of {history.pagination.totalPages}
                  </span>
                  
                  <Button 
                    variant="outline" 
                    size="sm"
                    disabled={!history.pagination.hasNext}
                    onClick={() => loadPage(history.pagination.page + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </>
        )}
      </Card>
    </div>
  )
}

/**
 * Individual history row component
 */
function UsageHistoryRow({ event }: { event: any }) {
  const [showDetails, setShowDetails] = useState(false)

  const getCategoryColor = (category: string) => {
    switch (category) {
      case 'ai_analysis': return 'text-blue-400'
      case 'ai_visual': return 'text-green-400'
      case 'ai_enhancement': return 'text-purple-400'
      case 'data_transfer': return 'text-yellow-400'
      case 'formatting': return 'text-orange-400'
      default: return 'text-gray-400'
    }
  }

  return (
    <>
      <tr className="border-b border-nexa-border hover:bg-nexa-surface/50 transition-colors">
        <td className="p-4">
          <div className="space-y-1">
            <p className="text-sm font-medium text-white">
              {event.eventName}
            </p>
            <p className={cn("text-xs capitalize", getCategoryColor(event.category))}>
              {event.category.replace('_', ' ')}
            </p>
          </div>
        </td>
        
        <td className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-white">{event.user.name}</p>
            <p className="text-xs text-nexa-muted">{event.user.email}</p>
          </div>
        </td>
        
        <td className="p-4">
          {event.session ? (
            <div className="space-y-1">
              <p className="text-sm text-white">{event.session.title}</p>
              <p className="text-xs text-nexa-muted font-mono">
                {event.session.uuid.slice(0, 8)}...
              </p>
            </div>
          ) : (
            <span className="text-xs text-nexa-muted">No session</span>
          )}
        </td>
        
        <td className="p-4 text-right">
          <span className="text-sm font-medium text-white">
            {event.creditsConsumed.toLocaleString()}
          </span>
        </td>
        
        <td className="p-4">
          <div className="space-y-1">
            <p className="text-sm text-white">
              {new Date(event.createdAt).toLocaleDateString()}
            </p>
            <p className="text-xs text-nexa-muted">
              {new Date(event.createdAt).toLocaleTimeString()}
            </p>
          </div>
        </td>
        
        <td className="p-4 text-center">
          <Button 
            variant="ghost" 
            size="sm"
            onClick={() => setShowDetails(!showDetails)}
          >
            <ExternalLink className="h-4 w-4" />
          </Button>
        </td>
      </tr>
      
      {/* Expandable details row */}
      {showDetails && (
        <tr>
          <td colSpan={6} className="p-4 bg-nexa-surface/30">
            <div className="space-y-3">
              <h4 className="text-sm font-medium text-white">Event Details</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                <div>
                  <span className="text-nexa-muted">Complexity:</span>
                  <span className="text-white ml-2">{event.complexity.toFixed(1)}x</span>
                </div>
                <div>
                  <span className="text-nexa-muted">Endpoint:</span>
                  <span className="text-white ml-2 font-mono text-xs">{event.endpoint}</span>
                </div>
                <div>
                  <span className="text-nexa-muted">Event ID:</span>
                  <span className="text-white ml-2 font-mono text-xs">{event.id}</span>
                </div>
              </div>
              
              {event.eventData && Object.keys(event.eventData).length > 0 && (
                <div>
                  <p className="text-nexa-muted text-sm mb-2">Additional Data:</p>
                  <pre className="text-xs text-nexa-muted bg-nexa-background p-2 rounded overflow-x-auto">
                    {JSON.stringify(event.eventData, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </td>
        </tr>
      )}
    </>
  )
}



















