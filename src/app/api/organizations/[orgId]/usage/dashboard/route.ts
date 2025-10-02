import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationAccess } from '@/lib/api-rbac'
import { usageTracker } from '@/lib/usage/usage-tracker'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    const url = new URL(request.url)
    const month = url.searchParams.get('month')

    console.log(`📊 API: Usage dashboard request for org ${orgId}`)

    // RBAC check - organization access required
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied - Organization access required' },
        { status: 403 }
      )
    }

    // Get usage breakdown for the specified month (or current month)
    const targetMonth = month ? new Date(month) : undefined
    const breakdown = await usageTracker.getUsageBreakdown(orgId, targetMonth)

    // Get usage trends for context
    const trends = await usageTracker.getUsageTrends(orgId, 3)

    // Calculate additional metrics
    const warningThreshold = 80 // 80% of limit
    const isNearLimit = breakdown.percentageUsed >= warningThreshold
    const isOverLimit = breakdown.percentageUsed >= 100

    // Top users by usage
    const topUsers = Object.entries(breakdown.userBreakdown)
      .map(([userName, data]) => ({
        name: userName,
        credits: data.credits,
        count: data.count,
        percentage: breakdown.usedCredits > 0 ? (data.credits / breakdown.usedCredits) * 100 : 0
      }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 5)

    // Usage efficiency metrics
    const avgCreditsPerEvent = breakdown.usedCredits > 0 
      ? breakdown.usedCredits / Object.values(breakdown.eventBreakdown).reduce((sum, e) => sum + e.count, 0)
      : 0

    const dailyAverage = breakdown.dailyUsage.length > 0
      ? breakdown.dailyUsage.reduce((sum, day) => sum + day.credits, 0) / breakdown.dailyUsage.length
      : 0

    // Create comprehensive dashboard data
    const dashboardData = {
      // Core usage metrics
      overview: {
        totalCredits: breakdown.totalCredits,
        usedCredits: breakdown.usedCredits,
        remainingCredits: breakdown.remainingCredits,
        percentageUsed: breakdown.percentageUsed,
        isNearLimit,
        isOverLimit,
        warningThreshold
      },

      // Event breakdown
      events: {
        breakdown: breakdown.eventBreakdown,
        topEvents: breakdown.topEvents,
        totalEvents: Object.values(breakdown.eventBreakdown).reduce((sum, e) => sum + e.count, 0)
      },

      // User breakdown
      users: {
        breakdown: breakdown.userBreakdown,
        topUsers,
        totalUsers: Object.keys(breakdown.userBreakdown).length
      },

      // Time-based analytics
      analytics: {
        dailyUsage: breakdown.dailyUsage,
        monthlyTrends: trends.monthlyTrends,
        forecast: trends.forecast,
        dailyAverage,
        avgCreditsPerEvent
      },

      // Plan and limits
      limits: {
        planType: breakdown.totalCredits === Infinity ? 'enterprise' : 'limited',
        isUnlimited: breakdown.totalCredits === Infinity,
        daysInMonth: new Date(
          targetMonth?.getFullYear() || new Date().getFullYear(),
          (targetMonth?.getMonth() || new Date().getMonth()) + 1,
          0
        ).getDate()
      },

      // Metadata
      meta: {
        organizationId: orgId,
        reportMonth: targetMonth?.toISOString().slice(0, 7) || new Date().toISOString().slice(0, 7),
        generatedAt: new Date().toISOString(),
        generatedBy: roleInfo.user?.id
      }
    }

    console.log(`✅ API: Dashboard generated for org ${orgId} - ${breakdown.usedCredits} credits used`)

    return NextResponse.json({
      success: true,
      dashboard: dashboardData
    })

  } catch (error) {
    console.error('❌ Usage dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error', details: error.message },
      { status: 500 }
    )
  }
}





