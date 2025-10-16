/**
 * LoadingIndicator Component
 * 
 * Displays NEXA icon + scrolling text animation while waiting for AI response
 * Based on the "Structure Solution" animation from /solutioning
 * 
 * Features:
 * - NEXA icon with blur/brightness animation
 * - Scrolling text with blur effect
 * - Inline size (fits in a message row)
 * - Multiple text variations
 */

'use client'

import { useEffect, useState } from 'react'

interface LoadingIndicatorProps {
  /** Text to display (e.g., "Thinking...", "Considering...") */
  text?: string
}

// Text variations for random selection
const TEXT_VARIATIONS = [
  'Thinking...',
  'Considering...',
  'Researching...',
  'Analyzing...',
  'Processing...',
  'Formulating...',
  'Contemplating...',
  'Evaluating...'
]

export function LoadingIndicator({ text }: LoadingIndicatorProps) {
  const [displayText, setDisplayText] = useState(text || TEXT_VARIATIONS[0])

  // Pick a random text if none provided
  useEffect(() => {
    if (!text) {
      const randomText = TEXT_VARIATIONS[Math.floor(Math.random() * TEXT_VARIATIONS.length)]
      setDisplayText(randomText)
    }
  }, [text])

  // Split text into letters for animation
  const letters = displayText.split('')

  return (
    <div className="flex items-center gap-3 py-2">
      {/* NEXA Icon with blur/brightness animation */}
      <img
        src="/images/nexanonameicon.png?v=1"
        alt="NEXA"
        className="nexa-chat-loading-icon"
        style={{
          width: '24px',
          height: '24px',
          filter: 'brightness(1.2)',
          animation: 'nexaBlurEffect 2s ease-in-out infinite'
        }}
      />
      
      {/* Scrolling text with blur effect */}
      <div 
        className="blur-scroll-loading-chat"
        style={{
          minHeight: '1.5rem',
          minWidth: '8rem',
          position: 'relative',
          overflow: 'hidden',
          maskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0))',
          WebkitMaskImage: 'linear-gradient(to right, rgba(0, 0, 0, 0), rgba(0, 0, 0, 1) 30%, rgba(0, 0, 0, 1) 70%, rgba(0, 0, 0, 0))',
          fontFamily: "'Courier New', Courier, monospace"
        }}
      >
        {letters.map((letter, index) => (
          <span
            key={index}
            className="blur-scroll-letter-chat"
            style={{
              position: 'absolute',
              top: '50%',
              transform: 'translate(0px, -50%)',
              left: '100%',
              animation: 'blurScroll 3.5s linear infinite',
              animationDelay: `calc(3.5s / ${letters.length} * (${letters.length} - ${index + 1}) * -1)`,
              fontSize: '14px',
              fontWeight: 600,
              lineHeight: '20px',
              letterSpacing: '0.2em',
              color: '#ffffff',
              width: '1ch'
            }}
          >
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        ))}
      </div>
    </div>
  )
}

