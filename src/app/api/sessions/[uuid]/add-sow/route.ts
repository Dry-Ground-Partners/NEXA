import { NextRequest, NextResponse } from 'next/server'
import { updateSessionWithSOW } from '@/lib/sessions-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const body = await request.json()
    const { sowData } = body
    
    console.log(`📝 Adding SOW to session: ${params.uuid}`)
    console.log(`   - Project: ${sowData.basic?.title || 'N/A'} for ${sowData.basic?.client || 'N/A'}`)
    console.log(`   - Deliverables: ${sowData.scope?.deliverables?.length || 0}`)
    console.log(`   - Timeline phases: ${sowData.timeline?.phases?.length || 0}`)
    
    if (!sowData) {
      return NextResponse.json(
        { success: false, error: 'SOW data is required' },
        { status: 400 }
      )
    }
    
    const success = await updateSessionWithSOW(params.uuid, sowData)
    
    if (success) {
      console.log('✅ Successfully added SOW to session')
      return NextResponse.json({ success: true })
    } else {
      console.log('❌ Failed to add SOW to session')
      return NextResponse.json(
        { success: false, error: 'Failed to add SOW to session' },
        { status: 500 }
      )
    }
  } catch (error: unknown) {
    console.error('💥 Error adding SOW to session:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}





