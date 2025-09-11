import { NextRequest, NextResponse } from 'next/server'
import { updateSolutioningSession, getSession } from '@/lib/sessions-server'

export async function PUT(request: NextRequest) {
  try {
    const { sessionId, solutionId, updates } = await request.json()
    
    console.log(`📝 API: Updating solution ${solutionId} in session ${sessionId}`)
    
    if (!sessionId || !solutionId || !updates) {
      return NextResponse.json({ 
        success: false, 
        error: 'Missing required fields: sessionId, solutionId, or updates' 
      }, { status: 400 })
    }
    
    // Get current session data
    const session = await getSession(sessionId, 'solutioning')
    if (!session || !session.data) {
      return NextResponse.json({ 
        success: false, 
        error: 'Session not found or no solutioning data' 
      }, { status: 404 })
    }
    
    const sessionData = session.data
    
    // Validate that solution exists
    if (!sessionData.solutions || !sessionData.solutions[solutionId]) {
      return NextResponse.json({ 
        success: false, 
        error: `Solution ${solutionId} not found in session` 
      }, { status: 404 })
    }
    
    // Update specific solution with new data
    sessionData.solutions[solutionId] = {
      ...sessionData.solutions[solutionId],
      additional: {
        ...sessionData.solutions[solutionId].additional,
        ...(updates.imageUrl && { imageUrl: updates.imageUrl })
      },
      variables: {
        ...sessionData.solutions[solutionId].variables,
        ...(updates.aiAnalysis && { aiAnalysis: updates.aiAnalysis })
      },
      structure: {
        ...sessionData.solutions[solutionId].structure,
        ...(updates.title && { title: updates.title }),
        ...(updates.steps && { steps: updates.steps }),
        ...(updates.approach && { approach: updates.approach })
      }
    }
    
    // Update last saved timestamp
    sessionData.lastSaved = new Date().toISOString()
    
    // Save updated session
    const success = await updateSolutioningSession(sessionId, sessionData)
    
    if (success) {
      console.log(`✅ API: Successfully updated solution ${solutionId}`)
      return NextResponse.json({ 
        success: true, 
        message: `Solution ${solutionId} updated successfully` 
      })
    } else {
      return NextResponse.json({ 
        success: false, 
        error: 'Failed to save updated session to database' 
      }, { status: 500 })
    }
  } catch (error: any) {
    console.error('❌ API: Error updating solution:', error)
    return NextResponse.json({ 
      success: false, 
      error: `Internal server error: ${error.message}` 
    }, { status: 500 })
  }
}
