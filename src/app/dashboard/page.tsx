'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { 
  Lightbulb, 
  FileText, 
  Calculator, 
  Palette, 
  Layers, 
  History,
  BarChart3,
  Users,
  Bell
} from 'lucide-react'
import type { AuthUser } from '@/types'

// Tool card data matching NEXA design
const toolCards = [
  {
    id: 'solutioning',
    title: 'Solution Documents',
    description: 'Create comprehensive solution architecture documents with AI assistance',
    icon: Lightbulb,
    href: '/solutioning',
    color: 'text-yellow-500' // warning color
  },
  {
    id: 'sow',
    title: 'Statement of Work',
    description: 'Generate professional SoW documents for your projects',
    icon: FileText,
    href: '/sow',
    color: 'text-green-500' // success color
  },
  {
    id: 'loe',
    title: 'Level of Effort',
    description: 'Estimate project effort and resource requirements',
    icon: Calculator,
    href: '/loe',
    color: 'text-blue-500' // info color
  },
  {
    id: 'visuals',
    title: 'Visual Diagrams',
    description: 'Create and manage architectural diagrams and sketches',
    icon: Palette,
    href: '/visuals',
    color: 'text-purple-500' // primary color
  },
  {
    id: 'structuring',
    title: 'Content Structuring',
    description: 'Organize and structure your content with AI',
    icon: Layers,
    href: '/structuring',
    color: 'text-gray-400' // secondary color
  },
  {
    id: 'sessions',
    title: 'Session Management',
    description: 'View and manage all your saved sessions',
    icon: History,
    href: '/sessions',
    color: 'text-yellow-500' // warning color
  }
]

export default function DashboardPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (data.success) {
          setUser(data.user)
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  if (loading) {
    return (
      <div className="min-h-screen nexa-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <DashboardLayout 
      currentPage="Dashboard" 
      user={user ? {
        fullName: user.fullName,
        email: user.email
      } : undefined}
    >
      <div className="container mx-auto p-6">
        <div className="max-w-6xl mx-auto">
          <Card variant="nexa" className="p-8">
            {/* Welcome Banner */}
            <div className="bg-gradient-to-r from-gray-800 to-gray-700 rounded-lg p-6 mb-8 border border-nexa-border">
              <h2 className="text-xl font-semibold text-white mb-2">
                🚀 Welcome to NEXA
              </h2>
              <p className="text-nexa-muted">
                Your AI-powered solution architecture, documentation, and project planning platform.
              </p>
            </div>

            {/* Tool Cards Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
              {toolCards.map((tool) => {
                const IconComponent = tool.icon
                return (
                  <Link key={tool.id} href={tool.href}>
                    <Card className="tool-card p-8 h-full">
                      <div className="flex flex-col h-full">
                        <IconComponent className={`h-12 w-12 mb-4 ${tool.color}`} />
                        <h3 className="text-lg font-semibold text-white mb-3">
                          {tool.title}
                        </h3>
                        <p className="text-nexa-muted text-sm leading-relaxed">
                          {tool.description}
                        </p>
                      </div>
                    </Card>
                  </Link>
                )
              })}
            </div>

            {/* Placeholder Sections for Future Features */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
              {/* Recent Activity */}
              <Card variant="nexa" className="p-8 text-center">
                <BarChart3 className="h-12 w-12 text-nexa-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">
                  Recent Activity
                </h3>
                <p className="text-nexa-muted">
                  Your recent sessions and activity will appear here
                </p>
              </Card>

              {/* Shared Sessions */}
              <Card variant="nexa" className="p-8 text-center">
                <Users className="h-12 w-12 text-nexa-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">
                  Shared Sessions
                </h3>
                <p className="text-nexa-muted">
                  Sessions shared with you by other users will appear here
                </p>
              </Card>
            </div>

            {/* Notifications Section */}
            <div className="grid grid-cols-1">
              <Card variant="nexa" className="p-8 text-center">
                <Bell className="h-12 w-12 text-nexa-muted mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-3">
                  Notifications & Updates
                </h3>
                <p className="text-nexa-muted">
                  System notifications, feature updates, and announcements will appear here
                </p>
              </Card>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}
