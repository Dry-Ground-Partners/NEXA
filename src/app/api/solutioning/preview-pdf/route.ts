import { NextRequest, NextResponse } from 'next/server'
import { getUserRoleFromRequest } from '@/lib/api-rbac'
import { getOrganizationPreferences } from '@/lib/preferences/preferences-service'
import { pdfServiceClient } from '@/lib/pdf/pdf-service-client'

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
    
    // PHASE 4: Fetch organization preferences for logos
    let mainLogo = ''
    let secondLogo = ''
    
    try {
      const roleInfo = await getUserRoleFromRequest(request)
      if (roleInfo && roleInfo.user && roleInfo.user.organizationMemberships && roleInfo.user.organizationMemberships.length > 0) {
        const orgId = roleInfo.user.organizationMemberships[0].organization.id
        console.log(`🎨 Fetching logo preferences for organization: ${orgId}`)
        
        const preferences = await getOrganizationPreferences(orgId)
        mainLogo = preferences.mainLogo || ''
        secondLogo = preferences.secondLogo || ''
        
        if (mainLogo || secondLogo) {
          console.log(`✅ PDF Preview: Found organization logos (main: ${!!mainLogo}, secondary: ${!!secondLogo})`)
        } else {
          console.log('📸 PDF Preview: No organization logos set, will use defaults')
        }
      }
    } catch (error: unknown) {
      console.warn('⚠️ PDF Preview: Could not fetch organization preferences, using default logos:', error)
    }
    
    console.log('📊 Solutioning PDF Preview: Calling PDF microservice')
    
    // Call PDF microservice
    const pdfBuffer = await pdfServiceClient.generateSolutioningPDF(
      sessionData,
      sessionId,
      mainLogo,
      secondLogo
    )
    
    if (!pdfBuffer) {
      throw new Error('Failed to generate PDF')
    }
    
    console.log('✅ Solutioning PDF Preview: Generated successfully, size:', pdfBuffer.length, 'bytes')
    
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="solutioning_preview.pdf"'
      }
    })
    
  } catch (error: unknown) {
    console.error('❌ Solutioning PDF Preview: Error:', error)
    return NextResponse.json(
      { success: false, error: 'Failed to generate PDF preview' },
      { status: 500 }
    )
  }
}
