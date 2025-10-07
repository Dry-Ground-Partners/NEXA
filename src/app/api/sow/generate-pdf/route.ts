import { NextRequest, NextResponse } from 'next/server'
import { getUserRoleFromRequest } from '@/lib/api-rbac'
import { getOrganizationPreferences } from '@/lib/preferences/preferences-service'
import { pdfServiceClient } from '@/lib/pdf/pdf-service-client'

export async function POST(request: NextRequest) {
  try {
    console.log('📥 SOW PDF Download: Starting...')
    
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
        console.log(`🎨 SOW: Fetching logo preferences for organization: ${orgId}`)
        
        const preferences = await getOrganizationPreferences(orgId)
        secondLogo = preferences.secondLogo || ''
        
        if (secondLogo) {
          console.log('✅ SOW PDF: Found organization secondary logo')
        } else {
          console.log('📸 SOW PDF: No organization logo set, will use default')
        }
      }
    } catch (error: unknown) {
      console.warn('⚠️ SOW PDF: Could not fetch organization preferences, using default logo:', error)
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
    
    console.log('📊 SOW PDF Download: Sending data to PDF microservice')
    
    // Call PDF microservice
    const pdfBuffer = await pdfServiceClient.generateSOWPDF(pythonData)
    
    console.log('✅ SOW PDF Download: PDF generated, size:', pdfBuffer.length, 'bytes')
    
    // Generate filename with sanitized project name
    const sanitizedProjectName = pythonData.project
      .replace(/[^a-zA-Z0-9\s-]/g, '')
      .replace(/\s+/g, '_')
      .substring(0, 50)
    const filename = `SOW_${sanitizedProjectName}_${new Date().toISOString().split('T')[0]}.pdf`
    
    // Return PDF as attachment for download
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="${filename}"`,
      },
    })
    
  } catch (error: unknown) {
    console.error('❌ SOW PDF Download: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate SOW PDF download' },
      { status: 500 }
    )
  }
}
