import { NextRequest, NextResponse } from 'next/server'
import { generatePlanningFromIdeation } from '@/lib/langchain/visuals'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    console.log(`📡 API: Generate planning request for org ${orgId}`)
    
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
    const { solution, sessionId } = body

    console.log('📝 API: Processing ideation content:', {
      solutionLength: solution?.length || 0,
      organizationId: orgId
    })

    // Validate request
    if (!solution || typeof solution !== 'string') {
      console.log('❌ API: Invalid solution content')
      return NextResponse.json(
        { success: false, error: 'Solution content is required' },
        { status: 400 }
      )
    }

    // Calculate complexity based on solution content
    const complexity = calculateComplexityFromInput(solution)
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'visuals_planning',
      sessionId: sessionId ? parseInt(sessionId) : undefined,
      eventData: {
        solutionLength: solution.length,
        complexity: complexity,
        endpoint: '/api/organizations/[orgId]/visuals/generate-planning'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)

    // Call LangChain visuals planning function with organization preferences
    const result = await generatePlanningFromIdeation({ solution }, orgId)

    console.log('📊 API: LangChain result:', {
      success: result.success,
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      error: result.error
    })

    if (!result.success) {
      console.log('❌ API: Planning generation failed:', result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Planning generation failed',
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

    console.log('✅ API: Planning generation successful')
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message,
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits,
        usageEventId: trackingResult.usageEventId,
        warning: trackingResult.limitWarning
      }
    })

  } catch (error) {
    console.error('❌ API: Error in generate planning:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown server error' 
      },
      { status: 500 }
    )
  }
}

