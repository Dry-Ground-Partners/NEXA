import { NextRequest, NextResponse } from 'next/server'
import { getUserRoleFromRequest } from '@/lib/api-rbac'
import { getOrganizationPreferences } from '@/lib/preferences/preferences-service'
import { pdfServiceClient } from '@/lib/pdf/pdf-service-client'

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

    // Fetch organization preferences for logos (main + header)
    let mainLogo = ''
    let secondLogo = ''
    
    try {
      const roleInfo = await getUserRoleFromRequest(request)
      if (roleInfo && roleInfo.user && roleInfo.user.organizationMemberships && roleInfo.user.organizationMemberships.length > 0) {
        const orgId = roleInfo.user.organizationMemberships[0].organization.id
        console.log(`🎨 LOE Preview: Fetching logo preferences for organization: ${orgId}`)
        
        const preferences = await getOrganizationPreferences(orgId)
        mainLogo = preferences.mainLogo || ''
        secondLogo = preferences.secondLogo || ''
        
        if (mainLogo) {
          console.log('✅ LOE Preview: Found organization main logo')
        }
        if (secondLogo) {
          console.log('✅ LOE Preview: Found organization secondary logo')
        }
        if (!mainLogo && !secondLogo) {
          console.log('📸 LOE Preview: No organization logos set, will use defaults')
        }
      }
    } catch (error: unknown) {
      console.warn('⚠️ LOE Preview: Could not fetch organization preferences, using default logos:', error)
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
      // Organization logos
      mainLogo: mainLogo,
      secondLogo: secondLogo
    }

    console.log('📊 LOE PDF Preview: Sending data to PDF microservice')

    // Call PDF microservice
    const pdfBuffer = await pdfServiceClient.generateLOEPDF(pythonData)

    console.log('✅ LOE PDF Preview: PDF generated, size:', pdfBuffer.length, 'bytes')

    // Return PDF for preview (inline display)
    return new NextResponse(pdfBuffer as unknown as BodyInit, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'inline; filename="loe_preview.pdf"',
      },
    })

  } catch (error: unknown) {
    console.error('❌ LOE PDF Preview: Error occurred:', error)
    return NextResponse.json(
      { error: 'Failed to generate LOE PDF preview' },
      { status: 500 }
    )
  }
}


