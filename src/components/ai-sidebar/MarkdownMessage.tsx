'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MarkdownMessageProps {
  content: string
}

export function MarkdownMessage({ content }: MarkdownMessageProps) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="text-xs leading-relaxed"
      components={{
        // Paragraphs
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        // Bold - cyan accent
        strong: ({ children }) => (
          <strong className="font-semibold text-cyan-300">{children}</strong>
        ),
        // Italic
        em: ({ children }) => (
          <em className="italic text-white/80">{children}</em>
        ),
        // Inline code
        code: ({ inline, children, ...props }: any) =>
          inline ? (
            <code className="bg-white/10 px-1 py-0.5 rounded text-cyan-400 text-[11px] font-mono">
              {children}
            </code>
          ) : (
            <code className="block bg-white/10 p-2 rounded my-2 text-[11px] font-mono overflow-x-auto">
              {children}
            </code>
          ),
        // Lists
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>
        ),
        li: ({ children }) => (
          <li className="text-white/90">{children}</li>
        ),
        // Links
        a: ({ children, href }) => (
          <a 
            href={href} 
            target="_blank" 
            rel="noopener noreferrer"
            className="text-cyan-400 hover:text-cyan-300 underline"
          >
            {children}
          </a>
        ),
        // Blockquotes
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-cyan-400/50 pl-3 my-2 italic text-white/70">
            {children}
          </blockquote>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}

