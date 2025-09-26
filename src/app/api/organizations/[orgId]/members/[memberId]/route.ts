import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { requireMemberManagement } from '@/lib/api-rbac'

export async function PATCH(
  request: NextRequest,
  { params }: { params: { orgId: string; memberId: string } }
) {
  try {
    const { orgId, memberId } = params
    const body = await request.json()
    const { action, role, reason } = body

    // RBAC: Only Owners can manage members and roles
    const roleInfo = await requireMemberManagement(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Owner permission required for member management' },
        { status: 403 }
      )
    }

    const { user, role: userRole } = roleInfo

    // Validate action
    const validActions = ['change_role', 'offboard']
    if (!action || !validActions.includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action specified. Must be "change_role" or "offboard"' },
        { status: 400 }
      )
    }

    // Validate role for role changes
    if (action === 'change_role') {
      const validRoles = ['owner', 'admin', 'member', 'viewer', 'billing']
      if (!role || !validRoles.includes(role)) {
        return NextResponse.json(
          { error: 'Invalid role specified' },
          { status: 400 }
        )
      }
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

    // Handle different actions
    if (action === 'change_role') {
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
      if (userRole !== 'owner') {
        if (targetMembership.role === 'owner' || role === 'owner') {
          return NextResponse.json(
            { error: 'Only owners can modify owner roles' },
            { status: 403 }
          )
        }
      }
    } else if (action === 'offboard') {
      // Prevent offboarding the last owner
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
            { error: 'Cannot offboard the last owner of the organization' },
            { status: 400 }
          )
        }
      }

      // Prevent non-owners from offboarding owners
      if (userRole !== 'owner' && targetMembership.role === 'owner') {
        return NextResponse.json(
          { error: 'Only owners can offboard other owners' },
          { status: 403 }
        )
      }
    }

    let updatedMembership
    let auditAction
    let auditOldValues
    let auditNewValues

    if (action === 'change_role') {
      // Update the role
      updatedMembership = await prisma.organizationMembership.update({
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

      auditAction = 'role_change'
      auditOldValues = { role: targetMembership.role }
      auditNewValues = { role }

    } else if (action === 'offboard') {
      // Get organization info for offboarding data
      const organization = await prisma.organization.findUnique({
        where: { id: orgId },
        select: { name: true }
      })

      // Create comprehensive offboarding data
      const offboardingData = {
        nexa_offboarded: {
          status: 'offboarded',
          timestamp: new Date().toISOString(),
        offboarded_by_user_id: user!.id,
        offboarded_by_name: user!.fullName || user!.email,
          reason: reason || 'administrative_action',
          organization_name: organization?.name || 'Unknown Organization',
          original_role: targetMembership.role,
          final_login: null, // Could be enhanced with last login tracking
          data_retention_period_days: 90
        }
      }

      // Update membership to suspended with offboarding data
      updatedMembership = await prisma.organizationMembership.update({
        where: { id: memberId },
        data: { 
          status: 'suspended',
          offboardingData: offboardingData,
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

      auditAction = 'member_offboarding'
      auditOldValues = { 
        status: 'active', 
        role: targetMembership.role,
        offboardingData: {}
      }
      auditNewValues = { 
        status: 'suspended',
        role: targetMembership.role,
        offboardingData: offboardingData
      }
    }

    // Log the action in audit log
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: user!.id,
        action: auditAction!,
        resourceType: 'user',
        resourceId: targetMembership.user.id,
        oldValues: auditOldValues,
        newValues: auditNewValues,
        ipAddress: '127.0.0.1', // Fixed IP for development
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    return NextResponse.json({
      success: true,
      action: action,
      message: action === 'change_role' 
        ? `Role changed to ${role}` 
        : `Member offboarded successfully`,
      membership: {
        id: updatedMembership!.id,
        userId: updatedMembership!.user.id,
        email: updatedMembership!.user.email,
        name: updatedMembership!.user.fullName || `${updatedMembership!.user.firstName} ${updatedMembership!.user.lastName}`,
        avatarUrl: updatedMembership!.user.avatarUrl,
        role: updatedMembership!.role,
        status: updatedMembership!.status,
        joinedAt: updatedMembership!.joinedAt,
        emailVerified: !!updatedMembership!.user.emailVerifiedAt,
        ...(action === 'offboard' && { 
          offboardingData: updatedMembership!.offboardingData 
        })
      }
    })

  } catch (error: any) {
    console.error('Error updating member:', error)
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
    const { orgId, memberId } = params

    // RBAC: Only Owners can remove members
    const roleInfo = await requireMemberManagement(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Owner permission required for member removal' },
        { status: 403 }
      )
    }

    const { user, role: userRole } = roleInfo

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
    if (userRole !== 'owner' && targetMembership.role === 'owner') {
      return NextResponse.json(
        { error: 'Only owners can remove other owners' },
        { status: 403 }
      )
    }

    // Prevent users from removing themselves if they're the last admin/owner
    if (targetMembership.userId === user!.id) {
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
        userId: user!.id,
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
