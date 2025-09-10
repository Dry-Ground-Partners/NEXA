import { NextRequest, NextResponse } from 'next/server'
import { updateSessionWithVisuals } from '@/lib/sessions-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const body = await request.json()
    const { visualsData } = body
    
    console.log(`📝 Adding visuals to session: ${params.uuid}`)
    console.log(`   - Basic info: ${visualsData.basic?.title || 'N/A'} for ${visualsData.basic?.client || 'N/A'}`)
    console.log(`   - Diagram sets: ${visualsData.diagramSets?.length || 0}`)
    
    if (!visualsData) {
      return NextResponse.json(
        { success: false, error: 'Visual data is required' },
        { status: 400 }
      )
    }
    
    const success = await updateSessionWithVisuals(params.uuid, visualsData)
    
    if (success) {
      console.log('✅ Successfully added visuals to session')
      return NextResponse.json({ success: true })
    } else {
      console.log('❌ Failed to add visuals to session')
      return NextResponse.json(
        { success: false, error: 'Failed to add visuals to session' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('💥 Error adding visuals to session:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
