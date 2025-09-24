import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { sendWelcomeEmail } from '@/lib/email'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    const { token } = await request.json()

    if (!token) {
      return NextResponse.json(
        { success: false, error: 'Verification token is required' },
        { status: 400 }
      )
    }

    // Find the verification session
    const session = await prisma.userSession.findFirst({
      where: {
        sessionToken: token,
        expiresAt: { gt: new Date() },
        revokedAt: null
      },
      include: {
        user: true,
        organization: true
      }
    })

    if (!session) {
      return NextResponse.json(
        { success: false, error: 'Invalid or expired verification token' },
        { status: 400 }
      )
    }

    if (session.user.emailVerifiedAt) {
      return NextResponse.json(
        { success: false, error: 'Email already verified' },
        { status: 400 }
      )
    }

    // Update user status and verify email
    const result = await prisma.$transaction(async (tx) => {
      // Activate user account
      const updatedUser = await tx.user.update({
        where: { id: session.user.id },
        data: {
          status: 'active',
          emailVerifiedAt: new Date(),
          updatedAt: new Date()
        }
      })

      // If user has pending organization membership, activate it
      const pendingMemberships = await tx.organizationMembership.findMany({
        where: {
          userId: session.user.id,
          status: 'pending'
        },
        include: { organization: true }
      })

      for (const membership of pendingMemberships) {
        await tx.organizationMembership.update({
          where: { id: membership.id },
          data: {
            status: 'active',
            joinedAt: new Date()
          }
        })

        // Log audit event
        await tx.auditLog.create({
          data: {
            organizationId: membership.organizationId,
            userId: session.user.id,
            action: 'activate_membership',
            resourceType: 'membership',
            resourceId: membership.id,
            newValues: {
              role: membership.role,
              status: 'active'
            },
            ipAddress: request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown',
            userAgent: request.headers.get('user-agent')
          }
        })
      }

      // Revoke the verification token
      await tx.userSession.update({
        where: { id: session.id },
        data: { revokedAt: new Date() }
      })

      return { updatedUser, activatedMemberships: pendingMemberships }
    })

    // Send welcome email
    const emailSent = await sendWelcomeEmail(
      result.updatedUser.email,
      result.updatedUser.fullName || 'User',
      session.organization?.name
    )

    return NextResponse.json({
      success: true,
      message: 'Email verified successfully! Welcome to NEXA.',
      data: {
        userActivated: true,
        membershipsActivated: result.activatedMemberships.length,
        welcomeEmailSent: emailSent,
        redirectTo: '/dashboard'
      }
    })

  } catch (error) {
    console.error('Email verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

export async function GET(request: NextRequest) {
  // Handle verification via URL (GET request)
  const { searchParams } = new URL(request.url)
  const token = searchParams.get('token')

  if (!token) {
    return NextResponse.redirect(new URL('/auth/login?error=missing-token', request.url))
  }

  try {
    // Verify the token using the same logic as POST
    const verifyResponse = await POST(request)
    const verifyData = await verifyResponse.json()

    if (verifyData.success) {
      return NextResponse.redirect(new URL('/auth/login?verified=true', request.url))
    } else {
      return NextResponse.redirect(new URL(`/auth/login?error=${encodeURIComponent(verifyData.error)}`, request.url))
    }
  } catch (error) {
    console.error('Email verification redirect error:', error)
    return NextResponse.redirect(new URL('/auth/login?error=verification-failed', request.url))
  }
}

