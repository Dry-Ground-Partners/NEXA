import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'
import { enhanceTextWithLangSmith } from '@/lib/langchain/solutioning'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    console.log(`📡 API: Text enhancement request for org ${orgId}`)
    
    // RBAC: Check organization access
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Organization access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json()
    const { text, sessionId } = body

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Text content is required and cannot be empty' 
        },
        { status: 400 }
      )
    }

    console.log('📝 API: Processing text enhancement:', {
      textLength: text.length,
      organizationId: orgId
    })

    // Calculate complexity based on text length
    const complexity = calculateComplexityFromInput(text)
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'solutioning_ai_enhance',
      sessionId: sessionId ? parseInt(sessionId) : undefined,
      eventData: {
        textLength: text.length,
        complexity: complexity,
        endpoint: '/api/organizations/[orgId]/solutioning/enhance-text'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    // Call the text enhancement function with organization preferences
    const result = await enhanceTextWithLangSmith({ text }, orgId)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Text enhancement failed',
          usage: {
            creditsConsumed: trackingResult.creditsConsumed,
            remainingCredits: trackingResult.remainingCredits,
            usageEventId: trackingResult.usageEventId,
            warning: trackingResult.limitWarning
          }
        },
        { status: 500 }
      )
    }

    console.log('✅ API: Text enhancement completed successfully')
    
    return NextResponse.json({
      success: true,
      enhancedText: result.enhancedText,
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits,
        usageEventId: trackingResult.usageEventId,
        warning: trackingResult.limitWarning
      }
    })

  } catch (error) {
    console.error('❌ API: Error in text enhancement:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? getErrorMessage(error) : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
