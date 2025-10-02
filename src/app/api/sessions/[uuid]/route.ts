import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'
import { 
  getSession,
  getStructuringSession, 
  updateStructuringSession,
  updateVisualsSession,
  updateSolutioningSession,
  updateSOWSession,
  updateLOESession,
  deleteStructuringSession 
} from '@/lib/sessions-server'
import type { StructuringSessionData, VisualsSessionData, SolutioningSessionData, SOWSessionData, LOESessionData } from '@/lib/sessions'

// GET /api/sessions/[uuid] - Get session by UUID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    // Extract requested data type from query parameter
    const { searchParams } = new URL(request.url)
    const requestedDataType = searchParams.get('type')
    
    console.log(`📡 API: Get session request for UUID: ${params.uuid}`)
    if (requestedDataType) {
      console.log(`🎯 API: Requested data type: ${requestedDataType}`)
    }
    
    const session = await getSession(params.uuid, requestedDataType || undefined)
    
    if (!session) {
      console.log('❌ API: Session not found')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Session not found' 
        },
        { status: 404 }
      )
    }
    
    console.log(`✅ API: Session found - "${session.title}" (${session.sessionType} data)`)
    
    return NextResponse.json({
      success: true,
      session
    })
  } catch (error) {
    console.error('💥 API: Error getting session:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get session: ${error instanceof Error ? getErrorMessage(error) : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}

// PUT /api/sessions/[uuid] - Update session
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    console.log(`📡 API: Update session request for UUID: ${params.uuid}`)
    
    const body = await request.json() as {
      data: StructuringSessionData | VisualsSessionData | SolutioningSessionData | SOWSessionData | LOESessionData
      sessionType?: 'structuring' | 'visuals' | 'solutioning' | 'sow' | 'loe'
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
    
    // Determine session type from existing session if not provided
    let sessionType = body.sessionType
    if (!sessionType) {
      const existingSession = await getSession(params.uuid)
      sessionType = existingSession?.sessionType as any || 'structuring'
    }
    
    console.log(`📝 API: Updating ${sessionType} session`)
    
    // Get title and client based on session type (same fix as POST route)
    let title = '', client = ''
    if (sessionType === 'loe') {
      const loeData = body.data as LOESessionData
      title = loeData.info?.project || ''
      client = loeData.info?.client || ''
    } else {
      title = (body.data as any).basic?.title || ''
      client = (body.data as any).basic?.client || (body.data as any).basic?.recipient || ''
    }
    
    console.log(`   - Title: "${title}"`)
    console.log(`   - Client: "${client}"`)
    console.log(`   - Version: ${body.data.version || 0} -> ${(body.data.version || 0) + 1}`)
    
    let success
    if (sessionType === 'structuring') {
      const structuringData = body.data as StructuringSessionData
      console.log(`   - Content tabs: ${structuringData.contentTabs?.length || 0}`)
      console.log(`   - Solution tabs: ${structuringData.solutionTabs?.length || 0}`)
      success = await updateStructuringSession(params.uuid, structuringData)
    } else if (sessionType === 'visuals') {
      const visualsData = body.data as VisualsSessionData
      console.log(`   - Diagram sets: ${visualsData.diagramSets?.length || 0}`)
      success = await updateVisualsSession(params.uuid, visualsData)
    } else if (sessionType === 'solutioning') {
      const solutioningData = body.data as SolutioningSessionData
      console.log(`   - Solutions: ${Object.keys(solutioningData.solutions || {}).length}`)
      console.log(`   - Current solution: ${solutioningData.currentSolution}`)
      success = await updateSolutioningSession(params.uuid, solutioningData)
    } else if (sessionType === 'sow') {
      const sowData = body.data as SOWSessionData
      console.log(`   - Objectives: ${sowData.project?.objectives?.length || 0}`)
      console.log(`   - Deliverables: ${sowData.scope?.deliverables?.length || 0}`)
      console.log(`   - Phases: ${sowData.timeline?.phases?.length || 0}`)
      success = await updateSOWSession(params.uuid, sowData)
    } else if (sessionType === 'loe') {
      const loeData = body.data as LOESessionData
      console.log(`   - Workstreams: ${loeData.workstreams?.workstreams?.length || 0}`)
      console.log(`   - Resources: ${loeData.resources?.resources?.length || 0}`)
      console.log(`   - Assumptions: ${loeData.assumptions?.assumptions?.length || 0}`)
      success = await updateLOESession(params.uuid, loeData)
    }
    
    if (!success) {
      console.log('❌ API: Failed to update session')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to update session' 
        },
        { status: 500 }
      )
    }
    
    console.log('✅ API: Session updated successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Session updated successfully'
    })
    
  } catch (error) {
    console.error('💥 API: Error updating session:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to update session: ${error instanceof Error ? getErrorMessage(error) : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}

// DELETE /api/sessions/[uuid] - Delete session
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
) {
  try {
    console.log(`📡 API: Delete session request for UUID: ${params.uuid}`)
    
    const success = await deleteStructuringSession(params.uuid)
    
    if (!success) {
      console.log('❌ API: Failed to delete session')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to delete session' 
        },
        { status: 500 }
      )
    }
    
    console.log('✅ API: Session deleted successfully')
    
    return NextResponse.json({
      success: true,
      message: 'Session deleted successfully'
    })
    
  } catch (error) {
    console.error('💥 API: Error deleting session:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to delete session: ${error instanceof Error ? getErrorMessage(error) : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}
