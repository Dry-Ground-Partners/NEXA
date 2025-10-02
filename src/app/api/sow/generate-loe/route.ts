import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'
import { generateLOEWithLangSmith } from '@/lib/langchain/solutioning'

export async function POST(request: NextRequest) {
  try {
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
    
    console.log('📊 Generating LOE from SOW data...')
    console.log(`   - Content length: ${concatenatedContent.length} chars`)

    // Generate LOE using LangSmith
    const result = await generateLOEWithLangSmith({
      sowData: concatenatedContent
    })

    if (!result.success) {
      console.error('❌ LOE generation failed:', result.error)
      throw new Error(result.error || 'LOE generation failed')
    }

    console.log('✅ LOE generated successfully')
    return NextResponse.json({
      success: true,
      loeData: result.loeData
    })

  } catch (error) {
    console.error('❌ Error in LOE generation:', error)
    return NextResponse.json(
      { success: false, error: error instanceof Error ? getErrorMessage(error) : 'Unknown error' },
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





