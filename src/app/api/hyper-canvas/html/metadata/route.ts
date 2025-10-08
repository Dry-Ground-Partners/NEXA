import { NextRequest, NextResponse } from 'next/server'
import { htmlStorage } from '@/lib/hyper-canvas/html-storage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('📊 Get HTML Metadata API: Incoming request')
    
    const { threadId, sessionId } = await request.json()
    
    if (!threadId || !sessionId) {
      console.log('❌ Missing required fields')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required fields: threadId or sessionId',
          metadata: null
        },
        { status: 400 }
      )
    }
    
    console.log(`🔍 Getting metadata: thread=${threadId}, session=${sessionId}`)
    
    // Get metadata
    const metadata = await htmlStorage.getHTMLMetadata(threadId, sessionId)
    
    if (!metadata) {
      console.log('⚠️ No metadata found')
      return NextResponse.json({
        success: true,
        metadata: null,
        hasHTML: false
      })
    }
    
    console.log(`✅ Metadata retrieved:`, metadata)
    
    return NextResponse.json({
      success: true,
      metadata: metadata,
      hasHTML: true
    })
    
  } catch (error: unknown) {
    console.error('❌ Get Metadata API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        metadata: null
      },
      { status: 500 }
    )
  }
}
