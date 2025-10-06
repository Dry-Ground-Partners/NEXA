import { NextRequest, NextResponse } from 'next/server'
import { pdfServiceClient } from '@/lib/pdf/pdf-service-client'

export async function POST(request: NextRequest) {
  try {
    console.log('📄 Template-to-PDF: Converting modified template...')
    
    const { htmlTemplate } = await request.json()
    
    if (!htmlTemplate) {
      console.log('❌ Template-to-PDF: Missing HTML template')
      return NextResponse.json(
        { success: false, error: 'Missing HTML template' },
        { status: 400 }
      )
    }
    
    console.log('📊 Template-to-PDF: Template length:', htmlTemplate.length, 'characters')
    
    // Call PDF microservice to convert HTML to PDF
    const pdfBuffer = await pdfServiceClient.generatePDF(htmlTemplate)
    
    if (!pdfBuffer) {
      throw new Error('Failed to convert HTML template to PDF')
    }
    
    console.log('✅ Template-to-PDF: Converted successfully, size:', pdfBuffer.length, 'bytes')
    
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="maestro_modified.pdf"'
      }
    })
    
  } catch (error: unknown) {
    console.error('❌ Template-to-PDF: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to convert template to PDF' },
      { status: 500 }
    )
  }
}

