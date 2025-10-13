'use client'

import { useState, useEffect, useRef } from 'react'
import { Speech, X, Send } from 'lucide-react'
import { cn } from '@/lib/utils'
import { MarkdownMessage } from './MarkdownMessage'
import { getHiddenMessage } from '@/lib/ai-sidebar/message-generators'

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
  const messagesEndRef = useRef<HTMLDivElement>(null)

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

  // Helper to stream a message
  const streamMessage = async (
    messageType: 'hidden' | 'pre-response' | 'response' | 'next-hidden',
    userInput: string,
    previousMessagesText: string,
    initialContent: string = ''
  ): Promise<{ content: string; action?: any }> => {
    const messageId = `${messageType}-${Date.now()}`
    
    // Create placeholder message
    const placeholderMessage: Message = {
      id: messageId,
      role: 'assistant',
      type: messageType === 'next-hidden' ? 'hidden' : messageType,
      content: initialContent,
      timestamp: new Date()
    }
    setMessages(prev => [...prev, placeholderMessage])
    
    let accumulated = initialContent
    let action = { type: null, params: {} }
    
    try {
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
                // Update message with accumulated content
                setMessages(prev => prev.map(m => 
                  m.id === messageId ? { ...m, content: accumulated } : m
                ))
              }
              
              if (data.done) {
                if (data.action) {
                  action = data.action
                }
              }
              
              if (data.error) {
                throw new Error(data.error)
              }
            } catch (e) {
              // Skip invalid JSON lines
            }
          }
        }
      }
      
      return { content: accumulated, action }
      
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

      // 4. If complex, show hidden message (use saved, or fall back to pool)
      if (isComplex) {
        let hiddenText = nextHiddenMessage
        
        // If no saved hidden message, use pool
        if (!hiddenText) {
          hiddenText = getHiddenMessage()
          console.log('Using pool hidden message (no saved message)')
        } else {
          console.log('Using saved hidden message')
        }
        
        // Clear the saved hidden message
        setNextHiddenMessage(null)
        
        // Stream the hidden message character by character (faster: 10ms)
        const hiddenId = `hidden-${Date.now()}`
        const hiddenMessage: Message = {
          id: hiddenId,
          role: 'assistant',
          type: 'hidden',
          content: '',
          timestamp: new Date()
        }
        setMessages(prev => [...prev, hiddenMessage])
        
        // Stream character by character
        let accumulated = ''
        for (let i = 0; i < hiddenText.length; i++) {
          accumulated += hiddenText[i]
          setMessages(prev => prev.map(m => 
            m.id === hiddenId ? { ...m, content: accumulated } : m
          ))
          await new Promise(resolve => setTimeout(resolve, 10))
        }
        
        // Small delay before starting pre-response
        await new Promise(resolve => setTimeout(resolve, 100))
      }

      // 5. Stream pre-response (WAIT for it to complete)
      await streamMessage('pre-response', trimmedInput, previousMessagesText)
      
      // Small delay before response
      await new Promise(resolve => setTimeout(resolve, 100))
      
      // 6. Stream full response (WAIT for it to complete)
      const responseResult = await streamMessage('response', trimmedInput, previousMessagesText)
      
      // Log action if present
      if (responseResult.action && responseResult.action.type) {
        console.log('Action received:', responseResult.action)
      }
      
      // 7. After response completes, generate and SAVE next hidden message (don't display)
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
          "bg-black/95 backdrop-blur-xl",
          "border-l border-white/10",
          "shadow-[0_0_15px_rgba(255,255,255,0.1)]",
          isExpanded ? "w-96" : "w-0"
        )}
      >
        {isExpanded && (
          <div className="h-full flex flex-col">
            {/* Header */}
            <div className="p-4 border-b border-white/10 bg-white/5">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                  <h3 className="text-white font-medium text-sm">NEXA Liaison</h3>
                </div>
                <button
                  onClick={() => setIsExpanded(false)}
                  className="text-white/60 hover:text-white transition-colors p-1 rounded hover:bg-white/5"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3">
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
                      <div
                        className={cn(
                          "p-3 rounded-lg",
                          "bg-black/95 border border-black",
                          message.type === 'pre-response' && "text-purple-100",
                          message.type === 'response' && "text-white",
                          message.type === 'hidden' && "text-white"
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
                      </div>
                    )}
                  </div>
                ))
              )}
              {/* Auto-scroll anchor */}
              <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div className="p-4 border-t border-white/10 bg-white/5">
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
              <p className="text-[10px] text-white/30 mt-2 text-center">
                Mock mode • Messages are ephemeral
              </p>
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

