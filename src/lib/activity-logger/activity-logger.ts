/**
 * Activity Logger Service
 * Central service for logging user activities across workflows
 * Logs are displayed in AI sidebar and added to AI context
 */

import type { ActivityLog, ActivityLogInput, WorkflowType } from './types'

/**
 * Generate a random ID for activity logs
 */
function generateId(): string {
  return `log-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
}

/**
 * Central activity logging service
 */
export class ActivityLogger {
  private logs: ActivityLog[] = []
  private maxLogs = 50  // Keep last 50 logs in memory
  
  /**
   * Log a new activity
   * Adds to buffer and dispatches to AI sidebar via custom event
   */
  log(activity: ActivityLogInput): void {
    const log: ActivityLog = {
      id: generateId(),
      timestamp: new Date(),
      ...activity
    }
    
    // Add to buffer
    this.logs.push(log)
    
    // Trim buffer if exceeds max size
    if (this.logs.length > this.maxLogs) {
      this.logs.shift()
    }
    
    // Dispatch to AI sidebar
    this.dispatchToSidebar(log)
    
    // Debug log
    console.log(`📝 [Activity Logger] ${log.workflow}: ${log.action} ${log.status === 'success' ? '✓' : '✗'}`)
  }
  
  /**
   * Dispatch log to AI sidebar via custom event
   * AI sidebar listens to 'activityLog' events
   */
  private dispatchToSidebar(log: ActivityLog): void {
    if (typeof window === 'undefined') return
    
    try {
      window.dispatchEvent(new CustomEvent('activityLog', {
        detail: log
      }))
    } catch (error) {
      console.error('[Activity Logger] Failed to dispatch event:', error)
    }
  }
  
  /**
   * Get recent logs for AI context (last N logs)
   * Returns formatted string suitable for AI prompt
   */
  getRecentLogs(count: number = 10): string {
    const recentLogs = this.logs.slice(-count)
    
    if (recentLogs.length === 0) {
      return 'No recent activity'
    }
    
    return recentLogs
      .map(log => this.formatForAI(log))
      .join('\n')
  }
  
  /**
   * Format log for AI context (concise, one-line)
   * Example: "[14:32] structuring: Diagnosed pain points ✅ (3 credits)"
   */
  private formatForAI(log: ActivityLog): string {
    const time = log.timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      hour12: false
    })
    const statusIcon = log.status === 'success' ? '✅' : '❌'
    const credits = log.credits ? ` (${log.credits} credits)` : ''
    
    return `[${time}] ${log.workflow}: ${log.action} ${statusIcon}${credits}`
  }
  
  /**
   * Format log for chat display (detailed, monospace)
   * Example: "[14:32:15] ✓ STRUCTURING: Diagnosed pain points • 3 credits"
   */
  formatForChat(log: ActivityLog): string {
    const time = log.timestamp.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit',
      hour12: false
    })
    const statusIcon = log.status === 'success' ? '✓' : '✗'
    const credits = log.credits ? ` • ${log.credits} credits` : ''
    
    return `[${time}] ${statusIcon} ${log.workflow.toUpperCase()}: ${log.action}${credits}`
  }
  
  /**
   * Get all logs (for export/debugging)
   */
  getAllLogs(): ActivityLog[] {
    return [...this.logs]
  }
  
  /**
   * Get logs for a specific workflow
   */
  getLogsByWorkflow(workflow: WorkflowType): ActivityLog[] {
    return this.logs.filter(log => log.workflow === workflow)
  }
  
  /**
   * Get logs within a time range
   */
  getLogsByTimeRange(startTime: Date, endTime: Date): ActivityLog[] {
    return this.logs.filter(
      log => log.timestamp >= startTime && log.timestamp <= endTime
    )
  }
  
  /**
   * Get only successful logs
   */
  getSuccessfulLogs(): ActivityLog[] {
    return this.logs.filter(log => log.status === 'success')
  }
  
  /**
   * Get only error logs
   */
  getErrorLogs(): ActivityLog[] {
    return this.logs.filter(log => log.status === 'error')
  }
  
  /**
   * Get total credits consumed in logged activities
   */
  getTotalCredits(): number {
    return this.logs.reduce((total, log) => total + (log.credits || 0), 0)
  }
  
  /**
   * Get statistics about logged activities
   */
  getStats(): {
    total: number
    successful: number
    errors: number
    totalCredits: number
    byWorkflow: Record<WorkflowType, number>
  } {
    const byWorkflow: Record<string, number> = {
      structuring: 0,
      visuals: 0,
      solutioning: 0,
      sow: 0,
      loe: 0
    }
    
    let successful = 0
    let errors = 0
    let totalCredits = 0
    
    for (const log of this.logs) {
      byWorkflow[log.workflow]++
      if (log.status === 'success') successful++
      if (log.status === 'error') errors++
      totalCredits += log.credits || 0
    }
    
    return {
      total: this.logs.length,
      successful,
      errors,
      totalCredits,
      byWorkflow: byWorkflow as Record<WorkflowType, number>
    }
  }
  
  /**
   * Clear all logs
   */
  clear(): void {
    this.logs = []
    console.log('📝 [Activity Logger] Cleared all logs')
  }
  
  /**
   * Export logs as JSON string
   */
  exportLogsJSON(): string {
    return JSON.stringify(this.logs, null, 2)
  }
  
  /**
   * Import logs from JSON string
   * Useful for debugging or restoring state
   */
  importLogsJSON(jsonString: string): void {
    try {
      const imported = JSON.parse(jsonString)
      if (Array.isArray(imported)) {
        // Convert timestamp strings back to Date objects
        this.logs = imported.map(log => ({
          ...log,
          timestamp: new Date(log.timestamp)
        }))
        console.log(`📝 [Activity Logger] Imported ${this.logs.length} logs`)
      }
    } catch (error) {
      console.error('[Activity Logger] Failed to import logs:', error)
    }
  }
}

// Singleton instance
export const activityLogger = new ActivityLogger()

// Export for testing
export { generateId }

