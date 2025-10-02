import { NextRequest, NextResponse } from 'next/server'
import { spawn } from 'child_process'
import path from 'path'
import { getUserRoleFromRequest } from '@/lib/api-rbac'
import { getOrganizationPreferences } from '@/lib/preferences/preferences-service'

export async function POST(request: NextRequest) {
  try {
    console.log('🔍 SOW PDF Preview: Starting...')
    
    const body = await request.json()
    const { sessionData, sessionId } = body
    
    if (!sessionData || !sessionData.basic) {
      return NextResponse.json(
        { success: false, error: 'Missing session data' },
        { status: 400 }
      )
    }
    
    // PHASE 4: Fetch organization preferences for logo
    let secondLogo = ''
    
    try {
      const roleInfo = await getUserRoleFromRequest(request)
      if (roleInfo && roleInfo.user && roleInfo.user.organizationMemberships && roleInfo.user.organizationMemberships.length > 0) {
        const orgId = roleInfo.user.organizationMemberships[0].organization.id
        console.log(`🎨 SOW Preview: Fetching logo preferences for organization: ${orgId}`)
        
        const preferences = await getOrganizationPreferences(orgId)
        secondLogo = preferences.secondLogo || ''
        
        if (secondLogo) {
          console.log('✅ SOW Preview: Found organization secondary logo')
        } else {
          console.log('📸 SOW Preview: No organization logo set, will use default')
        }
      }
    } catch (error) {
      console.warn('⚠️ SOW Preview: Could not fetch organization preferences, using default logo:', error)
    }
    
    // Transform SOW session data to Python script format (matching original system structure)
    const pythonData = {
      project: sessionData.basic?.title || 'Untitled SOW',
      client: sessionData.basic?.client || 'Unknown Client',
      prepared_by: sessionData.basic?.engineer || 'Unknown Engineer',
      date: sessionData.basic?.date || new Date().toISOString().split('T')[0],
      project_purpose_background: sessionData.project?.background || '',
      objectives: (sessionData.project?.objectives || [])
        .map((obj: any) => obj.text)
        .filter(Boolean),
      
      // Scope data - using original field names
      in_scope_deliverables: (sessionData.scope?.deliverables || []).map((del: any) => ({
        deliverable: del.deliverable || '',
        key_features: del.keyFeatures || '',
        primary_artifacts: del.primaryArtifacts || ''
      })),
      out_of_scope: sessionData.scope?.outOfScope || '',
      
      // Requirements data  
      functional_requirements: (sessionData.clauses?.functionalRequirements || [])
        .map((req: any) => req.text)
        .filter(Boolean),
      non_functional_requirements: (sessionData.clauses?.nonFunctionalRequirements || [])
        .map((req: any) => req.text)
        .filter(Boolean),
      
      // Timeline data - structured as original system expects
      project_phases_timeline: {
        phases: (sessionData.timeline?.phases || []).map((phase: any) => ({
          phase: phase.phase || '',
          key_activities: phase.keyActivities || '',
          weeks_start: phase.weeksStart || 1,
          weeks_end: phase.weeksEnd || 4,
          weeks_display: `${phase.weeksStart || 1}-${phase.weeksEnd || 4}`
        }))
      },
      // PHASE 4: Add organization logo
      secondLogo: secondLogo
    }
    
    console.log('📊 SOW PDF Preview: Python data:', pythonData)
    
    // Call Python script
    const pdfBuffer = await callPythonScript(pythonData)
    
    if (!pdfBuffer) {
      throw new Error('Failed to generate PDF')
    }
    
    console.log('✅ SOW PDF Preview: PDF generated, size:', pdfBuffer.length, 'bytes')
    
    // Return PDF blob
    return new NextResponse(new Uint8Array(pdfBuffer), {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline',
      },
    })
    
  } catch (error) {
    console.error('❌ SOW PDF Preview: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate SOW PDF preview' },
      { status: 500 }
    )
  }
}

async function callPythonScript(data: any): Promise<Buffer | null> {
  return new Promise((resolve, reject) => {
    // Path to Python script
    const scriptPath = path.join(process.cwd(), 'pdf-service', 'generate_sow_standalone.py')
    console.log('🔍 Script path:', scriptPath)
    
    console.log('🐍 Calling Python script at:', scriptPath)
    
    // Spawn Python process
    const python = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    })
    
    const chunks: Buffer[] = []
    const errorChunks: Buffer[] = []
    
    // Collect PDF data from stdout
    python.stdout.on('data', (chunk) => {
      chunks.push(chunk)
    })
    
    // Collect error data
    python.stderr.on('data', (data) => {
      errorChunks.push(data)
    })
    
    // Handle completion
    python.on('close', (code) => {
      if (code === 0 && chunks.length > 0) {
        const pdfBuffer = Buffer.concat(chunks)
        console.log('✅ Python script completed successfully, PDF size:', pdfBuffer.length)
        resolve(pdfBuffer)
      } else {
        const errorMessage = Buffer.concat(errorChunks).toString()
        console.error('❌ Python script failed with code:', code)
        console.error('❌ Python script error:', errorMessage)
        reject(new Error(`Python script failed with code: ${code}, error: ${errorMessage}`))
      }
    })
    
    // Handle process errors
    python.on('error', (error) => {
      console.error('❌ Python process error:', error)
      reject(error)
    })
    
    // Send JSON data to Python script
    const jsonInput = JSON.stringify(data)
    console.log('📤 Sending to Python script:', jsonInput)
    python.stdin.write(jsonInput)
    python.stdin.end()
  })
}
