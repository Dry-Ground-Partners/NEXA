/**
 * Preferences Caching Utility for LangChain Functions
 * 
 * Caches organization preferences for 5 minutes to avoid repeated database hits
 * during AI generation workflows.
 */

import { getPreferencesForPrompts } from '@/lib/preferences/preferences-service'

interface CachedPreferences {
  data: {
    generalApproach: string
    structuring: Record<string, string>
    visuals: Record<string, string>
    solutioning: Record<string, string>
    pushing: Record<string, string>
  }
  expires: number
}

// Simple in-memory cache
const preferencesCache = new Map<string, CachedPreferences>()

// Cache TTL: 5 minutes
const CACHE_TTL_MS = 5 * 60 * 1000

/**
 * Get organization preferences with caching
 * @param organizationId - Organization UUID
 * @returns Preferences object with all fields
 */
export async function getCachedPreferences(organizationId: string) {
  // Check cache first
  const cached = preferencesCache.get(organizationId)
  if (cached && cached.expires > Date.now()) {
    console.log(`✅ Preferences cache HIT for org ${organizationId}`)
    return cached.data
  }

  // Cache miss - fetch from database
  console.log(`🔄 Preferences cache MISS for org ${organizationId} - fetching from DB...`)
  const prefs = await getPreferencesForPrompts(organizationId)

  // Store in cache
  preferencesCache.set(organizationId, {
    data: prefs,
    expires: Date.now() + CACHE_TTL_MS
  })

  console.log(`💾 Cached preferences for org ${organizationId} (expires in 5 minutes)`)
  
  return prefs
}

/**
 * Clear preferences cache for a specific organization
 * Called when preferences are updated
 */
export function clearPreferencesCache(organizationId: string) {
  const deleted = preferencesCache.delete(organizationId)
  if (deleted) {
    console.log(`🗑️ Cleared preferences cache for org ${organizationId}`)
  }
  return deleted
}

/**
 * Clear all preferences cache
 * Useful for testing or manual cache invalidation
 */
export function clearAllPreferencesCache() {
  const size = preferencesCache.size
  preferencesCache.clear()
  console.log(`🗑️ Cleared all preferences cache (${size} entries)`)
}

/**
 * Get cache statistics
 * Useful for monitoring and debugging
 */
export function getPreferencesCacheStats() {
  return {
    size: preferencesCache.size,
    entries: Array.from(preferencesCache.entries()).map(([orgId, cache]) => ({
      organizationId: orgId,
      expiresIn: Math.max(0, cache.expires - Date.now()),
      expired: cache.expires <= Date.now()
    }))
  }
}





