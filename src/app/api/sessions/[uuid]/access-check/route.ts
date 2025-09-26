import { NextRequest, NextResponse } from 'next/server'
import { sessionAccessControl } from '@/lib/session-access-control'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/sessions/[uuid]/access-check
 * Check user's access level for a specific session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const sessionId = params.uuid
    
    // Check all access levels
    const [canRead, canWrite, canDelete] = await Promise.all([
      sessionAccessControl.canRead(sessionId),
      sessionAccessControl.canWrite(sessionId),
      sessionAccessControl.canDelete(sessionId)
    ])

    // Get the detailed access level for logging
    const accessLevel = await sessionAccessControl.evaluateSessionAccess(sessionId)

    console.log(`🔍 Access check for session ${sessionId} by user ${user.email}:`, {
      accessLevel,
      canRead,
      canWrite,
      canDelete
    })

    return NextResponse.json({
      success: true,
      sessionId,
      accessLevel,
      canRead,
      canWrite,
      canDelete
    })

  } catch (error) {
    console.error('❌ Error checking session access:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to check session access: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}


