import { prisma } from '@/lib/prisma'
import { eventRegistry, EventDefinition } from '@/lib/config/event-registry'
import { planRegistry } from '@/lib/config/plan-registry'

export interface TrackUsageParams {
  organizationId: string
  userId: string
  eventType: string
  sessionId?: number
  eventData?: Record<string, any>
  // Optional overrides
  creditsOverride?: number
  skipLimitCheck?: boolean
}

export interface UsageResult {
  success: boolean
  creditsConsumed: number
  remainingCredits: number
  error?: string
  usageEventId?: string
  limitWarning?: {
    percentageUsed: number
    isNearLimit: boolean
    isOverLimit: boolean
    recommendedAction?: string
  }
}

export interface UsageBreakdown {
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  percentageUsed: number
  eventBreakdown: Record<string, { count: number; credits: number }>
  userBreakdown: Record<string, { count: number; credits: number }>
  dailyUsage: Array<{ date: string; credits: number }>
  topEvents: Array<{ eventType: string; credits: number; percentage: number }>
}

export class UsageTracker {
  /**
   * Track usage for a specific event
   */
  async trackUsage(params: TrackUsageParams): Promise<UsageResult> {
    const { 
      organizationId, 
      userId, 
      eventType, 
      sessionId, 
      eventData = {},
      creditsOverride,
      skipLimitCheck = false 
    } = params

    try {
      // Get event definition
      const eventDef = await eventRegistry.getEventDefinition(eventType)
      if (!eventDef) {
        return {
          success: false,
          creditsConsumed: 0,
          remainingCredits: 0,
          error: `Unknown event type: ${eventType}`
        }
      }

      // Calculate credits
      const creditsConsumed = creditsOverride || this.calculateCredits(eventDef, eventData)

      // Check limits (unless skipped)
      if (!skipLimitCheck) {
        const limitCheck = await this.checkUsageLimits(organizationId, creditsConsumed)
        if (!limitCheck.allowed) {
          return {
            success: false,
            creditsConsumed: 0,
            remainingCredits: limitCheck.remainingCredits,
            error: limitCheck.reason
          }
        }
      }

      // Record usage event
      const usageEvent = await prisma.usageEvent.create({
        data: {
          organizationId,
          userId,
          eventType,
          eventData: {
            ...eventData,
            calculatedCredits: creditsConsumed,
            baseCredits: eventDef.baseCredits,
            multipliers: this.getAppliedMultipliers(eventDef, eventData)
          },
          creditsConsumed,
          sessionId
        }
      })

      // Calculate remaining credits and warnings
      const remaining = await this.getRemainingCredits(organizationId)
      const limitWarning = await this.getLimitWarning(organizationId)

      console.log(`✅ Tracked ${eventType}: ${creditsConsumed} credits for org ${organizationId}`)

      return {
        success: true,
        creditsConsumed,
        remainingCredits: remaining,
        usageEventId: usageEvent.id,
        limitWarning
      }

    } catch (error: unknown) {
      console.error('❌ Usage tracking error:', error)
      return {
        success: false,
        creditsConsumed: 0,
        remainingCredits: 0,
        error: 'Internal tracking error'
      }
    }
  }

  /**
   * Calculate credits based on event definition and data
   */
  private calculateCredits(eventDef: EventDefinition, eventData: Record<string, any>): number {
    let credits = eventDef.baseCredits

    // Apply complexity multiplier
    if (eventDef.multipliers?.complexity && eventData.complexity) {
      const complexity = Math.max(
        eventDef.multipliers.complexity.min,
        Math.min(eventDef.multipliers.complexity.max, eventData.complexity)
      )
      credits *= complexity
    }

    // Apply feature multipliers (additive)
    if (eventDef.multipliers?.features) {
      for (const [feature, multiplier] of Object.entries(eventDef.multipliers.features)) {
        if (eventData[feature]) {
          credits += multiplier as number
        }
      }
    }

    return Math.round(credits)
  }

  /**
   * Get applied multipliers for audit trail
   */
  private getAppliedMultipliers(eventDef: EventDefinition, eventData: Record<string, any>): Record<string, any> {
    const applied: Record<string, any> = {}

    if (eventDef.multipliers?.complexity && eventData.complexity) {
      applied.complexity = Math.max(
        eventDef.multipliers.complexity.min,
        Math.min(eventDef.multipliers.complexity.max, eventData.complexity)
      )
    }

    if (eventDef.multipliers?.features) {
      applied.features = {}
      for (const [feature, multiplier] of Object.entries(eventDef.multipliers.features)) {
        if (eventData[feature]) {
          applied.features[feature] = multiplier
        }
      }
    }

    return applied
  }

  /**
   * Check if usage is within limits
   */
  private async checkUsageLimits(organizationId: string, creditsNeeded: number): Promise<{
    allowed: boolean
    reason?: string
    remainingCredits: number
  }> {
    // Get organization plan
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planType: true, usageLimits: true }
    })

    if (!org) {
      return { allowed: false, reason: 'Organization not found', remainingCredits: 0 }
    }

    // Get current month usage
    const { startOfMonth, endOfMonth } = this.getCurrentMonthRange()

    const monthlyUsage = await prisma.usageEvent.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { creditsConsumed: true }
    })

    const usedCredits = monthlyUsage._sum.creditsConsumed || 0
    const creditLimit = (org.usageLimits as any).ai_calls_per_month || 0
    const remainingCredits = creditLimit - usedCredits

    // Allow unlimited usage for enterprise plans (creditLimit = -1)
    if (creditLimit === -1) {
      return { allowed: true, remainingCredits: Infinity }
    }

    if (usedCredits + creditsNeeded > creditLimit) {
      return {
        allowed: false,
        reason: `Credit limit exceeded. Used: ${usedCredits}, Needed: ${creditsNeeded}, Limit: ${creditLimit}`,
        remainingCredits
      }
    }

    return { allowed: true, remainingCredits }
  }

  /**
   * Get remaining credits for organization
   */
  private async getRemainingCredits(organizationId: string): Promise<number> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { usageLimits: true }
    })

    if (!org) return 0

    const { startOfMonth, endOfMonth } = this.getCurrentMonthRange()

    const monthlyUsage = await prisma.usageEvent.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { creditsConsumed: true }
    })

    const usedCredits = monthlyUsage._sum.creditsConsumed || 0
    const creditLimit = (org.usageLimits as any).ai_calls_per_month || 0

    // Return unlimited for enterprise plans
    if (creditLimit === -1) return Infinity

    return Math.max(0, creditLimit - usedCredits)
  }

  /**
   * Get limit warning information
   */
  private async getLimitWarning(organizationId: string): Promise<{
    percentageUsed: number
    isNearLimit: boolean
    isOverLimit: boolean
    recommendedAction?: string
  } | undefined> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planType: true, usageLimits: true }
    })

    if (!org) return undefined

    const { startOfMonth, endOfMonth } = this.getCurrentMonthRange()

    const monthlyUsage = await prisma.usageEvent.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { creditsConsumed: true }
    })

    const usedCredits = monthlyUsage._sum.creditsConsumed || 0
    const creditLimit = (org.usageLimits as any).ai_calls_per_month || 0

    // Skip warnings for unlimited plans
    if (creditLimit === -1) return undefined

    const percentageUsed = creditLimit > 0 ? (usedCredits / creditLimit) * 100 : 0
    const isNearLimit = percentageUsed >= 80
    const isOverLimit = percentageUsed >= 100

    let recommendedAction: string | undefined
    if (isOverLimit) {
      recommendedAction = 'Consider upgrading your plan or purchasing additional credits'
    } else if (isNearLimit) {
      recommendedAction = 'You are approaching your monthly limit'
    }

    return {
      percentageUsed,
      isNearLimit,
      isOverLimit,
      recommendedAction
    }
  }

  /**
   * Get detailed usage breakdown for an organization
   */
  async getUsageBreakdown(organizationId: string, month?: Date): Promise<UsageBreakdown> {
    const targetMonth = month || new Date()
    const { startOfMonth, endOfMonth } = this.getMonthRange(targetMonth)

    // Get organization plan
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { usageLimits: true }
    })

    const totalCredits = (org?.usageLimits as any)?.ai_calls_per_month || 0

    // Get usage events for the month
    const events = await prisma.usageEvent.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true }
        }
      },
      orderBy: { createdAt: 'desc' }
    })

    const usedCredits = events.reduce((sum, event) => sum + event.creditsConsumed, 0)
    const remainingCredits = totalCredits === -1 ? Infinity : Math.max(0, totalCredits - usedCredits)
    const percentageUsed = totalCredits === -1 ? 0 : totalCredits > 0 ? (usedCredits / totalCredits) * 100 : 0

    // Event breakdown
    const eventBreakdown: Record<string, { count: number; credits: number }> = {}
    for (const event of events) {
      if (!eventBreakdown[event.eventType]) {
        eventBreakdown[event.eventType] = { count: 0, credits: 0 }
      }
      eventBreakdown[event.eventType].count++
      eventBreakdown[event.eventType].credits += event.creditsConsumed
    }

    // User breakdown
    const userBreakdown: Record<string, { count: number; credits: number }> = {}
    for (const event of events) {
      const userKey = event.user.fullName || event.user.email
      if (!userBreakdown[userKey]) {
        userBreakdown[userKey] = { count: 0, credits: 0 }
      }
      userBreakdown[userKey].count++
      userBreakdown[userKey].credits += event.creditsConsumed
    }

    // Daily usage
    const dailyUsage = this.calculateDailyUsage(events, startOfMonth, endOfMonth)

    // Top events
    const topEvents = Object.entries(eventBreakdown)
      .map(([eventType, data]) => ({
        eventType,
        credits: data.credits,
        percentage: usedCredits > 0 ? (data.credits / usedCredits) * 100 : 0
      }))
      .sort((a, b) => b.credits - a.credits)
      .slice(0, 5)

    return {
      totalCredits: totalCredits === -1 ? Infinity : totalCredits,
      usedCredits,
      remainingCredits,
      percentageUsed,
      eventBreakdown,
      userBreakdown,
      dailyUsage,
      topEvents
    }
  }

  /**
   * Calculate daily usage breakdown
   */
  private calculateDailyUsage(events: any[], startOfMonth: Date, endOfMonth: Date): Array<{ date: string; credits: number }> {
    const dailyMap = new Map<string, number>()
    
    // Initialize all days in month with 0
    const current = new Date(startOfMonth)
    while (current <= endOfMonth) {
      const dateStr = current.toISOString().split('T')[0]
      dailyMap.set(dateStr, 0)
      current.setDate(current.getDate() + 1)
    }

    // Aggregate events by day
    for (const event of events) {
      const dateStr = event.createdAt.toISOString().split('T')[0]
      dailyMap.set(dateStr, (dailyMap.get(dateStr) || 0) + event.creditsConsumed)
    }

    return Array.from(dailyMap.entries())
      .map(([date, credits]) => ({ date, credits }))
      .sort((a, b) => a.date.localeCompare(b.date))
  }

  /**
   * Get current month date range
   */
  private getCurrentMonthRange(): { startOfMonth: Date; endOfMonth: Date } {
    return this.getMonthRange(new Date())
  }

  /**
   * Get month date range for any month
   */
  private getMonthRange(date: Date): { startOfMonth: Date; endOfMonth: Date } {
    const startOfMonth = new Date(date.getFullYear(), date.getMonth(), 1)
    const endOfMonth = new Date(date.getFullYear(), date.getMonth() + 1, 0, 23, 59, 59, 999)
    return { startOfMonth, endOfMonth }
  }

  /**
   * Get usage trends and forecasting
   */
  async getUsageTrends(organizationId: string, months: number = 3): Promise<{
    monthlyTrends: Array<{
      month: string
      credits: number
      growth: number
    }>
    forecast: {
      nextMonthEstimate: number
      confidence: number
    }
  }> {
    const trends = []
    const now = new Date()

    for (let i = months - 1; i >= 0; i--) {
      const month = new Date(now.getFullYear(), now.getMonth() - i, 1)
      const { startOfMonth, endOfMonth } = this.getMonthRange(month)

      const monthUsage = await prisma.usageEvent.aggregate({
        where: {
          organizationId,
          createdAt: {
            gte: startOfMonth,
            lte: endOfMonth
          }
        },
        _sum: { creditsConsumed: true }
      })

      const credits = monthUsage._sum.creditsConsumed || 0
      const growth = trends.length > 0 
        ? ((credits - trends[trends.length - 1].credits) / Math.max(1, trends[trends.length - 1].credits)) * 100
        : 0

      trends.push({
        month: month.toISOString().slice(0, 7), // YYYY-MM
        credits,
        growth
      })
    }

    // Simple linear forecast
    const lastThreeMonths = trends.slice(-3)
    const avgGrowth = lastThreeMonths.reduce((sum, t) => sum + t.growth, 0) / lastThreeMonths.length
    const lastMonthCredits = trends[trends.length - 1]?.credits || 0
    const nextMonthEstimate = Math.max(0, lastMonthCredits * (1 + avgGrowth / 100))
    const confidence = Math.max(0, Math.min(100, 100 - Math.abs(avgGrowth) * 2)) // Lower confidence for high volatility

    return {
      monthlyTrends: trends,
      forecast: {
        nextMonthEstimate: Math.round(nextMonthEstimate),
        confidence: Math.round(confidence)
      }
    }
  }
}

// Singleton instance
export const usageTracker = new UsageTracker()






















