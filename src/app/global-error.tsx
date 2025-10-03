'use client'

export const dynamic = 'force-dynamic'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html>
      <body className="nexa-background">
        <div className="min-h-screen flex items-center justify-center">
          <div className="text-center max-w-md">
            <h1 className="text-6xl font-bold text-white mb-4">Error</h1>
            <p className="text-xl text-gray-300 mb-4">A critical error occurred</p>
            <p className="text-sm text-gray-400 mb-8">{error.message}</p>
            <button
              onClick={reset}
              className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              Try again
            </button>
          </div>
        </div>
      </body>
    </html>
  )
}

