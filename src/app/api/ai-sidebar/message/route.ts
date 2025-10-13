import { NextRequest, NextResponse } from 'next/server'
import * as hub from 'langchain/hub/node'

export async function POST(request: NextRequest) {
  try {
    const { userInput, previousMessages, activityLogs, messageType } = await request.json()
    
    if (messageType === 'pre-response') {
      // Generate pre-response using LangSmith
      const prompt = await hub.pull('nexa-liaison-swift-pre', {
        includeModel: true
      })
      
      const result = await prompt.invoke({
        previous_messages: previousMessages || '',
        activity_logs: activityLogs || ' ',
        user_input: userInput || ''
      })
      
      const preResponse = result.content || result.text || String(result)
      
      return NextResponse.json({ 
        preResponse,
        success: true 
      })
      
    } else if (messageType === 'response') {
      // Generate full response using LangSmith
      const prompt = await hub.pull('nexa-liaison-response', {
        includeModel: true
      })
      
      const result = await prompt.invoke({
        previous_messages: previousMessages || '',
        activity_logs: activityLogs || ' ',
        user_input: userInput || ''
      })
      
      const content = result.content || result.text || String(result)
      
      // Try to parse JSON response
      try {
        const parsed = JSON.parse(content)
        return NextResponse.json({ 
          response: parsed.response || content,
          action: parsed.action || { type: null, params: {} },
          success: true 
        })
      } catch {
        // If not JSON, return as plain response
        return NextResponse.json({ 
          response: content,
          action: { type: null, params: {} },
          success: true 
        })
      }
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

