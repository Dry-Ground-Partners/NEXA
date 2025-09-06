'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  Grid3X3, 
  Terminal, 
  Clock, 
  Eye,
  Loader2,
  ArrowRight
} from 'lucide-react'
import type { SessionSummary } from '@/lib/sessions'

export default function GridPage() {
  const router = useRouter()
  
  // Tab state
  const [activeTab, setActiveTab] = useState('sessions')
  
  // Session data state
  const [sessions, setSessions] = useState<SessionSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  
  // Fetch sessions on component mount
  useEffect(() => {
    fetchSessions()
  }, [])
  
  const fetchSessions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Grid: Fetching user sessions...')
      const response = await fetch('/api/sessions')
      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Grid: Loaded ${result.sessions.length} sessions`)
        setSessions(result.sessions)
      } else {
        console.error('❌ Grid: Failed to fetch sessions:', result.error)
        setError(result.error || 'Failed to load sessions')
      }
    } catch (err) {
      console.error('💥 Grid: Error fetching sessions:', err)
      setError('Network error while loading sessions')
    } finally {
      setLoading(false)
    }
  }
  
  // Navigate to session
  const handlePushSession = (session: SessionSummary) => {
    console.log(`🔗 Grid: Navigating to session ${session.uuid}`)
    
    // Route based on session type
    const routes: { [key: string]: string } = {
      'structuring': '/structuring',
      'visuals': '/visuals', 
      'solutioning': '/solutioning',
      'sow': '/sow',
      'loe': '/loe'
    }
    
    const basePath = routes[session.sessionType] || '/structuring'
    router.push(`${basePath}?session=${session.uuid}`)
  }
  
  // Get tags based on actual content availability
  const getSessionTags = (session: SessionSummary) => {
    const availableTags: string[] = []
    
    // Debug logging for content availability
    console.log(`🏷️ Grid: Checking content for session "${session.title || 'Untitled'}" (${session.sessionType}):`, {
      structure: session.availableContent.structure,
      visuals: session.availableContent.visuals,
      solution: session.availableContent.solution,
      work: session.availableContent.work,
      effort: session.availableContent.effort
    })
    
    // Check each content type and add tag if content exists
    if (session.availableContent.structure) {
      availableTags.push('Structure')
    }
    if (session.availableContent.visuals) {
      availableTags.push('Visuals')
    }
    if (session.availableContent.solution) {
      availableTags.push('Solution')
    }
    if (session.availableContent.work) {
      availableTags.push('Work')
    }
    if (session.availableContent.effort) {
      availableTags.push('Effort')
    }
    
    console.log(`🏷️ Grid: Generated tags for "${session.title || 'Untitled'}":`, availableTags)
    
    // Return available tags, or empty array if none
    return availableTags
  }
  
  // Format date for display
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  return (
    <DashboardLayout>
      <div className="nexa-background min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Tab Navigation Row */}
          <div className="flex items-end justify-between mb-0">
            {/* Left: Label + Tab Strip */}
            <div className="flex items-end gap-8">
              {/* Grid Label */}
              <div className="flex items-center gap-2 text-white pb-3 ml-16">
                <Grid3X3 className="w-4 h-4" />
                <span>Grid</span>
              </div>
              
              {/* Main Tabs */}
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList>
                  <TabsTrigger value="command">
                    <Terminal className="w-4 h-4 mr-2" />
                    Command
                  </TabsTrigger>
                  <TabsTrigger value="sessions">
                    <Clock className="w-4 h-4 mr-2" />
                    Sessions
                  </TabsTrigger>
                  <TabsTrigger value="backdrop">
                    <Eye className="w-4 h-4 mr-2" />
                    Backdrop
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>

          {/* Content Card */}
          <Card variant="nexa" className="rounded-tr-none border-t border-nexa-border p-8 mt-0">
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              
              {/* Command Tab Content */}
              <TabsContent value="command" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Command</h3>
                  <div className="text-nexa-muted">
                    <p>Command interface and controls will be implemented here.</p>
                    <p>This tab will handle grid commands and operations.</p>
                  </div>
                </div>
              </TabsContent>

              {/* Sessions Tab Content */}
              <TabsContent value="sessions" className="mt-0">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">Sessions</h3>
                  
                  {/* Search & Filter Placeholder */}
                  <div className="bg-white/5 border border-white/10 rounded-lg p-4">
                    <div className="text-nexa-muted text-sm">
                      <p>🔍 Search and filter options will be implemented here</p>
                      <p>Filter by date, status, type, etc.</p>
                    </div>
                  </div>

                  {/* Sessions Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium text-white">Recent Sessions</h4>
                      {!loading && (
                        <p className="text-sm text-nexa-muted">
                          {sessions.length} session{sessions.length !== 1 ? 's' : ''} found
                        </p>
                      )}
                    </div>
                    
                    {/* Loading State */}
                    {loading && (
                      <div className="flex items-center justify-center py-12">
                        <div className="flex items-center gap-3 text-nexa-muted">
                          <Loader2 className="h-5 w-5 animate-spin" />
                          <span>Loading sessions...</span>
                        </div>
                      </div>
                    )}
                    
                    {/* Error State */}
                    {error && !loading && (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="text-red-400 text-center">
                          <p className="font-medium">Failed to load sessions</p>
                          <p className="text-sm text-red-400/80">{error}</p>
                        </div>
                        <button 
                          onClick={fetchSessions}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white text-sm rounded-lg transition-all duration-200"
                        >
                          Try Again
                        </button>
                      </div>
                    )}
                    
                    {/* Empty State */}
                    {!loading && !error && sessions.length === 0 && (
                      <div className="flex flex-col items-center justify-center py-12 space-y-4">
                        <div className="text-nexa-muted text-center">
                          <p className="font-medium">No sessions found</p>
                          <p className="text-sm">Create your first session to get started</p>
                        </div>
                        <button 
                          onClick={() => router.push('/structuring')}
                          className="px-4 py-2 bg-white/10 hover:bg-white/20 border border-white/20 hover:border-white/30 text-white text-sm rounded-lg transition-all duration-200"
                        >
                          Create Session
                        </button>
                      </div>
                    )}
                    
                    {/* Sessions Grid */}
                    {!loading && !error && sessions.length > 0 && (
                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {sessions.map((session) => {
                          const tags = getSessionTags(session)
                          const gradientColors = [
                            'from-slate-900/40 to-blue-900/20',
                            'from-slate-900/40 to-teal-900/20', 
                            'from-slate-900/40 to-purple-900/20',
                            'from-slate-900/40 to-emerald-900/20',
                            'from-slate-900/40 to-cyan-900/20',
                            'from-slate-900/40 to-indigo-900/20'
                          ]
                          const hoverColors = [
                            'hover:from-slate-800/50 hover:to-blue-800/30',
                            'hover:from-slate-800/50 hover:to-teal-800/30',
                            'hover:from-slate-800/50 hover:to-purple-800/30', 
                            'hover:from-slate-800/50 hover:to-emerald-800/30',
                            'hover:from-slate-800/50 hover:to-cyan-800/30',
                            'hover:from-slate-800/50 hover:to-indigo-800/30'
                          ]
                          const gradientIndex = Math.abs(session.id.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)) % gradientColors.length
                          
                          return (
                            <div 
                              key={session.uuid} 
                              className={`group relative backdrop-blur-md bg-gradient-to-br ${gradientColors[gradientIndex]} border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/60 hover:bg-gradient-to-br ${hoverColors[gradientIndex]} transition-all duration-300 cursor-pointer shadow-lg hover:shadow-xl`}
                            >
                              {/* Title & Client */}
                              <div className="mb-4">
                                <h5 className="text-white font-semibold text-lg mb-1 line-clamp-1">
                                  {session.title || 'Untitled Session'}
                                </h5>
                                <p className="text-slate-300 text-sm line-clamp-1">
                                  {session.client || 'No client specified'}
                                </p>
                                <p className="text-slate-400 text-xs mt-1">
                                  {formatDate(session.updatedAt)}
                                </p>
                              </div>
                              
                              {/* Divisor */}
                              <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent mb-4"></div>
                              
                              {/* Tag Cloud */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                {tags.length > 0 ? (
                                  tags.map((tag) => {
                                    const tagColors: Record<string, string> = {
                                      'Structure': 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300',
                                      'Visuals': 'bg-blue-500/20 border-blue-400/30 text-blue-300',
                                      'Solution': 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300',
                                      'Work': 'bg-slate-500/20 border-slate-400/30 text-slate-300',
                                      'Effort': 'bg-gray-500/20 border-gray-400/30 text-gray-300'
                                    }
                                    return (
                                      <span 
                                        key={tag}
                                        className={`px-3 py-1 ${tagColors[tag] || 'bg-slate-500/20 border-slate-400/30 text-slate-300'} text-xs font-medium rounded-full backdrop-blur-sm`}
                                      >
                                        {tag}
                                      </span>
                                    )
                                  })
                                ) : (
                                  <span className="px-3 py-1 bg-yellow-500/10 border border-yellow-400/20 text-yellow-400/70 text-xs font-medium rounded-full backdrop-blur-sm">
                                    No Content
                                  </span>
                                )}
                              </div>
                              
                              {/* Divisor */}
                              <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent mb-4"></div>
                              
                              {/* Push Button */}
                              <div className="flex justify-end">
                                <button 
                                  onClick={() => handlePushSession(session)}
                                  className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600/60 to-blue-600/60 hover:from-slate-500/70 hover:to-blue-500/70 border border-slate-500/50 hover:border-slate-400/60 text-white text-sm font-medium rounded-lg backdrop-blur-sm transition-all duration-200 hover:shadow-lg"
                                >
                                  Push
                                  <ArrowRight className="h-3 w-3" />
                                </button>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </TabsContent>

              {/* Backdrop Tab Content */}
              <TabsContent value="backdrop" className="mt-0">
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-white">Backdrop</h3>
                  <div className="text-nexa-muted">
                    <p>Backdrop configuration and settings will be available here.</p>
                    <p>This tab will handle grid backdrop and visual settings.</p>
                  </div>
                </div>
              </TabsContent>
              
            </Tabs>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}