import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 Solutioning PDF Preview: Starting...')
    
    const body = await request.json()
    console.log('📨 Solutioning PDF Preview: Received body keys:', Object.keys(body))
    
    const { sessionData, sessionId } = body
    
    if (!sessionData || !sessionData.basic) {
      console.log('❌ Solutioning PDF Preview: Missing session data')
      return NextResponse.json(
        { success: false, error: 'Missing session data' },
        { status: 400 }
      )
    }
    
    // Transform data to match Python script expectations
    const pythonData = {
      basic: {
        title: sessionData.basic.title || 'Untitled Project',
        engineer: sessionData.basic.engineer || 'Unknown Engineer',
        recipient: sessionData.basic.recipient || 'Unknown Client',
        date: sessionData.basic.date || new Date().toISOString().split('T')[0]
      },
      solutions: Object.values(sessionData.solutions || {}).map((solution: any) => ({
        title: solution.structure?.title || 'Untitled Solution',
        steps: solution.structure?.steps || '',
        approach: solution.structure?.approach || '',
        difficulty: solution.structure?.difficulty || 0,
        layout: solution.structure?.layout || 1,
        imageData: solution.additional?.imageData || null
      })),
      sessionProtocol: sessionId ? sessionId.split('-')[0].toUpperCase() : 'SH123'
    }
    
    console.log('📊 Solutioning PDF Preview: Sending to Python:', {
      basic: pythonData.basic,
      solutionsCount: pythonData.solutions.length,
      sessionProtocol: pythonData.sessionProtocol
    })
    
    // Call Python script
    const pdfBuffer = await callPythonScript(pythonData)
    
    if (!pdfBuffer) {
      throw new Error('Failed to generate PDF')
    }
    
    console.log('✅ Solutioning PDF Preview: Generated successfully, size:', pdfBuffer.length, 'bytes')
    
    return new NextResponse(pdfBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="solutioning_preview.pdf"'
      }
    })
    
  } catch (error) {
    console.error('❌ Solutioning PDF Preview: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF preview' },
      { status: 500 }
    )
  }
}

async function callPythonScript(data: any): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    try {
      const scriptPath = path.join(process.cwd(), 'pdf-service', 'generate_solutioning_standalone.py')
      
      console.log('🐍 Calling Python script:', scriptPath)
      console.log('📊 Data being sent to Python:', JSON.stringify(data, null, 2))
      
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
          console.log('✅ PDF generated successfully, size:', pdfBuffer.length, 'bytes')
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
        reject(new Error(`Failed to start Python process: ${error.message}`))
      })
      
      // Send JSON data to Python script
      python.stdin.write(JSON.stringify(data))
      python.stdin.end()
      
    } catch (error) {
      console.error('❌ Error in callPythonScript:', error)
      reject(error)
    }
  })
}
