import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, generateToken, getUserById } from '@/lib/auth'
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

// Generate short random ID for unique slugs
function generateShortId(): string {
  return Math.random().toString(36).substring(2, 8)
}

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Onboarding request received')
    
    // Check authentication
    const user = await getCurrentUser()
    if (!user) {
      console.log('❌ API: User not authenticated')
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // Check if user already has organization
    if (user.organizationMemberships && user.organizationMemberships.length > 0) {
      console.log('❌ API: User already has organization')
      return NextResponse.json(
        { success: false, error: 'User already has an organization' },
        { status: 400 }
      )
    }

    const body = await request.json()
    const { type } = body
    
    console.log(`📝 API: Creating ${type} workspace for ${user.email}`)

    if (type === 'solo') {
      // Create personal workspace
      const shortId = generateShortId()
      const username = user.email.split('@')[0].replace(/[^a-z0-9]/gi, '')
      
      const orgName = `${user.firstName}'s Workspace`
      let slug = `solo-${username}`
      
      // Ensure unique slug
      let counter = 1
      while (true) {
        const existing = await prisma.organization.findUnique({
          where: { slug }
        })
        if (!existing) break
        slug = `solo-${username}-${counter++}`
      }

      console.log(`🏠 Creating personal workspace: "${orgName}" (${slug})`)

      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: orgName,
            slug: slug,
            billingEmail: user.email,
            planType: 'free',
            status: 'active',
            usageLimits: {
              ai_calls_per_month: 100,
              pdf_exports_per_month: 10,
              sessions_limit: 20,
              team_members_limit: 1, // Solo workspace
              storage_limit_mb: 500,
              features: {
                custom_branding: false,
                priority_support: false,
                sso_enabled: false,
                api_access: false
              }
            }
          }
        })

        // Create membership
        const membership = await tx.organizationMembership.create({
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
            action: 'create',
            resourceType: 'organization',
            resourceId: organization.id,
            newValues: {
              type: 'personal_workspace',
              name: orgName,
              slug: slug
            }
          }
        })

        return { organization, membership }
      })

      console.log(`✅ API: Personal workspace created - ${orgName}`)

      // Generate new JWT token with updated organization status
      const updatedUser = await getUserById(user.id)
      if (updatedUser) {
        const newToken = generateToken(updatedUser)
        console.log('🔄 Generated new JWT token with organization access')
        
        const response = NextResponse.json({
          success: true,
          message: 'Personal workspace created successfully',
          organization: {
            id: result.organization.id,
            name: result.organization.name,
            slug: result.organization.slug,
            type: 'personal'
          }
        })
        
        // Update the auth cookie with new token
        response.cookies.set('auth-token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        })
        
        return response
      }

      return NextResponse.json({
        success: true,
        message: 'Personal workspace created successfully',
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
          type: 'personal'
        }
      })

    } else if (type === 'organization') {
      // Create team organization
      const { name, description, website, industry } = body
      
      if (!name?.trim()) {
        console.log('❌ API: Organization name required')
        return NextResponse.json(
          { success: false, error: 'Organization name is required' },
          { status: 400 }
        )
      }

      // Generate slug from name
      let slug = name.toLowerCase()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-')
        .replace(/-+/g, '-')
        .trim()

      // Ensure unique slug
      let counter = 1
      const baseSlug = slug
      while (true) {
        const existing = await prisma.organization.findUnique({
          where: { slug }
        })
        if (!existing) break
        slug = `${baseSlug}-${counter++}`
      }

      console.log(`🏢 Creating organization: "${name}" (${slug})`)

      const result = await prisma.$transaction(async (tx) => {
        // Create organization
        const organization = await tx.organization.create({
          data: {
            name: name.trim(),
            slug: slug,
            domain: website?.trim() || null,
            website: website?.trim() || null,
            industry: industry?.trim() || null,
            billingEmail: user.email,
            planType: 'free',
            status: 'active',
            usageLimits: {
              ai_calls_per_month: 500, // Higher limits for teams
              pdf_exports_per_month: 50,
              sessions_limit: 100,
              team_members_limit: 10,
              storage_limit_mb: 2000,
              features: {
                custom_branding: false,
                priority_support: false,
                sso_enabled: false,
                api_access: false
              }
            }
          }
        })

        // Create membership as owner
        const membership = await tx.organizationMembership.create({
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
            action: 'create',
            resourceType: 'organization',
            resourceId: organization.id,
            newValues: {
              type: 'team_organization',
              name: name.trim(),
              slug: slug,
              description: description?.trim(),
              website: website?.trim(),
              industry: industry?.trim()
            }
          }
        })

        return { organization, membership }
      })

      console.log(`✅ API: Organization created - ${name}`)

      // Generate new JWT token with updated organization status
      const updatedUser = await getUserById(user.id)
      if (updatedUser) {
        const newToken = generateToken(updatedUser)
        console.log('🔄 Generated new JWT token with organization access')
        
        const response = NextResponse.json({
          success: true,
          message: 'Organization created successfully',
          organization: {
            id: result.organization.id,
            name: result.organization.name,
            slug: result.organization.slug,
            type: 'team'
          }
        })
        
        // Update the auth cookie with new token
        response.cookies.set('auth-token', newToken, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 7 * 24 * 60 * 60 // 7 days
        })
        
        return response
      }

      return NextResponse.json({
        success: true,
        message: 'Organization created successfully',
        organization: {
          id: result.organization.id,
          name: result.organization.name,
          slug: result.organization.slug,
          type: 'team'
        }
      })

    } else {
      console.log('❌ API: Invalid onboarding type:', type)
      return NextResponse.json(
        { success: false, error: 'Invalid onboarding type. Must be "solo" or "organization"' },
        { status: 400 }
      )
    }

  } catch (error: unknown) {
    console.error('💥 API: Onboarding error:', error)
    
    return NextResponse.json(
      { 
        success: false, 
        error: `Failed to create workspace: ${error instanceof Error ? error.message : 'Unknown error'}` 
      },
      { status: 500 }
    )
  } finally {
    await prisma.$disconnect()
  }
}
