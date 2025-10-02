import { NextRequest } from 'next/server'
import { usageTracker } from '@/lib/usage/usage-tracker'
import { getUserRoleFromRequest } from '@/lib/api-rbac'

export interface TrackingOptions {
  eventType: string
  eventData?: Record<string, any>
  creditsOverride?: number
  skipLimitCheck?: boolean
  sessionId?: number
}

export interface TrackingResult {
  creditsConsumed: number
  remainingCredits: number
  limitWarning?: {
    percentageUsed: number
    isNearLimit: boolean
    isOverLimit: boolean
    recommendedAction?: string
  }
  usageEventId: string
}

/**
 * Main usage tracking middleware function
 * This is the primary way to track usage in API routes
 */
export async function withUsageTracking(
  request: NextRequest,
  organizationId: string,
  options: TrackingOptions
): Promise<TrackingResult> {
  // Get user information from request
  const { userId, user } = await getUserRoleFromRequest(request, organizationId)
  
  if (!user || !userId) {
    throw new Error('Authentication required for usage tracking')
  }

  // Validate organization ID
  if (!organizationId || organizationId.trim() === '') {
    throw new Error('Valid organization ID required for usage tracking')
  }

  // Validate event type
  if (!options.eventType || options.eventType.trim() === '') {
    throw new Error('Event type is required for usage tracking')
  }

  console.log(`🔄 Tracking usage: ${options.eventType} for user ${userId} in org ${organizationId}`)

  // Track the usage
  const result = await usageTracker.trackUsage({
    organizationId,
    userId,
    eventType: options.eventType,
    sessionId: options.sessionId,
    eventData: {
      ...options.eventData,
      userAgent: request.headers.get('user-agent'),
      ipAddress: getClientIP(request),
      timestamp: new Date().toISOString()
    },
    creditsOverride: options.creditsOverride,
    skipLimitCheck: options.skipLimitCheck
  })

  if (!result.success) {
    throw new Error(result.error || 'Usage tracking failed')
  }

  return {
    creditsConsumed: result.creditsConsumed,
    remainingCredits: result.remainingCredits,
    limitWarning: result.limitWarning,
    usageEventId: result.usageEventId!
  }
}

/**
 * Simplified tracking function for common use cases
 */
export async function trackSimpleUsage(
  request: NextRequest,
  organizationId: string,
  eventType: string,
  eventData?: Record<string, any>
): Promise<TrackingResult> {
  return withUsageTracking(request, organizationId, {
    eventType,
    eventData
  })
}

/**
 * Async tracking function that doesn't block the response
 * Use this for non-critical tracking where user shouldn't wait
 */
export function trackUsageAsync(
  request: NextRequest,
  organizationId: string,
  options: TrackingOptions
): void {
  // Fire and forget - don't await this
  withUsageTracking(request, organizationId, options)
    .then((result) => {
      console.log(`✅ Async usage tracked: ${options.eventType} - ${result.creditsConsumed} credits`)
    })
    .catch((error) => {
      console.error(`❌ Async usage tracking failed: ${error.message}`)
    })
}

/**
 * Middleware wrapper for API routes that automatically handles errors
 */
export function createUsageTrackingHandler<T extends any[]>(
  handler: (...args: T) => Promise<Response>,
  getTrackingOptions: (...args: T) => TrackingOptions & { organizationId: string }
) {
  return async (...args: T): Promise<Response> => {
    try {
      const [request] = args
      const { organizationId, ...trackingOptions } = getTrackingOptions(...args)

      // Track usage before executing handler
      const trackingResult = await withUsageTracking(
        request as NextRequest,
        organizationId,
        trackingOptions
      )

      // Execute the original handler
      const response = await handler(...args)

      // Add usage info to response headers (optional)
      const newResponse = new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: {
          ...response.headers,
          'X-Credits-Consumed': trackingResult.creditsConsumed.toString(),
          'X-Credits-Remaining': trackingResult.remainingCredits.toString()
        }
      })

      return newResponse

    } catch (error) {
      console.error('Usage tracking handler error:', error)
      
      // If tracking fails, we should still execute the handler but log the error
      // Comment out the following lines if you want tracking to be mandatory
      if (error.message.includes('tracking')) {
        console.warn('⚠️ Proceeding without usage tracking due to error')
        return handler(...args)
      }
      
      throw error
    }
  }
}

/**
 * Decorator for API route methods (TypeScript decorator syntax)
 * Note: This requires experimental decorators to be enabled
 */
export function trackUsage(eventType: string, options?: Partial<TrackingOptions>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const [request, { params }] = args
      const organizationId = params?.orgId

      if (!organizationId) {
        throw new Error('Organization ID required for usage tracking')
      }

      // Track usage before executing the method
      const trackingResult = await withUsageTracking(request, organizationId, {
        eventType,
        ...options
      })

      // Store tracking result in request for access in handler
      ;(request as any)._usageTracking = trackingResult

      // Execute original method
      return method.apply(this, args)
    }

    return descriptor
  }
}

/**
 * Get usage tracking result from request (when using decorator)
 */
export function getUsageTrackingResult(request: NextRequest): TrackingResult | null {
  return (request as any)._usageTracking || null
}

/**
 * Pre-check if usage would exceed limits without actually tracking
 */
export async function checkUsageLimits(
  request: NextRequest,
  organizationId: string,
  eventType: string,
  creditsNeeded?: number
): Promise<{
  allowed: boolean
  reason?: string
  remainingCredits: number
  percentageUsed: number
}> {
  const { userId, user } = await getUserRoleFromRequest(request, organizationId)
  
  if (!user || !userId) {
    throw new Error('Authentication required for usage limit check')
  }

  // This is a simplified version - in production you might want to
  // implement this directly in UsageTracker to avoid duplication
  try {
    const result = await usageTracker.trackUsage({
      organizationId,
      userId,
      eventType,
      creditsOverride: creditsNeeded,
      skipLimitCheck: false,
      eventData: { dryRun: true }
    })

    if (!result.success) {
      return {
        allowed: false,
        reason: result.error,
        remainingCredits: result.remainingCredits,
        percentageUsed: 0
      }
    }

    return {
      allowed: true,
      remainingCredits: result.remainingCredits,
      percentageUsed: result.limitWarning?.percentageUsed || 0
    }

  } catch (error) {
    return {
      allowed: false,
      reason: error.message,
      remainingCredits: 0,
      percentageUsed: 0
    }
  }
}

/**
 * Utility function to extract client IP from request
 */
function getClientIP(request: NextRequest): string {
  // Check various headers for the real IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIP = request.headers.get('x-real-ip')
  const cfConnectingIP = request.headers.get('cf-connecting-ip')
  
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  if (realIP) {
    return realIP
  }
  
  if (cfConnectingIP) {
    return cfConnectingIP
  }
  
  // Fallback to connection remote address
  return request.ip || 'unknown'
}

/**
 * Utility function to extract complexity from request data
 */
export function calculateComplexityFromInput(input: any): number {
  if (typeof input === 'string') {
    // Base complexity on text length
    const length = input.length
    if (length < 100) return 1.0
    if (length < 500) return 1.2
    if (length < 1000) return 1.5
    if (length < 2000) return 2.0
    return 2.5
  }
  
  if (Array.isArray(input)) {
    // Base complexity on array size
    const size = input.length
    if (size < 5) return 1.0
    if (size < 20) return 1.3
    if (size < 50) return 1.7
    return 2.2
  }
  
  if (typeof input === 'object' && input !== null) {
    // Base complexity on object size
    const keys = Object.keys(input).length
    if (keys < 5) return 1.0
    if (keys < 15) return 1.4
    if (keys < 30) return 1.8
    return 2.3
  }
  
  return 1.0 // Default complexity
}

/**
 * Utility function to extract feature flags from request
 */
export function extractFeatureFlags(request: NextRequest): Record<string, boolean> {
  const body = (request as any)._body // Assuming body is already parsed
  if (!body) return {}

  const flags: Record<string, boolean> = {}
  
  // Common feature flags to look for
  const flagNames = ['echo', 'traceback', 'enhanced', 'priority', 'detailed']
  
  for (const flag of flagNames) {
    if (body[flag] !== undefined) {
      flags[flag] = Boolean(body[flag])
    }
  }
  
  return flags
}





