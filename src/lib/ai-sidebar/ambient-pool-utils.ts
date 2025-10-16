/**
 * Ambient audio pool utilities
 * Simple helpers for managing pool of background audio clips
 */

/**
 * Wrapped audio buffer with unique ID for tracking
 */
export interface PoolAudio {
  id: string
  buffer: AudioBuffer
  phrase: string
}

/**
 * Get a random audio from pool without removing it
 * @param pool Array of PoolAudios
 * @returns Random PoolAudio or null if pool empty
 */
export function getRandomPoolAudio(pool: PoolAudio[]): PoolAudio | null {
  if (pool.length === 0) return null
  
  const randomIndex = Math.floor(Math.random() * pool.length)
  return pool[randomIndex]
}

/**
 * Remove an audio from pool (after playing) using ID
 * @param pool Current pool
 * @param audioId ID of audio to remove
 * @returns New pool array
 */
export function removeFromPool(pool: PoolAudio[], audioId: string): PoolAudio[] {
  return pool.filter(audio => audio.id !== audioId)
}

/**
 * Generate ambient audio pool from API
 * Calls backend to generate 4 new audio clips
 * @returns Array of PoolAudios with unique IDs
 */
export async function generateAmbientPool(): Promise<PoolAudio[]> {
  try {
    console.log('[Ambient Pool] Requesting new batch from API...')
    
    // Call API to generate 4 new audios
    const response = await fetch('/api/ai-sidebar/generate-ambient-pool', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
    })
    
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}))
      throw new Error(errorData.error || `API error: ${response.status}`)
    }
    
    const { audios, phrases, count } = await response.json()
    console.log(`[Ambient Pool] Received ${count} audio clips:`, phrases)
    
    // Convert base64 to AudioBuffer with unique IDs
    const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
    const poolAudios: PoolAudio[] = []
    
    for (let i = 0; i < audios.length; i++) {
      try {
        const base64Audio = audios[i]
        const phrase = phrases[i] || `Audio ${i + 1}`
        
        // Decode base64 to binary
        const binaryString = atob(base64Audio)
        const bytes = new Uint8Array(binaryString.length)
        for (let j = 0; j < binaryString.length; j++) {
          bytes[j] = binaryString.charCodeAt(j)
        }
        
        // Decode audio data
        const arrayBuffer = bytes.buffer
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer)
        
        // Create unique ID and wrap audio
        const poolAudio: PoolAudio = {
          id: `pool-${Date.now()}-${i}-${Math.random().toString(36).substring(2, 9)}`,
          buffer: audioBuffer,
          phrase
        }
        
        poolAudios.push(poolAudio)
        
        console.log(`[Ambient Pool] Decoded audio ${i + 1}/${audios.length}: "${phrase}" (${audioBuffer.duration.toFixed(2)}s, ID: ${poolAudio.id})`)
      } catch (error) {
        console.error(`[Ambient Pool] Failed to decode audio ${i + 1}:`, error)
      }
    }
    
    console.log(`[Ambient Pool] Successfully created ${poolAudios.length} PoolAudios`)
    return poolAudios
    
  } catch (error) {
    console.error('[Ambient Pool] Generation failed:', error)
    return []
  }
}

/**
 * Pool configuration constants
 */
export const AMBIENT_POOL_CONFIG = {
  MIN_SIZE: 5,            // When to trigger refill (5+4=9, safe zone!)
  BATCH_SIZE: 4,          // How many to generate at once
  MAX_SIZE: 12,           // Maximum pool size (allows 2-3 batches)
  EMPTY_WAIT_MS: 1000,    // Wait time if pool empty (ms)
} as const

