import { NextRequest, NextResponse } from 'next/server'
import * as hub from 'langchain/hub/node'
import OpenAI from 'openai'

export const runtime = 'nodejs'

const openai = new OpenAI()

/**
 * Generate ambient pool of 4 short audio clips
 * Used for voice mode filler during message generation
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Ambient Pool] Generating new batch...')
    
    // Step 1: Get 4 phrases from LangSmith
    const prompt = await hub.pull('nexa-liaison-ambient-thinking', {
      includeModel: true
    })
    
    const result = await prompt.invoke({})
    const content = result.content || result.text || String(result)
    
    // Step 2: Parse JSON array
    console.log('[Ambient Pool] Raw LangSmith response:', content)
    
    let phrases: string[]
    phrases = JSON.parse(content)
    
    // Validate array
    if (!Array.isArray(phrases)) {
      console.error('[Ambient Pool] LangSmith did not return array:', typeof phrases)
      throw new Error('LangSmith did not return an array')
    }
    
    if (phrases.length !== 4) {
      console.error(`[Ambient Pool] LangSmith returned ${phrases.length} phrases, expected 4:`, phrases)
      throw new Error(`Expected 4 phrases, got ${phrases.length}`)
    }
    
    // NO LENGTH FILTERING - accept whatever LangSmith generates!
    phrases = phrases.map(p => String(p).trim())
    
    console.log('[Ambient Pool] LangSmith phrases accepted:', phrases)
    
    // Step 3: Generate audio for each phrase in parallel
    console.log('[Ambient Pool] Generating TTS for 4 phrases...')
    const audioPromises = phrases.map(async (phrase, index) => {
      try {
        const mp3 = await openai.audio.speech.create({
          model: 'tts-1',
          voice: 'alloy',
          input: phrase,
        })
        
        const buffer = Buffer.from(await mp3.arrayBuffer())
        console.log(`[Ambient Pool] Generated audio ${index + 1}/4`)
        return buffer.toString('base64')
      } catch (error) {
        console.error(`[Ambient Pool] Failed to generate audio for phrase "${phrase}":`, error)
        return null
      }
    })
    
    const audioBuffers = await Promise.all(audioPromises)
    
    // Filter out failed generations
    const validAudios = audioBuffers.filter(a => a !== null) as string[]
    
    if (validAudios.length === 0) {
      console.error('[Ambient Pool] All audio generations failed')
      return NextResponse.json(
        { error: 'Failed to generate any audio clips' },
        { status: 500 }
      )
    }
    
    console.log(`[Ambient Pool] Successfully generated ${validAudios.length}/4 audio clips`)
    
    // Step 4: Return array of base64 audio
    return NextResponse.json({
      audios: validAudios,
      phrases: phrases.slice(0, validAudios.length), // For debugging
      count: validAudios.length,
      timestamp: new Date().toISOString()
    })
    
  } catch (error: any) {
    console.error('[Ambient Pool] Generation error:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to generate ambient pool' },
      { status: 500 }
    )
  }
}

