import { NextRequest, NextResponse } from 'next/server'
import { analyzePainPoints } from '@/lib/langchain/structuring'
import type { StructuringRequest } from '@/lib/langchain/types'

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Pain point analysis request received')
    
    // Parse request body
    const body = await request.json() as {
      content: string[]
      sessionId?: string
    }
    
    // Validate request
    if (!body.content || !Array.isArray(body.content)) {
      console.log('❌ API: Invalid request - missing or invalid content array')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Content array is required' 
        },
        { status: 400 }
      )
    }
    
    // Filter out empty content
    const validContent = body.content.filter(text => text && text.trim())
    
    if (validContent.length === 0) {
      console.log('❌ API: No valid content provided')
      return NextResponse.json(
        { 
          success: false, 
          error: 'At least one non-empty content item is required' 
        },
        { status: 400 }
      )
    }
    
    console.log(`📝 API: Processing ${validContent.length} content items`)
    console.log(`📊 API: Total content length: ${validContent.join('').length} characters`)
    
    // Create request object
    const analysisRequest: StructuringRequest = {
      content: validContent,
      sessionId: body.sessionId
    }
    
    // Call LangChain analysis
    const result = await analyzePainPoints(analysisRequest)
    
    if (!result.success) {
      console.log('❌ API: LangChain analysis failed:', result.error)
      return NextResponse.json(result, { status: 500 })
    }
    
    console.log('✅ API: Pain point analysis completed successfully')
    console.log(`📊 API: Found ${result.data?.pain_points?.length || 0} pain points`)
    
    return NextResponse.json(result)
    
  } catch (error) {
    console.error('💥 API: Unexpected error in pain point analysis:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Internal server error: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}

// Health check endpoint
export async function GET() {
  try {
    const { healthCheck } = await import('@/lib/langchain/structuring')
    const health = await healthCheck()
    
    return NextResponse.json({
      status: 'API endpoint active',
      langchain: health,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    return NextResponse.json(
      { 
        status: 'API endpoint active', 
        langchain: { success: false, message: 'Health check failed' },
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    )
  }
}











