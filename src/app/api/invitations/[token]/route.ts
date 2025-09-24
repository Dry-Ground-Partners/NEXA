import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyAuth, generateJWT } from '@/lib/auth'
import bcrypt from 'bcryptjs'

export async function GET(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params

    // Find the invitation by token (check expiration manually)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const invitation = await prisma.organizationMembership.findFirst({
      where: {
        invitationToken: token,
        status: 'pending',
        invitedAt: {
          gt: sevenDaysAgo // Not expired (invited within last 7 days)
        }
      },
      include: {
        user: {
          select: {
            id: true,
            email: true,
            firstName: true,
            lastName: true,
            fullName: true,
            status: true
          }
        },
        organization: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true
          }
        },
        inviter: {
          select: {
            firstName: true,
            lastName: true,
            fullName: true
          }
        }
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    // Return invitation details for the frontend
    const expiresAt = new Date(invitation.invitedAt)
    expiresAt.setDate(expiresAt.getDate() + 7) // Calculate expiration (7 days from invitation)
    
    return NextResponse.json({
      invitation: {
        id: invitation.id,
        role: invitation.role,
        invitedAt: invitation.invitedAt,
        expiresAt,
        invitedBy: invitation.inviter?.fullName || 'Unknown',
        user: {
          email: invitation.user.email,
          firstName: invitation.user.firstName,
          lastName: invitation.user.lastName,
          fullName: invitation.user.fullName,
          isExistingUser: invitation.user.status === 'active' // Has completed registration
        },
        organization: {
          id: invitation.organization.id,
          name: invitation.organization.name,
          slug: invitation.organization.slug,
          logoUrl: invitation.organization.logoUrl
        }
      }
    })

  } catch (error) {
    console.error('Error validating invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: { token: string } }
) {
  try {
    const { token } = params
    const body = await request.json()
    const { password, currentPassword } = body

    // Find the invitation by token (check expiration manually)
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
    
    const invitation = await prisma.organizationMembership.findFirst({
      where: {
        invitationToken: token,
        status: 'pending',
        invitedAt: {
          gt: sevenDaysAgo // Not expired (invited within last 7 days)
        }
      },
      include: {
        user: true,
        organization: true
      }
    })

    if (!invitation) {
      return NextResponse.json(
        { error: 'Invalid or expired invitation' },
        { status: 404 }
      )
    }

    const user = invitation.user
    let updatedUser = user

    // Check if this is an existing user or new user
    if (user.status === 'active' && user.passwordHash) {
      // Existing user - verify current password if provided
      if (currentPassword) {
        const isValidPassword = await bcrypt.compare(currentPassword, user.passwordHash)
        if (!isValidPassword) {
          return NextResponse.json(
            { error: 'Current password is incorrect' },
            { status: 400 }
          )
        }
      }

      // Update password if new one provided
      if (password) {
        const hashedPassword = await bcrypt.hash(password, 12)
        updatedUser = await prisma.user.update({
          where: { id: user.id },
          data: { passwordHash: hashedPassword }
        })
      }
    } else {
      // New user - set initial password and activate
      if (!password) {
        return NextResponse.json(
          { error: 'Password is required for new users' },
          { status: 400 }
        )
      }

      const hashedPassword = await bcrypt.hash(password, 12)
      updatedUser = await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: hashedPassword,
          status: 'active'
        }
      })
    }

    // Accept the invitation - update membership status
    const updatedMembership = await prisma.organizationMembership.update({
      where: { id: invitation.id },
      data: {
        status: 'active',
        invitationToken: null, // Clear the token
        joinedAt: new Date()
      }
    })

    // Get IP address properly
    const forwardedFor = request.headers.get('x-forwarded-for')
    const realIp = request.headers.get('x-real-ip')
    let ipAddress = '127.0.0.1' // Default fallback
    
    if (forwardedFor) {
      ipAddress = forwardedFor.split(',')[0].trim()
    } else if (realIp) {
      ipAddress = realIp
    } else if (request.ip) {
      ipAddress = request.ip
    }
    
    // Ensure it's a valid IPv4/IPv6 format for PostgreSQL inet type
    if (ipAddress === '::1') {
      ipAddress = '127.0.0.1' // Convert IPv6 localhost to IPv4
    }

    // Create audit log entry
    await prisma.auditLog.create({
      data: {
        organizationId: invitation.organizationId,
        userId: user.id,
        action: 'invitation_accepted',
        resourceType: 'organization_membership',
        resourceId: invitation.id,
        newValues: {
          status: 'active',
          role: invitation.role,
          joinedAt: new Date()
        },
        ipAddress,
        userAgent: request.headers.get('user-agent') || 'unknown'
      }
    })

    // Generate JWT token for auto-login
    const authToken = await generateJWT({
      id: updatedUser.id,
      email: updatedUser.email,
      emailVerifiedAt: updatedUser.emailVerifiedAt,
      status: updatedUser.status,
      organizationId: invitation.organizationId
    })

    // Set HTTP-only cookie for authentication
    const response = NextResponse.json({
      success: true,
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        fullName: updatedUser.fullName
      },
      organization: {
        id: invitation.organization.id,
        name: invitation.organization.name,
        slug: invitation.organization.slug
      },
      membership: {
        role: invitation.role,
        joinedAt: updatedMembership.joinedAt
      }
    })

    response.cookies.set('auth-token', authToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 7 // 7 days
    })

    return response

  } catch (error) {
    console.error('Error accepting invitation:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
