'use client'

import { useState, useEffect, useRef } from 'react'
import { Speech, X, Send, Volume2, VolumeX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownMessage } from './MarkdownMessage'
import { LoadingIndicator } from './LoadingIndicator'
import { getHiddenMessage } from '@/lib/ai-sidebar/message-generators'
import { textToSpeech, playAudio, stopAudio } from '@/lib/ai-sidebar/audio-utils'
import { 
  generateAmbientPool, 
  getRandomPoolAudio, 
  removeFromPool,
  AMBIENT_POOL_CONFIG,
  type PoolAudio
} from '@/lib/ai-sidebar/ambient-pool-utils'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'log'
  type: 'user' | 'hidden' | 'pre-response' | 'response' | 'log'
  content: string
  timestamp: Date
}

const AI_SIDEBAR_STORAGE_KEY = 'nexa-ai-sidebar-state'
const MIN_COMPLEXITY_THRESHOLD = 60

export function AISidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
  const [isProcessing, setIsProcessing] = useState(false)
  const [nextHiddenMessage, setNextHiddenMessage] = useState<string | null>(null)
  const [voiceMode, setVoiceMode] = useState(false)
  const [nextHiddenAudio, setNextHiddenAudio] = useState<AudioBuffer | null>(null)
  const [ambientAudioPool, setAmbientAudioPool] = useState<PoolAudio[]>([])
  const [isGeneratingPool, setIsGeneratingPool] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const audioQueueRef = useRef<AudioBuffer[]>([])
  const isPlayingRef = useRef(false)

  // Load state from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(AI_SIDEBAR_STORAGE_KEY)
    if (stored === 'true') {
      setIsExpanded(true)
    }
  }, [])

  // Save state and dispatch event when changed
  useEffect(() => {
    localStorage.setItem(AI_SIDEBAR_STORAGE_KEY, isExpanded.toString())
    // Dispatch event so DashboardLayout can adjust margins
    window.dispatchEvent(new CustomEvent('aiSidebarStateChange', { detail: { isExpanded } }))
  }, [isExpanded])

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      stopAudio()
    }
  }, [])

  // Toggle with 'W' key
  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      if (e.key === 'w' || e.key === 'W') {
        // Only toggle if not typing in an input
        if (
          document.activeElement?.tagName !== 'INPUT' &&
          document.activeElement?.tagName !== 'TEXTAREA'
        ) {
          setIsExpanded(prev => !prev)
        }
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [])

  // Helper to queue and play audio sequentially
  const queueAndPlayAudio = async (audioBuffer: AudioBuffer) => {
    try {
      await playAudio(audioBuffer)
    } catch (error) {
      console.error('Audio playback error:', error)
    }
  }

  // Refill ambient audio pool
  const refillAmbientPool = async () => {
    if (isGeneratingPool) {
      return // Already generating
    }

    setIsGeneratingPool(true)
    console.log('[Ambient Pool] Refilling pool...')

    try {
      const newAudios = await generateAmbientPool()
      
      if (newAudios.length > 0) {
        setAmbientAudioPool(prev => {
          const combined = [...prev, ...newAudios]
          const limited = combined.slice(0, AMBIENT_POOL_CONFIG.MAX_SIZE)
          console.log(`[Ambient Pool] Pool refilled (+${newAudios.length} clips, pool now: ${limited.length})`)
          console.log(`[Ambient Pool] New audio IDs:`, newAudios.map(a => `${a.id.substring(0, 20)}... ("${a.phrase}")`))
          return limited
        })
      } else {
        console.warn('[Ambient Pool] No audios generated')
      }
    } catch (error) {
      console.error('[Ambient Pool] Refill error:', error)
    } finally {
      setIsGeneratingPool(false)
    }
  }

  // Wait for audio with pool fallback, then stream text + play audio TOGETHER
  // This ensures audio plays FIRST or TOGETHER with text, never AFTER
  const waitForAudioAndStreamText = async (
    getTargetAudio: () => AudioBuffer | null,
    text: string,
    messageId: string,
    audioName: string
  ): Promise<void> => {
    console.log(`[Voice Mode] Waiting for ${audioName} audio...`)

    let targetAudio = getTargetAudio()

    // If audio is ready immediately, skip pool entirely!
    if (targetAudio) {
      console.log(`[Voice Mode] ${audioName} audio ready immediately, skipping pool`)
    } else {
      // Audio not ready yet - play pool fillers while waiting
      while (!targetAudio && voiceMode) {
        // Random delay before filler (0.8-2.0 seconds)
        const randomDelay = 800 + Math.random() * 1200 // 800-2000ms
        console.log(`[Ambient Pool] Waiting ${randomDelay.toFixed(0)}ms before checking...`)
        await new Promise(resolve => setTimeout(resolve, randomDelay))

        // Check if audio became ready during delay
        targetAudio = getTargetAudio()
        if (targetAudio) {
          console.log(`[Voice Mode] ${audioName} audio ready during delay, skipping pool`)
          break
        }

        // Get a pool audio
        const poolAudio = getRandomPoolAudio(ambientAudioPool)

        if (!poolAudio) {
          // Pool empty, wait a bit
          console.log(`[Ambient Pool] Pool empty (${ambientAudioPool.length}), waiting...`)
          await new Promise(resolve => setTimeout(resolve, AMBIENT_POOL_CONFIG.EMPTY_WAIT_MS))

          // Trigger refill if needed
          if (ambientAudioPool.length < AMBIENT_POOL_CONFIG.MIN_SIZE && !isGeneratingPool) {
            refillAmbientPool()
          }
        } else {
          // Play pool audio to completion
          console.log(`[Ambient Pool] Playing pool filler "${poolAudio.phrase}" (ID: ${poolAudio.id}, pool: ${ambientAudioPool.length}) while waiting for ${audioName}`)

          try {
            await playAudio(poolAudio.buffer)

            // Remove played audio from pool using ID (prevents replays!)
            setAmbientAudioPool(prev => {
              const updated = removeFromPool(prev, poolAudio.id)
              console.log(`[Ambient Pool] Pool filler done, removed ID: ${poolAudio.id} (pool: ${updated.length} remaining)`)
              
              // Trigger refill if pool getting low
              if (updated.length < AMBIENT_POOL_CONFIG.MIN_SIZE && !isGeneratingPool) {
                console.log(`[Ambient Pool] Pool low (${updated.length}), triggering refill...`)
                refillAmbientPool()
              }
              
              return updated
            })
          } catch (error) {
            console.error('[Ambient Pool] Pool playback error:', error)
          }
        }

        // Check again if target audio is ready
        targetAudio = getTargetAudio()
      }
    }

    // Audio is ready! Now stream text AND play audio TOGETHER
    if (targetAudio) {
      console.log(`[Voice Mode] ${audioName} audio ready, streaming text + playing audio TOGETHER`)

      // Start audio playback immediately (non-blocking)
      const audioPlayPromise = playAudio(targetAudio)

      // Stream text character-by-character simultaneously
      let accumulated = ''
      for (let i = 0; i < text.length; i++) {
        accumulated += text[i]
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content: accumulated } : m
        ))
        await new Promise(resolve => setTimeout(resolve, 10))
      }

      // Wait for audio to finish
      await audioPlayPromise
      console.log(`[Voice Mode] ${audioName} complete (text + audio)`)
    }
  }

  // Generate initial pool when voice mode activates
  useEffect(() => {
    if (voiceMode && ambientAudioPool.length === 0 && !isGeneratingPool) {
      console.log('[Ambient Pool] Voice mode activated, generating initial pool...')
      refillAmbientPool()
    }
  }, [voiceMode])

  // Helper to stream a message
  const streamMessage = async (
    messageType: 'hidden' | 'pre-response' | 'response' | 'next-hidden',
    userInput: string,
    previousMessagesText: string,
    initialContent: string = ''
  ): Promise<{ content: string; action?: any }> => {
    const messageId = `${messageType}-${Date.now()}`
    
    let action = { type: null, params: {} }
    let fullText = initialContent
    
    try {
      // Step 1: Fetch complete text from API
      const response = await fetch('/api/ai-sidebar/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          previousMessages: previousMessagesText,
          activityLogs: ' ',
          messageType: messageType === 'next-hidden' ? 'next-hidden' : messageType
        })
      })
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) throw new Error('No reader available')
      
      // Read all chunks to get complete text
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.token) {
                fullText += data.token
              }
              
              if (data.done && data.action) {
                action = data.action
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
      // Step 2: In voice mode, generate audio from complete text
      let audioPromise: Promise<AudioBuffer> | null = null
      if (voiceMode && fullText) {
        audioPromise = textToSpeech(fullText).catch(err => {
          console.error('Audio generation error:', err)
          return null as any
        })
        console.log(`[Voice Mode] Generating audio for complete ${messageType} (${fullText.length} chars)`)
      }
      
      // Step 3: Create placeholder message
      const placeholderMessage: Message = {
        id: messageId,
        role: 'assistant',
        type: messageType === 'next-hidden' ? 'hidden' : messageType,
        content: '',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, placeholderMessage])
      
      // Step 4: Stream text character-by-character AND play audio together
      let accumulated = ''
      let audioStarted = false
      
      for (let i = 0; i < fullText.length; i++) {
        accumulated += fullText[i]
        setMessages(prev => prev.map(m => 
          m.id === messageId ? { ...m, content: accumulated } : m
        ))
        
        // Start audio playback when first character streams
        if (voiceMode && !audioStarted && audioPromise && i === 0) {
          audioStarted = true
          audioPromise.then(buffer => {
            if (buffer) {
              queueAndPlayAudio(buffer)
              console.log(`[Voice Mode] Audio started playing for ${messageType}`)
            }
          }).catch(err => {
            console.error('Failed to play audio:', err)
          })
        }
        
        await new Promise(resolve => setTimeout(resolve, 10))
      }
      
      return { content: fullText, action }
      
    } catch (error) {
      console.error(`Error streaming ${messageType}:`, error)
      throw error
    }
  }

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isProcessing) return

    const trimmedInput = inputValue.trim()
    setInputValue('')
    setIsProcessing(true)

    try {
      // 1. Add user message
      const userMessage: Message = {
        id: `user-${Date.now()}`,
        role: 'user',
        type: 'user',
        content: trimmedInput,
        timestamp: new Date()
      }
      setMessages(prev => [...prev, userMessage])

      // 2. Format context (last 8 messages)
      const last8Messages = messages.slice(-8)
      const previousMessagesText = last8Messages
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n')

      // 3. Check input complexity
      const isComplex = trimmedInput.length >= MIN_COMPLEXITY_THRESHOLD

      // 4. VOICE MODE: Use pool fallback system
      if (voiceMode) {
        // Refs to store generated audios
        let hiddenAudioReady: AudioBuffer | null = null
        let preResponseAudioReady: AudioBuffer | null = null
        let responseAudioReady: AudioBuffer | null = null
        
        // Start all text generations in parallel (same as current system)
        const preResponseTextPromise = fetch('/api/ai-sidebar/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userInput: trimmedInput,
            previousMessages: previousMessagesText,
            activityLogs: ' ',
            messageType: 'pre-response'
          })
        })
        
        const responseTextPromise = fetch('/api/ai-sidebar/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userInput: trimmedInput,
            previousMessages: previousMessagesText,
            activityLogs: ' ',
            messageType: 'response'
          })
        })
        
        // Hidden message
        if (isComplex) {
          let hiddenText = nextHiddenMessage
          hiddenAudioReady = nextHiddenAudio
          
          if (!hiddenText) {
            console.log('[Voice Mode] No saved hidden message, using pool')
            hiddenText = getHiddenMessage()
            
            // Generate audio in background
            textToSpeech(hiddenText).then(audio => {
              hiddenAudioReady = audio
            }).catch(err => console.error('Hidden audio gen error:', err))
          } else {
            console.log('[Voice Mode] Using saved hidden message with audio')
          }
          
          setNextHiddenMessage(null)
          setNextHiddenAudio(null)
          
          // Create placeholder message
          const hiddenId = `hidden-${Date.now()}`
          const hiddenMessage: Message = {
            id: hiddenId,
            role: 'assistant',
            type: 'hidden',
            content: '',
            timestamp: new Date()
          }
          setMessages(prev => [...prev, hiddenMessage])
          
          // Wait for audio, then stream text + play audio TOGETHER
          await waitForAudioAndStreamText(() => hiddenAudioReady, hiddenText, hiddenId, 'hidden')
          await new Promise(resolve => setTimeout(resolve, 100))
        }
        
        // Pre-response
        const preResponseText = await (async () => {
          const response = await preResponseTextPromise
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          let fullText = ''
          
          if (reader) {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              
              const chunk = decoder.decode(value)
              const lines = chunk.split('\n')
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    if (data.token) fullText += data.token
                  } catch (e) {}
                }
              }
            }
          }
          
          return fullText
        })()
        
        // Generate pre-response audio in background
        textToSpeech(preResponseText).then(audio => {
          preResponseAudioReady = audio
        }).catch(err => console.error('Pre-response audio gen error:', err))
        
        // Create placeholder message
        const preResponseId = `pre-response-${Date.now()}`
        const preResponseMessage: Message = {
          id: preResponseId,
          role: 'assistant',
          type: 'pre-response',
          content: '',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, preResponseMessage])
        
        // Wait for audio, then stream text + play audio TOGETHER
        await waitForAudioAndStreamText(() => preResponseAudioReady, preResponseText, preResponseId, 'pre-response')
        await new Promise(resolve => setTimeout(resolve, 100))
        
        // Response
        const responseText = await (async () => {
          const response = await responseTextPromise
          const reader = response.body?.getReader()
          const decoder = new TextDecoder()
          let fullText = ''
          
          if (reader) {
            while (true) {
              const { done, value } = await reader.read()
              if (done) break
              
              const chunk = decoder.decode(value)
              const lines = chunk.split('\n')
              
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  try {
                    const data = JSON.parse(line.slice(6))
                    if (data.token) fullText += data.token
                  } catch (e) {}
                }
              }
            }
          }
          
          return fullText
        })()
        
        // Generate response audio in background
        textToSpeech(responseText).then(audio => {
          responseAudioReady = audio
        }).catch(err => console.error('Response audio gen error:', err))
        
        // Create placeholder message
        const responseId = `response-${Date.now()}`
        const responseMessage: Message = {
          id: responseId,
          role: 'assistant',
          type: 'response',
          content: '',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, responseMessage])
        
        // Wait for audio, then stream text + play audio TOGETHER
        await waitForAudioAndStreamText(() => responseAudioReady, responseText, responseId, 'response')
        
      } else {
        // 5. TEXT MODE: Use existing flow (no changes)
        if (isComplex) {
          let hiddenText = nextHiddenMessage
          
          if (!hiddenText) {
            hiddenText = getHiddenMessage()
            console.log('Using pool hidden message (no saved message)')
          } else {
            console.log('Using saved hidden message')
          }
          
          setNextHiddenMessage(null)
          setNextHiddenAudio(null)
          
          if (hiddenText) {
            const hiddenId = `hidden-${Date.now()}`
            const hiddenMessage: Message = {
              id: hiddenId,
              role: 'assistant',
              type: 'hidden',
              content: '',
              timestamp: new Date()
            }
            setMessages(prev => [...prev, hiddenMessage])
            
            let accumulated = ''
            for (let i = 0; i < hiddenText.length; i++) {
              accumulated += hiddenText[i]
              setMessages(prev => prev.map(m => 
                m.id === hiddenId ? { ...m, content: accumulated } : m
              ))
              await new Promise(resolve => setTimeout(resolve, 10))
            }
            
            await new Promise(resolve => setTimeout(resolve, 100))
          }
        }

        await streamMessage('pre-response', trimmedInput, previousMessagesText)
        await new Promise(resolve => setTimeout(resolve, 100))
        
        const responseResult = await streamMessage('response', trimmedInput, previousMessagesText)
        
        if (responseResult.action && responseResult.action.type) {
          console.log('Action received:', responseResult.action)
        }
      }
      
      // 6. After response completes, generate and SAVE next hidden message (don't display)
      const updatedMessages = [...messages, userMessage]
      const updatedContext = updatedMessages.slice(-8)
        .map(m => `${m.role === 'user' ? 'User' : 'Assistant'}: ${m.content}`)
        .join('\n')
      
      // Generate next hidden in background and save it (don't display)
      generateAndSaveNextHidden(trimmedInput, updatedContext)
      
    } catch (error) {
      console.error('Error in message flow:', error)
      
      const errorMessage: Message = {
        id: `error-${Date.now()}`,
        role: 'assistant',
        type: 'response',
        content: "I'm having trouble processing your request. Please try again in a moment.",
        timestamp: new Date()
      }
      setMessages(prev => [...prev, errorMessage])
    } finally {
      setIsProcessing(false)
    }
  }

  // Helper to generate and save next hidden message (don't display it)
  const generateAndSaveNextHidden = async (userInput: string, previousMessagesText: string) => {
    try {
      const response = await fetch('/api/ai-sidebar/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userInput,
          previousMessages: previousMessagesText,
          activityLogs: ' ',
          messageType: 'next-hidden'
        })
      })
      
      const reader = response.body?.getReader()
      const decoder = new TextDecoder()
      
      if (!reader) {
        console.error('No reader for next hidden generation')
        return
      }
      
      let accumulated = ''
      
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        
        const chunk = decoder.decode(value)
        const lines = chunk.split('\n')
        
        for (const line of lines) {
          if (line.startsWith('data: ')) {
            try {
              const data = JSON.parse(line.slice(6))
              
              if (data.token) {
                accumulated += data.token
              }
              
              if (data.done) {
                // Save the generated hidden message for next use
                setNextHiddenMessage(accumulated)
                console.log('Saved next hidden message:', accumulated.substring(0, 50) + '...')
                
                // In voice mode: also generate and save audio
                if (voiceMode && accumulated) {
                  try {
                    const audio = await textToSpeech(accumulated)
                    setNextHiddenAudio(audio)
                    console.log('Saved next hidden audio')
                  } catch (error) {
                    console.error('Failed to generate next hidden audio:', error)
                    // Continue without audio
                  }
                }
              }
            } catch (e) {
              // Skip invalid JSON
            }
          }
        }
      }
      
    } catch (error) {
      console.error('Failed to generate next hidden message:', error)
      // Don't set anything - will fall back to pool next time
    }
  }

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })
  }

  return (
    <>
      {/* Floating Toggle Button (Bottom Right) */}
      {!isExpanded && (
        <button
          onClick={() => setIsExpanded(true)}
          className={cn(
            "fixed bottom-6 right-6 z-50",
            "w-14 h-14 rounded-full",
            "bg-black/90 backdrop-blur-xl",
            "border border-cyan-400/30",
            "shadow-[0_0_20px_rgba(34,211,238,0.4)]",
            "hover:shadow-[0_0_30px_rgba(34,211,238,0.6)]",
            "transition-all duration-300",
            "flex items-center justify-center",
            "group"
          )}
        >
          <Speech 
            className="text-cyan-400 group-hover:scale-110 transition-transform" 
            size={24} 
          />
        </button>
      )}

      {/* Sidebar - fixed position like left sidebar, content div pushes via margin */}
      <aside
        className={cn(
          "fixed right-0 top-0 bottom-0 z-40",
          "transition-all duration-300 ease-in-out",
          "border-l border-white/10",
          "shadow-[0_0_15px_rgba(255,255,255,0.1)]",
          isExpanded ? "w-96" : "w-0"
        )}
      >
        {isExpanded && (
          <div className="h-full flex flex-col">
            {/* Header - glassmorphism, matches main header height (h-16) */}
            <div className="h-16 px-4 border-b border-white/10 bg-black/30 backdrop-blur-xl">
              <div className="flex items-center justify-between h-full">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <h3 className="text-white font-medium text-sm">NEXA Liaison</h3>
                </div>
                <div className="flex items-center gap-2">
                  {/* Voice Mode Toggle */}
                  <button
                    onClick={() => setVoiceMode(!voiceMode)}
                    className={cn(
                      "transition-colors p-1.5 rounded",
                      voiceMode 
                        ? "text-cyan-400 bg-cyan-400/10 hover:bg-cyan-400/20" 
                        : "text-white/60 hover:text-white hover:bg-white/5"
                    )}
                    title={voiceMode ? "Voice mode enabled" : "Voice mode disabled"}
                  >
                    {voiceMode ? <Volume2 size={16} /> : <VolumeX size={16} />}
                  </button>
                  
                  {/* Close Button */}
                  <button
                    onClick={() => setIsExpanded(false)}
                    className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                  >
                    <X size={18} />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages - solid black background */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3 bg-black/95">
              {messages.length === 0 ? (
                <div className="flex items-center justify-center h-full">
                  <div className="text-center space-y-2">
                    <div className="w-12 h-12 mx-auto rounded-full bg-cyan-400/10 flex items-center justify-center">
                      <Speech className="text-cyan-400" size={24} />
                    </div>
                    <p className="text-white/40 text-sm">Start a conversation</p>
                    <p className="text-white/20 text-xs">Type a message below</p>
                  </div>
                </div>
              ) : (
                messages.map((message) => (
                  <div
                    key={message.id}
                    className={cn(
                      "flex",
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'user' ? (
                      /* User message: button-style bubble */
                      <button
                        className={cn(
                          "group backdrop-blur-md",
                          "bg-gradient-to-br from-slate-800/50 to-blue-800/30",
                          "border border-slate-700/50 rounded-lg px-3 py-2",
                          "shadow-md text-white",
                          "max-w-[85%]",
                          "cursor-default"
                        )}
                      >
                        <div className="text-xs leading-relaxed whitespace-pre-wrap text-left">
                          {message.content}
                        </div>
                      </button>
                    ) : message.role === 'log' ? (
                      /* Log message: full width, loggy style */
                      <div className="w-full">
                        <div className="py-2 px-3 border-t border-b border-white/10 bg-black/50">
                          <div className="text-[10px] font-mono text-cyan-400/70">
                            {message.content}
                          </div>
                        </div>
                      </div>
                    ) : (
                      /* AI message: full width, blended with background, markdown rendered */
                      <div className="w-full">
                        {/* Show loading indicator if message has no content yet */}
                        {!message.content ? (
                          <LoadingIndicator />
                        ) : (
                          <div
                            className={cn(
                              "p-3 rounded-lg",
                              "bg-black/95 border border-black",
                              "text-white"
                            )}
                          >
                            {message.type === 'response' ? (
                              <MarkdownMessage content={message.content} />
                            ) : (
                              <div className="text-xs leading-relaxed whitespace-pre-wrap">
                                {message.content}
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input - glassmorphism footer */}
            <div className="p-4 border-t border-white/10 bg-black/30 backdrop-blur-xl">
              {/* Pool status indicator (dev mode only) */}
              {process.env.NODE_ENV === 'development' && voiceMode && (
                <div className="text-[10px] text-white/30 mb-2 font-mono">
                  Ambient Pool: {ambientAudioPool.length}/10
                  {isGeneratingPool && ' (generating...)'}
                </div>
              )}
              
              <div className="flex gap-2">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey && !isProcessing) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder={isProcessing ? "Processing..." : "Type your message..."}
                  disabled={isProcessing}
                  className={cn(
                    "flex-1 bg-black/50 backdrop-blur-sm",
                    "border border-white/10 rounded-lg",
                    "px-3 py-2 text-xs text-white",
                    "placeholder:text-white/30",
                    "focus:outline-none focus:border-cyan-400/50",
                    "focus:shadow-[0_0_10px_rgba(34,211,238,0.2)]",
                    "transition-all",
                    isProcessing && "opacity-50 cursor-not-allowed"
                  )}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim() || isProcessing}
                  className={cn(
                    "p-2 rounded-lg",
                    "bg-cyan-500/20 border border-cyan-400/30",
                    "text-cyan-400",
                    "hover:bg-cyan-500/30 hover:shadow-[0_0_10px_rgba(34,211,238,0.3)]",
                    "disabled:opacity-30 disabled:cursor-not-allowed",
                    "transition-all"
                  )}
                >
                  <Send size={16} />
                </button>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Backdrop overlay when expanded (optional, for mobile) */}
      {isExpanded && (
        <div
          className="fixed inset-0 bg-black/20 backdrop-blur-sm z-30 md:hidden"
          onClick={() => setIsExpanded(false)}
        />
      )}
    </>
  )
}

