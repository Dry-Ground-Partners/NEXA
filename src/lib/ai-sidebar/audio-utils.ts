/**
 * Audio utilities for voice mode
 * Uses Web Audio API for playback control
 */

// Global audio context (reused across calls)
let audioContext: AudioContext | null = null

// Currently playing source (for cleanup)
let currentSource: AudioBufferSourceNode | null = null

/**
 * Get or create audio context
 */
function getAudioContext(): AudioContext {
  if (!audioContext) {
    audioContext = new (window.AudioContext || (window as any).webkitAudioContext)()
  }
  return audioContext
}

/**
 * Convert text to speech using OpenAI Whisper TTS API
 * @param text The text to convert to speech
 * @returns AudioBuffer ready for playback
 */
export async function textToSpeech(text: string): Promise<AudioBuffer> {
  try {
    // Call our TTS API endpoint
    const response = await fetch('/api/ai-sidebar/tts', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ text })
    })
    
    if (!response.ok) {
      throw new Error(`TTS API error: ${response.statusText}`)
    }
    
    // Get audio blob
    const audioBlob = await response.blob()
    const arrayBuffer = await audioBlob.arrayBuffer()
    
    // Decode audio data
    const context = getAudioContext()
    const audioBuffer = await context.decodeAudioData(arrayBuffer)
    
    return audioBuffer
  } catch (error) {
    console.error('Text-to-speech error:', error)
    throw error
  }
}

/**
 * Play an audio buffer
 * Waits for previous audio to finish before playing
 * @param buffer The audio buffer to play
 * @returns Promise that resolves when audio finishes playing
 */
export function playAudio(buffer: AudioBuffer): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      // Stop any currently playing audio
      stopAudio()
      
      const context = getAudioContext()
      const source = context.createBufferSource()
      source.buffer = buffer
      source.connect(context.destination)
      
      // Store reference for cleanup
      currentSource = source
      
      // Resolve when audio finishes
      source.onended = () => {
        currentSource = null
        resolve()
      }
      
      // Start playback
      source.start(0)
      
    } catch (error) {
      console.error('Audio playback error:', error)
      reject(error)
    }
  })
}

/**
 * Stop currently playing audio
 */
export function stopAudio(): void {
  if (currentSource) {
    try {
      currentSource.stop()
      currentSource.disconnect()
    } catch (error) {
      // Already stopped or disconnected
    }
    currentSource = null
  }
}

/**
 * Check if audio is currently playing
 */
export function isAudioPlaying(): boolean {
  return currentSource !== null
}

/**
 * Generate audio for a message and play it
 * This is a convenience function that combines textToSpeech and playAudio
 * @param text The text to convert and play
 * @returns Promise that resolves when audio finishes playing
 */
export async function generateAndPlayAudio(text: string): Promise<void> {
  try {
    const audioBuffer = await textToSpeech(text)
    await playAudio(audioBuffer)
  } catch (error) {
    console.error('Generate and play audio error:', error)
    throw error
  }
}

