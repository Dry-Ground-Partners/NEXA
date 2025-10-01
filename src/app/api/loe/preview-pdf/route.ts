import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { getUserRoleFromRequest } from '@/lib/api-rbac'
import { getOrganizationPreferences } from '@/lib/preferences/preferences-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔄 LOE PDF Preview: Starting request processing')
    
    const body = await request.json()
    const { loeData } = body

    if (!loeData) {
      console.error('❌ LOE PDF Preview: Missing loeData in request')
      return NextResponse.json({ error: 'Missing loeData' }, { status: 400 })
    }

    console.log('📊 LOE PDF Preview: Received data for project:', loeData.info?.project || 'Unknown')

    // PHASE 4: Fetch organization preferences for logo
    let secondLogo = ''
    
    try {
      const roleInfo = await getUserRoleFromRequest(request)
      if (roleInfo && roleInfo.user && roleInfo.user.organizationMemberships && roleInfo.user.organizationMemberships.length > 0) {
        const orgId = roleInfo.user.organizationMemberships[0].organization.id
        console.log(`🎨 LOE Preview: Fetching logo preferences for organization: ${orgId}`)
        
        const preferences = await getOrganizationPreferences(orgId)
        secondLogo = preferences.secondLogo || ''
        
        if (secondLogo) {
          console.log('✅ LOE Preview: Found organization secondary logo')
        } else {
          console.log('📸 LOE Preview: No organization logo set, will use default')
        }
      }
    } catch (error) {
      console.warn('⚠️ LOE Preview: Could not fetch organization preferences, using default logo:', error)
    }

    // Transform LOE page data to match Python script expected format
    const pythonData = {
      basic: {
        project: loeData.info?.project || 'Untitled LOE',
        client: loeData.info?.client || 'Unknown Client',
        prepared_by: loeData.info?.preparedBy || 'Unknown Engineer',
        date: loeData.info?.date || new Date().toISOString().split('T')[0]
      },
      overview: loeData.workstreams?.overview || '',
      workstreams: loeData.workstreams?.workstreams || [],
      resources: loeData.resources?.resources || [],
      buffer: loeData.resources?.buffer || { weeks: 0, hours: 0 },
      assumptions: (loeData.assumptions?.assumptions || [])
        .map((a: any) => a.text)
        .filter(Boolean),
      goodOptions: loeData.variations?.goodOptions || [],
      bestOptions: loeData.variations?.bestOptions || [],
      // PHASE 4: Add organization logo
      secondLogo: secondLogo
    }

    console.log('🔄 LOE PDF Preview: Transformed data structure:', {
      project: pythonData.basic.project,
      client: pythonData.basic.client,
      workstreamsCount: pythonData.workstreams.length,
      resourcesCount: pythonData.resources.length,
      assumptionsCount: pythonData.assumptions.length,
      goodOptionsCount: pythonData.goodOptions.length,
      bestOptionsCount: pythonData.bestOptions.length
    })

    // Path to the Python script
    const scriptPath = path.join(process.cwd(), 'pdf-service', 'generate_loe_standalone.py')
    console.log('🐍 LOE PDF Preview: Using Python script at:', scriptPath)

    // Spawn Python process
    const python = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    })

    const chunks: Buffer[] = []
    const errorChunks: Buffer[] = []

    // Collect stdout (PDF data)
    python.stdout.on('data', (chunk) => {
      chunks.push(chunk)
    })

    // Collect stderr (error messages)
    python.stderr.on('data', (chunk) => {
      errorChunks.push(chunk)
    })

    // Send JSON data to Python script via stdin
    python.stdin.write(JSON.stringify(pythonData))
    python.stdin.end()

    // Wait for Python process to complete
    const result = await new Promise<Buffer>((resolve, reject) => {
      python.on('close', (code) => {
        const errorOutput = Buffer.concat(errorChunks).toString()
        
        if (errorOutput) {
          console.log('🐍 LOE PDF Preview: Python stderr:', errorOutput)
        }

        if (code === 0 && chunks.length > 0) {
          const pdfBuffer = Buffer.concat(chunks)
          console.log('✅ LOE PDF Preview: Successfully generated PDF, size:', pdfBuffer.length, 'bytes')
          resolve(pdfBuffer)
        } else {
          const errorMessage = errorOutput || `Python script failed with exit code: ${code}`
          console.error('❌ LOE PDF Preview: Python script failed:', errorMessage)
          reject(new Error(`Python script failed with code: ${code}, error: ${errorMessage}`))
        }
      })

      python.on('error', (error) => {
        console.error('❌ LOE PDF Preview: Python process error:', error)
        reject(error)
      })
    })

    // Return PDF for preview (inline display)
    return new NextResponse(result, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="loe_preview.pdf"',
      },
    })

  } catch (error) {
    console.error('❌ LOE PDF Preview: Error occurred:', error)
    return NextResponse.json(
      { error: 'Failed to generate LOE PDF preview' },
      { status: 500 }
    )
  }
}


