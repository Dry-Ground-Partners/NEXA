/**
 * Pool of 50 generic hidden messages
 * Used when no contextual hidden message is available
 */

export const HIDDEN_MESSAGES_POOL = [
  "Hmm, interesting... let me think about this...",
  "Let me consider what you've been working on...",
  "I'm analyzing your recent activity...",
  "Interesting question... I'm processing this...",
  "Let me reflect on the context here...",
  "I'm thinking through your workflow patterns...",
  "Hmm... let me analyze this properly...",
  "I'm considering the best way to help...",
  "Let me examine what you've done recently...",
  "Interesting... I'm connecting the dots...",
  "I'm reviewing your recent work...",
  "Let me think about how this fits together...",
  "Hmm, let me consider the full picture...",
  "I'm processing your recent activity...",
  "Let me analyze this in context...",
  "Interesting approach... let me think...",
  "I'm reflecting on your workflow...",
  "Let me consider what would help most...",
  "Hmm... I'm thinking through this...",
  "I'm analyzing the patterns here...",
  "Let me process this thoughtfully...",
  "Interesting... I'm considering the options...",
  "I'm examining your recent progress...",
  "Let me think about the best approach...",
  "Hmm, I'm analyzing the situation...",
  "I'm reflecting on what you've shared...",
  "Let me consider this carefully...",
  "Interesting point... I'm thinking...",
  "I'm processing the context here...",
  "Let me analyze your workflow...",
  "Hmm... I'm considering the details...",
  "I'm thinking about how to help best...",
  "Let me reflect on what you need...",
  "Interesting... I'm analyzing this...",
  "I'm examining the broader context...",
  "Let me think through this properly...",
  "Hmm, I'm processing the information...",
  "I'm considering your recent activity...",
  "Let me analyze what's important here...",
  "Interesting question... let me think...",
  "I'm reflecting on the workflow...",
  "Let me consider the connections...",
  "Hmm... I'm thinking about this...",
  "I'm analyzing what you've done...",
  "Let me process this thoughtfully...",
  "Interesting... I'm examining this...",
  "I'm thinking through the context...",
  "Let me reflect on the patterns...",
  "Hmm, I'm considering the approach...",
  "I'm analyzing the situation here..."
]

/**
 * Get a random hidden message from the pool
 */
export function getRandomHiddenMessage(): string {
  const randomIndex = Math.floor(Math.random() * HIDDEN_MESSAGES_POOL.length)
  return HIDDEN_MESSAGES_POOL[randomIndex]
}

