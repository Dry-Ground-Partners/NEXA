import { NextRequest, NextResponse } from 'next/server'
import { generateAnalysisReport } from '@/lib/langchain/structuring'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    console.log(`📡 API: Analysis report generation request for org ${orgId}`)
    
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
      pain_points: string[]
      sessionId?: string
    }
    
    // Validate request
    if (!body.pain_points || !Array.isArray(body.pain_points)) {
      console.log('❌ API: Invalid request - missing or invalid pain_points array')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Pain points array is required' 
        },
        { status: 400 }
      )
    }
    
    // Filter out empty pain points
    const validPainPoints = body.pain_points.filter(pp => pp && pp.trim())
    
    if (validPainPoints.length === 0) {
      console.log('❌ API: No valid pain points provided')
      return NextResponse.json(
        { 
          success: false, 
          error: 'At least one non-empty pain point is required' 
        },
        { status: 400 }
      )
    }
    
    console.log(`📝 API: Processing ${validPainPoints.length} pain points for analysis report`)
    
    // Calculate complexity based on pain points content
    const totalContent = validPainPoints.join(' ')
    const complexity = calculateComplexityFromInput(totalContent)
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'structuring_analysis_report',
      sessionId: body.sessionId ? parseInt(body.sessionId) : undefined,
      eventData: {
        painPointsCount: validPainPoints.length,
        totalLength: totalContent.length,
        complexity: complexity,
        endpoint: '/api/organizations/[orgId]/structuring/generate-analysis-report'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    // Call LangChain analysis with organization preferences
    const result = await generateAnalysisReport(validPainPoints, orgId)
    
    if (!result.success) {
      console.log('❌ API: LangChain analysis report generation failed:', result.error)
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
    
    console.log('✅ API: Analysis report generation completed successfully')
    console.log(`📄 Report length: ${result.data?.report?.length || 0} characters`)
    
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
    console.error('💥 API: Error in generate-analysis-report:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to generate analysis report' 
      },
      { status: 500 }
    )
  }
}

