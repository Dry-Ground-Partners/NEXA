import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableWithMessageHistory } from '@langchain/core/runnables'
import { RunnableConfig } from '@langchain/core/runnables'
import { BaseChatMessageHistory } from '@langchain/core/chat_history'
import { BaseMessage, HumanMessage, AIMessage } from '@langchain/core/messages'
import { PrismaClient } from '@prisma/client'
import * as hub from 'langchain/hub/node'
import { htmlStorage } from '@/lib/hyper-canvas/html-storage'

const prisma = new PrismaClient()

/**
 * Custom PostgreSQL-backed chat message history using Prisma
 */
class PostgresChatMessageHistory extends BaseChatMessageHistory {
  lc_namespace = ["langchain", "stores", "message", "postgres"]
  private threadId: string

  constructor(threadId: string) {
    super()
    this.threadId = threadId
  }

  async getMessages(): Promise<BaseMessage[]> {
    try {
      // Query raw SQL since we might not have Prisma model yet
      const messages = await prisma.$queryRaw<Array<{
        id: number
        session_id: string
        message: any
        role: string
        created_at: Date
      }>>`
        SELECT * FROM hyper_canvas_messages 
        WHERE session_id = ${this.threadId}
        ORDER BY created_at ASC
      `

      return messages.map(msg => {
        const messageData = typeof msg.message === 'string' 
          ? JSON.parse(msg.message) 
          : msg.message
        
        const content = messageData.content || messageData.data?.content || ''
        
        return messageData.type === 'human' || msg.role === 'user'
          ? new HumanMessage(content)
          : new AIMessage(content)
      })
    } catch (error) {
      console.error('Error getting messages:', error)
      return []
    }
  }

  async addMessage(message: BaseMessage): Promise<void> {
    try {
      const messageType = message._getType()
      const role = messageType === 'human' ? 'user' : 'assistant'
      
      await prisma.$executeRaw`
        INSERT INTO hyper_canvas_messages (session_id, message, role, created_at)
        VALUES (
          ${this.threadId},
          ${JSON.stringify({ type: messageType, content: message.content })}::jsonb,
          ${role},
          NOW()
        )
      `
    } catch (error) {
      console.error('Error adding message:', error)
      throw error
    }
  }

  async addUserMessage(message: string): Promise<void> {
    await this.addMessage(new HumanMessage(message))
  }

  async addAIChatMessage(message: string): Promise<void> {
    await this.addMessage(new AIMessage(message))
  }

  async clear(): Promise<void> {
    try {
      await prisma.$executeRaw`
        DELETE FROM hyper_canvas_messages 
        WHERE session_id = ${this.threadId}
      `
    } catch (error) {
      console.error('Error clearing messages:', error)
      throw error
    }
  }
}

/**
 * Get message history for a specific thread (PostgreSQL-backed via Prisma)
 */
function getMessageHistory(threadId: string) {
  return new PostgresChatMessageHistory(threadId)
}

/**
 * Create the Quickshot chain with LCEL and memory support
 */
export async function createQuickshotChain() {
  let promptTemplate

  // Temporarily use fallback prompt until we debug LangSmith integration
  console.log('🔧 Using fallback prompt for debugging')
  
  try {
    // Uncomment this when we want to test LangSmith integration
    /*
    console.log('📥 Attempting to pull nexa-lazy-quickshot from LangSmith...')
    const hubPrompt = await hub.pull('nexa-lazy-quickshot', {
      includeModel: true
    })
    console.log('✅ Successfully pulled prompt from LangSmith')
    console.log('🔍 Prompt type:', typeof hubPrompt, hubPrompt.constructor.name)
    
    // Check if it's a runnable prompt that we can use directly
    if (hubPrompt && typeof hubPrompt.invoke === 'function') {
      console.log('✅ Using LangSmith prompt directly')
      promptTemplate = hubPrompt
    } else {
      console.log('⚠️ LangSmith prompt not in expected format, using fallback')
      throw new Error('Prompt format not compatible')
    }
    */
    throw new Error('Using fallback for debugging')
  } catch (error: unknown) {
    console.log('⚠️ Using fallback prompt')
    
    // Fallback to local prompt with memory structure
    promptTemplate = PromptTemplate.fromTemplate(`
SUMMARY: {summary}
(SUMMARY ENDS HERE)

OLDER MESSAGES: {older_messages}
(OLDER MESSAGES END HERE)

NEW MESSAGE: {input}

You are Nexa's Quickshot AI, an instant-response engagement assistant for PDF document editing. Your job is to immediately acknowledge user requests, provide engaging commentary, and determine if document changes are needed.

CORE RESPONSIBILITIES:
1. Acknowledge user input instantly with enthusiasm
2. Decide if the user wants actual document changes
3. Provide 2-4 engaging messages with realistic work descriptions
4. Extract simple instructions for the document agent if changes are needed

PERSONALITY:
- Lightning-fast and responsive
- Professional but energetic  
- Action-oriented with present tense
- Encouraging and supportive

DECISION LOGIC:
- MAESTRO=true: User wants document changes (text, styling, layout)
- MAESTRO=false: User is just chatting, asking questions, or explaining

RESPONSE FORMAT (Always return exactly this JSON):
{{
  "maestro": boolean,
  "message_to_maestro": "simple instruction if maestro=true, null if false",
  "chat_responses": [
    "First immediate acknowledgment",
    "Second message describing what you're doing", 
    "Third message with progress update",
    "Final confirmation/encouragement"
  ]
}}

EXAMPLES:

Input: "Make the timeline more aggressive"
Output: 
{{
  "maestro": true,
  "message_to_maestro": "Reduce timeline durations and make language more urgent",
  "chat_responses": [
    "Perfect! Compressing your timeline now ⚡",
    "I'm analyzing each phase and reducing timeframes while maintaining feasibility...",
    "Adding more action-oriented language to show urgency and decisiveness...",
    "Done! Your timeline now shows a more aggressive, results-driven approach 🚀"
  ]
}}

Input: "What does this document include?"
Output: 
{{
  "maestro": false,
  "message_to_maestro": null,
  "chat_responses": [
    "Great question! Let me walk you through this document 📋",
    "This solutioning document includes your project overview, technical solutions, and implementation approach...",
    "Each section covers different aspects - from problem definition to detailed technical architecture...",
    "It's designed to give stakeholders a complete picture of your proposed solution! Anything specific you'd like me to explain?"
  ]
}}

RULES:
- Always return valid JSON in the exact format above
- chat_responses must have 2-4 messages (never empty)
- Keep each message under 100 characters
- Use emojis sparingly but effectively
- Never say you can't do something
- Always sound encouraging and capable
- Focus on the value/impact of changes when maestro=true
`)
  }

  const llm = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.7,
    openAIApiKey: process.env.OPENAI_API_KEY
  })

  // Create LCEL chain: prompt | llm
  console.log('✅ Creating LCEL chain: prompt | llm')
  const chain = promptTemplate.pipe(llm)
  
  return chain
}

/**
 * Execute a chat turn with persistent message history
 */
export async function chatTurn(
  threadId: string, 
  userId: string, 
  sessionId: string,
  organizationId: string,
  input: string
): Promise<any> {
  
  console.log(`💬 Chat turn started: ${threadId}`)
  console.log(`   User: ${userId}`)
  console.log(`   Session: ${sessionId}`)
  console.log(`   Input: "${input.substring(0, 50)}..."`)
  
  try {
    // Get the base chain
    const baseChain = await createQuickshotChain()
    
    // Wrap chain with message history (PostgreSQL-backed)
    const chainWithHistory = new RunnableWithMessageHistory({
      runnable: baseChain,
      getMessageHistory: getMessageHistory,
      inputMessagesKey: "input",
      historyMessagesKey: "older_messages"
    })
    
    // Configure LangSmith tagging
    const config: RunnableConfig = {
      configurable: { 
        sessionId: threadId  // This maps to the thread_id in the database
      },
      tags: [
        `thread:${threadId}`,
        `user:${userId}`,
        `session:${sessionId}`,
        `org:${organizationId}`,
        'quickshot',
        'hyper-canvas'
      ],
      metadata: {
        thread_id: threadId,
        user_id: userId,
        session_id: sessionId,
        organization_id: organizationId,
        feature: 'hyper-canvas-chat',
        timestamp: new Date().toISOString()
      }
    }
    
    console.log('🔄 Invoking chain with persistent message history')
    
    // Invoke the chain - history is automatically loaded and saved
    const result = await chainWithHistory.invoke(
      {
        input: input,
        summary: "", // Will be auto-populated from history
        older_messages: "" // Will be auto-populated from history
      },
      config
    )
    
    // Extract content from the result
    let responseText: string
    if (typeof result === 'string') {
      responseText = result
    } else if (result && typeof result === 'object' && 'content' in result) {
      responseText = (result as any).content
    } else if (result && typeof result === 'object' && 'text' in result) {
      responseText = (result as any).text
    } else {
      console.error('❌ Unexpected result format:', result)
      responseText = JSON.stringify(result)
    }
    
    console.log(`🔄 Chain result: ${responseText.substring(0, 100)}...`)
    
    // Clean and parse JSON response
    let quickshotResponse
    try {
      // Strip markdown code blocks if present
      let cleanedResponse = responseText.trim()
      
      // Remove ```json at the start
      if (cleanedResponse.startsWith('```json')) {
        cleanedResponse = cleanedResponse.substring(7)
      } else if (cleanedResponse.startsWith('```')) {
        cleanedResponse = cleanedResponse.substring(3)
      }
      
      // Remove ``` at the end
      if (cleanedResponse.endsWith('```')) {
        cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3)
      }
      
      cleanedResponse = cleanedResponse.trim()
      console.log(`🧹 Cleaned response: ${cleanedResponse.substring(0, 100)}...`)
      
      quickshotResponse = JSON.parse(cleanedResponse)
    } catch (parseError) {
      console.error('❌ JSON parsing failed:', parseError)
      console.error('Raw response:', responseText)
      throw new Error('Invalid JSON response from Quickshot')
    }
    
    // Validate response structure
    if (!quickshotResponse.chat_responses || !Array.isArray(quickshotResponse.chat_responses)) {
      console.error('❌ Invalid response structure:', quickshotResponse)
      throw new Error('Invalid quickshot response format')
    }
    
    // Message history is automatically saved by RunnableWithMessageHistory!
    console.log(`✅ Chat turn completed successfully`)
    console.log(`   Maestro: ${quickshotResponse.maestro}`)
    console.log(`   Responses: ${quickshotResponse.chat_responses.length}`)
    console.log(`   💾 Message history persisted to database`)
    
    // Get message count from database for memory state
    const messageHistory = getMessageHistory(threadId)
    const messages = await messageHistory.getMessages()
    
    return {
      success: true,
      maestro: quickshotResponse.maestro,
      message_to_maestro: quickshotResponse.message_to_maestro,
      chat_responses: quickshotResponse.chat_responses,
      memoryState: {
        summary: `${messages.length} messages in conversation`,
        messageCount: messages.length,
        tokenBudget: 2000
      }
    }
    
  } catch (error: unknown) {
    console.error('❌ Chat turn error:', error)
    
    // Fallback response
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      maestro: false,
      message_to_maestro: null,
      chat_responses: [
        "I'm having trouble processing that request right now 😅",
        "Let me try to understand what you're looking for...",
        "Could you rephrase that for me?"
      ]
    }
  }
}

/**
 * Get memory status for a thread
 */
export async function getMemoryStatus(threadId: string) {
  try {
    const messageHistory = getMessageHistory(threadId)
    const messages = await messageHistory.getMessages()
    
    return {
      messageCount: messages.length,
      summary: `${messages.length} messages in conversation`,
      tokenBudget: 2000,
      hasHistory: messages.length > 0
    }
  } catch (error) {
    console.error('❌ Error getting memory status:', error)
    return {
      messageCount: 0,
      summary: 'No conversation yet',
      tokenBudget: 2000,
      hasHistory: false
    }
  }
}

/**
 * Clear memory for a thread (useful for testing)
 */
export async function clearThreadMemory(threadId: string) {
  try {
    const messageHistory = getMessageHistory(threadId)
    await messageHistory.clear()
    console.log(`🗑️ Cleared message history for thread: ${threadId}`)
  } catch (error) {
    console.error('❌ Error clearing thread memory:', error)
  }
}

/**
 * Create maestro chain with same context structure as quickshot
 */
export async function createMaestroChain() {
  let promptTemplate

  try {
    // Pull maestro prompt from LangSmith
    console.log('📥 Attempting to pull nexa-canvas-maestro from LangSmith...')
    const hubPrompt = await hub.pull('nexa-canvas-maestro', {
      includeModel: true
    })
    console.log('✅ Successfully pulled maestro prompt from LangSmith')
    promptTemplate = hubPrompt
  } catch (error: unknown) {
    console.log('⚠️ Using fallback maestro prompt')
    
    // Fallback prompt with same context structure
    promptTemplate = PromptTemplate.fromTemplate(`
SUMMARY: {summary}
(SUMMARY ENDS HERE)

OLDER MESSAGES: {older_messages}
(OLDER MESSAGES END HERE)

CURRENT TEMPLATE: {template}
(CURRENT TEMPLATE ENDS HERE)

MODIFICATION INSTRUCTION: {instruction}

You are Nexa's Canvas Maestro, an expert document modification AI. Your job is to precisely modify HTML templates based on user instructions while maintaining document structure and styling.

CORE RESPONSIBILITIES:
1. Analyze the current HTML template structure
2. Understand the modification instruction in context of the conversation
3. Apply changes while preserving styling, layout, and functionality
4. Provide clear explanation of modifications made

RESPONSE FORMAT (Always return exactly this JSON):
{{
  "modified_template": "Complete HTML document with all changes applied",
  "explanation": "Brief summary of modifications and their impact"
}}

MODIFICATION GUIDELINES:
- Preserve all CSS styling and layout structures
- Maintain document hierarchy and organization
- Apply changes precisely as requested
- Ensure all HTML remains valid and well-formed
- Keep explanations concise but informative

EXAMPLES:

Instruction: "Make the timeline more aggressive"
Output:
{{
  "modified_template": "<html>...modified timeline with shorter durations...</html>",
  "explanation": "Compressed timeline phases by 30% and added urgent language to show accelerated delivery"
}}

Instruction: "Add more technical details to the API section"
Output:
{{
  "modified_template": "<html>...enhanced API section with technical specs...</html>",
  "explanation": "Expanded API documentation with endpoints, authentication methods, and rate limiting details"
}}

RULES:
- Always return valid JSON in the exact format above
- modified_template must be complete, valid HTML
- explanation should be 1-2 sentences describing the changes
- Preserve all original styling and structure
- Apply changes contextually based on conversation history
`)
  }

  const llm = new ChatOpenAI({
    modelName: 'gpt-4o',
    temperature: 0.3, // Lower temperature for precise modifications
    openAIApiKey: process.env.OPENAI_API_KEY
  })

  const chain = promptTemplate.pipe(llm)
  return chain
}

/**
 * Execute maestro document modification with shared context
 */
export async function maestroTurn(
  threadId: string,
  userId: string, 
  sessionId: string,
  organizationId: string,
  instruction: string,
  currentTemplate: string
): Promise<any> {
  
  console.log(`🎭 Maestro turn started: ${threadId}`)
  console.log(`   Instruction: "${instruction.substring(0, 50)}..."`)
  console.log(`   Template size: ${currentTemplate.length} characters`)
  
  try {
    // Get maestro chain
    const maestroChain = await createMaestroChain()
    
    // Get conversation history (natural language only, NO HTML)
    const messageHistory = getMessageHistory(threadId)
    const messages = await messageHistory.getMessages()
    
    // Filter out any HTML content (defensive - should not be there)
    const conversationMessages = messages
      .filter(msg => {
        const content = msg.content as string
        // Filter out anything that looks like HTML
        return !content.includes('<html') && 
               !content.includes('<!DOCTYPE') &&
               content.length < 10000 // Also filter unusually long messages
      })
      .slice(-10) // Last 10 natural language messages only
    
    // Convert to simple context string for Maestro
    const conversationContext = conversationMessages
      .map(msg => `${msg._getType() === 'human' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')
    
    console.log(`🧠 Maestro context: ${conversationMessages.length} messages (HTML excluded)`)
    console.log(`   Context size: ${conversationContext.length} characters`)
    console.log(`   Template size: ${currentTemplate.length} characters`)
    
    // Configure LangSmith tagging
    const config: RunnableConfig = {
      tags: [
        `thread:${threadId}`,
        `user:${userId}`,
        `session:${sessionId}`,
        `org:${organizationId}`,
        'maestro',
        'hyper-canvas'
      ],
      metadata: {
        thread_id: threadId,
        user_id: userId,
        session_id: sessionId,
        organization_id: organizationId,
        feature: 'maestro-document-modification',
        timestamp: new Date().toISOString()
      }
    }
    
    // Invoke maestro with conversation context + current template + instruction
    const result = await maestroChain.invoke({
      summary: conversationContext.substring(0, 500), // Limited context summary
      template: currentTemplate,  // Match LangSmith prompt variable name
      older_messages: conversationContext,
      instruction: instruction
    }, config)
    
    // Extract and parse maestro response
    let responseText: string
    if (typeof result === 'string') {
      responseText = result
    } else if (result && typeof result === 'object' && 'content' in result) {
      responseText = (result as any).content
    } else {
      responseText = JSON.stringify(result)
    }
    
    // Clean JSON response (same as quickshot)
    let cleanedResponse = responseText.trim()
    if (cleanedResponse.startsWith('```json')) {
      cleanedResponse = cleanedResponse.substring(7)
    } else if (cleanedResponse.startsWith('```')) {
      cleanedResponse = cleanedResponse.substring(3)
    }
    if (cleanedResponse.endsWith('```')) {
      cleanedResponse = cleanedResponse.substring(0, cleanedResponse.length - 3)
    }
    
    const maestroResponse = JSON.parse(cleanedResponse.trim())
    
    // Validate maestro response
    if (!maestroResponse.modified_template || !maestroResponse.explanation) {
      throw new Error('Invalid maestro response format')
    }
    
    console.log(`✅ Maestro modification completed: ${maestroResponse.explanation}`)
    
    // ✅ STORE LATEST HTML (replaces previous version)
    console.log(`💾 Storing modified HTML to database...`)
    try {
      await htmlStorage.storeLatestHTML(
        threadId,
        sessionId,
        maestroResponse.modified_template,
        maestroResponse.explanation
      )
      
      const metadata = await htmlStorage.getHTMLMetadata(threadId, sessionId)
      console.log(`✅ HTML stored successfully!`)
      console.log(`   Version: ${metadata?.version || 'unknown'}`)
      console.log(`   Size: ${maestroResponse.modified_template.length} characters`)
    } catch (storageError) {
      console.error('⚠️ Warning: Failed to store HTML:', storageError)
      // Don't fail the whole operation if storage fails
    }
    
    // Note: HTML is stored separately, NOT in conversation history
    // Maestro reads from conversation (natural language only)
    // Conversation stays clean and token-efficient
    
    return {
      success: true,
      modified_template: maestroResponse.modified_template,
      explanation: maestroResponse.explanation,
      memoryState: {
        summary: `${conversationMessages.length} messages (HTML stored separately)`,
        messageCount: conversationMessages.length,
        tokenBudget: 2000
      }
    }
    
  } catch (error: unknown) {
    console.error('❌ Maestro turn error:', error)
    
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown maestro error',
      modified_template: null,
      explanation: 'I encountered an issue while modifying the document. Please try again.'
    }
  }
}

