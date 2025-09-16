import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export async function POST(request: NextRequest) {
  try {
    const { sessionId, userId, organizationId } = await request.json()
    
    // Validate required fields
    if (!sessionId || !userId) {
      return NextResponse.json(
        { success: false, error: 'sessionId and userId are required' },
        { status: 400 }
      )
    }
    
    // Generate thread ID with prefix for easy identification
    const threadId = `hc_${sessionId}_${uuidv4().slice(0, 8)}`
    
    console.log('🧵 Creating Hyper-Canvas thread:', { 
      threadId, 
      sessionId, 
      userId,
      organizationId: organizationId || 'none'
    })
    
    // Memory will be auto-created on first chat turn
    // No database persistence needed for now - using in-memory storage
    
    return NextResponse.json({
      success: true,
      threadId,
      message: 'Thread created successfully'
    })
    
  } catch (error) {
    console.error('❌ Thread creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to create thread' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')
    
    if (!threadId) {
      return NextResponse.json(
        { success: false, error: 'threadId is required' },
        { status: 400 }
      )
    }
    
    // Import here to avoid circular dependencies
    const { clearThreadMemory } = await import('@/lib/langchain/hyper-canvas-chat')
    
    clearThreadMemory(threadId)
    
    console.log('🗑️ Thread deleted:', threadId)
    
    return NextResponse.json({
      success: true,
      message: 'Thread deleted successfully'
    })
    
  } catch (error) {
    console.error('❌ Thread deletion error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to delete thread' },
      { status: 500 }
    )
  }
}

