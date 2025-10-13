import { getRandomHiddenMessage } from './hidden-messages-pool'

/**
 * Get hidden message from pool
 * TODO: Later implement generateHiddenMessage using nexa-liaison-swift-hidden
 */
export function getHiddenMessage(): string {
  return getRandomHiddenMessage()
}

