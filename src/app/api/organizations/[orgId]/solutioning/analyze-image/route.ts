import { NextRequest, NextResponse } from 'next/server'
import { analyzeImageWithVision } from '@/lib/langchain/solutioning'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    console.log(`📡 API: Image analysis request for org ${orgId}`)
    
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
    const { imageUrl, imageData, additionalContext, sessionId } = body

    // Validate input
    if (!imageUrl && !imageData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either imageUrl or imageData is required' 
        },
        { status: 400 }
      )
    }

    console.log('🔍 API: Processing image analysis:', {
      hasImageUrl: !!imageUrl,
      hasImageData: !!imageData,
      contextLength: additionalContext?.length || 0,
      organizationId: orgId
    })

    // Calculate complexity based on context and image processing
    const complexity = calculateComplexityFromInput(additionalContext || 'image analysis')
    const imageComplexity = 1.8 // Image analysis is more complex
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'solutioning_image_analysis',
      sessionId: sessionId ? parseInt(sessionId) : undefined,
      eventData: {
        hasImageUrl: !!imageUrl,
        hasImageData: !!imageData,
        contextLength: additionalContext?.length || 0,
        complexity: complexity * imageComplexity,
        endpoint: '/api/organizations/[orgId]/solutioning/analyze-image'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)

    console.log('🔍 API: Starting vision analysis...')
    
    // Call the vision analysis function with organization preferences
    const result = await analyzeImageWithVision({
      imageUrl,
      imageData,
      additionalContext
    }, orgId)

    if (!result.success) {
      console.error('❌ API: Vision analysis failed:', result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Vision analysis failed',
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

    console.log('✅ API: Vision analysis completed successfully')
    
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
    console.error('❌ API: Error in vision analysis:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
