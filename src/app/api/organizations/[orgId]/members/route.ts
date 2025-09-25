import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = params

    // Verify user has access to this organization
    const userMembership = await prisma.organizationMembership.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
        status: 'active'
      }
    })

    if (!userMembership) {
      return NextResponse.json(
        { error: 'Access denied to this organization' },
        { status: 403 }
      )
    }

    // Get all active members of the organization
    const members = await prisma.organizationMembership.findMany({
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
            status: true,
            emailVerifiedAt: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // owners first, then admins, etc.
        { joinedAt: 'asc' }
      ]
    })

    // Count members by role for role summary
    const roleCounts = members.reduce((acc, member) => {
      acc[member.role] = (acc[member.role] || 0) + 1
      return acc
    }, {} as Record<string, number>)

    return NextResponse.json({
      success: true,
      members: members.map(member => ({
        id: member.id,
        userId: member.user.id,
        email: member.user.email,
        name: member.user.fullName,
        firstName: member.user.firstName,
        lastName: member.user.lastName,
        avatarUrl: member.user.avatarUrl,
        role: member.role,
        status: member.status,
        joinedAt: member.joinedAt,
        emailVerified: !!member.user.emailVerifiedAt,
        userStatus: member.user.status,
        lastActive: member.joinedAt // Can be enhanced with actual last activity tracking
      })),
      roles: roleCounts,
      totalMembers: members.length
    })

  } catch (error) {
    console.error('Error fetching organization members:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

