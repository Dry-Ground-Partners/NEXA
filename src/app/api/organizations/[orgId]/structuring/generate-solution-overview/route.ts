import { NextRequest, NextResponse } from 'next/server'
import { generateSolutionOverview } from '@/lib/langchain/structuring'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    console.log(`📡 API: Solution overview generation request for org ${orgId}`)
    
    // RBAC: Check organization access
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Organization access required' },
        { status: 403 }
      )
    }

    // Parse request body
    const body = await request.json() as {
      solutions: string[]
      sessionId?: string
    }
    
    // Validate request
    if (!body.solutions || !Array.isArray(body.solutions)) {
      console.log('❌ API: Invalid request - missing or invalid solutions array')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Solutions array is required' 
        },
        { status: 400 }
      )
    }
    
    // Filter out empty items
    const validSolutions = body.solutions.filter(sol => sol && sol.trim())
    
    if (validSolutions.length === 0) {
      console.log('❌ API: No valid solutions provided')
      return NextResponse.json(
        { 
          success: false, 
          error: 'At least one non-empty solution is required' 
        },
        { status: 400 }
      )
    }
    
    console.log(`📝 API: Processing ${validSolutions.length} solutions for overview`)
    
    // Calculate complexity based on content
    const totalContent = validSolutions.join(' ')
    const complexity = calculateComplexityFromInput(totalContent)
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'structuring_solution_overview',
      sessionId: body.sessionId ? parseInt(body.sessionId) : undefined,
      eventData: {
        solutionsCount: validSolutions.length,
        totalLength: totalContent.length,
        complexity: complexity,
        endpoint: '/api/organizations/[orgId]/structuring/generate-solution-overview'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    // Call LangChain (prompt only takes solutions)
    const result = await generateSolutionOverview(validSolutions, orgId)
    
    if (!result.success) {
      console.log('❌ API: LangChain solution overview generation failed:', result.error)
      return NextResponse.json(
        { 
          ...result,
          usage: {
            creditsConsumed: trackingResult.creditsConsumed,
            remainingCredits: trackingResult.remainingCredits,
            usageEventId: trackingResult.usageEventId,
            warning: trackingResult.limitWarning
          }
        }
      )
    }
    
    console.log('✅ API: Solution overview generation completed successfully')
    console.log(`📄 Overview length: ${result.data?.overview?.length || 0} characters`)
    
    return NextResponse.json({
      ...result,
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits,
        usageEventId: trackingResult.usageEventId,
        warning: trackingResult.limitWarning
      }
    })
    
  } catch (error: unknown) {
    console.error('💥 API: Error in generate-solution-overview:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate solution overview' 
      },
      { status: 500 }
    )
  }
}

