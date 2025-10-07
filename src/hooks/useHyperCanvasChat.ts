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
  organizationId?: string,
  sessionData?: any,
  onDocumentUpdate?: (newBlobUrl: string) => void
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
  
  // Helper function to extract current template from session data
  const extractCurrentTemplate = useCallback(async (sessionData: any, sessionId: string): Promise<string> => {
    if (!sessionData) {
      console.error('❌ No session data available for template extraction')
      return '<html><body><h1>No session data available</h1></body></html>'
    }

    try {
      // Call the SAME API that generates the preview to get the exact HTML template
      console.log('🎯 Extracting current template via preview API...')
      
      const response = await fetch('/api/solutioning/preview-html', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sessionData, sessionId })
      })
      
      if (response.ok) {
        const htmlTemplate = await response.text()
        console.log('✅ Successfully extracted real template, length:', htmlTemplate.length)
        return htmlTemplate
      } else {
        console.error('❌ Failed to extract template via API')
        throw new Error('Failed to extract template')
      }
    } catch (error: unknown) {
      console.error('❌ Error extracting template:', error)
      throw error
    }
  }, [])

  // Helper function to refresh document preview
  const refreshDocumentPreview = useCallback(async (modifiedTemplate: string) => {
    try {
      console.log('📄 Refreshing document preview with maestro modifications...')
      
      const response = await fetch('/api/hyper-canvas/template-to-pdf', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ htmlTemplate: modifiedTemplate })
      })
      
      if (response.ok) {
        const pdfBlob = await response.blob()
        const pdfUrl = URL.createObjectURL(pdfBlob)
        
        // Callback to update preview (passed from solutioning page)
        onDocumentUpdate?.(pdfUrl)
        
        console.log('✅ Document preview refreshed with maestro modifications')
      } else {
        console.error('❌ Failed to convert template to PDF')
      }
    } catch (error: unknown) {
      console.error('❌ Failed to refresh document preview:', error)
    }
  }, [onDocumentUpdate])

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
    } catch (error: unknown) {
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
        
        // Add assistant messages with sophisticated maestro flow
        if (data.chat_responses && Array.isArray(data.chat_responses)) {
          const responses = data.chat_responses
          
          if (data.maestro && data.message_to_maestro && responses.length > 0) {
            // MAESTRO FLOW: Hold the last message, post others first
            console.log('🎭 Maestro mode: Holding final message until document modification')
            
            const initialResponses = responses.slice(0, -1) // All but last
            const finalResponse = responses[responses.length - 1] // Last message
            
            // Post initial responses with maestro timing (3-7s)
            const baseDelay = () => 3000 + Math.random() * 4000
            let cumulativeDelay = 0
            
            initialResponses.forEach((responseContent: string, index: number) => {
              const currentDelay = baseDelay()
              cumulativeDelay += currentDelay
              
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
                  isTyping: true // Keep typing indicator
                }))
                
                console.log(`💬 Assistant message ${index + 1}/${initialResponses.length} (maestro mode): ${responseContent.substring(0, 30)}...`)
              }, cumulativeDelay)
              
              messageTimeouts.current.push(timeout)
            })
            
            // Trigger maestro after initial messages
            const maestroTimeout = setTimeout(async () => {
              console.log('🎭 Triggering maestro:', data.message_to_maestro)
              
              try {
                // Extract current template and call maestro
                const currentTemplate = await extractCurrentTemplate(sessionData, sessionId)
                
                const maestroResponse = await fetch('/api/hyper-canvas/maestro', {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({
                    currentTemplate,
                    maestroInstruction: data.message_to_maestro,
                    threadId: chatState.threadId,
                    sessionId,
                    userId,
                    organizationId
                  })
                })
                
                const maestroData = await maestroResponse.json()
                
                if (maestroData.success) {
                  console.log('✅ Maestro completed:', maestroData.explanation)
                  
                  // Update document preview
                  await refreshDocumentPreview(maestroData.modified_template)
                  
                  // NOW post the final quickshot message
                  const finalTimeout = setTimeout(() => {
                    const finalMessage: ChatMessage = {
                      id: `assistant_final_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      role: 'assistant',
                      content: finalResponse,
                      timestamp: new Date(),
                      status: 'delivered'
                    }
                    
                    setChatState(prev => ({
                      ...prev,
                      messages: [...prev.messages, finalMessage],
                      isTyping: true // Still typing for explanation
                    }))
                    
                    console.log(`💬 Final quickshot message: ${finalResponse.substring(0, 30)}...`)
                  }, 1000) // Brief delay after maestro completion
                  
                  messageTimeouts.current.push(finalTimeout)
                  
                  // Post maestro explanation as separate message
                  const explanationTimeout = setTimeout(() => {
                    const explanationMessage: ChatMessage = {
                      id: `maestro_explanation_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                      role: 'assistant',
                      content: `📋 ${maestroData.explanation}`,
                      timestamp: new Date(),
                      status: 'delivered'
                    }
                    
                    setChatState(prev => ({
                      ...prev,
                      messages: [...prev.messages, explanationMessage],
                      isTyping: false, // Done!
                      memoryState: maestroData.memoryState || prev.memoryState
                    }))
                    
                    isProcessing.current = false
                    console.log(`🎭 Maestro explanation: ${maestroData.explanation}`)
                    console.log('✅ Maestro chat turn completed')
                  }, 2500) // Delay for explanation
                  
                  messageTimeouts.current.push(explanationTimeout)
                  
                } else {
                  console.error('❌ Maestro failed:', maestroData.error)
                  
                  // Still post final message even if maestro fails
                  const fallbackTimeout = setTimeout(() => {
                    const finalMessage: ChatMessage = {
                      id: `assistant_final_fallback_${Date.now()}`,
                      role: 'assistant',
                      content: finalResponse,
                      timestamp: new Date(),
                      status: 'delivered'
                    }
                    
                    const errorMessage: ChatMessage = {
                      id: `maestro_error_${Date.now()}`,
                      role: 'assistant',
                      content: `⚠️ ${maestroData.explanation || 'Document modification encountered an issue, but I can still help with other tasks.'}`,
                      timestamp: new Date(),
                      status: 'delivered'
                    }
                    
                    setChatState(prev => ({
                      ...prev,
                      messages: [...prev.messages, finalMessage, errorMessage],
                      isTyping: false
                    }))
                    
                    isProcessing.current = false
                  }, 1000)
                  
                  messageTimeouts.current.push(fallbackTimeout)
                }
                
              } catch (maestroError) {
                console.error('❌ Maestro request failed:', maestroError)
                
                // Fallback: post final message anyway
                const fallbackTimeout = setTimeout(() => {
                  const finalMessage: ChatMessage = {
                    id: `assistant_final_error_${Date.now()}`,
                    role: 'assistant',
                    content: finalResponse,
                    timestamp: new Date(),
                    status: 'delivered'
                  }
                  
                  setChatState(prev => ({
                    ...prev,
                    messages: [...prev.messages, finalMessage],
                    isTyping: false
                  }))
                  
                  isProcessing.current = false
                }, 1000)
                
                messageTimeouts.current.push(fallbackTimeout)
              }
            }, cumulativeDelay + 1000) // Start maestro after initial messages
            
            messageTimeouts.current.push(maestroTimeout)
            
          } else {
            // NORMAL FLOW: Post all messages with regular timing
            responses.forEach((responseContent: string, index: number) => {
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
                  isTyping: index < responses.length - 1
                }))
                
                console.log(`💬 Assistant message ${index + 1}/${responses.length} (normal mode): ${responseContent.substring(0, 30)}...`)
              }, (index + 1) * 1500) // Regular 1.5s timing
              
              messageTimeouts.current.push(timeout)
            })
            
            // Complete normal flow
            const finalTimeout = setTimeout(() => {
              setChatState(prev => ({ ...prev, isTyping: false }))
              isProcessing.current = false
              console.log('✅ Normal chat turn completed')
            }, responses.length * 1500 + 500)
            
            messageTimeouts.current.push(finalTimeout)
          }
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
        if (data.chat_responses) {
          data.chat_responses.forEach((responseContent: string, index: number) => {
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
      
    } catch (error: unknown) {
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
  }, [chatState.threadId, sessionId, userId, organizationId, clearTimeouts, sessionData, extractCurrentTemplate, refreshDocumentPreview])
  
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

