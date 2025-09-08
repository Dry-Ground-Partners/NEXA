import { NextRequest, NextResponse } from 'next/server'
import { analyzeImageWithVision } from '@/lib/langchain/solutioning'

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Vision analysis request')
    
    const body = await request.json()
    const { imageUrl, imageData, additionalContext } = body

    // Validate input
    if (!imageUrl && !imageData) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Either imageUrl or imageData is required' 
        },
        { status: 400 }
      )
    }

    console.log('🔍 API: Starting vision analysis...')
    
    // Call the vision analysis function
    const result = await analyzeImageWithVision({
      imageUrl,
      imageData,
      additionalContext
    })

    if (!result.success) {
      console.error('❌ API: Vision analysis failed:', result.error)
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Vision analysis failed' 
        },
        { status: 500 }
      )
    }

    console.log('✅ API: Vision analysis completed successfully')
    
    return NextResponse.json({
      success: true,
      analysis: result.analysis
    })

  } catch (error) {
    console.error('❌ API: Error in vision analysis:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}



