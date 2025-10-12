'use client'

import { useState, useEffect, useRef } from 'react'
import { Speech, X, Send } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'log'
  type: 'user' | 'hidden' | 'pre-response' | 'response' | 'log'
  content: string
  timestamp: Date
}

const AI_SIDEBAR_STORAGE_KEY = 'nexa-ai-sidebar-state'

export function AISidebar() {
  const [isExpanded, setIsExpanded] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const [inputValue, setInputValue] = useState('')
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

  const handleSendMessage = () => {
    if (!inputValue.trim()) return

    // Add user message (ephemeral for now)
    const userMessage: Message = {
      id: `user-${Date.now()}`,
      role: 'user',
      type: 'user',
      content: inputValue,
      timestamp: new Date()
    }

    setMessages(prev => [...prev, userMessage])

    // Simulate log message
    setTimeout(() => {
      const logMessage: Message = {
        id: `log-${Date.now()}`,
        role: 'log',
        type: 'log',
        content: '[2:34 PM] User sent message',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, logMessage])
    }, 100)

    // Simulate AI response after a short delay (ephemeral)
    setTimeout(() => {
      const aiMessage: Message = {
        id: `ai-${Date.now()}`,
        role: 'assistant',
        type: 'response',
        content: 'This is a mock response. The AI functionality will be implemented in later phases.',
        timestamp: new Date()
      }
      setMessages(prev => [...prev, aiMessage])
    }, 500)

    setInputValue('')
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
                      /* AI message: full width, blended with background */
                      <div className="w-full">
                        <div
                          className={cn(
                            "p-3 rounded-lg",
                            "bg-black/95 border border-black",
                            message.type === 'hidden' && "italic text-white/60",
                            message.type === 'pre-response' && "text-purple-100",
                            message.type === 'response' && "text-white"
                          )}
                        >
                          <div className="text-xs leading-relaxed whitespace-pre-wrap">
                            {message.content}
                          </div>
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
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSendMessage()
                    }
                  }}
                  placeholder="Type your message..."
                  className={cn(
                    "flex-1 bg-black/50 backdrop-blur-sm",
                    "border border-white/10 rounded-lg",
                    "px-3 py-2 text-xs text-white",
                    "placeholder:text-white/30",
                    "focus:outline-none focus:border-cyan-400/50",
                    "focus:shadow-[0_0_10px_rgba(34,211,238,0.2)]",
                    "transition-all"
                  )}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={!inputValue.trim()}
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

