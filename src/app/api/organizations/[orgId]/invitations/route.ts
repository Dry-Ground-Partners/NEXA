import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'
import { requireMemberManagement } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params
    const body = await request.json()
    const { email, firstName, lastName, role, personalMessage } = body

    // RBAC: Only Owners can invite members
    const roleInfo = await requireMemberManagement(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Owner permission required to invite members' },
        { status: 403 }
      )
    }

    const { user } = roleInfo

    // Validate required fields
    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, firstName, lastName, role' },
        { status: 400 }
      )
    }

    // Get organization info (we know user has access from RBAC check)
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { name: true }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Check if user already exists
    let existingUser = await prisma.user.findUnique({
      where: { email }
    })

    // Check if user is already a member of the organization
    let isReInvite = false
    let previousOffboardingData = null
    
    if (existingUser) {
      const existingMembership = await prisma.organizationMembership.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: orgId,
          status: { in: ['active', 'pending'] }
        }
      })

      if (existingMembership) {
        return NextResponse.json(
          { error: 'User is already a member of this organization' },
          { status: 409 }
        )
      }

      // Check for previously offboarded user (re-invite scenario)
      const offboardedMembership = await prisma.organizationMembership.findFirst({
        where: {
          userId: existingUser.id,
          organizationId: orgId,
          status: 'suspended',
          offboardingData: { 
            path: ['nexa_offboarded'], 
            not: {} 
          }
        }
      })

      if (offboardedMembership) {
        isReInvite = true
        previousOffboardingData = offboardedMembership.offboardingData as any
        
        const reason = previousOffboardingData.nexa_offboarded?.reason
        
        // Simple policy: Only owners can re-invite users offboarded for security reasons
        if (['security_concern', 'policy_violation'].includes(reason) && 
            roleInfo.role !== 'owner') {
          return NextResponse.json(
            { 
              error: 'Only owners can re-invite users offboarded for security or policy violations',
              details: { 
                reason: 'insufficient_permissions',
                previous_offboard_reason: reason,
                requires_owner_approval: true
              }
            },
            { status: 403 }
          )
        }
        
        console.log(`🔄 Re-invite detected for ${email} - Previous reason: ${reason}`)
      }
    }

    // Generate invitation token
    const invitationToken = uuidv4()

    // Create or update user record if needed
    if (!existingUser) {
      existingUser = await prisma.user.create({
        data: {
          email,
          firstName,
          lastName,
          fullName: `${firstName} ${lastName}`.trim(),
          status: 'pending',
          // Password will be set when they complete registration
          passwordHash: '' // Temporary empty password
        }
      })
    }

    // Create organization membership with pending status
    const organizationMembership = await prisma.organizationMembership.create({
      data: {
        userId: existingUser.id,
        organizationId: orgId,
        role,
        status: 'pending',
        invitationToken,
        invitedBy: user!.id,
        invitedAt: new Date(),
      }
    })

    // Prepare email payload
    const verificationUrl = `${process.env.NEXT_PUBLIC_APP_URL}/invite/${invitationToken}`
    
    const emailPayload = {
      recipient_email: email,
      verification_code: invitationToken,
      verification_url: verificationUrl,
      user_name: `${firstName} ${lastName}`.trim(),
      organization_name: organization.name,
      email_type: 'organization_invitation',
      subject: `You're invited to join ${organization.name} on NEXA`
    }

    // Send email via external service
    const emailServiceUrl = process.env.EMAIL_SERVICE_URL
    const emailServiceKey = process.env.KEY_CONAN_2FA

    if (!emailServiceUrl || !emailServiceKey) {
      console.error('Email service configuration missing')
      return NextResponse.json(
        { error: 'Email service not configured' },
        { status: 500 }
      )
    }

    const emailResponse = await fetch(emailServiceUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'KEY_CONAN_2FA': emailServiceKey
      },
      body: JSON.stringify(emailPayload)
    })

    if (!emailResponse.ok) {
      console.error('Failed to send invitation email:', await emailResponse.text())
      // Clean up the membership record if email fails
      await prisma.organizationMembership.delete({
        where: { id: organizationMembership.id }
      })
      
      return NextResponse.json(
        { error: 'Failed to send invitation email' },
        { status: 500 }
      )
    }

    // Add audit logging for invitation (including re-invites)
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: user!.id,
        action: isReInvite ? 'member_reinvite' : 'member_invite',
        resourceType: 'user',
        resourceId: existingUser?.id || organizationMembership.userId,
        oldValues: isReInvite ? { 
          previous_offboarding: previousOffboardingData 
        } : {},
        newValues: { 
          email,
          role,
          invited_by: user!.id,
          invited_by_name: user!.fullName || user!.email,
          ...(isReInvite && { 
            reinvite_reason: 'role_reopened',
            previous_offboard_reason: previousOffboardingData?.nexa_offboarded?.reason
          })
        },
        ipAddress: '127.0.0.1', // Fixed IP for development
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Return success response
    const expiresAt = new Date(organizationMembership.invitedAt!)
    expiresAt.setDate(expiresAt.getDate() + 7) // Calculate expiration (7 days from invitation)
    
    return NextResponse.json({
      success: true,
      invitation: {
        id: organizationMembership.id,
        email,
        role,
        status: 'pending',
        expiresAt,
        invitationToken,
        isReInvite,
        ...(isReInvite && {
          previousOffboarding: {
            reason: previousOffboardingData?.nexa_offboarded?.reason,
            timestamp: previousOffboardingData?.nexa_offboarded?.timestamp,
            offboardedBy: previousOffboardingData?.nexa_offboarded?.offboarded_by_name
          }
        })
      }
    })

  } catch (error) {
    console.error('Error sending invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params

    // RBAC: Only Owners can view invitations
    const roleInfo = await requireMemberManagement(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Owner permission required to view invitations' },
        { status: 403 }
      )
    }

    const { user } = roleInfo

    // Get all pending invitations for the organization (filter expired ones after fetch)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const invitations = await prisma.organizationMembership.findMany({
      where: {
        organizationId: orgId,
        status: 'pending',
        invitedAt: {
          gt: sevenDaysAgo // Only invitations from last 7 days (not expired)
        }
      },
      include: {
        user: {
          select: {
            email: true,
            firstName: true,
            lastName: true,
            fullName: true
          }
        },
        inviter: {
          select: {
            firstName: true,
            lastName: true,
            fullName: true
          }
        }
      },
      orderBy: {
        invitedAt: 'desc'
      }
    })

    return NextResponse.json({
      invitations: invitations.map(inv => {
        const expiresAt = new Date(inv.invitedAt!)
        expiresAt.setDate(expiresAt.getDate() + 7) // Calculate expiration (7 days from invitation)
        
        return {
          id: inv.id,
          email: inv.user.email,
          name: inv.user.fullName,
          role: inv.role,
          invitedBy: inv.inviter?.fullName || 'Unknown',
          invitedAt: inv.invitedAt,
          expiresAt,
          status: inv.status
        }
      })
    })

  } catch (error) {
    console.error('Error fetching invitations:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
