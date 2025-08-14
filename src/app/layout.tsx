import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'NEXA - AI-Powered Solution Architecture Platform',
  description: 'Your AI-powered solution architecture, documentation, and project planning platform.',
  keywords: ['AI', 'Solution Architecture', 'Documentation', 'Project Planning', 'Automation'],
  authors: [{ name: 'Dry Ground AI' }],
  creator: 'Dry Ground AI',
  robots: 'index, follow',
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} nexa-background min-h-screen`}>
        <div className="min-h-screen flex flex-col">
          {children}
        </div>
      </body>
    </html>
  )
}
