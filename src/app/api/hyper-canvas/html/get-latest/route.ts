import { NextRequest, NextResponse } from 'next/server'
import { htmlStorage } from '@/lib/hyper-canvas/html-storage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('📄 Get Latest HTML API: Incoming request')
    
    const { threadId, sessionId } = await request.json()
    
    if (!threadId || !sessionId) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: threadId or sessionId',
          html: null,
          hasHTML: false
        },
        { status: 400 }
      )
    }
    
    console.log(`🔍 Looking for HTML: thread=${threadId}, session=${sessionId}`)
    
    // Get latest HTML
    const html = await htmlStorage.getLatestHTML(threadId, sessionId)
    
    if (!html) {
      console.log('⚠️ No HTML found for this thread')
      return NextResponse.json({
        success: true,
        html: null,
        hasHTML: false,
        message: 'No HTML found for this thread'
      })
    }
    
    console.log(`✅ HTML retrieved: ${html.length} characters`)
    
    return NextResponse.json({
      success: true,
      html: html,
      hasHTML: true,
      size: html.length
    })
    
  } catch (error: unknown) {
    console.error('❌ Get Latest HTML API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        html: null,
        hasHTML: false
      },
      { status: 500 }
    )
  }
}
