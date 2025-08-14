import { NextRequest, NextResponse } from 'next/server'
import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import { generateVerificationToken, sendVerificationEmail, extractDomain, isValidEmail, isFreeEmailDomain } from '@/lib/email'

const prisma = new PrismaClient()

interface RegisterRequest {
  email: string
  password: string
  firstName: string
  lastName: string
  organizationName?: string
  organizationType?: 'create' | 'join' | 'solo'
  invitationToken?: string
}

export async function POST(request: NextRequest) {
  try {
    const body: RegisterRequest = await request.json()
    const { 
      email, 
      password, 
      firstName, 
      lastName, 
      organizationName, 
      organizationType = 'solo',
      invitationToken 
    } = body

    // Validate input
    if (!email || !password || !firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'All fields are required' },
        { status: 400 }
      )
    }

    if (!isValidEmail(email)) {
      return NextResponse.json(
        { success: false, error: 'Invalid email format' },
        { status: 400 }
      )
    }

    if (password.length < 8) {
      return NextResponse.json(
        { success: false, error: 'Password must be at least 8 characters' },
        { status: 400 }
      )
    }

    // Check if user already exists
    const existingUser = await prisma.user.findUnique({
      where: { email: email.toLowerCase() }
    })

    if (existingUser) {
      return NextResponse.json(
        { success: false, error: 'User already exists with this email' },
        { status: 400 }
      )
    }

    // Hash password
    const passwordHash = await bcrypt.hash(password, 12)
    const fullName = `${firstName} ${lastName}`.trim()
    const verificationToken = generateVerificationToken()

    // Start database transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create user with pending status
      const user = await tx.user.create({
        data: {
          email: email.toLowerCase(),
          passwordHash,
          firstName,
          lastName,
          fullName,
          status: 'pending',
          profileData: {
            registrationType: organizationType,
            registrationDate: new Date().toISOString()
          }
        }
      })

      let organization = null
      let membership = null

      // Handle different registration types
      if (organizationType === 'create' && organizationName) {
        // Create new organization
        const slug = organizationName.toLowerCase()
          .replace(/[^a-z0-9\s-]/g, '')
          .replace(/\s+/g, '-')
          .replace(/-+/g, '-')
          .trim()

        organization = await tx.organization.create({
          data: {
            name: organizationName,
            slug,
            billingEmail: email,
            planType: 'free',
            status: 'active'
          }
        })

        // Create membership as owner
        membership = await tx.organizationMembership.create({
          data: {
            userId: user.id,
            organizationId: organization.id,
            role: 'owner',
            status: 'active',
            joinedAt: new Date(),
            invitedBy: user.id
          }
        })

        // Log audit event
        await tx.auditLog.create({
          data: {
            organizationId: organization.id,
            userId: user.id,
            action: 'create_organization',
            resourceType: 'organization',
            resourceId: organization.id,
            newValues: {
              name: organizationName,
              slug,
              owner: user.email
            },
            ipAddress: request.headers.get('x-forwarded-for') || 
                      request.headers.get('x-real-ip') || 
                      'unknown',
            userAgent: request.headers.get('user-agent')
          }
        })

      } else if (organizationType === 'join' || invitationToken) {
        // Handle invitation-based registration
        if (invitationToken) {
          const invitation = await tx.organizationMembership.findFirst({
            where: {
              invitationToken,
              status: 'pending'
            },
            include: {
              organization: true
            }
          })

          if (invitation && invitation.organization) {
            // Update the invitation with the new user
            membership = await tx.organizationMembership.update({
              where: { id: invitation.id },
              data: {
                userId: user.id,
                status: 'active',
                joinedAt: new Date()
              }
            })

            organization = invitation.organization
          }
        } else {
          // Check for domain-based auto-join
          const userDomain = extractDomain(email)
          const domainConfig = await tx.organizationDomain.findFirst({
            where: { domain: userDomain },
            include: { organization: true }
          })

          if (domainConfig && domainConfig.organization) {
            membership = await tx.organizationMembership.create({
              data: {
                userId: user.id,
                organizationId: domainConfig.organization.id,
                role: domainConfig.autoJoinRole,
                status: domainConfig.verificationRequired ? 'pending' : 'active',
                joinedAt: domainConfig.verificationRequired ? null : new Date()
              }
            })

            organization = domainConfig.organization
          }
        }
      }

      // Store verification token (using user session table temporarily)
      await tx.userSession.create({
        data: {
          userId: user.id,
          sessionToken: verificationToken,
          expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000), // 24 hours
          organizationId: organization?.id
        }
      })

      return { user, organization, membership }
    })

    // Send verification email
    const emailSent = await sendVerificationEmail({
      email,
      token: verificationToken,
      userName: fullName,
      organizationName: result.organization?.name
    })

    if (!emailSent) {
      console.error('Failed to send verification email, but user was created')
    }

    // Return success response (don't include sensitive data)
    return NextResponse.json({
      success: true,
      message: 'Registration successful! Please check your email to verify your account.',
      data: {
        userId: result.user.id,
        email: result.user.email,
        organizationCreated: !!result.organization,
        organizationName: result.organization?.name,
        emailSent,
        requiresEmailVerification: true
      }
    })

  } catch (error) {
    console.error('Registration error:', error)
    
    // Handle specific Prisma errors
    if (error instanceof Error) {
      if (error.message.includes('Unique constraint')) {
        return NextResponse.json(
          { success: false, error: 'Email already registered' },
          { status: 400 }
        )
      }
    }

    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}

