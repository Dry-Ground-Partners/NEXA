import { NextRequest, NextResponse } from 'next/server'
import { updateSessionWithSolutioning } from '@/lib/sessions-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const body = await request.json()
    const { solutioningData } = body
    
    console.log(`📝 Adding solutioning to session: ${params.uuid}`)
    console.log(`   - Basic info: ${solutioningData.basic?.title || 'N/A'} for ${solutioningData.basic?.recipient || 'N/A'}`)
    console.log(`   - Solutions: ${Object.keys(solutioningData.solutions || {}).length}`)
    
    if (!solutioningData) {
      return NextResponse.json(
        { success: false, error: 'Solutioning data is required' },
        { status: 400 }
      )
    }
    
    const success = await updateSessionWithSolutioning(params.uuid, solutioningData)
    
    if (success) {
      console.log('✅ Successfully added solutioning to session')
      return NextResponse.json({ success: true })
    } else {
      console.log('❌ Failed to add solutioning to session')
      return NextResponse.json(
        { success: false, error: 'Failed to add solutioning to session' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('💥 Error adding solutioning to session:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}




