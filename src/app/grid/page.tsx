'use client'

import { useState, useEffect, useRef } from 'react'
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
  ArrowRight,
  Search,
  Filter,
  Tag,
  X,
  Settings,
  Layers,
  Palette,
  Lightbulb,
  Plus,
  Minus,
  Workflow,
  FileText,
  Calculator,
  ChevronDown,
  ChevronUp,
  MessageCircle,
  Send,
  Users,
  Upload,
  Image,
  Shield,
  UserPlus,
  UserMinus,
  Edit,
  Trash2,
  Crown,
  Key,
  Lock,
  Unlock,
  Mail,
  Calendar,
  MoreHorizontal,
  CheckCircle,
  XCircle
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
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFixedTags, setSelectedFixedTags] = useState<string[]>([])
  const [selectedCustomTags, setSelectedCustomTags] = useState<string[]>([])
  
  // Fixed tag options
  const fixedTagOptions = ['Structure', 'Visuals', 'Solution', 'Work', 'Effort']
  const customTagOptions = ['High Priority', 'Review Needed', 'Draft', 'Approved', 'Client Feedback'] // Mock custom tags
  
  // Backdrop state
  const [backdropStage, setBackdropStage] = useState<'structuring' | 'visuals' | 'solutioning'>('structuring')
  const [backdropData, setBackdropData] = useState({
    general: '',
    structuring: {
      activeTab: 'diagnose',
      diagnose: '',
      echo: '',
      traceback: '',
      solution: ''
    },
    visuals: {
      activeTab: 'ideation',
      ideation: '',
      planning: '',
      sketching: ''
    },
    solutioning: {
      activeTab: 'structure',
      structure: '',
      analysis: '',
      stack: '',
      enhance: '',
      formatting: ''
    },
    pushing: {
      structuringToVisuals: '',
      visualsToSolutioning: '',
      solutioningToSOW: '',
      sowToLOE: ''
    }
  })
  
  // Collapsible sections state
  const [expandedSections, setExpandedSections] = useState({
    general: true,
    stageSpecific: true,
    pushing: true
  })
  
  // Chat state
  const [chatInput, setChatInput] = useState('')
  const [chatMessages, setChatMessages] = useState<Array<{id: string, text: string, timestamp: Date}>>([])
  const chatMessagesRef = useRef<HTMLDivElement>(null)
  
  // Logo upload state
  const [mainLogo, setMainLogo] = useState<File | null>(null)
  const [secondLogo, setSecondLogo] = useState<File | null>(null)
  
  
  
  // Toggle section expansion
  const toggleSection = (section: keyof typeof expandedSections) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }))
  }
  
  // Handle logo upload
  const handleLogoUpload = (file: File, type: 'main' | 'second') => {
    if (type === 'main') {
      setMainLogo(file)
    } else {
      setSecondLogo(file)
    }
  }
  
  // Backdrop tab definitions
  const backdropTabs = {
    structuring: [
      { id: 'diagnose', label: 'Diagnose', description: 'Problem identification approach' },
      { id: 'echo', label: 'Echo', description: 'Context understanding method' },
      { id: 'traceback', label: 'Traceback', description: 'Root cause analysis style' },
      { id: 'solution', label: 'Solution', description: 'Solution development approach' }
    ],
    visuals: [
      { id: 'ideation', label: 'Ideation', description: 'Creative brainstorming method' },
      { id: 'planning', label: 'Planning', description: 'Visual planning approach' },
      { id: 'sketching', label: 'Sketching', description: 'Diagram creation style' }
    ],
    solutioning: [
      { id: 'structure', label: 'Structure', description: 'Solution structuring method' },
      { id: 'analysis', label: 'Analysis', description: 'Technical analysis approach' },
      { id: 'stack', label: 'Stack', description: 'Technology stack preferences' },
      { id: 'enhance', label: 'Enhance', description: 'Content enhancement style' },
      { id: 'formatting', label: 'Formatting', description: 'Document formatting preferences' }
    ]
  }
  
  // Fetch sessions on component mount
  useEffect(() => {
    fetchSessions()
  }, [])

  // Auto-scroll chat to bottom when new messages are added
  useEffect(() => {
    if (chatMessagesRef.current && chatMessages.length > 0) {
      chatMessagesRef.current.scrollTop = chatMessagesRef.current.scrollHeight
    }
  }, [chatMessages])

  // Keyboard shortcuts for grid tabs
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const activeElement = document.activeElement
      const isInputFocused = activeElement && (
        activeElement.tagName === 'INPUT' ||
        activeElement.tagName === 'TEXTAREA' ||
        activeElement.tagName === 'SELECT' ||
        activeElement.hasAttribute('contenteditable')
      )
      
      if (isInputFocused) return // Don't trigger shortcuts when typing
      
      // Grid tab shortcuts
      const tabMap: { [key: string]: string } = {
        '1': 'command',
        '2': 'sessions',
        '3': 'backdrop', 
        '4': 'access'
      }
      
      if (tabMap[event.key]) {
        event.preventDefault()
        setActiveTab(tabMap[event.key])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])
  
  const fetchSessions = async () => {
    try {
      setLoading(true)
      setError(null)
      
      console.log('🔄 Grid: Fetching user sessions (limit: 12)...')
      const response = await fetch('/api/sessions?limit=12')
      const result = await response.json()
      
      if (result.success) {
        console.log(`✅ Grid: Loaded ${result.sessions.length} sessions`)
        setSessions(result.sessions.slice(0, 12)) // Extra safety to ensure max 12 items
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
  
  // Navigate to session via tag click
  const handleTagClick = (session: SessionSummary, tagType: string) => {
    console.log(`🏷️ Grid: Tag "${tagType}" clicked for session ${session.uuid}`)
    
    // Map tag types to routes - navigate to the specific tool page
    const tagRoutes: { [key: string]: string } = {
      'Structure': '/structuring',
      'Visuals': '/visuals',
      'Solution': '/solutioning', 
      'Work': '/sow',
      'Effort': '/loe'
    }
    
    const targetRoute = tagRoutes[tagType] || `/solutioning` // Default fallback
    router.push(`${targetRoute}?session=${session.uuid}`)
  }
  
  // Get tags based on actual content availability
  const getSessionTags = (session: SessionSummary) => {
    const availableTags: string[] = []
    
    // Debug logging for content availability
    console.log(`🏷️ Grid: Checking content for session "${session.title || 'Untitled'}" (${session.sessionType}):`, {
      structure: session.hasStructure || session.availableContent?.structure,
      visuals: session.hasVisuals || session.availableContent?.visuals,
      solution: session.hasSolution || session.availableContent?.solution,
      work: session.hasWork || session.availableContent?.work,
      effort: session.hasEffort || session.availableContent?.effort
    })
    
    // Check each content type and add tag if content exists
    if (session.hasStructure || session.availableContent?.structure) {
      availableTags.push('Structure')
    }
    if (session.hasVisuals || session.availableContent?.visuals) {
      availableTags.push('Visuals')
    }
    if (session.hasSolution || session.availableContent?.solution) {
      availableTags.push('Solution')
    }
    if (session.hasWork || session.availableContent?.work) {
      availableTags.push('Work')
    }
    if (session.hasEffort || session.availableContent?.effort) {
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
  
  // Backdrop data handlers
  const updateBackdropGeneral = (value: string) => {
    setBackdropData(prev => ({ ...prev, general: value }))
  }
  
  const updateBackdropStageData = (stage: 'structuring' | 'visuals' | 'solutioning', field: string, value: string) => {
    setBackdropData(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        [field]: value
      }
    }))
  }
  
  const updateBackdropPushingData = (field: string, value: string) => {
    setBackdropData(prev => ({
      ...prev,
      pushing: {
        ...prev.pushing,
        [field]: value
      }
    }))
  }
  
  const setBackdropActiveTab = (stage: 'structuring' | 'visuals' | 'solutioning', tabId: string) => {
    setBackdropData(prev => ({
      ...prev,
      [stage]: {
        ...prev[stage],
        activeTab: tabId
      }
    }))
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
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Terminal className="h-6 w-6 text-white" />
                    <h3 className="text-lg font-semibold text-white">Command Center</h3>
                  </div>
                  
                  {/* NEXA's Comms Chat Interface */}
                  <div className="backdrop-blur-md bg-gradient-to-br from-slate-900/40 to-blue-900/20 border border-slate-700/50 rounded-xl p-6">
                    <div className="flex items-center justify-between mb-6">
                      <div className="flex items-center gap-3">
                        <MessageCircle className="h-5 w-5 text-white" />
                        <h4 className="text-md font-medium text-white">NEXA's Comms</h4>
                      </div>
                      <button
                        onClick={() => router.push('/profile')}
                        className="flex items-center gap-2 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 hover:border-white/20 text-white text-sm rounded-lg transition-all duration-200"
                      >
                        Settings
                        <ArrowRight className="h-3 w-3" />
                      </button>
                    </div>
                    
                    {/* Chat Messages */}
                    <div 
                      ref={chatMessagesRef}
                      className="space-y-3 mb-4 max-h-[32rem] overflow-y-auto"
                    >
                      {chatMessages.length === 0 ? (
                        <div className="text-center text-nexa-muted py-16">
                          <p className="text-sm">NEXA's communication interface for quick commands and interactions</p>
                          <p className="text-xs mt-1">Start typing below to begin...</p>
                        </div>
                      ) : (
                        chatMessages.map(message => (
                          <div key={message.id} className="bg-white/5 border border-white/10 rounded-lg p-3">
                            <p className="text-white text-sm">{message.text}</p>
                            <p className="text-nexa-muted text-xs mt-1">
                              {message.timestamp.toLocaleTimeString()}
                            </p>
                          </div>
                        ))
                      )}
                    </div>

                    {/* Chat Input */}
                    <div className="flex gap-2">
                      <input
                        type="text"
                        value={chatInput}
                        onChange={(e) => setChatInput(e.target.value)}
                        placeholder="Type a command or message..."
                        className="flex-1 p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                        onKeyPress={(e) => {
                          if (e.key === 'Enter' && chatInput.trim()) {
                            setChatMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              text: chatInput,
                              timestamp: new Date()
                            }])
                            setChatInput('')
                          }
                        }}
                      />
                      <button
                        onClick={() => {
                          if (chatInput.trim()) {
                            setChatMessages(prev => [...prev, {
                              id: Date.now().toString(),
                              text: chatInput,
                              timestamp: new Date()
                            }])
                            setChatInput('')
                          }
                        }}
                        className="px-4 py-3 backdrop-blur-md bg-gradient-to-br from-slate-600/60 to-blue-600/60 hover:from-slate-500/70 hover:to-blue-500/70 border border-slate-500/50 hover:border-slate-400/60 text-white rounded-lg transition-all duration-200"
                      >
                        <Send className="h-4 w-4" />
                      </button>
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Sessions Tab Content */}
              <TabsContent value="sessions" className="mt-0">
                <div className="space-y-6">
                  <h3 className="text-lg font-semibold text-white">Sessions</h3>
                  
                  {/* Search & Filter Controls */}
                  <div className="space-y-4">
                    {/* Search Bar */}
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-nexa-muted" />
                      <input
                        type="text"
                        placeholder="Search sessions by title, client, or content..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all"
                      />
                      {searchQuery && (
                        <button
                          onClick={() => setSearchQuery('')}
                          className="absolute right-3 top-1/2 transform -translate-y-1/2 text-nexa-muted hover:text-white transition-colors"
                        >
                          <X className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {/* Filter Row */}
                    <div className="flex flex-wrap gap-4">
                      {/* Fixed Tags Filter */}
                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-2 mb-2">
                          <Filter className="h-4 w-4 text-nexa-muted" />
                          <span className="text-sm font-medium text-white">Content Type</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {fixedTagOptions.map(tag => (
                            <button
                              key={tag}
                              onClick={() => {
                                setSelectedFixedTags(prev => 
                                  prev.includes(tag) 
                                    ? prev.filter(t => t !== tag)
                                    : [...prev, tag]
                                )
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                                selectedFixedTags.includes(tag)
                                  ? 'bg-blue-500/20 border-blue-400/50 text-blue-300'
                                  : 'bg-white/5 border-white/20 text-nexa-muted hover:border-white/40 hover:text-white'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Custom Tags Filter */}
                      <div className="flex-1 min-w-[250px]">
                        <div className="flex items-center gap-2 mb-2">
                          <Tag className="h-4 w-4 text-nexa-muted" />
                          <span className="text-sm font-medium text-white">Custom Tags</span>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          {customTagOptions.map(tag => (
                            <button
                              key={tag}
                              onClick={() => {
                                setSelectedCustomTags(prev => 
                                  prev.includes(tag) 
                                    ? prev.filter(t => t !== tag)
                                    : [...prev, tag]
                                )
                              }}
                              className={`px-3 py-1 text-xs font-medium rounded-full border transition-all ${
                                selectedCustomTags.includes(tag)
                                  ? 'bg-purple-500/20 border-purple-400/50 text-purple-300'
                                  : 'bg-white/5 border-white/20 text-nexa-muted hover:border-white/40 hover:text-white'
                              }`}
                            >
                              {tag}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    {/* Active Filters Summary */}
                    {(selectedFixedTags.length > 0 || selectedCustomTags.length > 0 || searchQuery) && (
                      <div className="flex items-center gap-2 text-sm">
                        <span className="text-nexa-muted">Active filters:</span>
                        {searchQuery && (
                          <span className="px-2 py-1 bg-blue-500/10 border border-blue-400/30 text-blue-300 rounded">
                            Search: "{searchQuery}"
                          </span>
                        )}
                        {selectedFixedTags.length > 0 && (
                          <span className="px-2 py-1 bg-blue-500/10 border border-blue-400/30 text-blue-300 rounded">
                            {selectedFixedTags.length} content type{selectedFixedTags.length > 1 ? 's' : ''}
                          </span>
                        )}
                        {selectedCustomTags.length > 0 && (
                          <span className="px-2 py-1 bg-purple-500/10 border border-purple-400/30 text-purple-300 rounded">
                            {selectedCustomTags.length} custom tag{selectedCustomTags.length > 1 ? 's' : ''}
                          </span>
                        )}
                        <button
                          onClick={() => {
                            setSearchQuery('')
                            setSelectedFixedTags([])
                            setSelectedCustomTags([])
                          }}
                          className="text-nexa-muted hover:text-white transition-colors"
                        >
                          Clear all
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Sessions Grid */}
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <h4 className="text-md font-medium text-white">Recent Sessions</h4>
                      {!loading && (
                        <p className="text-sm text-nexa-muted">
                          {sessions.length} session{sessions.length !== 1 ? 's' : ''} {sessions.length === 12 ? '(latest 12)' : 'found'}
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
                              {/* Access Level Indicator */}
                              <div className="absolute top-4 right-4 flex items-center gap-2">
                                {session.isCreator && (
                                  <div className="flex items-center gap-1 px-2 py-1 bg-yellow-500/20 border border-yellow-400/30 text-yellow-300 text-xs font-medium rounded-full backdrop-blur-sm" title="You created this session">
                                    <Crown className="h-3 w-3" />
                                    <span>Creator</span>
                                  </div>
                                )}
                              </div>

                              {/* Title & Client */}
                              <div className="mb-4 pr-20">
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
                              
                              {/* Tag Cloud - Clickable */}
                              <div className="flex flex-wrap gap-2 mb-4">
                                {tags.length > 0 ? (
                                  tags.map((tag) => {
                                    const tagColors: Record<string, string> = {
                                      'Structure': 'bg-cyan-500/20 border-cyan-400/30 text-cyan-300 hover:bg-cyan-500/30 hover:border-cyan-400/50',
                                      'Visuals': 'bg-blue-500/20 border-blue-400/30 text-blue-300 hover:bg-blue-500/30 hover:border-blue-400/50',
                                      'Solution': 'bg-indigo-500/20 border-indigo-400/30 text-indigo-300 hover:bg-indigo-500/30 hover:border-indigo-400/50',
                                      'Work': 'bg-slate-500/20 border-slate-400/30 text-slate-300 hover:bg-slate-500/30 hover:border-slate-400/50',
                                      'Effort': 'bg-gray-500/20 border-gray-400/30 text-gray-300 hover:bg-gray-500/30 hover:border-gray-400/50'
                                    }
                                    return (
                                      <button 
                                        key={tag}
                                        onClick={(e) => {
                                          e.stopPropagation() // Prevent card click
                                          handleTagClick(session, tag)
                                        }}
                                        className={`px-3 py-1 border ${tagColors[tag] || 'bg-slate-500/20 border-slate-400/30 text-slate-300 hover:bg-slate-500/30 hover:border-slate-400/50'} text-xs font-medium rounded-full backdrop-blur-sm transition-all duration-200 cursor-pointer`}
                                        title={`Go to ${tag} page for this session`}
                                      >
                                        {tag}
                                      </button>
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
                <div className="space-y-6">
                  <div className="flex items-center gap-3">
                    <Settings className="h-6 w-6 text-white" />
                  <h3 className="text-lg font-semibold text-white">Backdrop</h3>
                  </div>
                  
                  {/* Logo Upload Section */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                    {/* Main Logo Upload */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Image className="h-5 w-5 text-white" />
                        <h4 className="text-md font-medium text-white">Main Logo</h4>
                      </div>
                      <div className="relative backdrop-blur-md bg-gradient-to-br from-slate-900/40 to-blue-900/20 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/60 transition-all duration-300">
                        <input
                          type="file"
                          id="main-logo"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleLogoUpload(file, 'main')
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="text-center space-y-3">
                          {mainLogo ? (
                            <div>
                              <Image className="h-8 w-8 text-green-400 mx-auto mb-2" />
                              <p className="text-sm text-white font-medium">{mainLogo.name}</p>
                              <p className="text-xs text-nexa-muted">Click to change</p>
                            </div>
                          ) : (
                            <div>
                              <Upload className="h-8 w-8 text-nexa-muted mx-auto mb-2" />
                              <p className="text-sm text-white">Upload Main Logo</p>
                              <p className="text-xs text-nexa-muted">Click or drag to upload</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Second Logo Upload */}
                    <div className="space-y-3">
                      <div className="flex items-center gap-2">
                        <Image className="h-5 w-5 text-white" />
                        <h4 className="text-md font-medium text-white">Second Logo</h4>
                      </div>
                      <div className="relative backdrop-blur-md bg-gradient-to-br from-slate-900/40 to-blue-900/20 border border-slate-700/50 rounded-xl p-6 hover:border-slate-600/60 transition-all duration-300">
                        <input
                          type="file"
                          id="second-logo"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0]
                            if (file) handleLogoUpload(file, 'second')
                          }}
                          className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                        />
                        <div className="text-center space-y-3">
                          {secondLogo ? (
                            <div>
                              <Image className="h-8 w-8 text-green-400 mx-auto mb-2" />
                              <p className="text-sm text-white font-medium">{secondLogo.name}</p>
                              <p className="text-xs text-nexa-muted">Click to change</p>
                            </div>
                          ) : (
                            <div>
                              <Upload className="h-8 w-8 text-nexa-muted mx-auto mb-2" />
                              <p className="text-sm text-white">Upload Second Logo</p>
                              <p className="text-xs text-nexa-muted">Click or drag to upload</p>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Divider */}
                  <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent"></div>
                  
                  {/* General Approach Section */}
                  <div className="backdrop-blur-md bg-black border border-slate-700/50 rounded-xl">
                    <button
                      onClick={() => toggleSection('general')}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Lightbulb className="h-5 w-5 text-white" />
                        <h4 className="text-md font-medium text-white">General Approach</h4>
                      </div>
                      {expandedSections.general ? 
                        <ChevronUp className="h-5 w-5 text-nexa-muted" /> : 
                        <ChevronDown className="h-5 w-5 text-nexa-muted" />
                      }
                    </button>
                    {expandedSections.general && (
                      <div className="px-4 pb-4">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent mb-4"></div>
                        <textarea
                          value={backdropData.general}
                          onChange={(e) => updateBackdropGeneral(e.target.value)}
                          placeholder="Define your overall methodology and principles that will guide all workflows..."
                          rows={6}
                          className="w-full p-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all resize-none"
                        />
                      </div>
                    )}
                  </div>

                  {/* Stage-Specific Preferences Section */}
                  <div className="backdrop-blur-md bg-black border border-slate-700/50 rounded-xl">
                    <button
                      onClick={() => toggleSection('stageSpecific')}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Settings className="h-5 w-5 text-white" />
                        <h4 className="text-md font-medium text-white">Stage-Specific Preferences</h4>
                      </div>
                      {expandedSections.stageSpecific ? 
                        <ChevronUp className="h-5 w-5 text-nexa-muted" /> : 
                        <ChevronDown className="h-5 w-5 text-nexa-muted" />
                      }
                    </button>
                    {expandedSections.stageSpecific && (
                      <div className="px-4 pb-4">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent mb-4"></div>
                        
                        {/* Stage Toggle */}
                        <div className="flex items-center gap-3 mb-6">
                          {[
                            { id: 'structuring', label: 'Structuring', icon: Layers },
                            { id: 'visuals', label: 'Visuals', icon: Palette },
                            { id: 'solutioning', label: 'Solutioning', icon: Lightbulb }
                          ].map(stage => {
                            const Icon = stage.icon
                            const isActive = backdropStage === stage.id
                            return (
                              <button
                                key={stage.id}
                                onClick={() => setBackdropStage(stage.id as any)}
                                className={`group backdrop-blur-md bg-gradient-to-br border border-slate-700/50 rounded-lg px-3 py-1.5 hover:border-slate-600/60 transition-all duration-300 shadow-md hover:shadow-lg ${
                                  isActive 
                                    ? 'from-slate-600/60 to-blue-600/60 border-blue-500/50 text-white font-medium' 
                                    : 'from-slate-900/40 to-blue-900/20 text-nexa-muted hover:text-white hover:from-slate-800/50 hover:to-blue-800/30'
                                }`}
                              >
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4" />
                                  <span className="text-sm">{stage.label}</span>
                                </div>
                              </button>
                            )
                          })}
                        </div>

                        {/* Tab Navigation */}
                        <div className="border-b border-white/10 mb-4">
                          <div className="flex space-x-1 -mb-px">
                            {backdropTabs[backdropStage].map(tab => {
                              const isActive = backdropData[backdropStage].activeTab === tab.id
                              return (
                                <button
                                  key={tab.id}
                                  onClick={() => setBackdropActiveTab(backdropStage, tab.id)}
                                  className={`px-4 py-2 text-sm font-medium border-b-2 transition-colors ${
                                    isActive
                                      ? 'border-white text-white'
                                      : 'border-transparent text-nexa-muted hover:text-white hover:border-white/30'
                                  }`}
                                >
                                  {tab.label}
                                </button>
                              )
                            })}
                          </div>
                        </div>

                        {/* Tab Content */}
                        <div>
                          {backdropTabs[backdropStage].map(tab => {
                            const isActive = backdropData[backdropStage].activeTab === tab.id
                            if (!isActive) return null
                            
                            return (
                              <div key={tab.id}>
                                <textarea
                                  value={backdropData[backdropStage][tab.id as keyof typeof backdropData[typeof backdropStage]] as string}
                                  onChange={(e) => updateBackdropStageData(backdropStage, tab.id, e.target.value)}
                                  placeholder={`Define your ${tab.label.toLowerCase()} approach, preferred tools, techniques, or specific considerations...`}
                                  rows={6}
                                  className="w-full p-4 bg-white/5 border border-white/10 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all resize-none"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Pushing Preferences Section */}
                  <div className="backdrop-blur-md bg-black border border-slate-700/50 rounded-xl">
                    <button
                      onClick={() => toggleSection('pushing')}
                      className="w-full flex items-center justify-between p-4 text-left"
                    >
                      <div className="flex items-center gap-3">
                        <Workflow className="h-5 w-5 text-white" />
                        <h4 className="text-md font-medium text-white">Pushing Preferences</h4>
                      </div>
                      {expandedSections.pushing ? 
                        <ChevronUp className="h-5 w-5 text-nexa-muted" /> : 
                        <ChevronDown className="h-5 w-5 text-nexa-muted" />
                      }
                    </button>
                    {expandedSections.pushing && (
                      <div className="px-4 pb-4">
                        <div className="w-full h-px bg-gradient-to-r from-transparent via-slate-500/50 to-transparent mb-4"></div>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {[
                            { 
                              id: 'structuringToVisuals', 
                              label: 'Structuring to Visuals', 
                              icon: ArrowRight,
                              description: 'Transform structured data into visual concepts'
                            },
                            { 
                              id: 'visualsToSolutioning', 
                              label: 'Visuals to Solutioning', 
                              icon: ArrowRight,
                              description: 'Evolve visual concepts into technical solutions'
                            },
                            { 
                              id: 'solutioningToSOW', 
                              label: 'Solutioning to SOW', 
                              icon: ArrowRight,
                              description: 'Translate solutions into work statements'
                            },
                            { 
                              id: 'sowToLOE', 
                              label: 'SOW to LOE', 
                              icon: ArrowRight,
                              description: 'Convert work statements into effort estimates'
                            }
                          ].map(push => {
                            const Icon = push.icon
                            return (
                              <div key={push.id} className="space-y-3">
                                <div className="flex items-center gap-2">
                                  <Icon className="h-4 w-4 text-nexa-muted" />
                                  <h5 className="text-sm font-medium text-white">{push.label}</h5>
                                </div>
                                <textarea
                                  value={backdropData.pushing[push.id as keyof typeof backdropData.pushing]}
                                  onChange={(e) => updateBackdropPushingData(push.id, e.target.value)}
                                  placeholder={`${push.description}. Define transformation rules, key data points to preserve, and quality criteria...`}
                                  rows={4}
                                  className="w-full p-3 bg-white/5 border border-white/10 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-white/30 focus:ring-1 focus:ring-white/20 transition-all resize-none text-sm"
                                />
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
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