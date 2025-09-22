'use client'

import { useState, useRef, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import type { ChatMessage, MemoryState } from '@/hooks/useHyperCanvasChat'

interface ChatInterfaceProps {
  messages: ChatMessage[]
  isTyping: boolean
  onSendMessage: (message: string) => void
  memoryState: MemoryState | null
  canSendMessage: boolean
  isInitializing: boolean
  error: string | null
}

export function ChatInterface({ 
  messages, 
  isTyping, 
  onSendMessage, 
  memoryState, 
  canSendMessage,
  isInitializing,
  error
}: ChatInterfaceProps) {
  const [inputValue, setInputValue] = useState('')
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  
  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, isTyping])
  
  // Focus input when chat becomes ready
  useEffect(() => {
    if (canSendMessage && !isInitializing && inputRef.current) {
      inputRef.current.focus()
    }
  }, [canSendMessage, isInitializing])
  
  const handleSend = () => {
    const trimmedValue = inputValue.trim()
    if (trimmedValue && canSendMessage) {
      onSendMessage(trimmedValue)
      setInputValue('')
    }
  }
  
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSend()
    }
  }
  
  const getStatusIcon = (status: ChatMessage['status']) => {
    switch (status) {
      case 'sending':
        return <div className="w-2 h-2 bg-yellow-400 rounded-full animate-pulse" />
      case 'delivered':
        return <div className="w-2 h-2 bg-green-400 rounded-full" />
      case 'error':
        return <div className="w-2 h-2 bg-red-400 rounded-full" />
      default:
        return null
    }
  }
  
  return (
    <div className="p-4 h-full flex flex-col">
      {/* Status Bar */}
      <div className="mb-3 text-xs text-white/50 text-center space-y-1">
        {isInitializing && (
          <div className="text-blue-300">Initializing chat...</div>
        )}
        {error && (
          <div className="text-red-300 bg-red-500/10 rounded px-2 py-1">
            Error: {error}
          </div>
        )}
        {memoryState && !isInitializing && (
          <div className="flex justify-center items-center gap-2">
            <span>{memoryState.messageCount} messages</span>
            <span>•</span>
            <span>Memory budget: {memoryState.tokenBudget}</span>
          </div>
        )}
      </div>
      
      {/* Chat History */}
      <div className="flex-1 bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-4 mb-4 overflow-y-auto">
        <div className="space-y-4 min-h-full">
          {/* Welcome message when empty */}
          {messages.length === 0 && !isInitializing && (
            <div className="text-white/40 text-center py-8 space-y-2">
              <div className="text-lg">👋 Welcome to Hyper-Canvas!</div>
              <div className="text-sm">Start a conversation to edit your document with AI...</div>
              <div className="text-xs mt-4 space-y-1">
                <div>Try: "Make the timeline more aggressive"</div>
                <div>Or: "What does this document include?"</div>
              </div>
            </div>
          )}
          
          {/* Messages */}
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] p-3 rounded-lg ${
                  message.role === 'user'
                    ? 'bg-blue-500/20 text-white border border-blue-400/30'
                    : message.content.startsWith('📋')
                      ? 'bg-green-600/20 text-green-100 border border-green-500/30' // Maestro explanation styling
                      : 'bg-white/10 text-white border border-white/20' // Regular quickshot styling
                } ${
                  message.status === 'error' 
                    ? 'border-red-500/50 bg-red-500/10' 
                    : ''
                }`}
              >
                <div className="text-sm leading-relaxed whitespace-pre-wrap">
                  {message.content}
                </div>
                
                {/* Message status and timestamp */}
                <div className="flex items-center justify-between mt-2 text-xs text-white/60">
                  <span>
                    {message.timestamp.toLocaleTimeString([], { 
                      hour: '2-digit', 
                      minute: '2-digit' 
                    })}
                  </span>
                  <div className="flex items-center gap-1">
                    {message.status === 'sending' && <span>Sending...</span>}
                    {message.status === 'error' && <span className="text-red-400">Failed</span>}
                    {getStatusIcon(message.status)}
                  </div>
                </div>
              </div>
            </div>
          ))}
          
          {/* Enhanced typing indicator with maestro detection */}
          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white/10 text-white p-3 rounded-lg border border-white/20">
                <div className="flex items-center gap-2">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-75"></div>
                    <div className="w-2 h-2 bg-white/60 rounded-full animate-bounce delay-150"></div>
                  </div>
                  <span className="text-xs text-white/60">
                    {/* Detect if maestro is likely working based on recent messages */}
                    {messages.length > 0 && messages.slice(-3).some(msg => 
                      msg.role === 'assistant' && 
                      (msg.content.toLowerCase().includes('modifying') ||
                       msg.content.toLowerCase().includes('document') ||
                       msg.content.toLowerCase().includes('template') ||
                       msg.content.toLowerCase().includes('working with our document team'))
                    ) ? 'Modifying document...' : 'Quickshot is thinking...'}
                  </span>
                </div>
              </div>
            </div>
          )}
          
          {/* Scroll anchor */}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {/* Chat Input */}
      <div className="flex gap-2">
        <input
          ref={inputRef}
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder={
            isInitializing 
              ? "Initializing chat..." 
              : !canSendMessage 
                ? "Please wait..." 
                : "Describe your changes or ask a question..."
          }
          disabled={!canSendMessage}
          className="flex-1 bg-white/10 backdrop-blur-sm border border-white/20 rounded-lg px-4 py-3 text-white placeholder-white/50 focus:outline-none focus:border-blue-400/50 focus:ring-1 focus:ring-blue-400/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
          maxLength={500}
        />
        <Button
          onClick={handleSend}
          disabled={!inputValue.trim() || !canSendMessage}
          className="px-6 py-3 bg-blue-500/20 hover:bg-blue-500/30 text-white border border-blue-400/30 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 hover:shadow-lg"
        >
          {isTyping ? (
            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
          ) : (
            'Send'
          )}
        </Button>
      </div>
      
      {/* Character count */}
      <div className="text-xs text-white/40 text-right mt-1">
        {inputValue.length}/500
      </div>
    </div>
  )
}

