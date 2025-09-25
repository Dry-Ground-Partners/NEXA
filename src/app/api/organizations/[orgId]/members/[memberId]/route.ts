import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string; memberId: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, memberId } = params
    const body = await request.json()
    const { role } = body

    // Validate role
    const validRoles = ['owner', 'admin', 'member', 'viewer', 'billing']
    if (!role || !validRoles.includes(role)) {
      return NextResponse.json(
        { error: 'Invalid role specified' },
        { status: 400 }
      )
    }

    // Verify user has permission to change roles in this organization
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

    // Only owners and admins can change roles
    if (!['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to change roles' },
        { status: 403 }
      )
    }

    // Get the target membership
    const targetMembership = await prisma.organizationMembership.findFirst({
      where: {
        id: memberId,
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
            fullName: true
          }
        }
      }
    })

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Prevent demoting the last owner
    if (targetMembership.role === 'owner' && role !== 'owner') {
      const ownerCount = await prisma.organizationMembership.count({
        where: {
          organizationId: orgId,
          role: 'owner',
          status: 'active'
        }
      })

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot demote the last owner of the organization' },
          { status: 400 }
        )
      }
    }

    // Prevent non-owners from changing owner roles or creating new owners
    if (userMembership.role !== 'owner') {
      if (targetMembership.role === 'owner' || role === 'owner') {
        return NextResponse.json(
          { error: 'Only owners can modify owner roles' },
          { status: 403 }
        )
      }
    }

    // Update the role
    const updatedMembership = await prisma.organizationMembership.update({
      where: { id: memberId },
      data: { 
        role,
        updatedAt: new Date()
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
            emailVerifiedAt: true
          }
        }
      }
    })

    // Log the role change in audit log
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        action: 'role_change',
        resourceType: 'user',
        resourceId: targetMembership.user.id,
        oldValues: { role: targetMembership.role },
        newValues: { role },
        ipAddress: '127.0.0.1', // Fixed IP for development
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      membership: {
        id: updatedMembership.id,
        userId: updatedMembership.user.id,
        email: updatedMembership.user.email,
        name: updatedMembership.user.fullName || `${updatedMembership.user.firstName} ${updatedMembership.user.lastName}`,
        avatarUrl: updatedMembership.user.avatarUrl,
        role: updatedMembership.role,
        status: updatedMembership.status,
        joinedAt: updatedMembership.joinedAt,
        emailVerified: !!updatedMembership.user.emailVerifiedAt
      }
    })

  } catch (error: any) {
    console.error('Error updating member role:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { orgId: string; memberId: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId, memberId } = params

    // Verify user has permission to remove members from this organization
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

    // Only owners and admins can remove members
    if (!['owner', 'admin'].includes(userMembership.role)) {
      return NextResponse.json(
        { error: 'Insufficient permissions to remove members' },
        { status: 403 }
      )
    }

    // Get the target membership
    const targetMembership = await prisma.organizationMembership.findFirst({
      where: {
        id: memberId,
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
            fullName: true
          }
        }
      }
    })

    if (!targetMembership) {
      return NextResponse.json(
        { error: 'Member not found' },
        { status: 404 }
      )
    }

    // Prevent removing the last owner
    if (targetMembership.role === 'owner') {
      const ownerCount = await prisma.organizationMembership.count({
        where: {
          organizationId: orgId,
          role: 'owner',
          status: 'active'
        }
      })

      if (ownerCount <= 1) {
        return NextResponse.json(
          { error: 'Cannot remove the last owner of the organization' },
          { status: 400 }
        )
      }
    }

    // Prevent non-owners from removing owners
    if (userMembership.role !== 'owner' && targetMembership.role === 'owner') {
      return NextResponse.json(
        { error: 'Only owners can remove other owners' },
        { status: 403 }
      )
    }

    // Prevent users from removing themselves if they're the last admin/owner
    if (targetMembership.userId === user.id) {
      if (targetMembership.role === 'owner') {
        const ownerCount = await prisma.organizationMembership.count({
          where: {
            organizationId: orgId,
            role: 'owner',
            status: 'active'
          }
        })
        if (ownerCount <= 1) {
          return NextResponse.json(
            { error: 'Cannot remove yourself as the last owner' },
            { status: 400 }
          )
        }
      }
    }

    // Soft delete by updating status to 'suspended'
    await prisma.organizationMembership.update({
      where: { id: memberId },
      data: { 
        status: 'suspended',
        updatedAt: new Date()
      }
    })

    // Log the removal in audit log
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: user.id,
        action: 'member_removal',
        resourceType: 'user',
        resourceId: targetMembership.user.id,
        oldValues: { status: 'active', role: targetMembership.role },
        newValues: { status: 'suspended' },
        ipAddress: '127.0.0.1', // Fixed IP for development
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      message: 'Member removed successfully'
    })

  } catch (error: any) {
    console.error('Error removing member:', error)
    return NextResponse.json(
      { error: `Internal server error: ${error.message}` },
      { status: 500 }
    )
  }
}
