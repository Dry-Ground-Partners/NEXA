import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

/**
 * Markdown renderer for structuring page content
 * Renders markdown with custom styling for the NEXA theme
 */
export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn("prose prose-invert max-w-none", className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Paragraphs
          p: ({ children }) => (
            <p className="mb-3 text-nexa-text-primary leading-relaxed">{children}</p>
          ),
          
          // Strong/Bold
          strong: ({ children }) => (
            <strong className="font-semibold text-white">{children}</strong>
          ),
          
          // Emphasis/Italic
          em: ({ children }) => (
            <em className="italic text-nexa-text-secondary">{children}</em>
          ),
          
          // Headings
          h1: ({ children }) => (
            <h1 className="text-2xl font-bold mb-4 mt-6 text-white border-b border-white/10 pb-2">
              {children}
            </h1>
          ),
          h2: ({ children }) => (
            <h2 className="text-xl font-bold mb-3 mt-5 text-white">
              {children}
            </h2>
          ),
          h3: ({ children }) => (
            <h3 className="text-lg font-semibold mb-2 mt-4 text-cyan-400">
              {children}
            </h3>
          ),
          h4: ({ children }) => (
            <h4 className="text-base font-semibold mb-2 mt-3 text-nexa-text-primary">
              {children}
            </h4>
          ),
          
          // Lists
          ul: ({ children }) => (
            <ul className="list-disc list-inside mb-3 space-y-1 text-nexa-text-primary">
              {children}
            </ul>
          ),
          ol: ({ children }) => (
            <ol className="list-decimal list-inside mb-3 space-y-1 text-nexa-text-primary">
              {children}
            </ol>
          ),
          li: ({ children }) => (
            <li className="text-nexa-text-primary">{children}</li>
          ),
          
          // Code
          code: ({ inline, children }) =>
            inline ? (
              <code className="bg-white/10 px-1.5 py-0.5 rounded text-cyan-400 text-sm font-mono">
                {children}
              </code>
            ) : (
              <pre className="bg-white/10 p-4 rounded-lg my-3 overflow-x-auto">
                <code className="text-cyan-400 text-sm font-mono">{children}</code>
              </pre>
            ),
          
          // Blockquote
          blockquote: ({ children }) => (
            <blockquote className="border-l-4 border-cyan-400/50 pl-4 my-3 italic text-nexa-text-secondary bg-white/5 py-2 rounded-r">
              {children}
            </blockquote>
          ),
          
          // Links
          a: ({ href, children }) => (
            <a 
              href={href} 
              className="text-cyan-400 hover:text-cyan-300 hover:underline transition-colors" 
              target="_blank" 
              rel="noopener noreferrer"
            >
              {children}
            </a>
          ),
          
          // Horizontal Rule
          hr: () => (
            <hr className="my-4 border-t border-white/10" />
          ),
          
          // Tables
          table: ({ children }) => (
            <div className="overflow-x-auto my-4">
              <table className="min-w-full border border-white/10 rounded-lg overflow-hidden">
                {children}
              </table>
            </div>
          ),
          thead: ({ children }) => (
            <thead className="bg-white/10">
              {children}
            </thead>
          ),
          tbody: ({ children }) => (
            <tbody className="divide-y divide-white/10">
              {children}
            </tbody>
          ),
          tr: ({ children }) => (
            <tr className="hover:bg-white/5 transition-colors">
              {children}
            </tr>
          ),
          th: ({ children }) => (
            <th className="px-4 py-2 text-left text-sm font-semibold text-white">
              {children}
            </th>
          ),
          td: ({ children }) => (
            <td className="px-4 py-2 text-sm text-nexa-text-primary">
              {children}
            </td>
          ),
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}

