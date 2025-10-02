import { NextRequest, NextResponse } from 'next/server'
import { analyzePainPoints } from '@/lib/langchain/structuring'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'
import type { StructuringRequest } from '@/lib/langchain/types'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    console.log(`📡 API: Pain point analysis request for org ${orgId}`)
    
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
      content: string[]
      sessionId?: string
      echo?: boolean
      traceback?: boolean
    }
    
    // Validate request
    if (!body.content || !Array.isArray(body.content)) {
      console.log('❌ API: Invalid request - missing or invalid content array')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Content array is required' 
        },
        { status: 400 }
      )
    }
    
    // Filter out empty content
    const validContent = body.content.filter(text => text && text.trim())
    
    if (validContent.length === 0) {
      console.log('❌ API: No valid content provided')
      return NextResponse.json(
        { 
          success: false, 
          error: 'At least one non-empty content item is required' 
        },
        { status: 400 }
      )
    }
    
    console.log(`📝 API: Processing ${validContent.length} content items`)
    console.log(`📊 API: Total content length: ${validContent.join('').length} characters`)
    
    // Calculate complexity based on content
    const totalContent = validContent.join(' ')
    const complexity = calculateComplexityFromInput(totalContent)
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'structuring_diagnose',
      sessionId: body.sessionId ? parseInt(body.sessionId) : undefined,
      eventData: {
        contentItems: validContent.length,
        totalLength: totalContent.length,
        complexity: complexity,
        echo: !!body.echo,
        traceback: !!body.traceback,
        endpoint: '/api/organizations/[orgId]/structuring/analyze-pain-points'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    // Create request object
    const analysisRequest: StructuringRequest = {
      content: validContent,
      sessionId: body.sessionId
    }
    
    // Call LangChain analysis with organization preferences
    const result = await analyzePainPoints(analysisRequest, orgId)
    
    if (!result.success) {
      console.log('❌ API: LangChain analysis failed:', result.error)
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
    
    console.log('✅ API: Pain point analysis completed successfully')
    console.log(`📊 API: Found ${result.data?.pain_points?.length || 0} pain points`)
    
    return NextResponse.json({
      ...result,
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits,
        usageEventId: trackingResult.usageEventId,
        warning: trackingResult.limitWarning
      }
    })
    
  } catch (error) {
    console.error('💥 API: Unexpected error in pain point analysis:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    
    // RBAC: Check organization access
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    const { healthCheck } = await import('@/lib/langchain/structuring')
    const health = await healthCheck()
    
    return NextResponse.json({
      status: 'API endpoint active',
      organizationId: orgId,
      langchain: health,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'API endpoint active', 
        langchain: { success: false, message: 'Health check failed' },
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}

