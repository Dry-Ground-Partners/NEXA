import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import { generateVerificationToken, sendVerificationEmail } from '@/lib/email'
import { getCurrentUser } from '@/lib/auth'

const prisma = new PrismaClient()

export async function POST(request: NextRequest) {
  try {
    // This endpoint can be called by authenticated users or with email in body
    let email: string | null = null
    
    try {
      const currentUser = await getCurrentUser()
      if (currentUser) {
        email = currentUser.email
      }
    } catch {
      // User not authenticated, try to get email from request body
      const body = await request.json()
      email = body.email
    }

    if (!email) {
      return NextResponse.json(
        { success: false, error: 'Email is required' },
        { status: 400 }
      )
    }

    // Find user with pending status
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      include: {
        organizationMemberships: {
          include: { organization: true }
        }
      }
    })

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    if (user.emailVerifiedAt) {
      return NextResponse.json(
        { success: false, error: 'Email already verified' },
        { status: 400 }
      )
    }

    // Check if there's a recent verification token (prevent spam)
    const recentToken = await prisma.userSession.findFirst({
      where: {
        userId: user.id,
        expiresAt: { gt: new Date() },
        revokedAt: null,
        createdAt: { gt: new Date(Date.now() - 5 * 60 * 1000) } // Last 5 minutes
      }
    })

    if (recentToken) {
      return NextResponse.json(
        { success: false, error: 'Verification email already sent recently. Please wait before requesting another.' },
        { status: 429 }
      )
    }

    // Generate new verification token
    const verificationToken = generateVerificationToken()

    // Store new verification token
    await prisma.userSession.create({
      data: {
        userId: user.id,
        sessionToken: verificationToken,
        expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
        organizationId: user.organizationMemberships[0]?.organizationId
      }
    })

    // Send verification email
    const emailSent = await sendVerificationEmail({
      email: user.email,
      token: verificationToken,
      userName: user.fullName || `${user.firstName} ${user.lastName}`,
      organizationName: user.organizationMemberships[0]?.organization?.name
    })

    if (!emailSent) {
      return NextResponse.json(
        { success: false, error: 'Failed to send verification email' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Verification email sent successfully'
    })

  } catch (error: unknown) {
    console.error('Resend verification error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

