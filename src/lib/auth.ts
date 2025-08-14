import jwt from 'jsonwebtoken'
import bcrypt from 'bcryptjs'
import { cookies } from 'next/headers'
import type { User, AuthUser } from '@/types'

const JWT_SECRET = process.env.JWT_SECRET!
const TOKEN_EXPIRY = '7d' // 7 days

// Login credentials and auth response interfaces moved to API routes

// Mock database functions - replace with actual database calls
export async function getUserByEmail(email: string): Promise<User | null> {
  // This would be replaced with actual database query
  // For now, simulate the database response
  if (email === 'admin@dryground.ai') {
    return {
      id: '1',
      email: 'admin@dryground.ai',
      emailVerifiedAt: new Date(),
      firstName: 'Admin',
      lastName: 'User',
      fullName: 'Admin User',
      avatarUrl: null,
      timezone: 'UTC',
      locale: 'en',
      lastLoginAt: new Date(),
      loginCount: 1,
      failedLoginAttempts: 0,
      lockedUntil: null,
      profileData: { bio: "Platform administrator", job_title: "System Admin" },
      notificationSettings: { email_notifications: true, marketing_emails: false },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      status: 'active'
    }
  }
  return null
}

export async function verifyPassword(plainPassword: string, hashedPassword: string): Promise<boolean> {
  // For development, we'll accept 'password123' for admin
  if (plainPassword === 'password123') {
    return true
  }
  
  // In production, this would use bcrypt to compare with database hash
  return bcrypt.compare(plainPassword, hashedPassword)
}

export function generateToken(userId: string, email: string): string {
  const payload = {
    userId,
    email,
    iat: Math.floor(Date.now() / 1000),
  }
  
  return jwt.sign(payload, JWT_SECRET, { expiresIn: TOKEN_EXPIRY })
}

export function verifyToken(token: string): { userId: string; email: string } | null {
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as {
      userId: string
      email: string
      iat: number
    }
    return { userId: decoded.userId, email: decoded.email }
  } catch (error) {
    return null
  }
}

// Note: Cookie setting/clearing is now handled directly in API routes
// These functions were moved because cookies() from next/headers 
// doesn't work properly when called indirectly from API routes

export async function getAuthToken(): Promise<string | null> {
  const cookieStore = cookies()
  const token = cookieStore.get('auth-token')
  return token?.value || null
}

export async function getCurrentUser(): Promise<AuthUser | null> {
  const token = await getAuthToken()
  if (!token) return null

  const decoded = verifyToken(token)
  if (!decoded) return null

  const user = await getUserByEmail(decoded.email)
  if (!user) return null

  // Mock organization memberships - in production, this would query the database
  const mockOrganizations = [
    {
      id: '1',
      userId: user.id,
      organizationId: 'org-1',
      role: 'owner' as const,
      permissions: {},
      invitedBy: null,
      invitedAt: null,
      joinedAt: new Date('2024-01-01'),
      invitationToken: null,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
      status: 'active' as const,
      organization: {
        id: 'org-1',
        name: 'Dry Ground AI',
        slug: 'dry-ground-ai',
        domain: 'dryground.ai',
        logoUrl: null,
        brandColors: {},
        website: 'https://dryground.ai',
        industry: 'Technology',
        address: {},
        taxId: null,
        billingEmail: 'admin@dryground.ai',
        planType: 'enterprise' as const,
        subscriptionStatus: 'active' as const,
        subscriptionData: {},
        usageLimits: {
          ai_calls_per_month: 10000,
          pdf_exports_per_month: 1000,
          sessions_limit: 1000,
          team_members_limit: 50,
          storage_limit_mb: 10000,
          features: {
            custom_branding: true,
            priority_support: true,
            sso_enabled: true,
            api_access: true
          }
        },
        createdAt: new Date('2024-01-01'),
        updatedAt: new Date('2024-01-01'),
        deletedAt: null,
        status: 'active' as const
      }
    }
  ]

  return {
    id: user.id,
    email: user.email,
    fullName: user.fullName,
    avatarUrl: user.avatarUrl,
    organizations: mockOrganizations,
    currentOrganization: mockOrganizations[0]?.organization
  }
}

// Note: Login and logout functions moved to API routes
// This allows proper cookie management using NextResponse
