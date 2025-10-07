import { ConversationSummaryBufferMemory } from 'langchain/memory'
import { ChatOpenAI } from '@langchain/openai'
import { PromptTemplate } from '@langchain/core/prompts'
import { RunnableWithMessageHistory } from '@langchain/core/runnables'
import { BaseChatMessageHistory } from '@langchain/core/chat_history'
import { RunnableConfig } from '@langchain/core/runnables'
import * as hub from 'langchain/hub/node'

// Memory instances stored per thread (in-memory for now)
const threadMemories = new Map<string, ConversationSummaryBufferMemory>()

/**
 * Get or create memory for a specific thread
 */
export function getOrCreateMemory(threadId: string): ConversationSummaryBufferMemory {
  if (!threadMemories.has(threadId)) {
    const llm = new ChatOpenAI({
      modelName: 'gpt-4o-mini', // Cheaper model for summarization
      temperature: 0.3,
      openAIApiKey: process.env.OPENAI_API_KEY
    })
    
    const memory = new ConversationSummaryBufferMemory({
      llm: llm,
      maxTokenLimit: 2000,      // Budget for summary + recent messages
      returnMessages: true,      // Exposes messages for the prompt
      memoryKey: 'older_messages',
      aiPrefix: 'Quickshot',
      humanPrefix: 'User',
      outputKey: 'text'         // Key for chain output
    })
    
    threadMemories.set(threadId, memory)
    console.log(`🧠 Created new memory for thread: ${threadId}`)
  }
  
  return threadMemories.get(threadId)!
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
 * Execute a chat turn with LCEL, memory, and LangSmith tagging
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
  console.log(`   Input: "${input.substring(0, 50)}..."`)
  
  const memory = getOrCreateMemory(threadId)
  
  try {
    // Get the base chain
    const baseChain = await createQuickshotChain()
    
    // Configure LangSmith tagging
    const config: RunnableConfig = {
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
    
    // Get memory context for the prompt
    const memoryVariables = await memory.loadMemoryVariables({})
    const summary = memoryVariables.summary || ''
    const olderMessages = memoryVariables.older_messages || ''
    
    console.log(`🧠 Memory context: ${summary.substring(0, 50)}...`)
    
    // Invoke the chain with memory context
    console.log('🔄 Invoking chain with memory context')
    const result = await baseChain.invoke(
      {
        input: input,
        summary: summary,
        older_messages: olderMessages
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
    
    // Update memory with the conversation
    // Save the actual chat responses instead of the full JSON
    const chatText = quickshotResponse.chat_responses.join(' ')
    await memory.saveContext(
      { input: input },
      { text: chatText }  // Use 'text' key to match outputKey config
    )
    
    // Get updated memory state
    const updatedMemoryVariables = await memory.loadMemoryVariables({})
    const updatedSummary = updatedMemoryVariables.summary || 'No conversation yet'
    
    console.log(`✅ Chat turn completed successfully`)
    console.log(`   Maestro: ${quickshotResponse.maestro}`)
    console.log(`   Responses: ${quickshotResponse.chat_responses.length}`)
    
    return {
      success: true,
      maestro: quickshotResponse.maestro,
      message_to_maestro: quickshotResponse.message_to_maestro,
      chat_responses: quickshotResponse.chat_responses,
      memoryState: {
        summary: updatedSummary,
        messageCount: 0, // We'll update this when we find the proper API
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
  const memory = getOrCreateMemory(threadId)
  const memoryVariables = await memory.loadMemoryVariables({})
  
  return {
    messageCount: 0, // We'll update this when we find the proper API
    summary: memoryVariables.summary || 'No conversation yet',
    tokenBudget: 2000
  }
}

/**
 * Clear memory for a thread (useful for testing)
 */
export function clearThreadMemory(threadId: string) {
  if (threadMemories.has(threadId)) {
    threadMemories.delete(threadId)
    console.log(`🗑️ Cleared memory for thread: ${threadId}`)
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

CURRENT TEMPLATE: {current_template}
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
  
  // Get the SAME memory instance used by quickshot
  const memory = getOrCreateMemory(threadId)
  
  try {
    // Get maestro chain with shared context structure
    const maestroChain = await createMaestroChain()
    
    // Configure LangSmith tagging (same pattern as quickshot)
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
    
    // Get memory context (same as quickshot)
    const memoryVariables = await memory.loadMemoryVariables({})
    const summary = memoryVariables.summary || ''
    const olderMessages = memoryVariables.older_messages || ''
    
    console.log(`🧠 Maestro memory context: ${summary.substring(0, 50)}...`)
    
    // Invoke maestro with shared context + current template + instruction
    const result = await maestroChain.invoke({
      summary: summary,
      older_messages: olderMessages,
      current_template: currentTemplate,
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
    
    // Update memory with maestro interaction
    await memory.saveContext(
      { input: `[MAESTRO REQUEST] ${instruction}` },
      { text: `[MAESTRO COMPLETED] ${maestroResponse.explanation}` }
    )
    
    console.log(`✅ Maestro turn completed: ${maestroResponse.explanation}`)
    
    return {
      success: true,
      modified_template: maestroResponse.modified_template,
      explanation: maestroResponse.explanation,
      memoryState: {
        summary: (await memory.loadMemoryVariables({})).summary || 'No conversation yet',
        messageCount: 0,
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

