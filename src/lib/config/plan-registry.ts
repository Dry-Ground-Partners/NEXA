import { prisma } from '@/lib/prisma'

export interface PlanDefinition {
  planName: string
  displayName: string
  monthlyCredits: number
  pricing: {
    monthly: number
    annual: number
  }
  limits: {
    aiCallsPerMonth: number
    pdfExportsPerMonth: number
    sessionLimit: number
    teamMembersLimit: number
    storageLimit: number
  }
  features: string[]
  overageRate: number
}

export class PlanRegistry {
  private cache: Map<string, PlanDefinition> = new Map()
  private lastCacheUpdate: Date = new Date(0)
  private cacheTTL = 5 * 60 * 1000 // 5 minutes
  private isRefreshing = false

  /**
   * Get a specific plan definition by name
   */
  async getPlanDefinition(planName: string): Promise<PlanDefinition | null> {
    await this.refreshCacheIfNeeded()
    return this.cache.get(planName) || null
  }

  /**
   * Get all plan definitions
   */
  async getAllPlans(): Promise<Record<string, PlanDefinition>> {
    await this.refreshCacheIfNeeded()
    return Object.fromEntries(this.cache)
  }

  /**
   * Check if plan exists
   */
  async planExists(planName: string): Promise<boolean> {
    await this.refreshCacheIfNeeded()
    return this.cache.has(planName)
  }

  /**
   * Get plans within a price range
   */
  async getPlansByPriceRange(minPrice: number, maxPrice: number): Promise<Record<string, PlanDefinition>> {
    await this.refreshCacheIfNeeded()
    const plans: Record<string, PlanDefinition> = {}
    
    Array.from(this.cache.entries()).forEach(([planName, definition]) => {
      if (definition.pricing.monthly >= minPrice && definition.pricing.monthly <= maxPrice) {
        plans[planName] = definition
      }
    })
    
    return plans
  }

  /**
   * Get plans sorted by price
   */
  async getPlansSortedByPrice(): Promise<PlanDefinition[]> {
    await this.refreshCacheIfNeeded()
    const plans = Array.from(this.cache.values())
    return plans.sort((a, b) => a.pricing.monthly - b.pricing.monthly)
  }

  /**
   * Refresh cache if needed (TTL-based)
   */
  private async refreshCacheIfNeeded(): Promise<void> {
    const now = new Date()
    const cacheAge = now.getTime() - this.lastCacheUpdate.getTime()
    
    // Skip if cache is still fresh or already refreshing
    if (cacheAge < this.cacheTTL || this.isRefreshing) {
      return
    }

    await this.refreshCache()
  }

  /**
   * Force refresh cache from database
   */
  async refreshCache(): Promise<void> {
    if (this.isRefreshing) {
      return // Prevent concurrent refreshes
    }

    this.isRefreshing = true
    
    try {
      console.log('🔄 Refreshing plan definitions cache...')
      
      const definitions = await prisma.planDefinition.findMany({
        orderBy: { planName: 'asc' }
      })
      
      this.cache.clear()
      
      for (const def of definitions) {
        try {
          const planDef: PlanDefinition = {
            planName: def.planName,
            ...(def.config as any)
          }
          
          // Validate required fields
          if (!planDef.displayName || typeof planDef.monthlyCredits !== 'number') {
            console.warn(`⚠️ Invalid plan definition for ${def.planName}, skipping`)
            continue
          }
          
          if (!planDef.pricing || typeof planDef.pricing.monthly !== 'number') {
            console.warn(`⚠️ Invalid pricing for plan ${def.planName}, skipping`)
            continue
          }
          
          if (!planDef.limits || typeof planDef.limits.aiCallsPerMonth !== 'number') {
            console.warn(`⚠️ Invalid limits for plan ${def.planName}, skipping`)
            continue
          }
          
          // Set defaults for missing optional fields
          if (!Array.isArray(planDef.features)) {
            planDef.features = []
          }
          
          if (typeof planDef.overageRate !== 'number') {
            planDef.overageRate = 0
          }
          
          this.cache.set(def.planName, planDef)
        } catch (error: unknown) {
          console.error(`❌ Error parsing plan definition ${def.planName}:`, error)
        }
      }
      
      this.lastCacheUpdate = new Date()
      console.log(`✅ Loaded ${this.cache.size} plan definitions`)
      
    } catch (error: unknown) {
      console.error('❌ Failed to refresh plan definitions cache:', error)
    } finally {
      this.isRefreshing = false
    }
  }

  /**
   * Update or create a plan definition
   */
  async updatePlanDefinition(planName: string, config: Partial<PlanDefinition>): Promise<void> {
    try {
      await prisma.planDefinition.upsert({
        where: { planName },
        update: { 
          config: config as any,
          updatedAt: new Date()
        },
        create: { 
          planName, 
          config: config as any 
        }
      })
      
      // Force cache refresh
      this.lastCacheUpdate = new Date(0)
      console.log(`✅ Updated plan definition: ${planName}`)
      
    } catch (error: unknown) {
      console.error(`❌ Failed to update plan definition ${planName}:`, error)
      throw error
    }
  }

  /**
   * Delete a plan definition
   */
  async deletePlanDefinition(planName: string): Promise<void> {
    try {
      await prisma.planDefinition.delete({
        where: { planName }
      })
      
      // Force cache refresh
      this.lastCacheUpdate = new Date(0)
      console.log(`✅ Deleted plan definition: ${planName}`)
      
    } catch (error: unknown) {
      console.error(`❌ Failed to delete plan definition ${planName}:`, error)
      throw error
    }
  }

  /**
   * Calculate plan upgrade recommendations
   */
  async getUpgradeRecommendation(currentPlan: string, currentUsage: number): Promise<{
    shouldUpgrade: boolean
    recommendedPlan?: string
    reason?: string
  }> {
    await this.refreshCacheIfNeeded()
    
    const current = this.cache.get(currentPlan)
    if (!current) {
      return { shouldUpgrade: false, reason: 'Current plan not found' }
    }

    // If using more than 80% of credits, recommend upgrade
    const usagePercentage = (currentUsage / current.monthlyCredits) * 100
    if (usagePercentage < 80) {
      return { shouldUpgrade: false }
    }

    // Find next higher plan
    const plans = Array.from(this.cache.values())
      .filter(p => p.monthlyCredits > current.monthlyCredits)
      .sort((a, b) => a.monthlyCredits - b.monthlyCredits)

    if (plans.length === 0) {
      return { 
        shouldUpgrade: true, 
        reason: 'Consider enterprise plan for higher limits' 
      }
    }

    return {
      shouldUpgrade: true,
      recommendedPlan: plans[0].planName,
      reason: `You're using ${usagePercentage.toFixed(1)}% of your credits. Upgrade to ${plans[0].displayName} for ${plans[0].monthlyCredits} monthly credits.`
    }
  }

  /**
   * Get cache statistics
   */
  getCacheInfo(): {
    size: number
    lastUpdate: Date
    isStale: boolean
    isRefreshing: boolean
  } {
    const now = new Date()
    const cacheAge = now.getTime() - this.lastCacheUpdate.getTime()
    
    return {
      size: this.cache.size,
      lastUpdate: this.lastCacheUpdate,
      isStale: cacheAge > this.cacheTTL,
      isRefreshing: this.isRefreshing
    }
  }
}

// Singleton instance
export const planRegistry = new PlanRegistry()




