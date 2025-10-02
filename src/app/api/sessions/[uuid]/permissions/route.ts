import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import type { AccessControlConfig } from '@/lib/session-access-control'

/**
 * GET /api/sessions/[uuid]/permissions
 * Get current access permissions configuration for a session
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
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

    // Get the session with access permissions
    const session = await prisma.aIArchitectureSession.findFirst({
      where: {
        uuid: sessionId,
        deletedAt: null
      },
      include: {
        organization: {
          include: {
            memberships: {
              where: { 
                userId: user.id,
                status: 'active',
                role: { in: ['owner', 'admin'] } // Only owners/admins can view permissions
              }
            }
          }
        },
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            email: true
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    // Check if user has permission to view session permissions
    const userMembership = session.organization.memberships[0]
    if (!userMembership) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Parse access permissions
    const accessPermissions = session.accessPermissions as any
    const accessControl = accessPermissions?.nexa_access_control as AccessControlConfig['nexa_access_control']

    // Determine current access mode
    let accessMode: 'organization' | 'per_role' | 'per_user' = 'organization'
    if (accessControl?.type) {
      accessMode = accessControl.type
    }

    return NextResponse.json({
      success: true,
      sessionId,
      session: {
        id: session.id,
        uuid: session.uuid,
        title: session.title,
        client: session.client,
        sessionType: session.sessionType,
        createdBy: session.user,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt
      },
      permissions: {
        accessMode,
        configuration: accessControl || null
      }
    })

  } catch (error) {
    console.error('❌ Error getting session permissions:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get session permissions: ${error instanceof Error ? getErrorMessage(error) : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/sessions/[uuid]/permissions
 * Update access permissions configuration for a session
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ uuid: string }> }
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
    const body = await request.json()
    const { accessMode, rolePermissions, userPermissions } = body

    // Validate access mode
    if (!['organization', 'per_role', 'per_user'].includes(accessMode)) {
      return NextResponse.json(
        { success: false, error: 'Invalid access mode' },
        { status: 400 }
      )
    }

    // Get the session and verify permissions
    const session = await prisma.aIArchitectureSession.findFirst({
      where: {
        uuid: sessionId,
        deletedAt: null
      },
      include: {
        organization: {
          include: {
            memberships: {
              where: { 
                userId: user.id,
                status: 'active',
                role: { in: ['owner', 'admin'] }
              }
            }
          }
        }
      }
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Session not found' },
        { status: 404 }
      )
    }

    const userMembership = session.organization.memberships[0]
    if (!userMembership) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions to modify session access' },
        { status: 403 }
      )
    }

    // Build new access permissions configuration
    let newAccessPermissions: any = {}

    if (accessMode === 'organization') {
      // Organization-wide access - empty permissions object
      newAccessPermissions = {}
    } else {
      // Granular access control
      const accessControl: AccessControlConfig['nexa_access_control'] = {
        version: '1.0',
        type: accessMode,
        created_by: user.id,
        created_at: new Date().toISOString()
      }

      if (accessMode === 'per_role' && rolePermissions) {
        accessControl.role_permissions = rolePermissions
      } else if (accessMode === 'per_user' && userPermissions) {
        accessControl.user_permissions = userPermissions.map((up: any) => ({
          ...up,
          granted_by: user.id,
          granted_at: new Date().toISOString()
        }))
      }

      newAccessPermissions = {
        nexa_access_control: accessControl
      }
    }

    // Update the session - only update access_permissions field
    // Log the current session data before update for debugging
    console.log('🔍 Before update - Current session JSONB fields:', {
      sessionObjects: !!session.sessionObjects && Object.keys(session.sessionObjects as any).length > 0,
      diagramTextsJson: !!session.diagramTextsJson && Object.keys(session.diagramTextsJson as any).length > 0,
      visualAssetsJson: !!session.visualAssetsJson && Object.keys(session.visualAssetsJson as any).length > 0,
      sowObjects: !!session.sowObjects && Object.keys(session.sowObjects as any).length > 0,
      loeObjects: !!session.loeObjects && Object.keys(session.loeObjects as any).length > 0,
    })

    // Use raw SQL to update only the access_permissions column to avoid any Prisma side effects
    await prisma.$executeRaw`
      UPDATE ai_architecture_sessions 
      SET access_permissions = ${JSON.stringify(newAccessPermissions)}::jsonb
      WHERE uuid = ${sessionId}::uuid
    `
    
    // Fetch the updated session for response
    const updatedSession = await prisma.aIArchitectureSession.findFirst({
      where: { uuid: sessionId }
    })

    // Log after update to see if data was lost
    const sessionAfterUpdate = await prisma.aIArchitectureSession.findFirst({
      where: { uuid: sessionId },
      select: {
        sessionObjects: true,
        diagramTextsJson: true,
        visualAssetsJson: true,
        sowObjects: true,
        loeObjects: true,
        accessPermissions: true
      }
    })
    
    console.log('🔍 After update - Session JSONB fields:', {
      sessionObjects: !!sessionAfterUpdate?.sessionObjects && Object.keys(sessionAfterUpdate.sessionObjects as any).length > 0,
      diagramTextsJson: !!sessionAfterUpdate?.diagramTextsJson && Object.keys(sessionAfterUpdate.diagramTextsJson as any).length > 0,
      visualAssetsJson: !!sessionAfterUpdate?.visualAssetsJson && Object.keys(sessionAfterUpdate.visualAssetsJson as any).length > 0,
      sowObjects: !!sessionAfterUpdate?.sowObjects && Object.keys(sessionAfterUpdate.sowObjects as any).length > 0,
      loeObjects: !!sessionAfterUpdate?.loeObjects && Object.keys(sessionAfterUpdate.loeObjects as any).length > 0,
      accessPermissions: sessionAfterUpdate?.accessPermissions
    })

    // Log audit event
    await prisma.auditLog.create({
      data: {
        organizationId: session.organizationId,
        userId: user.id,
        action: 'update_session_permissions',
        resourceType: 'ai_architecture_session',
        resourceId: session.uuid,
        oldValues: { accessPermissions: session.accessPermissions },
        newValues: { accessPermissions: newAccessPermissions },
        ipAddress: request.headers.get('x-forwarded-for') || 
                   request.headers.get('x-real-ip') || 
                   '127.0.0.1',
        userAgent: request.headers.get('user-agent')
      }
    })

    console.log(`✅ Session permissions updated for ${sessionId} by ${user.email}`)

    return NextResponse.json({
      success: true,
      sessionId,
      permissions: {
        accessMode,
        configuration: newAccessPermissions.nexa_access_control || null
      }
    })

  } catch (error) {
    console.error('❌ Error updating session permissions:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to update session permissions: ${error instanceof Error ? getErrorMessage(error) : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}
