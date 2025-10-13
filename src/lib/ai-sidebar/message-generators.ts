import * as hub from 'langchain/hub/node'
import { getRandomHiddenMessage } from './hidden-messages-pool'

interface MessageContext {
  previousMessages: string
  activityLogs: string
  userInput?: string
}

/**
 * Generate pre-response using LangSmith prompt
 * DO NOT specify model - it's configured in LangSmith
 */
export async function generatePreResponse(context: MessageContext): Promise<string> {
  try {
    const prompt = await hub.pull('nexa-liaison-swift-pre', {
      includeModel: true
    })
    
    const result = await prompt.invoke({
      previous_messages: context.previousMessages,
      activity_logs: context.activityLogs,
      user_input: context.userInput || ''
    })
    
    return result.content || result.text || String(result)
  } catch (error) {
    console.error('Error generating pre-response:', error)
    throw error
  }
}

/**
 * Get hidden message from pool
 * TODO: Later implement generateHiddenMessage using nexa-liaison-swift-hidden
 */
export function getHiddenMessage(): string {
  return getRandomHiddenMessage()
}

/**
 * Generate full response using LangSmith prompt
 * DO NOT specify model - it's configured in LangSmith
 * Returns parsed JSON with response and action
 */
export async function generateResponse(context: MessageContext): Promise<{
  response: string
  action: { type: null; params: {} }
}> {
  try {
    const prompt = await hub.pull('nexa-liaison-response', {
      includeModel: true
    })
    
    const result = await prompt.invoke({
      previous_messages: context.previousMessages,
      activity_logs: context.activityLogs,
      user_input: context.userInput || ''
    })
    
    const content = result.content || result.text || String(result)
    
    // Try to parse JSON response
    try {
      const parsed = JSON.parse(content)
      return {
        response: parsed.response || content,
        action: parsed.action || { type: null, params: {} }
      }
    } catch {
      // If not JSON, return as plain response
      return {
        response: content,
        action: { type: null, params: {} }
      }
    }
  } catch (error) {
    console.error('Error generating response:', error)
    throw error
  }
}

