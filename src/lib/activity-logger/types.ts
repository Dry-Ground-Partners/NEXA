/**
 * Activity Logger Types
 * Defines types for tracking user activities across workflows
 */

/**
 * Supported workflow types
 */
export type WorkflowType = 'structuring' | 'visuals' | 'solutioning' | 'sow' | 'loe'

/**
 * Activity status
 */
export type ActivityStatus = 'success' | 'error'

/**
 * Activity log entry
 */
export interface ActivityLog {
  id: string
  timestamp: Date
  workflow: WorkflowType
  action: string           // Human-readable action description
  status: ActivityStatus
  credits?: number         // Credits consumed (if applicable)
  usageEventId?: string   // Reference to UsageEvent in database
  metadata?: Record<string, any>  // Additional context
}

/**
 * Activity log for creation (without auto-generated fields)
 */
export type ActivityLogInput = Omit<ActivityLog, 'id' | 'timestamp'>

/**
 * Formatted activity log for different contexts
 */
export interface FormattedActivityLog {
  /** Format for AI model context (concise) */
  forAI: string
  /** Format for chat display (detailed) */
  forChat: string
  /** Raw log object */
  raw: ActivityLog
}

