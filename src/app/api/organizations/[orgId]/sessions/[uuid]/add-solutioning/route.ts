import { NextRequest, NextResponse } from 'next/server'
import { updateSessionWithSolutioning } from '@/lib/sessions-server'
import { withUsageTracking } from '@/lib/middleware/usage-middleware'
import { requireOrganizationAccess } from '@/lib/api-rbac'

export async function PUT(
  request: NextRequest,
  { params }: { params: { orgId: string; uuid: string } }
) {
  try {
    const { orgId, uuid } = params
    console.log(`📝 Push: Visuals → Solutioning for org ${orgId}, session ${uuid}`)
    
    // RBAC: Check organization access
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Organization access required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { solutioningData } = body
    
    console.log(`   - Basic info: ${solutioningData.basic?.title || 'N/A'} for ${solutioningData.basic?.recipient || 'N/A'}`)
    console.log(`   - Solutions: ${Object.keys(solutioningData.solutions || {}).length}`)
    
    if (!solutioningData) {
      return NextResponse.json(
        { success: false, error: 'Solutioning data is required' },
        { status: 400 }
      )
    }
    
    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'push_visuals_to_solutioning',
      eventData: {
        sessionId: uuid,
        solutionCount: Object.keys(solutioningData.solutions || {}).length,
        hasTitle: !!solutioningData.basic?.title,
        hasRecipient: !!solutioningData.basic?.recipient,
        endpoint: '/api/organizations/[orgId]/sessions/[uuid]/add-solutioning'
      }
    })

    console.log(`💰 Usage tracked: ${trackingResult.creditsConsumed} credits consumed, ${trackingResult.remainingCredits} remaining`)
    
    const success = await updateSessionWithSolutioning(uuid, solutioningData)
    
    if (success) {
      console.log('✅ Successfully pushed to solutioning')
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
      console.log('❌ Failed to push to solutioning')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to add solutioning to session',
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
  } catch (error: unknown) {
    console.error('💥 Error pushing to solutioning:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}



















