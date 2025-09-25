import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'

/**
 * GET /api/organizations/[orgId]/members-for-permissions
 * Get organization members with basic info for permissions assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const user = await getCurrentUser()
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Authentication required' },
        { status: 401 }
      )
    }

    const { orgId } = params

    // Verify user has permission to view members
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
        status: 'active',
        role: { in: ['owner', 'admin'] } // Only owners and admins can assign permissions
      }
    })

    if (!membership) {
      return NextResponse.json(
        { success: false, error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

    // Get all active members
    const members = await prisma.organizationMembership.findMany({
      where: {
        organizationId: orgId,
        status: 'active'
      },
      include: {
        user: {
          select: {
            id: true,
            firstName: true,
            lastName: true,
            fullName: true,
            email: true,
            avatarUrl: true
          }
        }
      },
      orderBy: [
        { role: 'asc' }, // owners first, then admins, etc.
        { user: { fullName: 'asc' } }
      ]
    })

    const membersList = members.map(member => ({
      id: member.user.id,
      email: member.user.email,
      fullName: member.user.fullName || `${member.user.firstName} ${member.user.lastName}`.trim(),
      firstName: member.user.firstName,
      lastName: member.user.lastName,
      avatarUrl: member.user.avatarUrl,
      role: member.role,
      joinedAt: member.createdAt
    }))

    return NextResponse.json({
      success: true,
      members: membersList
    })

  } catch (error) {
    console.error('❌ Error getting organization members for permissions:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to get members: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  }
}

