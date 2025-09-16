import { NextRequest, NextResponse } from 'next/server'
import { chatTurn } from '@/lib/langchain/hyper-canvas-chat'

export async function POST(request: NextRequest) {
  try {
    const { message, threadId, sessionId, userId, organizationId } = await request.json()
    
    // Validate required fields
    if (!message || !threadId || !sessionId || !userId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: message, threadId, sessionId, userId' 
        },
        { status: 400 }
      )
    }
    
    // Validate message content
    if (typeof message !== 'string' || message.trim().length === 0) {
      return NextResponse.json(
        { success: false, error: 'Message must be a non-empty string' },
        { status: 400 }
      )
    }
    
    console.log('🚀 Quickshot chat turn request:', { 
      threadId, 
      userId, 
      sessionId,
      messageLength: message.length,
      organizationId: organizationId || 'none'
    })
    
    // Execute chat turn with memory
    const result = await chatTurn(
      threadId, 
      userId, 
      sessionId, 
      organizationId || 'default', 
      message.trim()
    )
    
    if (!result.success) {
      console.error('❌ Chat turn failed:', result.error)
      return NextResponse.json({
        success: false,
        error: result.error,
        // Still return fallback response for better UX
        response: result.response
      }, { status: 500 })
    }
    
    console.log('✅ Quickshot response generated:', {
      maestro: result.response.maestro,
      responseCount: result.response.chat_responses.length,
      memoryMessages: result.memoryState.messageCount
    })
    
    return NextResponse.json({
      success: true,
      maestro: result.response.maestro,
      message_to_maestro: result.response.message_to_maestro,
      chat_responses: result.response.chat_responses,
      memoryState: result.memoryState
    })
    
  } catch (error) {
    console.error('❌ Quickshot API error:', error)
    
    // Extract useful error message
    const errorMessage = error instanceof Error ? error.message : 'Internal server error'
    
    return NextResponse.json({
      success: false,
      error: errorMessage,
      // Provide fallback response for better UX
      response: {
        maestro: false,
        message_to_maestro: null,
        chat_responses: [
          "I encountered an error processing your request 😅",
          "This might be a temporary issue with my systems...",
          "Please try again, and let me know if the problem persists!"
        ]
      }
    }, { status: 500 })
  }
}

