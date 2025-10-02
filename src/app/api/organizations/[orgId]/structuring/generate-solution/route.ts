import { NextRequest, NextResponse } from 'next/server'
import { generateSolution } from '@/lib/langchain/structuring'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'
import type { GenerateSolutionRequest } from '@/lib/langchain/types'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    console.log(`📡 API: Generate solution request for org ${orgId}`)
    
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
      solutionContent: string[]  // Pain points to solve
      content: string           // Context echo (or space if disabled)
      report: string           // Traceback report (or space if disabled)
      sessionId?: string
      echo?: boolean
      traceback?: boolean
      enhanced?: boolean
    }
    
    // Validate request
    if (!body.solutionContent || !Array.isArray(body.solutionContent)) {
      console.log('❌ API: Invalid request - missing or invalid solutionContent array')
      return NextResponse.json(
        { 
          success: false, 
          error: 'solutionContent array is required' 
        },
        { status: 400 }
      )
    }
    
    // Filter out empty solution content
    const validSolutionContent = body.solutionContent.filter(text => text && text.trim())
    
    if (validSolutionContent.length === 0) {
      console.log('❌ API: No valid solution content provided')
      return NextResponse.json(
        { 
          success: false, 
          error: 'At least one non-empty pain point is required' 
        },
        { status: 400 }
      )
    }
    
    console.log(`📝 API: Processing ${validSolutionContent.length} pain points for solution generation`)
    console.log(`📊 API: Context length: ${body.content?.length || 0} chars, Report length: ${body.report?.length || 0} chars`)
    
    // Calculate complexity based on solution content
    const totalContent = validSolutionContent.join(' ')
    const complexity = calculateComplexityFromInput(totalContent)
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'structuring_generate_solution',
      sessionId: body.sessionId ? parseInt(body.sessionId) : undefined,
      eventData: {
        painPoints: validSolutionContent.length,
        contextLength: body.content?.length || 0,
        reportLength: body.report?.length || 0,
        complexity: complexity,
        echo: !!body.echo,
        traceback: !!body.traceback,
        enhanced: !!body.enhanced,
        endpoint: '/api/organizations/[orgId]/structuring/generate-solution'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    // Create request object with correct structure for GenerateSolutionRequest
    const solutionRequest: GenerateSolutionRequest = {
      solutionContent: validSolutionContent,
      content: body.content || ' ',
      report: body.report || ' '
    }
    
    console.log(`🔧 Calling generateSolution with ${validSolutionContent.length} pain points`)
    
    // Call LangChain solution generation with organization preferences
    const result = await generateSolution(solutionRequest, orgId)
    
    if (!result.success) {
      console.log('❌ API: LangChain solution generation failed:', result.error)
      return NextResponse.json(
        { 
          ...result,
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
    
    console.log('✅ API: Solution generation completed successfully')
    console.log(`📊 API: Generated ${result.data?.solution_parts?.length || 0} solution parts`)
    
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
    console.error('💥 API: Unexpected error in solution generation:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}

