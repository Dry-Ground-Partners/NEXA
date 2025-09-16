import { NextRequest, NextResponse } from 'next/server'
import { updateSessionWithLOE } from '@/lib/sessions-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const body = await request.json()
    const { loeData } = body

    console.log(`📝 Adding LOE to session: ${params.uuid}`)
    console.log(`   - Project: ${loeData.info?.project || 'N/A'} for ${loeData.info?.client || 'N/A'}`)
    console.log(`   - Workstreams: ${loeData.workstreams?.workstreams?.length || 0}`)
    console.log(`   - Resources: ${loeData.resources?.resources?.length || 0}`)

    if (!loeData) {
      return NextResponse.json(
        { success: false, error: 'LOE data is required' },
        { status: 400 }
      )
    }

    const success = await updateSessionWithLOE(params.uuid, loeData)

    if (success) {
      console.log('✅ Successfully added LOE to session')
      return NextResponse.json({ success: true })
    } else {
      console.log('❌ Failed to add LOE to session')
      return NextResponse.json(
        { success: false, error: 'Failed to add LOE to session' },
        { status: 500 }
      )
    }

  } catch (error) {
    console.error('💥 Error adding LOE to session:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}




