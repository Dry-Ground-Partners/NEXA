import { NextRequest, NextResponse } from 'next/server'
import { generateCoverHTML, type TemplateData } from '@/lib/pdf/html-template'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 PDF Generation: Starting...')
    
    const body = await request.json()
    console.log('📨 PDF Generation: Received body:', body)
    
    const { sessionData } = body
    
    if (!sessionData || !sessionData.basic) {
      console.log('❌ PDF Generation: Missing session data')
      return NextResponse.json(
        { success: false, error: 'Missing session data' },
        { status: 400 }
      )
    }
    
    // Extract basic info from session data
    const solutions = Object.values(sessionData.solutions || {}).map((solution: any) => ({
      id: solution.id,
      title: solution.structure?.title || 'Untitled Solution',
      steps: solution.structure?.steps || '',
      approach: solution.structure?.approach || '',
      difficulty: solution.structure?.difficulty || 0,
      imageData: solution.additional?.imageData || null
    }))

    const templateData: TemplateData = {
      title: sessionData.basic.title || 'Untitled Project',
      engineer: sessionData.basic.engineer || 'Unknown Engineer',
      client: sessionData.basic.recipient || 'Unknown Client',
      date: sessionData.basic.date || new Date().toISOString().split('T')[0],
      isMultiSolution: sessionData.solutionCount > 1,
      solutions: solutions,
      totalSolutions: sessionData.solutionCount || solutions.length
    }
    
    console.log('📊 PDF Generation: Session data:', JSON.stringify(sessionData, null, 2))
    console.log('📊 PDF Generation: Extracted solutions:', solutions)
    console.log('📊 PDF Generation: Template data:', templateData)
    
    // Return JSON with template data for client-side processing
    const filename = `${templateData.title.replace(/[^a-zA-Z0-9]/g, '_')}_Report.pdf`
    
    return NextResponse.json({
      success: true,
      templateData,
      filename
    })
    
  } catch (error) {
    console.error('❌ PDF Generation: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF' },
      { status: 500 }
    )
  }
}
