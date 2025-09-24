import { PrismaClient } from '@prisma/client'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { cookies } from 'next/headers'
import { NextRequest } from 'next/server'

const prisma = new PrismaClient()

export interface User {
  id: string
  email: string
  firstName: string | null
  lastName: string | null
  fullName: string | null
  avatarUrl: string | null
  status: string
  emailVerifiedAt: Date | null
  profileData: any
  organizationMemberships?: OrganizationMembership[]
}

export interface Organization {
  id: string
  name: string
  slug: string | null
  logoUrl: string | null
  planType: string
  status: string
}

export interface OrganizationMembership {
  id: string
  role: string
  status: string
  organization: Organization
  joinedAt: Date | null
}

/**
 * Get user by email from database
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase() 
      },
      include: {
        organizationMemberships: {
          where: { status: 'active' },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                planType: true,
                status: true
              }
            }
          }
        }
      }
    })

    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      profileData: user.profileData,
      organizationMemberships: user.organizationMemberships.map(membership => ({
        id: membership.id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          logoUrl: membership.organization.logoUrl,
          planType: membership.organization.planType,
          status: membership.organization.status
        }
      }))
    }
  } catch (error) {
    console.error('Error getting user by email:', error)
    return null
  }
}

/**
 * Get user by ID from database
 */
export async function getUserById(id: string): Promise<User | null> {
  try {
    const user = await prisma.user.findUnique({
      where: { id },
      include: {
        organizationMemberships: {
          where: { status: 'active' },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                planType: true,
                status: true
              }
            }
          }
        }
      }
    })

    if (!user) return null

    return {
      id: user.id,
      email: user.email,
      firstName: user.firstName,
      lastName: user.lastName,
      fullName: user.fullName,
      avatarUrl: user.avatarUrl,
      status: user.status,
      emailVerifiedAt: user.emailVerifiedAt,
      profileData: user.profileData,
      organizationMemberships: user.organizationMemberships.map(membership => ({
        id: membership.id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          logoUrl: membership.organization.logoUrl,
          planType: membership.organization.planType,
          status: membership.organization.status
        }
      }))
    }
  } catch (error) {
    console.error('Error getting user by ID:', error)
    return null
  }
}

/**
 * Verify user password against database hash
 */
export async function verifyPassword(email: string, password: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { 
        email: email.toLowerCase() 
      },
      select: {
        passwordHash: true,
        status: true
      }
    })

    if (!user || !user.passwordHash) {
      return false
    }

    // Only allow login for active users
    if (user.status !== 'active') {
      return false
    }

    return await bcrypt.compare(password, user.passwordHash)
  } catch (error) {
    console.error('Error verifying password:', error)
    return false
  }
}

/**
 * Generate JWT token for user
 */
export function generateToken(user: User): string {
  const payload = {
    userId: user.id,
    email: user.email,
    status: user.status,
    emailVerifiedAt: user.emailVerifiedAt,
    hasOrganization: !!(user.organizationMemberships && user.organizationMemberships.length > 0)
  }

  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  return jwt.sign(payload, secret, { expiresIn: '7d' })
}

/**
 * Generate JWT token for API usage (alias for generateToken)
 */
export function generateJWT(payload: { id: string; email: string; organizationId?: string; emailVerifiedAt?: Date | null; status?: string }): string {
  const secret = process.env.JWT_SECRET
  if (!secret) {
    throw new Error('JWT_SECRET environment variable is not set')
  }

  return jwt.sign({
    userId: payload.id,
    email: payload.email,
    emailVerifiedAt: payload.emailVerifiedAt,
    status: payload.status || 'active',
    organizationId: payload.organizationId,
    hasOrganization: !!payload.organizationId
  }, secret, { expiresIn: '7d' })
}

/**
 * Verify JWT token
 */
export function verifyToken(token: string): any {
  try {
    const secret = process.env.JWT_SECRET
    if (!secret) {
      throw new Error('JWT_SECRET environment variable is not set')
    }

    return jwt.verify(token, secret)
  } catch (error) {
    return null
  }
}

/**
 * Get current user from request context
 */
export async function getCurrentUser(): Promise<User | null> {
  try {
    const cookieStore = cookies()
    const token = cookieStore.get('auth-token')?.value

    console.log('🔍 Debug - Auth token exists:', !!token)

    if (!token) {
      console.log('❌ Debug - No auth token found')
      return null
    }

    const payload = verifyToken(token)
    console.log('🔍 Debug - Token payload:', payload ? 'valid' : 'invalid')
    
    if (!payload || !payload.userId) {
      console.log('❌ Debug - Invalid token payload')
      return null
    }

    // Get fresh user data from database
    const user = await getUserById(payload.userId)
    console.log('🔍 Debug - User from DB:', user ? `${user.email} (${user.id})` : 'null')
    console.log('🔍 Debug - User status:', user?.status)
    console.log('🔍 Debug - Organization memberships count:', user?.organizationMemberships?.length || 0)
    
    // Ensure user is still active
    if (!user || user.status !== 'active') {
      console.log('❌ Debug - User not active or not found')
      return null
    }

    return user
  } catch (error) {
    console.error('Error getting current user:', error)
    return null
  }
}

/**
 * Update user's last login information
 */
export async function updateLastLogin(userId: string): Promise<void> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: {
        lastLoginAt: new Date(),
        loginCount: {
          increment: 1
        },
        failedLoginAttempts: 0 // Reset failed attempts on successful login
      }
    })
  } catch (error) {
    console.error('Error updating last login:', error)
  }
}

/**
 * Record failed login attempt
 */
export async function recordFailedLogin(email: string): Promise<void> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { id: true, failedLoginAttempts: true }
    })

    if (user) {
      const newFailedAttempts = user.failedLoginAttempts + 1
      const shouldLock = newFailedAttempts >= 5
      
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedLoginAttempts: newFailedAttempts,
          lockedUntil: shouldLock ? new Date(Date.now() + 30 * 60 * 1000) : null // Lock for 30 minutes
        }
      })
    }
  } catch (error) {
    console.error('Error recording failed login:', error)
  }
}

/**
 * Check if user account is locked
 */
export async function isAccountLocked(email: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
      select: { lockedUntil: true }
    })

    if (!user || !user.lockedUntil) {
      return false
    }

    // Check if lock has expired
    if (user.lockedUntil <= new Date()) {
      // Unlock the account
      await prisma.user.update({
        where: { email: email.toLowerCase() },
        data: {
          lockedUntil: null,
          failedLoginAttempts: 0
        }
      })
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking account lock:', error)
    return false
  }
}

/**
 * Update user profile
 */
export async function updateUserProfile(userId: string, data: {
  firstName?: string
  lastName?: string
  fullName?: string
  avatarUrl?: string
  profileData?: any
}): Promise<User | null> {
  try {
    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        ...data,
        updatedAt: new Date()
      },
      include: {
        organizationMemberships: {
          where: { status: 'active' },
          include: {
            organization: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
                planType: true,
                status: true
              }
            }
          }
        }
      }
    })

    return {
      id: updatedUser.id,
      email: updatedUser.email,
      firstName: updatedUser.firstName,
      lastName: updatedUser.lastName,
      fullName: updatedUser.fullName,
      avatarUrl: updatedUser.avatarUrl,
      status: updatedUser.status,
      emailVerifiedAt: updatedUser.emailVerifiedAt,
      profileData: updatedUser.profileData,
      organizationMemberships: updatedUser.organizationMemberships.map(membership => ({
        id: membership.id,
        role: membership.role,
        status: membership.status,
        joinedAt: membership.joinedAt,
        organization: {
          id: membership.organization.id,
          name: membership.organization.name,
          slug: membership.organization.slug,
          logoUrl: membership.organization.logoUrl,
          planType: membership.organization.planType,
          status: membership.organization.status
        }
      }))
    }
  } catch (error) {
    console.error('Error updating user profile:', error)
    return null
  }
}

/**
 * Change user password
 */
export async function changeUserPassword(userId: string, currentPassword: string, newPassword: string): Promise<boolean> {
  try {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { passwordHash: true, email: true }
    })

    if (!user || !user.passwordHash) {
      return false
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(currentPassword, user.passwordHash)
    if (!isCurrentPasswordValid) {
      return false
    }

    // Hash new password
    const newPasswordHash = await bcrypt.hash(newPassword, 12)

    // Update password
    await prisma.user.update({
      where: { id: userId },
      data: {
        passwordHash: newPasswordHash,
        updatedAt: new Date()
      }
    })

    return true
  } catch (error) {
    console.error('Error changing password:', error)
    return false
  }
}

/**
 * Verify authentication from API request
 */
export async function verifyAuth(request: NextRequest): Promise<User | null> {
  try {
    // Try to get token from cookies first
    let token = request.cookies.get('auth-token')?.value
    
    // If no cookie token, try Authorization header
    if (!token) {
      const authHeader = request.headers.get('authorization')
      if (authHeader && authHeader.startsWith('Bearer ')) {
        token = authHeader.substring(7)
      }
    }

    if (!token) {
      return null
    }

    const payload = verifyToken(token)
    if (!payload || !payload.userId) {
      return null
    }

    // Get fresh user data from database
    const user = await getUserById(payload.userId)
    
    // Ensure user is still active
    if (!user || user.status !== 'active') {
      return null
    }

    return user
  } catch (error) {
    console.error('Error verifying auth:', error)
    return null
  }
}

// Clean up database connections
export async function disconnectDatabase() {
  await prisma.$disconnect()
}