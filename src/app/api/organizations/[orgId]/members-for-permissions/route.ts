import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { getCurrentUser } from '@/lib/auth'
import { requireMemberManagement } from '@/lib/api-rbac'

/**
 * GET /api/organizations/[orgId]/members-for-permissions
 * Get organization members with basic info for permissions assignment
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params

    // RBAC: Only Owners can assign permissions
    const roleInfo = await requireMemberManagement(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { success: false, error: 'Access denied - Owner permission required for permission management' },
        { status: 403 }
      )
    }

    const { user } = roleInfo

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



