import { NextResponse } from 'next/server'
import { generateSolution, healthCheck } from '@/lib/langchain/structuring'
import type { GenerateSolutionRequest } from '@/lib/langchain/types'

// GET /api/structuring/generate-solution - Health check
export async function GET() {
  const result = await healthCheck()
  if (result.success) {
    return NextResponse.json({ success: true, message: result.message }, { status: 200 })
  } else {
    return NextResponse.json({ success: false, error: result.message }, { status: 500 })
  }
}

// POST /api/structuring/generate-solution - Generate solutions from pain points
export async function POST(request: Request) {
  try {
    const { solutionContent, content, report } = (await request.json()) as GenerateSolutionRequest
    
    const result = await generateSolution({ solutionContent, content, report })

    if (result.success && result.data) {
      return NextResponse.json({ success: true, data: result.data }, { status: 200 })
    } else {
      return NextResponse.json({ success: false, error: result.error || 'Unknown error during solution generation' }, { status: 500 })
    }
  } catch (error) {
    console.error('API Error:', error)
    return NextResponse.json({ success: false, error: `API processing failed: ${error instanceof Error ? error.message : 'Unknown error'}` }, { status: 500 })
  }
}




