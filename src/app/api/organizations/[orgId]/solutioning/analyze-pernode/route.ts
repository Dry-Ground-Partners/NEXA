import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'
import { analyzePerNodeStackWithLangSmith } from '@/lib/langchain/solutioning'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    console.log(`📡 API: Per-node stack analysis request for org ${orgId}`)
    
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
    const { context, sessionId } = body

    // Validate input
    if (!context || context.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Context is required for per-node stack analysis' 
        },
        { status: 400 }
      )
    }

    console.log('📝 API: Processing per-node stack analysis:', {
      contextLength: context.length,
      organizationId: orgId
    })

    // Calculate complexity based on context
    const complexity = calculateComplexityFromInput(context)
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'solutioning_node_stack',
      sessionId: sessionId ? parseInt(sessionId) : undefined,
      eventData: {
        contextLength: context.length,
        complexity: complexity,
        endpoint: '/api/organizations/[orgId]/solutioning/analyze-pernode'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    // Call the per-node stack analysis function with organization preferences
    const result = await analyzePerNodeStackWithLangSmith({ 
      context: context.trim()
    }, orgId)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Per-node stack analysis failed',
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

    console.log('✅ API: Per-node stack analysis completed successfully')
    
    return NextResponse.json({
      success: true,
      analysis: result.analysis,
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits,
        usageEventId: trackingResult.usageEventId,
        warning: trackingResult.limitWarning
      }
    })

  } catch (error) {
    console.error('❌ API: Error in per-node stack analysis:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? getErrorMessage(error) : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
