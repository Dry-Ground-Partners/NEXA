import { NextRequest, NextResponse } from 'next/server'
import { getUserRoleFromRequest } from '@/lib/api-rbac'
import {
  getOrganizationPreferences,
  updateOrganizationPreferences,
  validateImageSize,
  validateImageMimeType,
  validateGeneralApproachLength,
  type PreferenceData,
} from '@/lib/preferences/preferences-service'

/**
 * GET /api/organizations/[orgId]/preferences
 * Fetch organization preferences (requires any role in the organization)
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params

    // RBAC: Check organization membership (any role can view)
    const roleInfo = await getUserRoleFromRequest(request, orgId)
    
    console.log('🔍 Preferences GET - roleInfo:', {
      role: roleInfo.role,
      userId: roleInfo.userId,
      organizationId: roleInfo.organizationId,
      hasUser: !!roleInfo.user,
      membershipCount: roleInfo.user?.organizationMemberships?.length || 0
    })
    
    if (!roleInfo.role || !roleInfo.userId) {
      return NextResponse.json(
        { error: 'Access denied - Organization membership required' },
        { status: 403 }
      )
    }

    // Fetch preferences (creates defaults if not exist)
    const preferences = await getOrganizationPreferences(orgId)

    // Transform to frontend-friendly format
    const response = {
      id: preferences.id,
      organizationId: preferences.organizationId,
      mainLogo: preferences.mainLogo
        ? {
            data: preferences.mainLogo,
            filename: preferences.mainLogoFilename || 'logo.png',
            mimeType: preferences.mainLogoMimeType || 'image/png',
            sizeBytes: preferences.mainLogoSizeBytes || 0,
          }
        : null,
      secondLogo: preferences.secondLogo
        ? {
            data: preferences.secondLogo,
            filename: preferences.secondLogoFilename || 'logo2.png',
            mimeType: preferences.secondLogoMimeType || 'image/png',
            sizeBytes: preferences.secondLogoSizeBytes || 0,
          }
        : null,
      generalApproach: preferences.generalApproach || '',
      structuring: preferences.structuringPreferences,
      visuals: preferences.visualsPreferences,
      solutioning: preferences.solutioningPreferences,
      pushing: preferences.pushingPreferences,
      changeHistory: preferences.changeHistory,
      createdAt: preferences.createdAt,
      updatedAt: preferences.updatedAt,
      createdBy: preferences.createdBy,
      updatedBy: preferences.updatedBy,
    }

    return NextResponse.json(response)
  } catch (error: unknown) {
    console.error('Error fetching organization preferences:', error)
    return NextResponse.json(
      { error: 'Failed to fetch organization preferences' },
      { status: 500 }
    )
  }
}

/**
 * PUT /api/organizations/[orgId]/preferences
 * Update organization preferences (requires owner or admin role)
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params

    // RBAC: Check organization membership
    const roleInfo = await getUserRoleFromRequest(request, orgId)
    
    console.log('🔍 Preferences PUT - roleInfo:', {
      role: roleInfo.role,
      userId: roleInfo.userId,
      organizationId: roleInfo.organizationId,
      hasUser: !!roleInfo.user,
      membershipCount: roleInfo.user?.organizationMemberships?.length || 0
    })
    
    if (!roleInfo.role || !roleInfo.userId) {
      return NextResponse.json(
        { error: 'Access denied - Organization membership required' },
        { status: 403 }
      )
    }

    // Only owner or admin can edit preferences
    if (roleInfo.role !== 'owner' && roleInfo.role !== 'admin') {
      return NextResponse.json(
        { 
          error: 'Access denied - Only organization owners and admins can edit preferences',
          requiredRole: 'owner or admin',
          currentRole: roleInfo.role,
        },
        { status: 403 }
      )
    }

    const body = await request.json() as PreferenceData

    // Validation: Main logo
    if (body.mainLogo) {
      if (!validateImageMimeType(body.mainLogo.mimeType)) {
        return NextResponse.json(
          { error: 'Invalid main logo format. Allowed: PNG, JPEG, WebP, SVG' },
          { status: 400 }
        )
      }
      if (!validateImageSize(body.mainLogo.sizeBytes)) {
        return NextResponse.json(
          { error: 'Main logo exceeds maximum size of 5MB' },
          { status: 400 }
        )
      }
    }

    // Validation: Second logo
    if (body.secondLogo) {
      if (!validateImageMimeType(body.secondLogo.mimeType)) {
        return NextResponse.json(
          { error: 'Invalid second logo format. Allowed: PNG, JPEG, WebP, SVG' },
          { status: 400 }
        )
      }
      if (!validateImageSize(body.secondLogo.sizeBytes)) {
        return NextResponse.json(
          { error: 'Second logo exceeds maximum size of 5MB' },
          { status: 400 }
        )
      }
    }

    // Validation: General approach length
    if (body.generalApproach && !validateGeneralApproachLength(body.generalApproach)) {
      return NextResponse.json(
        { error: 'General approach exceeds maximum length of 5000 characters' },
        { status: 400 }
      )
    }

    // Update preferences
    const updated = await updateOrganizationPreferences(
      orgId,
      roleInfo.userId,
      body
    )

    // Transform to frontend-friendly format
    const response = {
      id: updated.id,
      organizationId: updated.organizationId,
      mainLogo: updated.mainLogo
        ? {
            data: updated.mainLogo,
            filename: updated.mainLogoFilename || 'logo.png',
            mimeType: updated.mainLogoMimeType || 'image/png',
            sizeBytes: updated.mainLogoSizeBytes || 0,
          }
        : null,
      secondLogo: updated.secondLogo
        ? {
            data: updated.secondLogo,
            filename: updated.secondLogoFilename || 'logo2.png',
            mimeType: updated.secondLogoMimeType || 'image/png',
            sizeBytes: updated.secondLogoSizeBytes || 0,
          }
        : null,
      generalApproach: updated.generalApproach || '',
      structuring: updated.structuringPreferences,
      visuals: updated.visualsPreferences,
      solutioning: updated.solutioningPreferences,
      pushing: updated.pushingPreferences,
      changeHistory: updated.changeHistory,
      createdAt: updated.createdAt,
      updatedAt: updated.updatedAt,
      createdBy: updated.createdBy,
      updatedBy: updated.updatedBy,
    }

    return NextResponse.json({
      success: true,
      data: response,
      message: 'Preferences updated successfully',
    })
  } catch (error: unknown) {
    console.error('Error updating organization preferences:', error)
    return NextResponse.json(
      { error: 'Failed to update organization preferences' },
      { status: 500 }
    )
  }
}


