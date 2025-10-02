import { NextRequest, NextResponse } from 'next/server'
import { getErrorMessage } from '@/lib/utils'
import { requireOrganizationAccess, requireRoleManagement } from '@/lib/api-rbac'
import { prisma } from '@/lib/prisma'
import { usageTracker } from '@/lib/usage/usage-tracker'
import { planRegistry } from '@/lib/config/plan-registry'

/**
 * GET - Get organization usage management settings and current status
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params

    console.log(`📊 API: Usage management status request for org ${orgId}`)

    // RBAC check - organization access required
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Organization access required' },
        { status: 403 }
      )
    }

    // Get organization details
    const organization = await prisma.organization.findUnique({
      where: { id: orgId },
      select: {
        id: true,
        name: true,
        planType: true,
        usageLimits: true,
        subscriptionStatus: true,
        subscriptionData: true
      }
    })

    if (!organization) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Get current plan definition
    const planDef = await planRegistry.getPlanDefinition(organization.planType)
    
    // Get current usage breakdown
    const currentUsage = await usageTracker.getUsageBreakdown(orgId)
    
    // Get usage trends
    const trends = await usageTracker.getUsageTrends(orgId, 3)

    // Calculate usage efficiency and patterns
    const usagePatterns = {
      peakUsageDay: currentUsage.dailyUsage.reduce((peak, day) => 
        day.credits > (peak?.credits || 0) ? day : peak, null),
      averageDailyUsage: currentUsage.dailyUsage.length > 0 
        ? currentUsage.dailyUsage.reduce((sum, day) => sum + day.credits, 0) / currentUsage.dailyUsage.length
        : 0,
      consistencyScore: calculateUsageConsistency(currentUsage.dailyUsage)
    }

    // Check for upcoming limit warnings
    const warnings = []
    if (currentUsage.percentageUsed >= 90) {
      warnings.push({
        type: 'critical',
        message: 'Usage is at 90% of monthly limit',
        action: 'Consider upgrading plan or monitoring usage closely'
      })
    } else if (currentUsage.percentageUsed >= 75) {
      warnings.push({
        type: 'warning',
        message: 'Usage is at 75% of monthly limit',
        action: 'Monitor usage and consider plan upgrade if trend continues'
      })
    }

    // Predict end-of-month usage
    const daysInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate()
    const dayOfMonth = new Date().getDate()
    const remainingDays = daysInMonth - dayOfMonth
    const projectedUsage = remainingDays > 0 
      ? currentUsage.usedCredits + (usagePatterns.averageDailyUsage * remainingDays)
      : currentUsage.usedCredits

    const managementData = {
      organization: {
        id: organization.id,
        name: organization.name,
        planType: organization.planType,
        subscriptionStatus: organization.subscriptionStatus
      },
      
      plan: planDef ? {
        name: planDef.planName,
        displayName: planDef.displayName,
        monthlyCredits: planDef.monthlyCredits,
        pricing: planDef.pricing,
        limits: planDef.limits,
        features: planDef.features,
        overageRate: planDef.overageRate
      } : null,

      currentUsage: {
        ...currentUsage,
        projectedEndOfMonthUsage: Math.round(projectedUsage),
        willExceedLimit: planDef && planDef.monthlyCredits !== -1 
          ? projectedUsage > planDef.monthlyCredits 
          : false
      },

      usagePatterns,
      trends,
      warnings,

      permissions: {
        canModifyLimits: ['owner', 'admin'].includes(roleInfo.role || ''),
        canViewUsage: true,
        canManagePlan: ['owner', 'billing'].includes(roleInfo.role || ''),
        canViewBilling: ['owner', 'billing'].includes(roleInfo.role || '')
      }
    }

    console.log(`✅ API: Usage management data compiled for org ${orgId}`)

    return NextResponse.json({
      success: true,
      management: managementData
    })

  } catch (error) {
    console.error('❌ Usage management error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * PUT - Update organization usage limits and settings
 */
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ orgId: string }> }
) {
  try {
    const { orgId } = await params

    console.log(`📝 API: Usage management update request for org ${orgId}`)

    // RBAC check - only owners and admins can modify usage settings
    const roleInfo = await requireRoleManagement(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Admin privileges required' },
        { status: 403 }
      )
    }

    const body = await request.json()
    const { usageLimits, alertThresholds, autoScaling } = body

    // Validate usage limits
    if (usageLimits) {
      const allowedFields = [
        'ai_calls_per_month',
        'pdf_exports_per_month', 
        'session_limit',
        'team_members_limit',
        'storage_limit'
      ]

      for (const field of Object.keys(usageLimits)) {
        if (!allowedFields.includes(field)) {
          return NextResponse.json(
            { error: `Invalid usage limit field: ${field}` },
            { status: 400 }
          )
        }
        
        if (typeof usageLimits[field] !== 'number' || usageLimits[field] < -1) {
          return NextResponse.json(
            { error: `Invalid value for ${field}: must be a number >= -1` },
            { status: 400 }
          )
        }
      }
    }

    // Get current organization
    const currentOrg = await prisma.organization.findUnique({
      where: { id: orgId },
      select: { usageLimits: true }
    })

    if (!currentOrg) {
      return NextResponse.json(
        { error: 'Organization not found' },
        { status: 404 }
      )
    }

    // Merge new limits with existing ones
    const updatedLimits = {
      ...(currentOrg.usageLimits as object || {}),
      ...(usageLimits || {}),
      ...(alertThresholds ? { alertThresholds } : {}),
      ...(autoScaling ? { autoScaling } : {}),
      lastUpdated: new Date().toISOString(),
      updatedBy: roleInfo.user.id
    }

    // Update organization
    const updatedOrg = await prisma.organization.update({
      where: { id: orgId },
      data: {
        usageLimits: updatedLimits
      },
      select: {
        id: true,
        name: true,
        planType: true,
        usageLimits: true
      }
    })

    // Log the change for audit
    await prisma.auditLog.create({
      data: {
        organizationId: orgId,
        userId: roleInfo.user.id,
        action: 'update_usage_limits',
        resourceType: 'organization',
        resourceId: orgId,
        oldValues: currentOrg.usageLimits as any,
        newValues: updatedLimits,
        ipAddress: request.headers.get('x-forwarded-for') || 'unknown',
        userAgent: request.headers.get('user-agent')
      }
    })

    console.log(`✅ API: Usage limits updated for org ${orgId}`)

    return NextResponse.json({
      success: true,
      message: 'Usage limits updated successfully',
      organization: updatedOrg
    })

  } catch (error) {
    console.error('❌ Usage management update error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: getErrorMessage(error) },
      { status: 500 }
    )
  }
}

/**
 * Helper function to calculate usage consistency score (0-100)
 */
function calculateUsageConsistency(dailyUsage: Array<{ date: string; credits: number }>): number {
  if (dailyUsage.length < 2) return 100

  const values = dailyUsage.map(d => d.credits)
  const mean = values.reduce((sum, val) => sum + val, 0) / values.length
  
  if (mean === 0) return 100

  const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length
  const standardDeviation = Math.sqrt(variance)
  const coefficientOfVariation = standardDeviation / mean

  // Convert to consistency score (lower variation = higher consistency)
  return Math.max(0, Math.min(100, Math.round((1 - coefficientOfVariation) * 100)))
}
