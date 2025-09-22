import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Solutioning HTML Template Extraction: Starting...')
    
    const body = await request.json()
    console.log('📨 HTML Template Extraction: Received body keys:', Object.keys(body))
    
    const { sessionData, sessionId } = body
    
    if (!sessionData || !sessionData.basic) {
      console.log('❌ HTML Template Extraction: Missing session data')
      return NextResponse.json(
        { success: false, error: 'Missing session data' },
        { status: 400 }
      )
    }
    
    // Transform data to match Python script expectations - EXACTLY THE SAME
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
    
    console.log('📊 HTML Template Extraction: Sending to Python:', {
      basic: pythonData.basic,
      solutionsCount: pythonData.solutions.length,
      sessionProtocol: pythonData.sessionProtocol
    })
    
    // Call Python script to get HTML template (not PDF)
    const htmlContent = await callPythonScriptForHTML(pythonData)
    
    if (!htmlContent) {
      throw new Error('Failed to generate HTML template')
    }
    
    console.log('✅ HTML Template Extraction: Generated successfully, length:', htmlContent.length, 'characters')
    
    return new NextResponse(htmlContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/html',
        'Content-Disposition': 'inline; filename="template.html"'
      }
    })
    
  } catch (error) {
    console.error('❌ HTML Template Extraction: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate HTML template' },
      { status: 500 }
    )
  }
}

async function callPythonScriptForHTML(data: any): Promise<string | null> {
  return new Promise((resolve, reject) => {
    try {
      const scriptPath = path.join(process.cwd(), 'pdf-service', 'generate_solutioning_html.py')
      
      console.log('🐍 Calling HTML generation Python script:', scriptPath)
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
          const htmlContent = Buffer.concat(chunks).toString('utf-8')
          console.log('✅ HTML generated successfully, length:', htmlContent.length, 'characters')
          resolve(htmlContent)
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
      console.error('❌ Error in callPythonScriptForHTML:', error)
      reject(error)
    }
  })
}

