/**
 * API Response Interceptor
 * Wrapper for fetch() that automatically logs API activities
 * Extracts usage tracking data from API responses
 */

import { activityLogger } from './activity-logger'
import type { WorkflowType } from './types'

/**
 * Metadata for fetch logging
 */
export interface FetchLoggingMetadata {
  workflow: WorkflowType
  actionLabel?: string  // Custom action label, otherwise extracted from URL
  skipLogging?: boolean // Skip logging for this request
}

/**
 * API response with usage tracking info (standard format)
 */
interface APIResponseWithUsage {
  success: boolean
  usage?: {
    creditsConsumed: number
    remainingCredits: number
    usageEventId: string
    warning?: {
      percentageUsed: number
      isNearLimit: boolean
      isOverLimit: boolean
      recommendedAction?: string
    }
  }
  error?: string
  [key: string]: any
}

/**
 * Wrapper for fetch that automatically logs activities
 * 
 * @param url - URL to fetch
 * @param options - Fetch options (method, headers, body, etc.)
 * @param metadata - Logging metadata (workflow, action label)
 * @returns Promise<Response>
 * 
 * @example
 * const response = await fetchWithLogging(
 *   '/api/organizations/123/structuring/analyze-pain-points',
 *   {
 *     method: 'POST',
 *     headers: { 'Content-Type': 'application/json' },
 *     body: JSON.stringify({ content: ['...'] })
 *   },
 *   {
 *     workflow: 'structuring',
 *     actionLabel: 'Diagnosed pain points'
 *   }
 * )
 */
export async function fetchWithLogging(
  url: string,
  options?: RequestInit,
  metadata?: FetchLoggingMetadata
): Promise<Response> {
  // Perform the fetch
  const response = await fetch(url, options)
  
  // Skip logging if requested
  if (metadata?.skipLogging) {
    return response
  }
  
  // Extract workflow from URL if not provided
  const workflow = metadata?.workflow || extractWorkflowFromUrl(url)
  
  // Only log if we have a valid workflow
  if (!workflow || workflow === 'unknown') {
    console.debug('[API Interceptor] Skipping log for unknown workflow:', url)
    return response
  }
  
  // Log the activity asynchronously (don't block response)
  logAPIActivity(response.clone(), url, workflow, metadata?.actionLabel)
  
  return response
}

/**
 * Async function to log API activity
 * Runs in background, doesn't block the response
 */
async function logAPIActivity(
  response: Response,
  url: string,
  workflow: WorkflowType,
  actionLabel?: string
): Promise<void> {
  try {
    // Only log if response is JSON
    const contentType = response.headers.get('content-type')
    if (!contentType || !contentType.includes('application/json')) {
      console.debug('[API Interceptor] Skipping non-JSON response')
      return
    }
    
    // Parse response body
    const result: APIResponseWithUsage = await response.json()
    
    // Check if this is a tracked API call (has usage info)
    if (!result.usage) {
      console.debug('[API Interceptor] No usage info in response, skipping log')
      return
    }
    
    // Determine action label
    const action = actionLabel || extractActionFromUrl(url)
    
    // Determine status
    const status = result.success ? 'success' : 'error'
    
    // Log the activity
    activityLogger.log({
      workflow,
      action,
      status,
      credits: result.usage.creditsConsumed,
      usageEventId: result.usage.usageEventId,
      metadata: {
        endpoint: url,
        remainingCredits: result.usage.remainingCredits,
        warning: result.usage.warning,
        error: result.error
      }
    })
    
    console.log(`📝 [API Interceptor] Logged: ${workflow}/${action} - ${status} (${result.usage.creditsConsumed} credits)`)
    
  } catch (error) {
    // If logging fails, don't throw - just log the error
    console.debug('[API Interceptor] Failed to log activity:', error)
  }
}

/**
 * Extract workflow type from URL
 * 
 * @param url - API URL
 * @returns WorkflowType or 'unknown'
 * 
 * @example
 * extractWorkflowFromUrl('/api/organizations/123/structuring/analyze-pain-points')
 * // Returns: 'structuring'
 */
export function extractWorkflowFromUrl(url: string): WorkflowType | 'unknown' {
  const urlLower = url.toLowerCase()
  
  if (urlLower.includes('/structuring/')) return 'structuring'
  if (urlLower.includes('/visuals/')) return 'visuals'
  if (urlLower.includes('/solutioning/')) return 'solutioning'
  if (urlLower.includes('/sow/')) return 'sow'
  if (urlLower.includes('/loe/')) return 'loe'
  
  // Check session endpoints (e.g., add-visuals, add-solutioning)
  if (urlLower.includes('/sessions/')) {
    if (urlLower.includes('visuals')) return 'visuals'
    if (urlLower.includes('solutioning')) return 'solutioning'
  }
  
  return 'unknown'
}

/**
 * Extract human-readable action from URL
 * Converts last URL segment from kebab-case to Title Case
 * 
 * @param url - API URL
 * @returns Human-readable action string
 * 
 * @example
 * extractActionFromUrl('/api/organizations/123/structuring/analyze-pain-points')
 * // Returns: 'Analyze Pain Points'
 */
export function extractActionFromUrl(url: string): string {
  try {
    // Remove query parameters
    const urlWithoutQuery = url.split('?')[0]
    
    // Extract last segment of URL path
    const segments = urlWithoutQuery.split('/').filter(Boolean)
    const lastSegment = segments[segments.length - 1]
    
    // Skip if it's a UUID (session ID)
    if (lastSegment && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(lastSegment)) {
      // Use second-to-last segment
      const actionSegment = segments[segments.length - 2] || lastSegment
      return formatSegmentToTitle(actionSegment)
    }
    
    // Convert kebab-case to Title Case
    return formatSegmentToTitle(lastSegment || 'Unknown Action')
    
  } catch (error) {
    console.debug('[API Interceptor] Failed to extract action from URL:', error)
    return 'API Request'
  }
}

/**
 * Format a URL segment to Title Case
 * 
 * @param segment - URL segment in kebab-case
 * @returns Title Case string
 * 
 * @example
 * formatSegmentToTitle('analyze-pain-points')
 * // Returns: 'Analyze Pain Points'
 */
function formatSegmentToTitle(segment: string): string {
  return segment
    .split('-')
    .map(word => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ')
}

/**
 * Map of common event types to human-readable action labels
 * Used as fallback when action label is not provided
 */
export const ACTION_LABEL_MAP: Record<string, string> = {
  // Structuring
  'analyze-pain-points': 'Diagnosed pain points',
  'generate-solution': 'Generated solution',
  'add-visuals': 'Pushed to Visuals',
  
  // Visuals
  'generate-planning': 'Generated planning diagram',
  'generate-sketch': 'Generated sketch diagram',
  'add-solutioning': 'Pushed to Solutioning',
  
  // Solutioning
  'analyze-image': 'AI analyzed solution',
  'enhance-text': 'Enhanced solution text',
  'structure-solution': 'Structured solution',
  'analyze-pernode': 'Analyzed per-node stack',
  'auto-format': 'Auto-formatted solution',
  'generate-sow': 'Generated SOW',
  
  // SOW
  'generate-loe': 'Generated LOE',
  
  // LOE (if applicable)
  'download-pdf': 'Downloaded PDF',
  'preview-pdf': 'Previewed PDF'
}

/**
 * Get human-readable action label from URL
 * Uses ACTION_LABEL_MAP if available, otherwise extracts from URL
 * 
 * @param url - API URL
 * @returns Human-readable action label
 */
export function getActionLabel(url: string): string {
  const urlWithoutQuery = url.split('?')[0]
  const segments = urlWithoutQuery.split('/').filter(Boolean)
  const lastSegment = segments[segments.length - 1]
  
  // Check if we have a predefined label
  if (lastSegment && ACTION_LABEL_MAP[lastSegment]) {
    return ACTION_LABEL_MAP[lastSegment]
  }
  
  // Otherwise extract from URL
  return extractActionFromUrl(url)
}

