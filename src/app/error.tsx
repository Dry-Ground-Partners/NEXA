'use client'

export const dynamic = 'force-dynamic'

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-nexa-background">
      <div className="text-center max-w-md">
        <h1 className="text-6xl font-bold text-white mb-4">500</h1>
        <p className="text-xl text-nexa-muted mb-4">Something went wrong</p>
        <p className="text-sm text-gray-400 mb-8">{error.message}</p>
        <button
          onClick={reset}
          className="px-6 py-3 bg-nexa-accent text-white rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Try again
        </button>
      </div>
    </div>
  )
}

