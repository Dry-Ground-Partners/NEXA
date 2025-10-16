import { NextRequest } from 'next/server'

export const runtime = 'nodejs'

export async function POST(request: NextRequest) {
  try {
    const { text } = await request.json()
    
    if (!text || typeof text !== 'string') {
      return new Response(
        JSON.stringify({ error: 'Text is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Check for OpenAI API key
    const apiKey = process.env.OPENAI_API_KEY
    if (!apiKey) {
      return new Response(
        JSON.stringify({ error: 'OpenAI API key not configured' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Call OpenAI Whisper TTS API
    const response = await fetch('https://api.openai.com/v1/audio/speech', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        model: 'tts-1', // Fast model (tts-1-hd for higher quality)
        voice: 'alloy', // Options: alloy, echo, fable, onyx, nova, shimmer
        input: text,
        speed: 1.0
      })
    })
    
    if (!response.ok) {
      const errorText = await response.text()
      console.error('OpenAI TTS API error:', errorText)
      return new Response(
        JSON.stringify({ error: 'Failed to generate audio' }),
        { status: response.status, headers: { 'Content-Type': 'application/json' } }
      )
    }
    
    // Return audio blob directly
    const audioBlob = await response.blob()
    
    return new Response(audioBlob, {
      headers: {
        'Content-Type': 'audio/mpeg',
        'Cache-Control': 'public, max-age=31536000', // Cache for 1 year
      },
    })
    
  } catch (error: any) {
    console.error('Error in TTS route:', error)
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to generate audio' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

