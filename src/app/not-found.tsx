export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-nexa-background">
      <div className="text-center">
        <h1 className="text-6xl font-bold text-white mb-4">404</h1>
        <p className="text-xl text-nexa-muted mb-8">Page not found</p>
        <a 
          href="/"
          className="px-6 py-3 bg-nexa-accent text-white rounded-lg hover:bg-opacity-90 transition-colors"
        >
          Go Home
        </a>
      </div>
    </div>
  )
}

