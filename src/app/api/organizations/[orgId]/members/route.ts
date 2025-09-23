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

    // Fetch all members for this organization
    const memberships = await prisma.organizationMembership.findMany({
      where: {
        organizationId: orgId,
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            fullName: true,
            avatarUrl: true,
            status: true
          }
        }
      },
      orderBy: {
        joinedAt: 'desc'
      }
    })

    // Calculate session access for each member
    const memberData = await Promise.all(
      memberships.map(async (membership) => {
        // Count sessions this user has access to
        const sessionCount = await prisma.aIArchitectureSession.count({
          where: {
            organizationId: orgId,
            userId: membership.userId,
            deletedAt: null
          }
        })

        return {
          id: membership.id,
          name: membership.user.fullName || `${membership.user.firstName} ${membership.user.lastName}`.trim(),
          email: membership.user.email,
          role: membership.role,
          isOwner: membership.role === 'owner',
          sessionsAccess: sessionCount,
          lastActive: '2 hours ago', // TODO: Calculate from actual activity
          status: membership.status,
          joinedAt: membership.joinedAt?.toLocaleDateString() || 'Unknown'
        }
      })
    )

    // Calculate role distribution
    const roles = {
      owner: memberships.filter(m => m.role === 'owner').length,
      admin: memberships.filter(m => m.role === 'admin').length,
      member: memberships.filter(m => m.role === 'member').length,
      viewer: memberships.filter(m => m.role === 'viewer').length,
      billing: memberships.filter(m => m.role === 'billing').length
    }

    return NextResponse.json({
      success: true,
      members: memberData,
      roles: roles,
      totalMembers: memberships.length
    })

  } catch (error) {
    console.error('Error fetching organization members:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}






