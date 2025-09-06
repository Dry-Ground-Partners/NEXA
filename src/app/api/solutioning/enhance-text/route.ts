import { NextRequest, NextResponse } from 'next/server'
import { enhanceTextWithLangSmith } from '@/lib/langchain/solutioning'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { text } = body

    // Validate input
    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Text content is required and cannot be empty' 
        },
        { status: 400 }
      )
    }
    
    // Call the text enhancement function
    const result = await enhanceTextWithLangSmith({ text })

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Text enhancement failed' 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      enhancedText: result.enhancedText
    })

  } catch (error) {
    console.error('❌ API: Error in text enhancement:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
