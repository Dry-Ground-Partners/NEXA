import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'
import { spawn } from 'child_process'
import path from 'path'

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
    
    // Call Python script to convert HTML to PDF
    const pdfBuffer = await convertHtmlToPdf(htmlTemplate)
    
    if (!pdfBuffer) {
      throw new Error('Failed to convert HTML template to PDF')
    }
    
    console.log('✅ Template-to-PDF: Converted successfully, size:', pdfBuffer.length, 'bytes')
    
    return new NextResponse(new Uint8Array(pdfBuffer), {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="maestro_modified.pdf"'
      }
    })
    
  } catch (error) {
    console.error('❌ Template-to-PDF: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to convert template to PDF' },
      { status: 500 }
    )
  }
}

async function convertHtmlToPdf(htmlTemplate: string): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    try {
      const scriptPath = path.join(process.cwd(), 'pdf-service', 'html_to_pdf.py')
      
      console.log('🐍 Calling HTML-to-PDF Python script:', scriptPath)
      
      const python = spawn('python3', [scriptPath], {
        stdio: ['pipe', 'pipe', 'pipe']
      })
      
      const chunks: Buffer[] = []
      const errorChunks: Buffer[] = []
      
      python.stdout.on('data', (chunk) => {
        chunks.push(chunk)
      })
      
      python.stderr.on('data', (chunk) => {
        errorChunks.push(chunk)
        console.log('🐍 Python stderr:', chunk.toString())
      })
      
      python.on('close', (code) => {
        if (code === 0 && chunks.length > 0) {
          const pdfBuffer = Buffer.concat(chunks)
          console.log('✅ PDF converted successfully, size:', pdfBuffer.length, 'bytes')
          resolve(pdfBuffer)
        } else {
          const errorMessage = Buffer.concat(errorChunks).toString()
          console.error('❌ Python script failed with code:', code)
          console.error('❌ Error message:', errorMessage)
          reject(new Error(`Python script failed with code: ${code}, Error: ${errorMessage}`))
        }
      })
      
      python.on('error', (error) => {
        console.error('❌ Failed to start Python process:', error)
        reject(new Error(`Failed to start Python process: ${getErrorMessage(error)}`))
      })
      
      // Send HTML template to Python script
      python.stdin.write(htmlTemplate)
      python.stdin.end()
      
    } catch (error) {
      console.error('❌ Error in convertHtmlToPdf:', error)
      reject(error)
    }
  })
}

