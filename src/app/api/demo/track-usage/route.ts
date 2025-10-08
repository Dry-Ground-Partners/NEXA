import { NextRequest, NextResponse } from 'next/server'
import { withUsageTracking } from '@/lib/middleware/usage-middleware'
import { getUserRoleFromRequest } from '@/lib/api-rbac'

/**
 * Demo API endpoint to test usage tracking
 * This simulates what happens in real AI API routes
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { organizationId, eventType, eventData } = body

    // Validate required parameters
    if (!organizationId) {
      return NextResponse.json(
        { error: 'Organization ID is required' },
        { status: 400 }
      )
    }

    if (!eventType) {
      return NextResponse.json(
        { error: 'Event type is required' },
        { status: 400 }
      )
    }

    // Verify authentication and organization access
    const { user } = await getUserRoleFromRequest(request, organizationId)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Track usage before processing
    const trackingResult = await withUsageTracking(request, organizationId, {
      eventType,
      eventData: {
        ...eventData,
        demo: true,
        timestamp: new Date().toISOString()
      }
    })

    // Simulate some AI processing work
    await new Promise(resolve => setTimeout(resolve, 100))

    return NextResponse.json({
      success: true,
      message: `Successfully tracked ${eventType}`,
      result: {
        demoData: 'This would be your AI result',
        processedAt: new Date().toISOString()
      },
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits,
        usageEventId: trackingResult.usageEventId,
        warning: trackingResult.limitWarning
      }
    })

  } catch (error: unknown) {
    console.error('Demo API error:', error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    )
  }
}








