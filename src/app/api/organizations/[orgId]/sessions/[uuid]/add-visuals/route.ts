import { NextRequest, NextResponse } from 'next/server'
import { updateSessionWithVisuals } from '@/lib/sessions-server'
import { withUsageTracking } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string; uuid: string }> }
) {
  try {
    const { orgId, uuid } = await params
    console.log(`📝 Push: Structuring → Visuals for org ${orgId}, session ${uuid}`)
    
    // RBAC: Check organization access
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Organization access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { visualsData } = body
    
    console.log(`   - Basic info: ${visualsData.basic?.title || 'N/A'} for ${visualsData.basic?.client || 'N/A'}`)
    console.log(`   - Diagram sets: ${visualsData.diagramSets?.length || 0}`)
    
    if (!visualsData) {
      return NextResponse.json(
        { success: false, error: 'Visual data is required' },
        { status: 400 }
      )
    }
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'push_structuring_to_visuals',
      eventData: {
        sessionId: uuid,
        diagramSets: visualsData.diagramSets?.length || 0,
        hasTitle: !!visualsData.basic?.title,
        hasClient: !!visualsData.basic?.client,
        endpoint: '/api/organizations/[orgId]/sessions/[uuid]/add-visuals'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    const success = await updateSessionWithVisuals(uuid, visualsData)
    
    if (success) {
      console.log('✅ Successfully pushed to visuals')
      return NextResponse.json({ 
        success: true,
        usage: {
          creditsConsumed: trackingResult.creditsConsumed,
          remainingCredits: trackingResult.remainingCredits,
          usageEventId: trackingResult.usageEventId,
          warning: trackingResult.limitWarning
        }
      })
    } else {
      console.log('❌ Failed to push to visuals')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to add visuals to session',
          usage: {
            creditsConsumed: trackingResult.creditsConsumed,
            remainingCredits: trackingResult.remainingCredits,
            usageEventId: trackingResult.usageEventId,
            warning: trackingResult.limitWarning
          }
        },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('💥 Error pushing to visuals:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}




