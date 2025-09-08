import { NextRequest, NextResponse } from 'next/server'
import { structureSolutionWithLangSmith } from '@/lib/langchain/solutioning'

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()
    const { aiAnalysis, solutionExplanation } = body

    // Validate input - at least one should be provided
    if ((!aiAnalysis || aiAnalysis.trim().length === 0) && 
        (!solutionExplanation || solutionExplanation.trim().length === 0)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'At least one of AI Analysis or Solution Explanation is required' 
        },
        { status: 400 }
      )
    }
    
    // Call the solution structuring function
    const result = await structureSolutionWithLangSmith({ 
      aiAnalysis: aiAnalysis || '',
      solutionExplanation: solutionExplanation || ''
    })

    if (!result.success) {
      return NextResponse.json(
        { 
          success: false, 
          error: result.error || 'Solution structuring failed' 
        },
        { status: 500 }
      )
    }
    
    return NextResponse.json({
      success: true,
      structure: result.structure
    })

  } catch (error) {
    console.error('❌ API: Error in solution structuring:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}


