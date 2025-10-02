import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'
import type { Organization, OrganizationMembership } from '@/types'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { name, domain, website, industry, billingEmail } = body

    // Validate required fields
    if (!name?.trim()) {
      return NextResponse.json(
        { success: false, error: 'Organization name is required' },
        { status: 400 }
      )
    }

    // Generate slug from name
    const slug = name.toLowerCase()
      .replace(/[^a-z0-9\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/-+/g, '-')
      .trim()

    // In a real application, this would:
    // 1. Check if organization name/slug already exists
    // 2. Insert into database
    // 3. Create organization membership for the creator
    // 4. Send welcome email
    
    // For now, return mock success response
    const newOrganization: Organization = {
      id: `org-${Date.now()}`,
      name: name.trim(),
      slug,
      domain: domain?.trim() || null,
      logoUrl: null,
      brandColors: {},
      website: website?.trim() || null,
      industry: industry?.trim() || null,
      address: {},
      taxId: null,
      billingEmail: billingEmail?.trim() || user.email,
      planType: 'free',
      subscriptionStatus: 'active',
      subscriptionData: {},
      usageLimits: {
        ai_calls_per_month: 100,
        pdf_exports_per_month: 10,
        sessions_limit: 10,
        team_members_limit: 5,
        storage_limit_mb: 1000,
        features: {
          custom_branding: false,
          priority_support: false,
          sso_enabled: false,
          api_access: false
        }
      },
      createdAt: new Date(),
      updatedAt: new Date(),
      deletedAt: null,
      status: 'active'
    }

    const membership: OrganizationMembership = {
      id: `mem-${Date.now()}`,
      userId: user.id,
      organizationId: newOrganization.id,
      role: 'owner',
      permissions: {},
      invitedBy: null,
      invitedAt: null,
      joinedAt: new Date(),
      invitationToken: null,
      createdAt: new Date(),
      updatedAt: new Date(),
      status: 'active',
      organization: newOrganization
    }

    return NextResponse.json({
      success: true,
      data: {
        organization: newOrganization,
        membership
      },
      message: 'Organization created successfully'
    })

  } catch (error) {
    console.error('Organization creation error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser()
    
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    // In a real application, this would query the database for user's organizations
    // For now, return the mock organizations from the user object
    const organizations = (user as any).organizations || []
    return NextResponse.json({
      success: true,
      data: organizations
    })

  } catch (error) {
    console.error('Organizations fetch error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}

