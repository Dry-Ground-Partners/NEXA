import { NextRequest, NextResponse } from 'next/server'
import { generateCoverHTML, type TemplateData } from '@/lib/pdf/html-template'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 PDF Preview: Starting...')
    
    const body = await request.json()
    console.log('📨 PDF Preview: Received body:', body)
    
    const { sessionData, sessionId } = body
    
    if (!sessionData || !sessionData.basic) {
      console.log('❌ PDF Preview: Missing session data')
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
      layout: solution.structure?.layout || 1,
      imageData: solution.additional?.imageData || null
    }))

    // Extract short protocol from sessionId (first part before hyphen)
    const shortProtocol = sessionId ? sessionId.split('-')[0].toUpperCase() : 'SH123'
    
    const templateData: TemplateData = {
      title: sessionData.basic.title || 'Untitled Project',
      engineer: sessionData.basic.engineer || 'Unknown Engineer', 
      client: sessionData.basic.recipient || 'Unknown Client',
      date: sessionData.basic.date || new Date().toISOString().split('T')[0],
      isMultiSolution: sessionData.solutionCount > 1,
      solutions: solutions,
      totalSolutions: sessionData.solutionCount || solutions.length,
      sessionProtocol: shortProtocol
    }
    
    console.log('📊 PDF Preview: Session data:', JSON.stringify(sessionData, null, 2))
    console.log('📊 PDF Preview: Extracted solutions:', solutions)
    console.log('📊 PDF Preview: Template data:', templateData)
    
    // Generate HTML for debugging
    const { generateCoverHTML } = await import('@/lib/pdf/html-template')
    const htmlOutput = generateCoverHTML(templateData)
    
    console.log('📄 Generated HTML length:', htmlOutput.length)
    console.log('📄 Solution pages in HTML:', htmlOutput.includes('layout-page') ? 'YES' : 'NO')
    console.log('📄 Solution count in HTML:', (htmlOutput.match(/layout-page/g) || []).length)
    
    // Return JSON with template data for client-side processing
    return NextResponse.json({
      success: true,
      templateData
    })
    
  } catch (error) {
    console.error('❌ PDF Preview: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF preview' },
      { status: 500 }
    )
  }
}
