import { NextRequest, NextResponse } from 'next/server'
import { structureSolutionWithLangSmith } from '@/lib/langchain/solutioning'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    console.log(`📡 API: Structure solution request for org ${orgId}`)
    
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
    const { aiAnalysis, solutionExplanation, sessionId } = body

    console.log('📝 API: Processing solution structuring:', {
      aiAnalysisLength: aiAnalysis?.length || 0,
      solutionExplanationLength: solutionExplanation?.length || 0,
      organizationId: orgId
    })

    // Validate input - at least one should be provided
    if ((!aiAnalysis || aiAnalysis.trim().length === 0) && 
        (!solutionExplanation || solutionExplanation.trim().length === 0)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'At least one of AI Analysis or Solution Explanation is required' 
        },
        { status: 400 }
      )
    }
    
    // Calculate complexity based on input content
    const totalContent = (aiAnalysis || '') + ' ' + (solutionExplanation || '')
    const complexity = calculateComplexityFromInput(totalContent)
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'solutioning_structure_solution',
      sessionId: sessionId ? parseInt(sessionId) : undefined,
      eventData: {
        aiAnalysisLength: aiAnalysis?.length || 0,
        solutionExplanationLength: solutionExplanation?.length || 0,
        totalLength: totalContent.length,
        complexity: complexity,
        endpoint: '/api/organizations/[orgId]/solutioning/structure-solution'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    // Call the solution structuring function with organization preferences
    const result = await structureSolutionWithLangSmith({ 
      aiAnalysis: aiAnalysis || '',
      solutionExplanation: solutionExplanation || ''
    }, orgId)

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Solution structuring failed',
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
    
    console.log('✅ API: Solution structuring successful')
    
    return NextResponse.json({
      success: true,
      structure: result.structure,
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits,
        usageEventId: trackingResult.usageEventId,
        warning: trackingResult.limitWarning
      }
    })

  } catch (error) {
    console.error('❌ API: Error in solution structuring:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

