import { prisma } from '@/lib/prisma'

export interface EventDefinition {
  eventType: string
  baseCredits: number
  description: string
  category: string
  endpoint?: string
  multipliers?: {
    complexity?: { min: number; max: number }
    features?: Record<string, number>
  }
}

export class EventRegistry {
  private cache: Map<string, EventDefinition> = new Map()
  private lastCacheUpdate: Date = new Date(0)
  private cacheTTL = 5 * 60 * 1000 // 5 minutes
  private isRefreshing = false

  /**
   * Get a specific event definition by type
   */
  async getEventDefinition(eventType: string): Promise<EventDefinition | null> {
    await this.refreshCacheIfNeeded()
    return this.cache.get(eventType) || null
  }

  /**
   * Get all event definitions
   */
  async getAllEvents(): Promise<Record<string, EventDefinition>> {
    await this.refreshCacheIfNeeded()
    return Object.fromEntries(this.cache)
  }

  /**
   * Check if event type exists
   */
  async eventExists(eventType: string): Promise<boolean> {
    await this.refreshCacheIfNeeded()
    return this.cache.has(eventType)
  }

  /**
   * Get events by category
   */
  async getEventsByCategory(category: string): Promise<Record<string, EventDefinition>> {
    await this.refreshCacheIfNeeded()
    const events: Record<string, EventDefinition> = {}
    
    for (const [eventType, definition] of this.cache) {
      if (definition.category === category) {
        events[eventType] = definition
      }
    }
    
    return events
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
      console.log('🔄 Refreshing event definitions cache...')
      
      const definitions = await prisma.eventDefinition.findMany({
        orderBy: { eventType: 'asc' }
      })
      
      this.cache.clear()
      
      for (const def of definitions) {
        try {
          const eventDef: EventDefinition = {
            eventType: def.eventType,
            ...(def.config as any)
          }
          
          // Validate required fields
          if (typeof eventDef.baseCredits !== 'number' || eventDef.baseCredits < 0) {
            console.warn(`⚠️ Invalid baseCredits for event ${def.eventType}, skipping`)
            continue
          }
          
          if (!eventDef.description || !eventDef.category) {
            console.warn(`⚠️ Missing description/category for event ${def.eventType}, skipping`)
            continue
          }
          
          this.cache.set(def.eventType, eventDef)
        } catch (error) {
          console.error(`❌ Error parsing event definition ${def.eventType}:`, error)
        }
      }
      
      this.lastCacheUpdate = new Date()
      console.log(`✅ Loaded ${this.cache.size} event definitions`)
      
    } catch (error) {
      console.error('❌ Failed to refresh event definitions cache:', error)
    } finally {
      this.isRefreshing = false
    }
  }

  /**
   * Update or create an event definition
   */
  async updateEventDefinition(eventType: string, config: Partial<EventDefinition>): Promise<void> {
    try {
      await prisma.eventDefinition.upsert({
        where: { eventType },
        update: { 
          config: config as any,
          updatedAt: new Date()
        },
        create: { 
          eventType, 
          config: config as any 
        }
      })
      
      // Force cache refresh
      this.lastCacheUpdate = new Date(0)
      console.log(`✅ Updated event definition: ${eventType}`)
      
    } catch (error) {
      console.error(`❌ Failed to update event definition ${eventType}:`, error)
      throw error
    }
  }

  /**
   * Delete an event definition
   */
  async deleteEventDefinition(eventType: string): Promise<void> {
    try {
      await prisma.eventDefinition.delete({
        where: { eventType }
      })
      
      // Force cache refresh
      this.lastCacheUpdate = new Date(0)
      console.log(`✅ Deleted event definition: ${eventType}`)
      
    } catch (error) {
      console.error(`❌ Failed to delete event definition ${eventType}:`, error)
      throw error
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
export const eventRegistry = new EventRegistry()




