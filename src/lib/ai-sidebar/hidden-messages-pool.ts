/**
 * Pool of 50 generic hidden messages (~200 characters each)
 * Used when no contextual hidden message is available
 * These are displayed as normal messages with streaming effect
 */

export const HIDDEN_MESSAGES_POOL = [
  "I'm taking a moment to analyze your request and consider the best way to help. Let me gather my thoughts on this and make sure I understand exactly what you're looking for before I respond.",
  "Great to have you here! I'm processing your message carefully to ensure I provide the most accurate and helpful response. Give me just a second to think through the context and relevant details.",
  "Let me read through what you've shared and connect it with your recent work. I want to make sure my response is tailored specifically to your situation and addresses exactly what you need.",
  "I'm considering the different aspects of your question and how they relate to your workflow. This will help me give you a comprehensive answer that covers all the important points you might need.",
  "Thanks for reaching out! I'm analyzing your request in the context of what you've been working on recently. This helps me provide more relevant and actionable guidance that fits your specific use case.",
  "I'm thinking through the best way to explain this clearly and make sure you have all the information you need. Let me organize my thoughts so I can give you a well-structured response.",
  "Let me take a moment to process your question thoughtfully. I want to ensure my response is both accurate and helpful, so I'm considering all the relevant details before I answer.",
  "I'm examining your request carefully and thinking about how it connects to your recent activity. This context helps me provide more targeted and useful assistance for what you're trying to accomplish.",
  "Good question! I'm analyzing the different angles here to make sure I give you a complete answer. Let me think through the key points and how they apply to your specific situation.",
  "I'm reviewing your message and considering the best approach to help you. Give me a second to gather the relevant information and organize it in a way that will be most useful for you.",
  "Let me process this carefully so I can provide you with the most helpful response. I'm thinking about your workflow and how this fits into what you've been working on recently.",
  "I'm taking a moment to understand your request fully and consider all the relevant details. This helps me give you an answer that's specifically tailored to what you're asking about.",
  "Thanks for your patience! I'm analyzing your question and thinking about the best way to address it comprehensively. I want to make sure my response covers everything you need to know.",
  "I'm processing your message and connecting it with the context of your recent work. This helps me provide guidance that's directly relevant to your current situation and objectives.",
  "Let me think through this carefully to ensure I give you accurate and actionable information. I'm considering the different aspects of your question and how they relate to each other.",
  "I'm examining your request from multiple angles to provide you with a thorough response. Give me just a moment to organize my thoughts and gather the relevant information you'll need.",
  "Good to hear from you! I'm analyzing what you've asked and thinking about how it fits with your workflow. This context helps me provide more specific and helpful guidance.",
  "I'm taking a moment to process your question thoughtfully and consider the best way to help. Let me make sure I understand exactly what you're looking for before I respond.",
  "Let me read through your message carefully and think about the most effective way to assist you. I want to ensure my response is clear, accurate, and directly addresses your needs.",
  "I'm considering your question in the context of what you've been working on. This helps me provide recommendations that are specifically relevant to your situation and goals.",
  "Thanks for reaching out! I'm processing your request and thinking about how to explain this in the clearest way possible. Give me a second to organize the information for you.",
  "I'm analyzing your message and connecting it with your recent activity to provide contextual guidance. Let me think through the key points that will be most helpful for you.",
  "Let me take a moment to consider all aspects of your question carefully. I want to make sure my response is comprehensive and addresses everything you're asking about.",
  "I'm thinking through the best way to help you with this. Let me process your request and gather the relevant information so I can provide you with accurate and useful guidance.",
  "Good question! I'm examining the different elements here and how they relate to your workflow. This helps me give you a response that's specifically tailored to your needs.",
  "I'm processing your message thoughtfully to ensure I provide the most helpful answer. Let me consider the context and relevant details before I respond to you.",
  "Let me analyze your request carefully and think about the best approach to assist you. I'm considering how this connects with what you've been working on recently.",
  "I'm taking a moment to understand your question fully and gather my thoughts. This helps me provide you with a clear and comprehensive response that addresses your needs.",
  "Thanks for your message! I'm processing what you've asked and thinking about how to explain this effectively. Give me just a second to organize the information for you.",
  "I'm examining your request from different perspectives to ensure I give you a thorough answer. Let me think through the key points and how they apply to your situation.",
  "Let me read through your question carefully and consider the best way to help. I want to make sure my response is accurate, relevant, and directly addresses what you're asking.",
  "I'm analyzing your message in the context of your recent work to provide targeted guidance. This helps me give you recommendations that are specifically relevant to your goals.",
  "Good to see you! I'm processing your request thoughtfully and considering all the relevant details. Let me take a moment to ensure I give you the most helpful response.",
  "I'm thinking through your question carefully and how it relates to your workflow. This context helps me provide advice that's directly applicable to your specific situation.",
  "Let me analyze what you've asked and consider the different aspects involved. I want to ensure my response is comprehensive and covers all the important points you need.",
  "I'm processing your message and thinking about the clearest way to explain this. Give me a second to organize my thoughts so I can provide you with useful guidance.",
  "Thanks for reaching out! I'm examining your question carefully and considering how it connects with what you've been working on. This helps me provide more relevant assistance.",
  "I'm taking a moment to process your request thoughtfully and gather the information you need. Let me make sure I understand exactly what you're asking before I respond.",
  "Let me think through this carefully to provide you with accurate and actionable guidance. I'm considering the different elements and how they relate to your situation.",
  "I'm analyzing your message and connecting it with your recent activity to give you contextual advice. This helps me provide recommendations that are specifically useful for you.",
  "Good question! I'm processing what you've asked and thinking about the best way to address it comprehensively. Let me organize the information so it's clear and helpful.",
  "I'm examining your request carefully to ensure I provide the most relevant response. Give me a moment to consider the context and gather the details you'll need.",
  "Let me read through your message thoughtfully and think about how to help you effectively. I want to make sure my response directly addresses what you're looking for.",
  "I'm processing your question in the context of your workflow to provide targeted guidance. This helps me give you advice that's specifically applicable to your current work.",
  "Thanks for your patience! I'm analyzing what you've asked and thinking about the clearest way to explain this. Let me organize my thoughts to provide you with useful information.",
  "I'm considering your request from multiple angles to give you a thorough answer. Let me think through the key points and how they connect to your specific situation.",
  "Let me take a moment to process your message carefully and ensure I understand what you need. This helps me provide you with accurate and helpful guidance that addresses your question.",
  "I'm thinking through your request thoughtfully and considering how it relates to your recent work. This context helps me provide recommendations that are directly relevant to your goals.",
  "Good to hear from you! I'm analyzing your question and gathering the information you'll need. Give me just a second to organize everything so my response is clear and comprehensive.",
  "I'm processing what you've asked and thinking about the best way to assist you effectively. Let me consider all the relevant details to ensure my response is helpful and accurate."
]

/**
 * Get a random hidden message from the pool
 */
export function getRandomHiddenMessage(): string {
  const randomIndex = Math.floor(Math.random() * HIDDEN_MESSAGES_POOL.length)
  return HIDDEN_MESSAGES_POOL[randomIndex]
}

