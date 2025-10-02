import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'
import { generateSketchFromPlanning } from '@/lib/langchain/visuals'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    console.log(`📡 API: Generate sketch request for org ${orgId}`)
    
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
    const { planning, sessionId } = body

    console.log('📝 API: Processing planning content:', {
      planningLength: planning?.length || 0,
      organizationId: orgId
    })

    // Validate request
    if (!planning || typeof planning !== 'string') {
      console.log('❌ API: Invalid planning content')
      return NextResponse.json(
        { success: false, error: 'Planning content is required' },
        { status: 400 }
      )
    }

    // Calculate complexity based on planning content
    const complexity = calculateComplexityFromInput(planning)
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'visuals_sketch',
      sessionId: sessionId ? parseInt(sessionId) : undefined,
      eventData: {
        planningLength: planning.length,
        complexity: complexity,
        endpoint: '/api/organizations/[orgId]/visuals/generate-sketch'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)

    // Call LangChain visuals sketch function with organization preferences
    const result = await generateSketchFromPlanning({ planning }, orgId)

    console.log('📊 API: LangChain result:', {
      success: result.success,
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      error: result.error
    })

    if (!result.success) {
      console.log('❌ API: Sketch generation failed:', result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Sketch generation failed',
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

    console.log('✅ API: Sketch generation successful')
    
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
    console.error('❌ API: Error in generate sketch:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? getErrorMessage(error) : 'Unknown server error' 
      },
      { status: 500 }
    )
  }
}
