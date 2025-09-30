import { NextRequest, NextResponse } from 'next/server'
import { generateLOEWithLangSmith } from '@/lib/langchain/solutioning'
import { withUsageTracking, calculateComplexityFromInput } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    console.log(`📊 Push: SOW → LOE for org ${orgId}`)
    
    // RBAC: Check organization access
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Organization access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { sowData } = body

    if (!sowData) {
      return NextResponse.json(
        { success: false, error: 'SOW data is required' },
        { status: 400 }
      )
    }

    // Extract valuable content from SOW data (filtering out complex structures)
    const concatenatedContent = extractSOWContent(sowData)
    
    console.log(`   - Content length: ${concatenatedContent.length} chars`)

    // Calculate complexity based on content
    const complexity = calculateComplexityFromInput(concatenatedContent)
    
    // Track usage before processing (LOE generation is lightweight)
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'push_sow_to_loe',
      eventData: {
        contentLength: concatenatedContent.length,
        complexity: complexity,
        hasDeliverables: !!sowData.scope?.deliverables?.length,
        hasTimeline: !!sowData.timeline?.phases?.length,
        endpoint: '/api/organizations/[orgId]/sow/generate-loe'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)

    // Generate LOE using LangSmith
    const result = await generateLOEWithLangSmith({
      sowData: concatenatedContent
    })

    if (!result.success) {
      console.error('❌ LOE generation failed:', result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'LOE generation failed',
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

    console.log('✅ LOE generated successfully')
    return NextResponse.json({
      success: true,
      loeData: result.loeData,
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits,
        usageEventId: trackingResult.usageEventId,
        warning: trackingResult.limitWarning
      }
    })

  } catch (error) {
    console.error('❌ Error in LOE generation:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    )
  }
}

/**
 * Extract valuable text content from SOW data for AI processing
 */
function extractSOWContent(sowData: any): string {
  const sections: string[] = []
  
  // Project basics
  if (sowData.basic) {
    sections.push(`PROJECT: ${sowData.basic.title}`)
    sections.push(`CLIENT: ${sowData.basic.client}`)
    sections.push(`ENGINEER: ${sowData.basic.engineer}`)
    sections.push(`DATE: ${sowData.basic.date}`)
  }
  
  // Project background and objectives
  if (sowData.project) {
    if (sowData.project.background) {
      sections.push(`BACKGROUND: ${sowData.project.background}`)
    }
    sowData.project.objectives?.forEach((obj: any) => {
      if (obj.text?.trim()) {
        sections.push(`OBJECTIVE: ${obj.text}`)
      }
    })
  }
  
  // Scope and deliverables
  if (sowData.scope) {
    sowData.scope.deliverables?.forEach((del: any) => {
      if (del.deliverable?.trim()) {
        sections.push(`DELIVERABLE: ${del.deliverable}`)
      }
      if (del.keyFeatures?.trim()) {
        sections.push(`FEATURES: ${del.keyFeatures}`)
      }
      if (del.primaryArtifacts?.trim()) {
        sections.push(`ARTIFACTS: ${del.primaryArtifacts}`)
      }
    })
    if (sowData.scope.outOfScope?.trim()) {
      sections.push(`OUT OF SCOPE: ${sowData.scope.outOfScope}`)
    }
  }
  
  // Requirements
  if (sowData.clauses) {
    sowData.clauses.functionalRequirements?.forEach((req: any) => {
      if (req.text?.trim()) {
        sections.push(`FUNCTIONAL REQ: ${req.text}`)
      }
    })
    sowData.clauses.nonFunctionalRequirements?.forEach((req: any) => {
      if (req.text?.trim()) {
        sections.push(`NON-FUNCTIONAL REQ: ${req.text}`)
      }
    })
  }
  
  // Timeline phases
  if (sowData.timeline) {
    sowData.timeline.phases?.forEach((phase: any) => {
      if (phase.phase?.trim()) {
        sections.push(`PHASE: ${phase.phase} (Week ${phase.weeksStart}-${phase.weeksEnd})`)
      }
      if (phase.keyActivities?.trim()) {
        sections.push(`ACTIVITIES: ${phase.keyActivities}`)
      }
    })
  }
  
  return sections.join('\n\n')
}
