import { NextRequest, NextResponse } from 'next/server'
import { htmlStorage } from '@/lib/hyper-canvas/html-storage'

export const dynamic = 'force-dynamic'

export async function POST(request: NextRequest) {
  try {
    console.log('📋 List Threads API: Incoming request')
    
    const { sessionId } = await request.json()
    
    if (!sessionId) {
      console.log('❌ Missing sessionId')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Missing required field: sessionId',
          threads: []
        },
        { status: 400 }
      )
    }
    
    console.log(`🔍 Listing threads for session: ${sessionId}`)
    
    // Get all threads
    const threads = await htmlStorage.getAllThreads(sessionId)
    
    console.log(`✅ Found ${threads.length} thread(s)`)
    
    return NextResponse.json({
      success: true,
      threads: threads,
      count: threads.length
    })
    
  } catch (error: unknown) {
    console.error('❌ List Threads API Error:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error',
        threads: []
      },
      { status: 500 }
    )
  }
}
