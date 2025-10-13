import { NextRequest } from 'next/server'
import * as hub from 'langchain/hub/node'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { userInput, previousMessages, activityLogs, messageType } = await request.json()
    
    // Set up SSE headers
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          let prompt
          
          if (messageType === 'pre-response') {
            prompt = await hub.pull('nexa-liaison-swift-pre', {
              includeModel: true
            })
          } else if (messageType === 'response') {
            prompt = await hub.pull('nexa-liaison-response', {
              includeModel: true
            })
          } else if (messageType === 'next-hidden') {
            prompt = await hub.pull('nexa-liaison-swift-hidden', {
              includeModel: true
            })
          } else {
            controller.enqueue(encoder.encode('data: {"error": "Invalid message type"}\n\n'))
            controller.close()
            return
          }
          
          const result = await prompt.invoke({
            previous_messages: previousMessages || '',
            activity_logs: activityLogs || ' ',
            user_input: userInput || ''
          })
          
          const content = result.content || result.text || String(result)
          
          // For response type, try to parse JSON
          if (messageType === 'response') {
            try {
              const parsed = JSON.parse(content)
              const text = parsed.response || content
              
              // Stream the text character by character (faster: 10ms)
              for (let i = 0; i < text.length; i++) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: text[i] })}\n\n`))
                // Small delay for streaming effect
                await new Promise(resolve => setTimeout(resolve, 10))
              }
              
              // Send action at the end
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                done: true, 
                action: parsed.action || { type: null, params: {} } 
              })}\n\n`))
            } catch {
              // If not JSON, stream as plain text (faster: 10ms)
              for (let i = 0; i < content.length; i++) {
                controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: content[i] })}\n\n`))
                await new Promise(resolve => setTimeout(resolve, 10))
              }
              
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ 
                done: true, 
                action: { type: null, params: {} } 
              })}\n\n`))
            }
          } else {
            // For pre-response and next-hidden, stream as plain text (faster: 10ms)
            for (let i = 0; i < content.length; i++) {
              controller.enqueue(encoder.encode(`data: ${JSON.stringify({ token: content[i] })}\n\n`))
              await new Promise(resolve => setTimeout(resolve, 10))
            }
            
            controller.enqueue(encoder.encode(`data: ${JSON.stringify({ done: true })}\n\n`))
          }
          
          controller.close()
          
        } catch (error: any) {
          console.error('Streaming error:', error)
          controller.enqueue(encoder.encode(`data: ${JSON.stringify({ error: error.message })}\n\n`))
          controller.close()
        }
      }
    })
    
    return new Response(stream, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    })
    
  } catch (error: any) {
    console.error('Error in stream route:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate message' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

