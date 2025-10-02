import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'
import { maestroTurn } from '@/lib/langchain/hyper-canvas-chat'

export async function POST(request: NextRequest) {
  try {
    const { 
      currentTemplate, 
      maestroInstruction, 
      threadId, 
      userId, 
      sessionId, 
      organizationId 
    } = await request.json()
    
    console.log('🎭 Maestro API called:', {
      threadId,
      instructionLength: maestroInstruction?.length,
      templateLength: currentTemplate?.length
    })
    
    // Validate required fields
    if (!currentTemplate || !maestroInstruction || !threadId || !userId || !sessionId) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: currentTemplate, maestroInstruction, threadId, userId, or sessionId',
          modified_template: null,
          explanation: 'Invalid request parameters'
        },
        { status: 400 }
      )
    }
    
    // Execute maestro turn with shared context
    const result = await maestroTurn(
      threadId,
      userId,
      sessionId,
      organizationId || 'unknown',
      maestroInstruction,
      currentTemplate
    )
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('❌ Maestro API error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? getErrorMessage(error) : 'Unknown error',
        modified_template: null,
        explanation: 'Failed to process document modification'
      },
      { status: 500 }
    )
  }
}

