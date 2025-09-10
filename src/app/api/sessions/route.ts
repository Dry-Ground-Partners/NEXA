import { NextRequest, NextResponse } from 'next/server'
import { 
  createStructuringSession,
  createVisualsSession,
  createSolutioningSession,
  createSOWSession,
  createLOESession,
  getUserStructuringSessions 
} from '@/lib/sessions-server'
import type { StructuringSessionData, VisualsSessionData, SolutioningSessionData, SOWSessionData, LOESessionData } from '@/lib/sessions'

// GET /api/sessions - List user's sessions
export async function GET(request: NextRequest) {
  try {
    console.log('📡 API: Get user sessions request')
    
    const sessions = await getUserStructuringSessions()
    
    console.log(`✅ API: Found ${sessions.length} sessions`)
    
    return NextResponse.json({
      success: true,
      sessions
    })
  } catch (error) {
    console.error('💥 API: Error getting sessions:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get sessions: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}

// POST /api/sessions - Create new session
export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Create session request')
    
    const body = await request.json() as {
      title?: string
      client?: string
      sessionType: 'structuring' | 'visuals' | 'solutioning' | 'sow' | 'loe'
      data: StructuringSessionData | VisualsSessionData | SolutioningSessionData | SOWSessionData | LOESessionData
    }
    
    // Validate request
    if (!body.sessionType || !['structuring', 'visuals', 'solutioning', 'sow', 'loe'].includes(body.sessionType)) {
      console.log('❌ API: Invalid session type')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session type must be "structuring", "visuals", "solutioning", "sow", or "loe"' 
        },
        { status: 400 }
      )
    }
    
    if (!body.data) {
      console.log('❌ API: Missing session data')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session data is required' 
        },
        { status: 400 }
      )
    }
    
    console.log(`📝 API: Creating ${body.sessionType} session`)
    
    // Get title and client based on session type
    let title = '', client = ''
    if (body.sessionType === 'loe') {
      const loeData = body.data as LOESessionData
      title = loeData.info?.project || ''
      client = loeData.info?.client || ''
    } else {
      title = (body.data as any).basic?.title || ''
      client = (body.data as any).basic?.client || (body.data as any).basic?.recipient || ''
    }
    
    console.log(`   - Title: "${title}"`)
    console.log(`   - Client: "${client}"`)
    
    let session
    if (body.sessionType === 'structuring') {
      const structuringData = body.data as StructuringSessionData
      console.log(`   - Content tabs: ${structuringData.contentTabs.length}`)
      console.log(`   - Solution tabs: ${structuringData.solutionTabs.length}`)
      session = await createStructuringSession(structuringData)
    } else if (body.sessionType === 'visuals') {
      const visualsData = body.data as VisualsSessionData
      console.log(`   - Diagram sets: ${visualsData.diagramSets.length}`)
      session = await createVisualsSession(visualsData)
    } else if (body.sessionType === 'solutioning') {
      const solutioningData = body.data as SolutioningSessionData
      console.log(`   - Solutions: ${Object.keys(solutioningData.solutions).length}`)
      console.log(`   - Current solution: ${solutioningData.currentSolution}`)
      session = await createSolutioningSession(solutioningData)
    } else if (body.sessionType === 'sow') {
      const sowData = body.data as SOWSessionData
      console.log(`   - Objectives: ${sowData.project.objectives.length}`)
      console.log(`   - Deliverables: ${sowData.scope.deliverables.length}`)
      console.log(`   - Phases: ${sowData.timeline.phases.length}`)
      session = await createSOWSession(sowData)
    } else if (body.sessionType === 'loe') {
      const loeData = body.data as LOESessionData
      console.log(`   - Workstreams: ${loeData.workstreams.workstreams.length}`)
      console.log(`   - Resources: ${loeData.resources.resources.length}`)
      console.log(`   - Assumptions: ${loeData.assumptions.assumptions.length}`)
      session = await createLOESession(loeData)
    }
    
    if (!session) {
      console.log('❌ API: Failed to create session')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to create session' 
        },
        { status: 500 }
      )
    }
    
    console.log(`✅ API: Session created with UUID: ${session.uuid}`)
    
    return NextResponse.json({
      success: true,
      session
    }, { status: 201 })
    
  } catch (error) {
    console.error('💥 API: Error creating session:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to create session: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}
