import { NextRequest, NextResponse } from 'next/server'
import { chatTurn } from '@/lib/langchain/hyper-canvas-chat'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Quickshot API: Incoming request')
    
    const { 
      message, 
      threadId, 
      sessionId, 
      userId, 
      organizationId 
    } = await request.json()
    
    // Validate required fields
    if (!message || !threadId || !sessionId || !userId) {
      console.log('❌ Quickshot API: Missing required fields')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: message, threadId, sessionId, or userId',
          maestro: false,
          message_to_maestro: null,
          chat_responses: [
            "I need more information to help you. Please make sure you're properly connected."
          ]
        },
        { status: 400 }
      )
    }
    
    console.log('📝 Quickshot API: Processing message:', {
      messageLength: message.length,
      threadId: threadId.substring(0, 20) + '...',
      userId: userId.substring(0, 20) + '...',
      organizationId: organizationId || 'none'
    })
    
    // Execute quickshot turn with LangChain
    const result = await chatTurn(
      threadId,
      userId,
      sessionId,
      organizationId || 'unknown',
      message
    )
    
    console.log('✅ Quickshot API: Response generated:', {
      success: result.success,
      maestro: result.maestro,
      responseCount: result.chat_responses?.length || 0
    })
    
    return NextResponse.json(result)
    
  } catch (error: unknown) {
    console.error('❌ Quickshot API: Error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error occurred',
        maestro: false,
        message_to_maestro: null,
        chat_responses: [
          "I encountered an unexpected error. Let me try that again...",
          "If this persists, please try refreshing the page."
        ]
      },
      { status: 500 }
    )
  }
}
