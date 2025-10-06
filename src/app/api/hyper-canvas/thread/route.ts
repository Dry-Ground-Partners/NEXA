import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🧵 Thread API: Incoming thread creation request')
    
    const { sessionId, userId, organizationId } = await request.json()
    
    // Validate required fields
    if (!sessionId || !userId) {
      console.log('❌ Thread API: Missing required fields')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: sessionId or userId' 
        },
        { status: 400 }
      )
    }
    
    // Generate unique thread ID
    // Format: thread_{timestamp}_{uuid}
    const timestamp = Date.now()
    const uniqueId = uuidv4().split('-')[0] // First segment of UUID
    const threadId = `thread_${timestamp}_${uniqueId}`
    
    console.log('✅ Thread API: Thread created successfully:', {
      threadId: threadId.substring(0, 30) + '...',
      sessionId: sessionId.substring(0, 20) + '...',
      userId: userId.substring(0, 20) + '...',
      organizationId: organizationId || 'none'
    })
    
    // TODO: Once database schema is implemented, save thread to DB:
    // await prisma.hyperCanvasThread.create({
    //   data: {
    //     id: threadId,
    //     sessionId,
    //     userId,
    //     organizationId,
    //     langsmithThreadId: threadId,
    //     createdAt: new Date(),
    //     lastActive: new Date(),
    //     templateVersion: 1
    //   }
    // })
    
    return NextResponse.json({
      success: true,
      threadId,
      message: 'Thread created successfully',
      metadata: {
        sessionId,
        userId,
        organizationId: organizationId || null,
        createdAt: new Date().toISOString()
      }
    })
    
  } catch (error: unknown) {
    console.error('❌ Thread API: Error creating thread:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to create thread'
      },
      { status: 500 }
    )
  }
}

// GET endpoint to retrieve thread information (for future use)
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const threadId = searchParams.get('threadId')
    
    if (!threadId) {
      return NextResponse.json(
        { success: false, error: 'Missing threadId parameter' },
        { status: 400 }
      )
    }
    
    // TODO: Once database schema is implemented, retrieve thread from DB:
    // const thread = await prisma.hyperCanvasThread.findUnique({
    //   where: { id: threadId },
    //   include: { messages: true }
    // })
    
    return NextResponse.json({
      success: true,
      message: 'Thread retrieval not yet implemented (database schema pending)',
      threadId
    })
    
  } catch (error: unknown) {
    console.error('❌ Thread API: Error retrieving thread:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Failed to retrieve thread'
      },
      { status: 500 }
    )
  }
}
