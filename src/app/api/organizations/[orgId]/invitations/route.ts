import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth } from '@/lib/auth'
import { v4 as uuidv4 } from 'uuid'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = params
    const body = await request.json()
    const { email, firstName, lastName, role, personalMessage } = body

    // Validate required fields
    if (!email || !firstName || !lastName || !role) {
      return NextResponse.json(
        { error: 'Missing required fields: email, firstName, lastName, role' },
        { status: 400 }
      )
    }

    // Verify user has permission to invite to this organization
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
        status: 'active',
        role: { in: ['owner', 'admin'] } // Only owners and admins can invite
      },
      include: {
        organization: true
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions to invite users to this organization' },
        { status: 403 }
      )
    }

    // Check if user already exists
    let existingUser = await prisma.user.findUnique({
      where: { email }
    })

    // Check if user is already a member of the organization
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
        invitedBy: user.id,
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
      organization_name: membership.organization.name,
      email_type: 'organization_invitation',
      subject: `You're invited to join ${membership.organization.name} on NEXA`
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

    // Return success response
    const expiresAt = new Date(organizationMembership.invitedAt)
    expiresAt.setDate(expiresAt.getDate() + 7) // Calculate expiration (7 days from invitation)
    
    return NextResponse.json({
      success: true,
      invitation: {
        id: organizationMembership.id,
        email,
        role,
        status: 'pending',
        expiresAt,
        invitationToken
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
  { params }: { params: { orgId: string } }
) {
  try {
    const user = await verifyAuth(request)
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { orgId } = params

    // Verify user has permission to view invitations
    const membership = await prisma.organizationMembership.findFirst({
      where: {
        userId: user.id,
        organizationId: orgId,
        status: 'active',
        role: { in: ['owner', 'admin'] }
      }
    })

    if (!membership) {
      return NextResponse.json(
        { error: 'Insufficient permissions' },
        { status: 403 }
      )
    }

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
        const expiresAt = new Date(inv.invitedAt)
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
