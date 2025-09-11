'use client'

import { useEffect, useState, useCallback } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Download,
  Save,
  Database,
  RotateCw,
  Info,
  Calculator,
  Users,
  Lightbulb,
  BarChart3
} from 'lucide-react'
import type { AuthUser } from '@/types'
import type { LOESessionData } from '@/lib/sessions'
import { createDefaultLOEData } from '@/lib/sessions'

interface Workstream {
  id: number
  workstream: string
  activities: string
  duration: number
}

interface Resource {
  id: number
  role: string
  personWeeks: number
  personHours: number
}

interface Assumption {
  id: number
  text: string
}

interface GoodOption {
  id: number
  feature: string
  hours: number
  weeks: number
}

interface BestOption {
  id: number
  feature: string
  hours: number
  weeks: number
}

export default function LOEPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Tab state - matching structuring/visuals/solutioning/sow pattern
  const [activeMainTab, setActiveMainTab] = useState('info')
  
  // LOE Data State - using the proper interface
  const [loeData, setLOEData] = useState<LOESessionData>(createDefaultLOEData())

  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    previewing: false,
    generating: false,
    saving: false,
    deleting: false
  })
  const [saving, setSaving] = useState(false)
  
  // Save state management (following SOW pattern)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [sessionId, setSessionId] = useState<string | null>(null)

  // Load session from URL on mount
  useEffect(() => {
    const loadSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionParam = urlParams.get('session')
      
      if (sessionParam) {
        console.log(`🔄 Loading LOE session from URL: ${sessionParam}`)
        
        try {
          const response = await fetch(`/api/sessions/${sessionParam}?type=loe`)
          const result = await response.json()
          
          if (result.success && result.session?.data) {
            console.log('✅ LOE Session data loaded from URL')
            setSessionId(sessionParam)
            const loadedData = result.session.data
            console.log('🔍 Raw LOE data structure:', JSON.stringify(loadedData, null, 2))
            
            // Ensure the data has the correct structure
            const validatedData = {
              ...createDefaultLOEData(),
              ...loadedData,
              info: {
                ...createDefaultLOEData().info,
                ...(loadedData.info || {})
              },
              workstreams: {
                ...createDefaultLOEData().workstreams,
                ...(loadedData.workstreams || {})
              },
              resources: {
                ...createDefaultLOEData().resources,
                ...(loadedData.resources || {})
              },
              assumptions: {
                ...createDefaultLOEData().assumptions,
                ...(loadedData.assumptions || {})
              },
              variations: {
                ...createDefaultLOEData().variations,
                ...(loadedData.variations || {})
              }
            }
            
            console.log('✅ Validated LOE data structure')
            console.log(`   - Project: ${validatedData.info?.project || 'Untitled'}`)
            console.log(`   - Workstreams: ${validatedData.workstreams?.workstreams?.length || 0}`)
            console.log(`   - Resources: ${validatedData.resources?.resources?.length || 0}`)
            
            setLOEData(validatedData)
            setHasUnsavedChanges(false)
            setLastSaved(new Date(validatedData.lastSaved))
            console.log(`✅ LOE Session loaded: "${validatedData.info?.project || 'Untitled'}"`)
          } else {
            console.log('❌ Failed to load LOE session:', result.error)
            // Remove invalid session from URL
            window.history.replaceState({}, '', '/loe')
          }
        } catch (error) {
          console.error('💥 Error loading LOE session:', error)
          window.history.replaceState({}, '', '/loe')
        }
      }
    }

    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (data.success) {
          setUser(data.user)
          // Load session after user is authenticated
          await loadSession()
        } else {
          // Redirect to login if not authenticated
          window.location.href = '/auth/login'
        }
      } catch (error) {
        console.error('Error fetching user:', error)
        window.location.href = '/auth/login'
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  // Collect current data function (following SOW pattern)
  const collectCurrentData = useCallback(() => {
    return {
      info: loeData.info,
      workstreams: loeData.workstreams,
      resources: loeData.resources,
      assumptions: loeData.assumptions,
      variations: loeData.variations,
      lastSaved: new Date().toISOString(),
      version: (loeData.version || 0) + 1
    }
  }, [loeData])

  // Track changes to set hasUnsavedChanges (following SOW pattern)
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [loeData])

  // Auto-save functionality (following SOW pattern)
  useEffect(() => {
    if (!sessionId || saving || !hasUnsavedChanges) return
    
    const autoSaveTimer = setTimeout(async () => {
      try {
        const currentData = collectCurrentData()
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: currentData,
            sessionType: 'loe'
          })
        })
        
        const result = await response.json()
        if (result.success) {
          setHasUnsavedChanges(false)
          setLastSaved(new Date())
          console.log('✅ LOE auto-save completed')
        }
      } catch (error) {
        console.error('❌ LOE auto-save failed:', error)
      }
    }, 3000) // 3-second debounce
    
    return () => clearTimeout(autoSaveTimer)
  }, [sessionId, saving, hasUnsavedChanges, collectCurrentData])

  // Navigation functions - matching pattern from other pages
  const handleNext = () => {
    const tabOrder = ['info', 'workstreams', 'resources', 'assumptions', 'variations']
    const currentIndex = tabOrder.indexOf(activeMainTab)
    if (currentIndex < tabOrder.length - 1) {
      setActiveMainTab(tabOrder[currentIndex + 1])
    }
  }

  const handlePrevious = () => {
    const tabOrder = ['info', 'workstreams', 'resources', 'assumptions', 'variations']
    const currentIndex = tabOrder.indexOf(activeMainTab)
    if (currentIndex > 0) {
      setActiveMainTab(tabOrder[currentIndex - 1])
    }
  }

  // Calculation helpers
  const weeksToHours = (weeks: number) => Math.round(weeks * 20)
  const hoursToWeeks = (hours: number) => Math.round((hours / 20) * 2) / 2 // Round to nearest 0.5

  // Workstream functions
  const addWorkstream = () => {
    const newId = Math.max(...loeData.workstreams.workstreams.map(ws => ws.id)) + 1
    setLOEData(prev => ({
      ...prev,
      workstreams: {
        ...prev.workstreams,
        workstreams: [...prev.workstreams.workstreams, { id: newId, workstream: '', activities: '', duration: 2 }]
      }
    }))
  }

  const removeWorkstream = (id: number) => {
    if (loeData.workstreams.workstreams.length === 1) return
    setLOEData(prev => ({
      ...prev,
      workstreams: {
        ...prev.workstreams,
        workstreams: prev.workstreams.workstreams.filter(ws => ws.id !== id)
      }
    }))
  }

  const updateWorkstream = (id: number, field: keyof Workstream, value: string | number) => {
    setLOEData(prev => ({
      ...prev,
      workstreams: {
        ...prev.workstreams,
        workstreams: prev.workstreams.workstreams.map(ws => 
        ws.id === id ? { ...ws, [field]: value } : ws
      )
      }
    }))
  }

  // Resource functions
  const addResource = () => {
    const newId = Math.max(...loeData.resources.resources.map(res => res.id)) + 1
    setLOEData(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        resources: [...prev.resources.resources, { id: newId, role: '', personWeeks: 1.0, personHours: 20 }]
      }
    }))
  }

  const removeResource = (id: number) => {
    if (loeData.resources.resources.length === 1) return
    setLOEData(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        resources: prev.resources.resources.filter(res => res.id !== id)
      }
    }))
  }

  const updateResource = (id: number, field: keyof Resource, value: string | number) => {
    setLOEData(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
        resources: prev.resources.resources.map(res => {
        if (res.id === id) {
          const updated = { ...res, [field]: value }
          // Auto-calculate the other field
          if (field === 'personWeeks') {
            updated.personHours = weeksToHours(Number(value))
          } else if (field === 'personHours') {
            updated.personWeeks = hoursToWeeks(Number(value))
          }
          return updated
        }
        return res
      })
      }
    }))
  }

  // Buffer functions
  const updateBuffer = (field: 'weeks' | 'hours', value: number) => {
    setLOEData(prev => ({
      ...prev,
      resources: {
        ...prev.resources,
      buffer: {
        weeks: field === 'weeks' ? value : hoursToWeeks(value),
        hours: field === 'hours' ? value : weeksToHours(value)
        }
      }
    }))
  }

  // Assumption functions
  const addAssumption = () => {
    const newId = Math.max(...loeData.assumptions.assumptions.map(ass => ass.id)) + 1
    setLOEData(prev => ({
      ...prev,
      assumptions: {
        ...prev.assumptions,
        assumptions: [...prev.assumptions.assumptions, { id: newId, text: '' }]
      }
    }))
  }

  const removeAssumption = (id: number) => {
    if (loeData.assumptions.assumptions.length === 1) return
    setLOEData(prev => ({
      ...prev,
      assumptions: {
        ...prev.assumptions,
        assumptions: prev.assumptions.assumptions.filter(ass => ass.id !== id)
      }
    }))
  }

  const updateAssumption = (id: number, text: string) => {
    setLOEData(prev => ({
      ...prev,
      assumptions: {
        ...prev.assumptions,
        assumptions: prev.assumptions.assumptions.map(ass => 
        ass.id === id ? { ...ass, text } : ass
      )
      }
    }))
  }

  // Good Option functions
  const addGoodOption = () => {
    const newId = Math.max(...loeData.variations.goodOptions.map(opt => opt.id)) + 1
    setLOEData(prev => ({
      ...prev,
      variations: {
        ...prev.variations,
        goodOptions: [...prev.variations.goodOptions, { id: newId, feature: '', hours: 0, weeks: 0 }]
      }
    }))
  }

  const removeGoodOption = (id: number) => {
    if (loeData.variations.goodOptions.length === 1) return
    setLOEData(prev => ({
      ...prev,
      variations: {
        ...prev.variations,
        goodOptions: prev.variations.goodOptions.filter(opt => opt.id !== id)
      }
    }))
  }

  const updateGoodOption = (id: number, field: keyof GoodOption, value: string | number) => {
    setLOEData(prev => ({
      ...prev,
      variations: {
        ...prev.variations,
        goodOptions: prev.variations.goodOptions.map(opt => {
        if (opt.id === id) {
          const updated = { ...opt, [field]: value }
          if (field === 'weeks') {
            updated.hours = weeksToHours(Number(value))
          } else if (field === 'hours') {
            updated.weeks = hoursToWeeks(Number(value))
          }
          return updated
        }
        return opt
      })
      }
    }))
  }

  // Best Option functions
  const addBestOption = () => {
    const newId = Math.max(...loeData.variations.bestOptions.map(opt => opt.id)) + 1
    setLOEData(prev => ({
      ...prev,
      variations: {
        ...prev.variations,
        bestOptions: [...prev.variations.bestOptions, { id: newId, feature: '', hours: 0, weeks: 0 }]
      }
    }))
  }

  const removeBestOption = (id: number) => {
    if (loeData.variations.bestOptions.length === 1) return
    setLOEData(prev => ({
      ...prev,
      variations: {
        ...prev.variations,
        bestOptions: prev.variations.bestOptions.filter(opt => opt.id !== id)
      }
    }))
  }

  const updateBestOption = (id: number, field: keyof BestOption, value: string | number) => {
    setLOEData(prev => ({
      ...prev,
      variations: {
        ...prev.variations,
        bestOptions: prev.variations.bestOptions.map(opt => {
        if (opt.id === id) {
          const updated = { ...opt, [field]: value }
          if (field === 'weeks') {
            updated.hours = weeksToHours(Number(value))
          } else if (field === 'hours') {
            updated.weeks = hoursToWeeks(Number(value))
          }
          return updated
        }
        return opt
      })
      }
    }))
  }

  // Calculation functions
  const getTotalResourceHours = () => {
    return loeData.resources.resources.reduce((total, res) => total + res.personHours, 0)
  }

  const getTotalResourceWeeks = () => {
    return loeData.resources.resources.reduce((total, res) => total + res.personWeeks, 0)
  }

  const getBufferPercentage = () => {
    const totalHours = getTotalResourceHours()
    return totalHours > 0 ? Math.round((loeData.resources.buffer.hours / totalHours) * 100) : 0
  }

  const getGoodTotalReduction = () => {
    return {
      hours: loeData.variations.goodOptions.reduce((total, opt) => total + opt.hours, 0),
      weeks: loeData.variations.goodOptions.reduce((total, opt) => total + opt.weeks, 0)
    }
  }

  const getBestTotalAddition = () => {
    return {
      hours: loeData.variations.bestOptions.reduce((total, opt) => total + opt.hours, 0),
      weeks: loeData.variations.bestOptions.reduce((total, opt) => total + opt.weeks, 0)
    }
  }

  // Action functions
  const handlePreviewPDF = async () => {
    if (!loeData) return
    
    setLoadingStates(prev => ({ ...prev, previewing: true }))
    
    try {
      console.log('🔍 LOE Preview PDF: Starting preview generation')
      
      const response = await fetch('/api/loe/preview-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loeData })
      })

      if (response.ok) {
        console.log('✅ LOE Preview PDF: Response received successfully')
        const pdfBlob = await response.blob()
        const pdfUrl = URL.createObjectURL(pdfBlob)
        
        // Open PDF in new tab for preview
        const newWindow = window.open(pdfUrl, '_blank')
        if (newWindow) {
          console.log('✅ LOE Preview PDF: PDF opened in new tab')
        } else {
          console.warn('⚠️ LOE Preview PDF: Popup blocked, trying download fallback')
          alert('Please allow popups to preview the PDF, or use the download button instead.')
        }
      } else {
        const errorData = await response.json()
        console.error('❌ LOE Preview PDF: Server error:', errorData)
        alert('Failed to generate PDF preview. Please try again.')
      }
    } catch (error) {
      console.error('❌ LOE Preview PDF: Client error:', error)
      alert('Error generating PDF preview. Please try again.')
    } finally {
      setLoadingStates(prev => ({ ...prev, previewing: false }))
    }
  }

  const handleGeneratePDF = async () => {
    if (!loeData) return
    
    setLoadingStates(prev => ({ ...prev, generating: true }))
    
    try {
      console.log('🔍 LOE Generate PDF: Starting download generation')
      
      const response = await fetch('/api/loe/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ loeData })
      })

      if (response.ok) {
        console.log('✅ LOE Generate PDF: Response received successfully')
        const pdfBlob = await response.blob()
        const url = URL.createObjectURL(pdfBlob)
        
        // Create download link
        const link = document.createElement('a')
        link.href = url
        
        // Generate filename
        const projectName = loeData.info?.project?.replace(/[^a-zA-Z0-9]/g, '_') || 'LOE'
        const currentDate = new Date().toISOString().split('T')[0]
        link.download = `LOE_${projectName}_${currentDate}.pdf`
        
        // Trigger download
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up
        URL.revokeObjectURL(url)
        console.log('✅ LOE Generate PDF: Download completed')
      } else {
        const errorData = await response.json()
        console.error('❌ LOE Generate PDF: Server error:', errorData)
        alert('Failed to generate PDF download. Please try again.')
      }
    } catch (error) {
      console.error('❌ LOE Generate PDF: Client error:', error)
      alert('Error generating PDF download. Please try again.')
    } finally {
      setLoadingStates(prev => ({ ...prev, generating: false }))
    }
  }

  // Save function (following SOW pattern)
  const handleSave = async () => {
    setSaving(true)
    
    try {
      const currentData = collectCurrentData()
      
      if (sessionId) {
        // Update existing session
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            data: currentData,
            sessionType: 'loe'
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setLOEData(currentData as any)
          setHasUnsavedChanges(false)
          setLastSaved(new Date())
          console.log('✅ LOE session updated successfully')
        } else {
          console.error('❌ Failed to save LOE session:', result.error)
          alert(`Failed to save LOE session: ${result.error}`)
        }
      } else {
        // Create new session
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionType: 'loe',
            data: currentData
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setSessionId(result.session.uuid)
          setLOEData(currentData as any)
          setHasUnsavedChanges(false)
          setLastSaved(new Date())
          console.log('✅ New LOE session created successfully:', result.session.uuid)
          
          // Update URL to include session ID
          window.history.replaceState({}, '', `/loe?session=${result.session.uuid}`)
        } else {
          console.error('❌ Failed to create LOE session:', result.error)
          alert(`Failed to create LOE session: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('💥 LOE Save error:', error)
      alert('Error saving LOE session. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!sessionId) {
      window.location.href = '/dashboard'
      return
    }
    
    if (confirm('Are you sure you want to delete this LOE session?')) {
      try {
        console.log(`🗑️ Deleting LOE session: ${sessionId}`)
        
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE'
        })
        
        const result = await response.json()
        
        if (result.success) {
          console.log('✅ LOE session deleted successfully')
        window.location.href = '/dashboard'
        } else {
          console.error('❌ Failed to delete LOE session:', result.error)
          alert(`Failed to delete LOE session: ${result.error}`)
        }
      } catch (error) {
        console.error('💥 Delete LOE session error:', error)
        alert('Error deleting LOE session. Please try again.')
      }
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen nexa-background flex items-center justify-center">
        <div className="text-white">Loading...</div>
      </div>
    )
  }

  return (
    <DashboardLayout 
      currentPage="Level of Effort" 
      user={user ? {
        fullName: user.fullName,
        email: user.email
      } : undefined}
    >
      <div className="nexa-background min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Tab system matching structuring/visuals/solutioning/sow pattern */}
          <Tabs value={activeMainTab} className="w-full" onValueChange={setActiveMainTab}>
            {/* Header row with LoE label and Tabs */}
            <div className="flex items-end justify-between mb-0">
              <div className="flex items-end gap-6">
                {/* LoE label - positioned inline with tabs */}
                <div className="flex items-center gap-2 text-white pb-3 ml-16">
                  <Calculator className="w-4 h-4" />
                  <span>Effort</span>
                </div>

                {/* Tab strip */}
                <TabsList className="mb-0">
                  <TabsTrigger value="info" className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Info
                  </TabsTrigger>
                  <TabsTrigger value="workstreams" className="flex items-center gap-2">
                    <Calculator className="w-4 h-4" />
                    Workstreams
                  </TabsTrigger>
                  <TabsTrigger value="resources" className="flex items-center gap-2">
                    <Users className="w-4 h-4" />
                    Resources
                  </TabsTrigger>
                  <TabsTrigger value="assumptions" className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Assumptions
                  </TabsTrigger>
                  <TabsTrigger value="variations" className="flex items-center gap-2">
                    <BarChart3 className="w-4 h-4" />
                    Variations
                  </TabsTrigger>
                </TabsList>
          </div>

              {/* Action buttons aligned right */}
              <div className="flex">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className={`inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all border-t border-l border-r rounded-t-lg relative focus-visible:outline-none focus-visible:ring-2 mr-1 ${
                    saving
                      ? 'save-button-saving bg-white/10 text-white border-white'
                      : hasUnsavedChanges
                        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 hover:bg-yellow-500/30 focus-visible:ring-yellow-400/20'
                        : 'bg-white/10 text-white border-white hover:bg-white/20 focus-visible:ring-white/20'
                  }`}
                >
                  {saving ? (
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  <span className={saving ? "shimmer-text" : ""}>
                    {hasUnsavedChanges ? 'Save*' : 'Save'}
                  </span>
                </button>
                <button
                  onClick={handleDelete}
                  className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-red-500/10 text-red-500 border-t border-l border-r border-red-600 rounded-t-lg relative hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </div>
            </div>

            {/* Card container - matching structuring/visuals/sow */}
            <Card variant="nexa" className="rounded-tr-none border-t border-nexa-border p-8 mt-0">
              
              {/* Info Tab - Basic Information */}
              <TabsContent value="info" className="mt-0">
                <div className="space-y-6">
                  <h2 className="text-white text-xl font-semibold mb-6">Project Information</h2>
                  
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="project">
                      Project Name *
                    </Label>
                    <Input
                      variant="nexa"
                      id="project"
                      placeholder="Enter project name..."
                        value={loeData.info?.project || ''}
                      onChange={(e) => setLOEData(prev => ({
                        ...prev,
                          info: { ...prev.info, project: e.target.value }
                      }))}
                      required
                    />
                  </div>
                  
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="client">
                      Client *
                    </Label>
                    <Input
                      variant="nexa"
                      id="client"
                      placeholder="Enter client name..."
                        value={loeData.info?.client || ''}
                      onChange={(e) => setLOEData(prev => ({
                        ...prev,
                          info: { ...prev.info, client: e.target.value }
                      }))}
                      required
                    />
                  </div>
                  
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="preparedBy">
                      Prepared By *
                    </Label>
                    <Input
                      variant="nexa"
                      id="preparedBy"
                      placeholder="Enter your name..."
                        value={loeData.info?.preparedBy || ''}
                      onChange={(e) => setLOEData(prev => ({
                        ...prev,
                          info: { ...prev.info, preparedBy: e.target.value }
                      }))}
                      required
                    />
                  </div>
                  
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="date">
                      Date *
                    </Label>
                    <Input
                      variant="nexa"
                      type="date"
                      id="date"
                        value={loeData.info?.date || ''}
                      onChange={(e) => setLOEData(prev => ({
                        ...prev,
                          info: { ...prev.info, date: e.target.value }
                      }))}
                      required
                    />
                  </div>
                </div>
                </div>
              </TabsContent>

              {/* Workstreams Tab - Project Overview and Workstreams */}
              <TabsContent value="workstreams" className="mt-0">
                <div className="space-y-6">
                  <h2 className="text-white text-xl font-semibold mb-6">Project Overview & Workstreams</h2>

                {/* Project Overview Section */}
                <div className="nexa-form-group">
                  <div className="flex items-center gap-2 mb-3">
                    <FileText className="h-5 w-5 text-white" />
                    <Label variant="nexa">Project Overview</Label>
                  </div>
                  <Textarea
                    variant="nexa"
                    rows={6}
                    placeholder="Provide a comprehensive overview of the project, including objectives, scope, and key requirements..."
                      value={loeData.workstreams.overview}
                      onChange={(e) => setLOEData(prev => ({ 
                        ...prev, 
                        workstreams: { ...prev.workstreams, overview: e.target.value }
                      }))}
                    required
                  />
                  <div className="text-nexa-muted text-xs mt-2">
                    Describe the project's purpose, goals, and high-level requirements to help estimate effort accurately.
                  </div>
                </div>

                {/* Workstreams Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label variant="nexa">Workstreams</Label>
                    <Button
                      onClick={addWorkstream}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Workstream
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border border-nexa-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gray-800">
                          <th className="text-white text-left p-3 border-b border-nexa-border" style={{width: '35%'}}>
                            Workstream
                          </th>
                          <th className="text-white text-left p-3 border-b border-nexa-border" style={{width: '45%'}}>
                            Key Activities
                          </th>
                          <th className="text-white text-center p-3 border-b border-nexa-border" style={{width: '15%'}}>
                            Duration (wks)
                          </th>
                          <th className="text-white text-center p-3 border-b border-nexa-border" style={{width: '5%'}}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                          {loeData.workstreams.workstreams.map((workstream, index) => (
                          <tr key={workstream.id} className="border-b border-nexa-border">
                            <td className="p-3">
                              <Input
                                variant="nexa"
                                placeholder="e.g., Requirements Analysis"
                                value={workstream.workstream}
                                onChange={(e) => updateWorkstream(workstream.id, 'workstream', e.target.value)}
                                className="border-0 bg-transparent"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                variant="nexa"
                                placeholder="e.g., Stakeholder interviews, documentation review"
                                value={workstream.activities}
                                onChange={(e) => updateWorkstream(workstream.id, 'activities', e.target.value)}
                                className="border-0 bg-transparent"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                variant="nexa"
                                type="number"
                                min="1"
                                placeholder="2"
                                value={workstream.duration}
                                onChange={(e) => updateWorkstream(workstream.id, 'duration', parseInt(e.target.value) || 1)}
                                className="border-0 bg-transparent text-center"
                              />
                            </td>
                            <td className="p-3 text-center">
                              {index > 0 && (
                                <Button
                                  onClick={() => removeWorkstream(workstream.id)}
                                  variant="outline"
                                  size="sm"
                                  className="h-auto border-red-600 text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
                      </div>
              </TabsContent>

              {/* Resources Tab - Resource Allocation including buffer */}
              <TabsContent value="resources" className="mt-0">
                <div className="space-y-6">
                  <h2 className="text-white text-xl font-semibold mb-6">Resource Allocation Including Buffer</h2>

                {/* Resource Allocation Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label variant="nexa">Resource Allocation</Label>
                    <Button
                      onClick={addResource}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Resource
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border border-nexa-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gray-800">
                          <th className="text-white text-left p-3 border-b border-nexa-border" style={{width: '40%'}}>
                            Role
                          </th>
                          <th className="text-white text-center p-3 border-b border-nexa-border" style={{width: '25%'}}>
                            Person-Weeks
                          </th>
                          <th className="text-white text-center p-3 border-b border-nexa-border" style={{width: '25%'}}>
                            Person-Hours
                          </th>
                          <th className="text-white text-center p-3 border-b border-nexa-border" style={{width: '10%'}}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                          {loeData.resources.resources.map((resource, index) => (
                          <tr key={resource.id} className="border-b border-nexa-border">
                            <td className="p-3">
                              <Input
                                variant="nexa"
                                placeholder="Enter role..."
                                value={resource.role}
                                onChange={(e) => updateResource(resource.id, 'role', e.target.value)}
                                className="border-0 bg-transparent"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                variant="nexa"
                                type="number"
                                step="0.5"
                                min="0"
                                placeholder="0.0"
                                value={resource.personWeeks}
                                onChange={(e) => updateResource(resource.id, 'personWeeks', parseFloat(e.target.value) || 0)}
                                className="border-0 bg-transparent text-center"
                              />
                            </td>
                            <td className="p-3">
                              <Input
                                variant="nexa"
                                type="number"
                                step="10"
                                min="0"
                                placeholder="0"
                                value={resource.personHours}
                                onChange={(e) => updateResource(resource.id, 'personHours', parseInt(e.target.value) || 0)}
                                className="border-0 bg-transparent text-center"
                              />
                            </td>
                            <td className="p-3 text-center">
                              {index > 0 && (
                                <Button
                                  onClick={() => removeResource(resource.id)}
                                  variant="outline"
                                  size="sm"
                                  className="h-auto border-red-600 text-red-500 hover:bg-red-500/10"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              )}
                            </td>
                          </tr>
                        ))}
                        {/* Totals Row */}
                        <tr className="bg-gray-800 font-semibold">
                          <td className="p-3 text-white">Total</td>
                          <td className="p-3 text-white text-center">{getTotalResourceWeeks().toFixed(1)}</td>
                          <td className="p-3 text-white text-center">{getTotalResourceHours()}</td>
                          <td className="p-3"></td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>

                {/* Buffer Section */}
                <div>
                  <Label variant="nexa" className="mb-3 block">Buffer</Label>
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="nexa-form-group">
                      <Label variant="nexa" htmlFor="bufferWeeks">
                        Buffer Weeks
                      </Label>
                      <Input
                        variant="nexa"
                        type="number"
                        step="0.5"
                        min="0"
                        id="bufferWeeks"
                          value={loeData.resources.buffer.weeks}
                        onChange={(e) => updateBuffer('weeks', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="nexa-form-group">
                      <Label variant="nexa" htmlFor="bufferHours">
                        Buffer Hours
                      </Label>
                      <Input
                        variant="nexa"
                        type="number"
                        step="10"
                        min="0"
                        id="bufferHours"
                          value={loeData.resources.buffer.hours}
                        onChange={(e) => updateBuffer('hours', parseInt(e.target.value) || 0)}
                      />
                    </div>
                    
                    <div className="nexa-form-group">
                      <Label variant="nexa">
                        Percentage
                      </Label>
                      <div className="h-10 px-3 py-2 bg-nexa-input border border-nexa-border rounded-lg flex items-center text-white">
                        {getBufferPercentage()}%
                      </div>
                    </div>
                  </div>
                  <div className="text-nexa-muted text-xs mt-2">
                    Add contingency time for unforeseen circumstances (typically 10-20% of total effort)
                  </div>
                </div>
                </div>
              </TabsContent>

              {/* Assumptions Tab */}
              <TabsContent value="assumptions" className="mt-0">
                <div className="space-y-6">
                  <h2 className="text-white text-xl font-semibold mb-6">Assumptions</h2>
                  
                <div>
                  <div className="flex items-center justify-between mb-4">
                      <Label variant="nexa">Project Assumptions</Label>
                    <Button
                      onClick={addAssumption}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Assumption
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                      {loeData.assumptions.assumptions.map((assumption, index) => (
                      <div key={assumption.id} className="flex gap-2">
                        <Textarea
                          variant="nexa"
                          rows={2}
                          placeholder="Enter project assumption..."
                          value={assumption.text}
                          onChange={(e) => updateAssumption(assumption.id, e.target.value)}
                          className="flex-1"
                        />
                        <Button
                          onClick={() => removeAssumption(assumption.id)}
                            disabled={loeData.assumptions.assumptions.length === 1}
                          variant="outline"
                          size="sm"
                          className="h-auto border-red-600 text-red-500 hover:bg-red-500/10"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                  </div>
                </div>
                </div>
              </TabsContent>

              {/* Variations Tab - Good (Lower Effort) Option and Best (Enhanced) Option */}
              <TabsContent value="variations" className="mt-0">
                <div className="space-y-6">
                  <h2 className="text-white text-xl font-semibold mb-6">Good (Lower Effort) Option & Best (Enhanced) Option</h2>
                  
                  {/* PDF Action Buttons */}
                  <div className="flex gap-2 mb-6">
                    <Button
                      onClick={handlePreviewPDF}
                      disabled={loadingStates.previewing}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-blue-900/40 border-blue-600 text-blue-200 hover:bg-blue-800/60"
                      title="Preview PDF"
                    >
                      {loadingStates.previewing ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <FileText className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      onClick={handleGeneratePDF}
                      disabled={loadingStates.generating}
                      variant="outline"
                      size="sm"
                      className="h-8 w-8 p-0 bg-green-900/40 border-green-600 text-green-200 hover:bg-green-800/60"
                      title="Generate PDF"
                    >
                      {loadingStates.generating ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
                </div>

                {/* Options Section (Good/Better/Best) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  
                  {/* Good (Lower Effort) Option */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label variant="nexa" className="text-green-400">Good (Lower Effort) Option</Label>
                      <Button
                        onClick={addGoodOption}
                        variant="outline"
                        size="sm"
                        className="border-green-600 text-green-400 hover:bg-green-500/10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Feature
                      </Button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border border-green-600 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-green-800">
                            <th className="text-white text-left p-2 border-b border-green-600 text-xs" style={{width: '50%'}}>
                              Features Removed
                            </th>
                            <th className="text-white text-center p-2 border-b border-green-600 text-xs" style={{width: '20%'}}>
                              Hours
                            </th>
                            <th className="text-white text-center p-2 border-b border-green-600 text-xs" style={{width: '20%'}}>
                              Weeks
                            </th>
                            <th className="text-white text-center p-2 border-b border-green-600 text-xs" style={{width: '10%'}}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                            {loeData.variations.goodOptions.map((option, index) => (
                            <tr key={option.id} className="border-b border-green-600">
                              <td className="p-2">
                                <Textarea
                                  variant="nexa"
                                  rows={2}
                                  placeholder="Describe removed features..."
                                  value={option.feature}
                                  onChange={(e) => updateGoodOption(option.id, 'feature', e.target.value)}
                                  className="border-0 bg-transparent text-xs resize-none"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  variant="nexa"
                                  type="number"
                                  step="10"
                                  min="0"
                                  value={option.hours}
                                  onChange={(e) => updateGoodOption(option.id, 'hours', parseInt(e.target.value) || 0)}
                                  className="border-0 bg-transparent text-center text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  variant="nexa"
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={option.weeks}
                                  onChange={(e) => updateGoodOption(option.id, 'weeks', parseFloat(e.target.value) || 0)}
                                  className="border-0 bg-transparent text-center text-xs"
                                />
                              </td>
                              <td className="p-2 text-center">
                                {index > 0 && (
                                  <Button
                                    onClick={() => removeGoodOption(option.id)}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto border-red-600 text-red-500 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {/* Calculation Rows */}
                          <tr className="bg-green-700 font-semibold">
                            <td className="p-2 text-white text-xs">Decrease in Project Duration</td>
                            <td className="p-2 text-white text-center text-xs">{getGoodTotalReduction().hours}</td>
                            <td className="p-2 text-white text-center text-xs">{getGoodTotalReduction().weeks.toFixed(1)}</td>
                            <td className="p-2"></td>
                          </tr>
                          <tr className="bg-green-600 font-semibold">
                            <td className="p-2 text-white text-xs">Adjusted LOE</td>
                            <td className="p-2 text-white text-center text-xs">{getTotalResourceHours() - getGoodTotalReduction().hours}</td>
                            <td className="p-2 text-white text-center text-xs">{(getTotalResourceWeeks() - getGoodTotalReduction().weeks).toFixed(1)}</td>
                            <td className="p-2"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>

                  {/* Best (Enhanced) Option */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <Label variant="nexa" className="text-blue-400">Best (Enhanced) Option</Label>
                      <Button
                        onClick={addBestOption}
                        variant="outline"
                        size="sm"
                        className="border-blue-600 text-blue-400 hover:bg-blue-500/10"
                      >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Feature
                      </Button>
                    </div>
                    
                    <div className="overflow-x-auto">
                      <table className="w-full border border-blue-600 rounded-lg overflow-hidden">
                        <thead>
                          <tr className="bg-blue-800">
                            <th className="text-white text-left p-2 border-b border-blue-600 text-xs" style={{width: '50%'}}>
                              Features Added
                            </th>
                            <th className="text-white text-center p-2 border-b border-blue-600 text-xs" style={{width: '20%'}}>
                              Hours
                            </th>
                            <th className="text-white text-center p-2 border-b border-blue-600 text-xs" style={{width: '20%'}}>
                              Weeks
                            </th>
                            <th className="text-white text-center p-2 border-b border-blue-600 text-xs" style={{width: '10%'}}>
                              Actions
                            </th>
                          </tr>
                        </thead>
                        <tbody>
                            {loeData.variations.bestOptions.map((option, index) => (
                            <tr key={option.id} className="border-b border-blue-600">
                              <td className="p-2">
                                <Textarea
                                  variant="nexa"
                                  rows={2}
                                  placeholder="Describe added features..."
                                  value={option.feature}
                                  onChange={(e) => updateBestOption(option.id, 'feature', e.target.value)}
                                  className="border-0 bg-transparent text-xs resize-none"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  variant="nexa"
                                  type="number"
                                  step="10"
                                  min="0"
                                  value={option.hours}
                                  onChange={(e) => updateBestOption(option.id, 'hours', parseInt(e.target.value) || 0)}
                                  className="border-0 bg-transparent text-center text-xs"
                                />
                              </td>
                              <td className="p-2">
                                <Input
                                  variant="nexa"
                                  type="number"
                                  step="0.5"
                                  min="0"
                                  value={option.weeks}
                                  onChange={(e) => updateBestOption(option.id, 'weeks', parseFloat(e.target.value) || 0)}
                                  className="border-0 bg-transparent text-center text-xs"
                                />
                              </td>
                              <td className="p-2 text-center">
                                {index > 0 && (
                                  <Button
                                    onClick={() => removeBestOption(option.id)}
                                    variant="outline"
                                    size="sm"
                                    className="h-auto border-red-600 text-red-500 hover:bg-red-500/10"
                                  >
                                    <Trash2 className="h-3 w-3" />
                                  </Button>
                                )}
                              </td>
                            </tr>
                          ))}
                          {/* Calculation Rows */}
                          <tr className="bg-blue-700 font-semibold">
                            <td className="p-2 text-white text-xs">Increase in Project Duration</td>
                            <td className="p-2 text-white text-center text-xs">{getBestTotalAddition().hours}</td>
                            <td className="p-2 text-white text-center text-xs">{getBestTotalAddition().weeks.toFixed(1)}</td>
                            <td className="p-2"></td>
                          </tr>
                          <tr className="bg-blue-600 font-semibold">
                            <td className="p-2 text-white text-xs">Adjusted LOE</td>
                            <td className="p-2 text-white text-center text-xs">{getTotalResourceHours() + getBestTotalAddition().hours}</td>
                            <td className="p-2 text-white text-center text-xs">{(getTotalResourceWeeks() + getBestTotalAddition().weeks).toFixed(1)}</td>
                            <td className="p-2"></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
                      </div>
              </TabsContent>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                {activeMainTab !== 'info' ? (
                  <Button
                    onClick={handlePrevious}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                ) : (
                  <div />
                )}
                
                {activeMainTab !== 'variations' ? (
                  <Button
                    onClick={handleNext}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                ) : (
                  <div />
                )}
              </div>
          </Card>
          </Tabs>
        </div>
      </div>
    </DashboardLayout>
  )
}

