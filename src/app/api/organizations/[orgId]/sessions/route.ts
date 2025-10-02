import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { requireAccessManagement } from '@/lib/api-rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params

    // RBAC: Require Access Management permission (excludes Billing users)
    const roleInfo = await requireAccessManagement(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Access management permission required' },
        { status: 403 }
      )
    }

    const { user } = roleInfo

    // Get all sessions for this organization (simplified query first)
    const sessions = await prisma.aIArchitectureSession.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true
          }
        }
      },
      orderBy: {
        updatedAt: 'desc'
      },
      take: 20
    })

    return NextResponse.json({
      success: true,
      sessions: sessions.map(session => ({
        id: session.id,
        uuid: session.uuid,
        title: session.title || 'Untitled Session',
        client: session.client || 'No Client',
        sessionType: session.sessionType || 'solution',
        isTemplate: session.isTemplate || false,
        createdAt: session.createdAt,
        updatedAt: session.updatedAt,
        lastModified: session.updatedAt, // Map updatedAt to lastModified
        accessLevel: 'organization', // Default access level
        createdBy: {
          id: session.user.id,
          name: session.user.fullName || `${session.user.firstName} ${session.user.lastName}`,
          email: session.user.email
        }
      })),
      totalSessions: sessions.length
    })

  } catch (error: unknown) {
    console.error('Error fetching organization sessions:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error instanceof Error ? error.message : "Unknown error"}` },
      { status: 500 }
    )
  }
}
