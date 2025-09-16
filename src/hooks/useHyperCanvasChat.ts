import { useState, useCallback, useRef, useEffect } from 'react'

export interface ChatMessage {
  id: string
  role: 'user' | 'assistant'
  content: string
  timestamp: Date
  status: 'sending' | 'delivered' | 'error'
}

export interface MemoryState {
  messageCount: number
  summary: string
  tokenBudget: number
}

export interface ChatState {
  messages: ChatMessage[]
  isTyping: boolean
  threadId: string | null
  memoryState: MemoryState | null
  isInitializing: boolean
  error: string | null
}

export function useHyperCanvasChat(
  sessionId: string, 
  userId: string, 
  organizationId?: string
) {
  const [chatState, setChatState] = useState<ChatState>({
    messages: [],
    isTyping: false,
    threadId: null,
    memoryState: null,
    isInitializing: false,
    error: null
  })
  
  // Track timeouts for message delays
  const messageTimeouts = useRef<NodeJS.Timeout[]>([])
  // Track if we're currently processing a message
  const isProcessing = useRef<boolean>(false)
  
  // Clear timeouts on unmount
  useEffect(() => {
    return () => {
      messageTimeouts.current.forEach(clearTimeout)
      messageTimeouts.current = []
    }
  }, [])
  
  const clearTimeouts = useCallback(() => {
    messageTimeouts.current.forEach(clearTimeout)
    messageTimeouts.current = []
  }, [])
  
  const initializeChat = useCallback(async () => {
    if (!sessionId || !userId) {
      console.error('❌ Cannot initialize chat: missing sessionId or userId')
      return
    }
    
    if (chatState.threadId) {
      console.log('✅ Chat already initialized:', chatState.threadId)
      return
    }
    
    setChatState(prev => ({ 
      ...prev, 
      isInitializing: true, 
      error: null 
    }))
    
    try {
      console.log('🧵 Initializing Hyper-Canvas chat...', { sessionId, userId, organizationId })
      
      const response = await fetch('/api/hyper-canvas/thread', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionId, userId, organizationId })
      })
      
      const data = await response.json()
      
      if (data.success) {
        setChatState(prev => ({
          ...prev,
          threadId: data.threadId,
          isInitializing: false
        }))
        console.log('✅ Chat initialized successfully:', data.threadId)
      } else {
        throw new Error(data.error || 'Failed to create thread')
      }
    } catch (error) {
      console.error('❌ Chat initialization failed:', error)
      setChatState(prev => ({
        ...prev,
        isInitializing: false,
        error: error instanceof Error ? error.message : 'Failed to initialize chat'
      }))
    }
  }, [sessionId, userId, organizationId, chatState.threadId])
  
  const sendMessage = useCallback(async (content: string) => {
    if (!chatState.threadId) {
      console.error('❌ Cannot send message: no thread ID')
      return
    }
    
    if (isProcessing.current) {
      console.log('⏳ Message already processing, ignoring new request')
      return
    }
    
    if (!content.trim()) {
      console.log('⏳ Empty message, ignoring')
      return
    }
    
    // Set processing flag
    isProcessing.current = true
    
    // Clear any pending timeouts
    clearTimeouts()
    
    // Create user message
    const userMessage: ChatMessage = {
      id: `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      role: 'user',
      content: content.trim(),
      timestamp: new Date(),
      status: 'sending'
    }
    
    // Add user message immediately
    setChatState(prev => ({
      ...prev,
      messages: [...prev.messages, userMessage],
      isTyping: true,
      error: null
    }))
    
    console.log('📤 Sending message:', content.substring(0, 50) + '...')
    
    try {
      // Send to quickshot API
      const response = await fetch('/api/hyper-canvas/quickshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: content.trim(),
          threadId: chatState.threadId,
          sessionId,
          userId,
          organizationId
        })
      })
      
      const data = await response.json()
      
      if (data.success) {
        console.log('✅ Quickshot response received:', {
          maestro: data.maestro,
          responseCount: data.chat_responses?.length || 0
        })
        
        // Update user message status to delivered
        setChatState(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === userMessage.id
              ? { ...msg, status: 'delivered' }
              : msg
          ),
          memoryState: data.memoryState || prev.memoryState
        }))
        
        // Add assistant messages with delays
        if (data.chat_responses && Array.isArray(data.chat_responses)) {
          data.chat_responses.forEach((responseContent: string, index: number) => {
            const timeout = setTimeout(() => {
              const assistantMessage: ChatMessage = {
                id: `assistant_${Date.now()}_${index}_${Math.random().toString(36).substr(2, 9)}`,
                role: 'assistant',
                content: responseContent,
                timestamp: new Date(),
                status: 'delivered'
              }
              
              setChatState(prev => ({
                ...prev,
                messages: [...prev.messages, assistantMessage],
                isTyping: index < data.chat_responses.length - 1
              }))
              
              console.log(`💬 Assistant message ${index + 1}/${data.chat_responses.length}: ${responseContent.substring(0, 30)}...`)
            }, (index + 1) * 1500) // 1.5s delay between messages
            
            messageTimeouts.current.push(timeout)
          })
          
          // Stop typing and reset processing flag after last message
          const finalTimeout = setTimeout(() => {
            setChatState(prev => ({ ...prev, isTyping: false }))
            isProcessing.current = false
            console.log('✅ Chat turn completed')
          }, data.chat_responses.length * 1500 + 500)
          
          messageTimeouts.current.push(finalTimeout)
        } else {
          // No responses, stop immediately
          setChatState(prev => ({ ...prev, isTyping: false }))
          isProcessing.current = false
          console.log('⚠️ No chat responses in API response')
        }
        
      } else {
        console.error('❌ Quickshot API error:', data.error)
        
        // Handle error - update user message status
        setChatState(prev => ({
          ...prev,
          messages: prev.messages.map(msg =>
            msg.id === userMessage.id
              ? { ...msg, status: 'error' }
              : msg
          ),
          isTyping: false,
          error: data.error || 'Failed to send message'
        }))
        
        // Show fallback response if provided
        if (data.response && data.response.chat_responses) {
          data.response.chat_responses.forEach((responseContent: string, index: number) => {
            const timeout = setTimeout(() => {
              const assistantMessage: ChatMessage = {
                id: `assistant_error_${Date.now()}_${index}`,
                role: 'assistant',
                content: responseContent,
                timestamp: new Date(),
                status: 'delivered'
              }
              
              setChatState(prev => ({
                ...prev,
                messages: [...prev.messages, assistantMessage]
              }))
            }, (index + 1) * 1000) // Faster for error responses
            
            messageTimeouts.current.push(timeout)
          })
        }
        
        isProcessing.current = false
      }
      
    } catch (error) {
      console.error('❌ Send message error:', error)
      
      // Handle network/request error
      setChatState(prev => ({
        ...prev,
        messages: prev.messages.map(msg =>
          msg.id === userMessage.id
            ? { ...msg, status: 'error' }
            : msg
        ),
        isTyping: false,
        error: error instanceof Error ? error.message : 'Network error'
      }))
      
      isProcessing.current = false
    }
  }, [chatState.threadId, sessionId, userId, organizationId, clearTimeouts])
  
  const clearChat = useCallback(() => {
    clearTimeouts()
    isProcessing.current = false
    setChatState({
      messages: [],
      isTyping: false,
      threadId: null,
      memoryState: null,
      isInitializing: false,
      error: null
    })
  }, [clearTimeouts])
  
  const canSendMessage = !chatState.isInitializing && 
                        !isProcessing.current && 
                        chatState.threadId !== null
  
  return {
    chatState,
    sendMessage,
    initializeChat,
    clearChat,
    canSendMessage
  }
}

