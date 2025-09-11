import { NextRequest, NextResponse } from 'next/server'
import { generatePlanningFromIdeation } from '@/lib/langchain/visuals'

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Generate planning request received')
    
    const body = await request.json()
    const { solution } = body

    console.log('📝 API: Processing ideation content:', {
      solutionLength: solution?.length || 0
    })

    // Validate request
    if (!solution || typeof solution !== 'string') {
      console.log('❌ API: Invalid solution content')
      return NextResponse.json(
        { success: false, error: 'Solution content is required' },
        { status: 400 }
      )
    }

    // Call LangChain visuals planning function
    const result = await generatePlanningFromIdeation({ solution })

    console.log('📊 API: LangChain result:', {
      success: result.success,
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      error: result.error
    })

    if (!result.success) {
      console.log('❌ API: Planning generation failed:', result.error)
      return NextResponse.json(
        { success: false, error: result.error || 'Planning generation failed' },
        { status: 500 }
      )
    }

    console.log('✅ API: Planning generation successful')
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

  } catch (error) {
    console.error('❌ API: Error in generate planning:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown server error' 
      },
      { status: 500 }
    )
  }
}






