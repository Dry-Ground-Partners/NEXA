import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { getCurrentUser } from '@/lib/auth'

const prisma = new PrismaClient()

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const { orgId } = params

    // Verify user has access to this organization
    const userMembership = user.organizationMemberships?.find(
      membership => membership.organization.id === orgId
    )

    if (!userMembership) {
      return NextResponse.json(
        { success: false, error: 'Access denied to this organization' },
        { status: 403 }
      )
    }

    // Fetch sessions for this organization
    const sessions = await prisma.aIArchitectureSession.findMany({
      where: {
        organizationId: orgId,
        deletedAt: null
      },
      orderBy: {
        updatedAt: 'desc'
      },
      select: {
        id: true,
        uuid: true,
        title: true,
        client: true,
        sessionType: true,
        createdAt: true,
        updatedAt: true,
        userId: true,
        user: {
          select: {
            fullName: true,
            firstName: true,
            lastName: true
          }
        }
      }
    })

    const formattedSessions = sessions.map(session => ({
      id: session.id.toString(),
      uuid: session.uuid,
      title: session.title || 'Untitled Session',
      type: session.sessionType,
      createdBy: session.user?.fullName || session.user?.firstName || 'Unknown User',
      collaborators: 1, // For now, just the creator
      lastModified: session.updatedAt,
      accessLevel: 'organization', // Default for now
      status: 'active'
    }))

    return NextResponse.json({
      success: true,
      sessions: formattedSessions
    })

  } catch (error) {
    console.error('Error fetching organization sessions:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}






