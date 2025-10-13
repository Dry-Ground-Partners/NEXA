import { NextRequest, NextResponse } from 'next/server'
import { generatePreResponse, generateResponse } from '@/lib/ai-sidebar/message-generators'

export async function POST(request: NextRequest) {
  try {
    const { userInput, previousMessages, activityLogs, messageType } = await request.json()
    
    // Format context for generators
    const context = {
      previousMessages: previousMessages || '',
      activityLogs: activityLogs || ' ', // Empty string as placeholder
      userInput
    }
    
    if (messageType === 'pre-response') {
      // Generate pre-response only
      const preResponse = await generatePreResponse(context)
      
      return NextResponse.json({ 
        preResponse,
        success: true 
      })
    } else if (messageType === 'response') {
      // Generate full response
      const { response, action } = await generateResponse(context)
      
      return NextResponse.json({ 
        response,
        action,
        success: true 
      })
    }
    
    return NextResponse.json(
      { error: 'Invalid message type' },
      { status: 400 }
    )
    
  } catch (error: any) {
    console.error('Error generating message:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate message' },
      { status: 500 }
    )
  }
}

