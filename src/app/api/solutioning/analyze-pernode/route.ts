import { NextRequest, NextResponse } from 'next/server'
import { analyzePerNodeStackWithLangSmith } from '@/lib/langchain/solutioning'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { context } = body

    // Validate input
    if (!context || context.trim().length === 0) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Context is required for per-node stack analysis' 
        },
        { status: 400 }
      )
    }
    
    // Call the per-node stack analysis function
    const result = await analyzePerNodeStackWithLangSmith({ 
      context: context.trim()
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Per-node stack analysis failed' 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      analysis: result.analysis
    })

  } catch (error) {
    console.error('❌ API: Error in per-node stack analysis:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
