import { NextRequest, NextResponse } from 'next/server'
import { generateSOWWithLangSmith } from '@/lib/langchain/solutioning'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    console.log(`📋 Push: Solutioning → SOW for org ${orgId}`)
    
    // RBAC: Check organization access
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Organization access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { solutioningData } = body

    if (!solutioningData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Solutioning data is required' 
        },
        { status: 400 }
      )
    }

    // Extract valuable text content (no base64 or URLs)
    const concatenatedContent = extractValuableContent(solutioningData)
    
    console.log(`   - Content length: ${concatenatedContent.length} chars`)
    console.log(`   - Solutions count: ${Object.keys(solutioningData.solutions || {}).length}`)
    
    // Calculate complexity based on content
    const complexity = calculateComplexityFromInput(concatenatedContent)
    
    // Track usage before processing (SOW generation has medium AI processing)
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'push_solutioning_to_sow',
      eventData: {
        contentLength: concatenatedContent.length,
        solutionCount: Object.keys(solutioningData.solutions || {}).length,
        complexity: complexity,
        endpoint: '/api/organizations/[orgId]/solutioning/generate-sow'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    // Call LangSmith with the specialized prompt and organization preferences
    const result = await generateSOWWithLangSmith({
      solutioningData: concatenatedContent
    }, orgId)

    if (!result.success) {
      console.error('❌ SOW generation failed:', result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'SOW generation failed',
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

    console.log('✅ SOW generated successfully')
    
    return NextResponse.json({
      success: true,
      sowData: result.sowData,
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits,
        usageEventId: trackingResult.usageEventId,
        warning: trackingResult.limitWarning
      }
    })

  } catch (error: unknown) {
    console.error('❌ Error in SOW generation:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}

// Helper function to extract valuable text content
function extractValuableContent(solutioningData: any): string {
  const sections: string[] = []
  
  // Add basic project info
  if (solutioningData.basic) {
    sections.push(`PROJECT: ${solutioningData.basic.title || 'Untitled Project'}`)
    sections.push(`CLIENT: ${solutioningData.basic.recipient || 'Client TBD'}`)
    sections.push(`ENGINEER: ${solutioningData.basic.engineer || 'Engineer TBD'}`)
    sections.push(`DATE: ${solutioningData.basic.date || 'Date TBD'}`)
  }
  
  // Extract from each solution
  if (solutioningData.solutions) {
    Object.values(solutioningData.solutions).forEach((solution: any, index) => {
      sections.push(`\n--- SOLUTION ${index + 1} ---`)
      
      if (solution.variables?.solutionExplanation) {
        sections.push(`EXPLANATION: ${solution.variables.solutionExplanation}`)
      }
      
      if (solution.variables?.aiAnalysis) {
        sections.push(`AI ANALYSIS: ${solution.variables.aiAnalysis}`)
      }
      
      if (solution.structure?.title) {
        sections.push(`TITLE: ${solution.structure.title}`)
      }
      
      if (solution.structure?.steps) {
        sections.push(`IMPLEMENTATION STEPS: ${solution.structure.steps}`)
      }
      
      if (solution.structure?.approach) {
        sections.push(`TECHNICAL APPROACH: ${solution.structure.approach}`)
      }
      
      if (solution.structure?.stack) {
        sections.push(`TECHNOLOGY STACK: ${solution.structure.stack}`)
      }
      
      if (solution.structure?.difficulty) {
        sections.push(`COMPLEXITY LEVEL: ${solution.structure.difficulty}/10`)
      }
    })
  }
  
  return sections.join('\n\n')
}
