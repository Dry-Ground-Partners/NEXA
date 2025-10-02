import { NextRequest, NextResponse } from 'next/server'
import { generateSketchFromPlanning } from '@/lib/langchain/visuals'

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Generate sketch request received')
    
    const body = await request.json()
    const { planning } = body

    console.log('📝 API: Processing planning content:', {
      planningLength: planning?.length || 0
    })

    // Validate request
    if (!planning || typeof planning !== 'string') {
      console.log('❌ API: Invalid planning content')
      return NextResponse.json(
        { success: false, error: 'Planning content is required' },
        { status: 400 }
      )
    }

    // Call LangChain visuals sketch function
    const result = await generateSketchFromPlanning({ planning })

    console.log('📊 API: LangChain result:', {
      success: result.success,
      hasData: !!result.data,
      dataLength: result.data?.length || 0,
      error: result.error
    })

    if (!result.success) {
      console.log('❌ API: Sketch generation failed:', result.error)
      return NextResponse.json(
        { success: false, error: result.error || 'Sketch generation failed' },
        { status: 500 }
      )
    }

    console.log('✅ API: Sketch generation successful')
    
    return NextResponse.json({
      success: true,
      data: result.data,
      message: result.message
    })

  } catch (error: unknown) {
    console.error('❌ API: Error in generate sketch:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown server error' 
      },
      { status: 500 }
    )
  }
}





