import { NextRequest, NextResponse } from 'next/server'
import { generateCoverHTML, type TemplateData } from '@/lib/pdf/html-template'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 PDF Preview: Starting...')
    
    const body = await request.json()
    console.log('📨 PDF Preview: Received body:', body)
    
    const { sessionData } = body
    
    if (!sessionData || !sessionData.basic) {
      console.log('❌ PDF Preview: Missing session data')
      return NextResponse.json(
        { success: false, error: 'Missing session data' },
        { status: 400 }
      )
    }
    
    // Extract basic info from session data
    const templateData: TemplateData = {
      title: sessionData.basic.title || 'Untitled Project',
      engineer: sessionData.basic.engineer || 'Unknown Engineer', 
      client: sessionData.basic.recipient || 'Unknown Client',  // Fixed: recipient -> client
      date: sessionData.basic.date || new Date().toISOString().split('T')[0],
      isMultiSolution: sessionData.solutionCount > 1
    }
    
    console.log('📊 PDF Preview: Extracted data:', templateData)
    
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
