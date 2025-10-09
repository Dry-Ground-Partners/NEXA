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
  FileText,
  Plus,
  Trash2,
  Save,
  RotateCw,
  ChevronUp,
  ChevronDown,
  Download,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'
import type { AuthUser } from '@/types'
import type { SOWSessionData } from '@/lib/sessions'
import { createDefaultSOWData } from '@/lib/sessions'
import { useUser } from '@/contexts/user-context'

export default function SOWPage() {
  // Get organization context for usage tracking
  const { selectedOrganization } = useUser()
  
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<SOWSessionData>(createDefaultSOWData())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  
  // UI state
  const [activeMainTab, setActiveMainTab] = useState('basic')
  
  // PDF loading states
  const [loadingStates, setLoadingStates] = useState({
    generating: false,
    previewing: false
  })

  // Collect current form data into session format
  const collectCurrentData = useCallback((): SOWSessionData => {
    return {
      ...sessionData,
      lastSaved: new Date().toISOString(),
      version: (sessionData.version || 0) + 1
    }
  }, [sessionData])

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!sessionId || saving || !hasUnsavedChanges) return
    
    try {
      const currentData = collectCurrentData()
      console.log('💾 Auto-saving SOW session...')
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          data: currentData,
          sessionType: 'sow'
        }),
      })
      
      const result = await response.json()
      
      if (result.success) {
        setLastSaved(new Date(currentData.lastSaved))
        setHasUnsavedChanges(false)
        console.log('✅ Auto-save successful')
      } else {
        console.log('❌ Auto-save failed:', result.error)
      }
    } catch (error: unknown) {
      console.error('💥 Auto-save error:', error)
    }
  }, [sessionId, saving, hasUnsavedChanges, collectCurrentData])

  // Manual save function
  const handleSave = async () => {
    if (saving) return
    
    setSaving(true)
    
    try {
      const currentData = collectCurrentData()
      console.log('💾 Manual save SOW session...')
      
      if (!sessionId) {
        // Create new session
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            sessionType: 'sow',
            data: currentData
          }),
        })
        
        const result = await response.json()
        
        if (result.success && result.session) {
          setSessionId(result.session.uuid)
          setLastSaved(new Date(currentData.lastSaved))
          setHasUnsavedChanges(false)
          // Update URL without refresh
          window.history.replaceState({}, '', `/sow?session=${result.session.uuid}`)
          console.log(`✅ New SOW session created: ${result.session.uuid}`)
        } else {
          console.log('❌ Failed to create session:', result.error)
        }
      } else {
        // Update existing session
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            data: currentData,
            sessionType: 'sow'
          }),
        })
        
        const result = await response.json()
        
        if (result.success) {
          setLastSaved(new Date(currentData.lastSaved))
          setHasUnsavedChanges(false)
          console.log('✅ SOW session updated successfully')
        } else {
          console.log('❌ Failed to update session:', result.error)
        }
      }
    } catch (error: unknown) {
      console.error('💥 Save error:', error)
    } finally {
      setSaving(false)
    }
  }

  // Helper function to check if SOW has valid data for LOE generation
  const hasValidSOWData = () => {
    return sessionData.scope?.deliverables?.length > 0 && 
           sessionData.timeline?.phases?.length > 0 &&
           sessionData.project?.background?.trim() !== ''
  }

  // Handle transition to LOE page
  const handleTransitionToLOE = async () => {
    if (!sessionId) {
      alert('Please save your SOW first before transitioning to LOE.')
      return
    }

    setSaving(true)
    
    // Validate organization selection
    if (!selectedOrganization) {
      alert('⚠️ Please select an organization before pushing features.')
      return
    }

    try {
      const orgId = selectedOrganization.organization.id
      console.log(`🚀 Pushing to LOE for org ${orgId}...`)
      
      // 1. Generate LOE data from SOW (org-scoped)
      console.log('📊 Generating LOE from SOW data...')
      const response = await fetch(`/api/organizations/${orgId}/sow/generate-loe`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ sowData: sessionData })
      })
      
      if (!response.ok) {
        const errorText = await response.text()
        throw new Error(`Failed to generate LOE: ${errorText}`)
      }
      
      const result = await response.json()
      
      if (!result.success) {
        throw new Error(result.error || 'LOE generation failed')
      }
      
      console.log('✅ LOE generated successfully')
      console.log(`   - Workstreams: ${result.loeData.workstreams?.workstreams?.length || 0}`)
      console.log(`   - Resources: ${result.loeData.resources?.resources?.length || 0}`)
      
      // Log usage tracking info
      if (result.usage) {
        console.log(`💰 Credits consumed: ${result.usage.creditsConsumed}`)
        console.log(`💵 Credits remaining: ${result.usage.remainingCredits}`)
        
        if (result.usage.warning?.isNearLimit) {
          alert(`⚠️ Warning: You've used ${result.usage.warning.percentageUsed}% of your credits.`)
        }
        if (result.usage.warning?.isOverLimit) {
          alert(`🚫 Credit limit exceeded!`)
          return
        }
      }
      
      // 2. Add LOE data to same session UUID
      console.log('📝 Adding LOE data to existing session...')
      const loeResponse = await fetch(`/api/sessions/${sessionId}/add-loe`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ loeData: result.loeData })
      })
      
      if (!loeResponse.ok) {
        const errorText = await loeResponse.text()
        throw new Error(`Failed to save LOE: ${errorText}`)
      }
      
      const loeResult = await loeResponse.json()
      
      if (!loeResult.success) {
        throw new Error('Failed to save LOE to session')
      }
      
      console.log('✅ LOE data saved to session successfully')
      
      // 3. Navigate to LOE page
      console.log('🔗 Redirecting to LOE page...')
      window.location.href = `/loe?session=${sessionId}`
      
    } catch (error: any) {
      console.error('❌ Error transitioning to LOE:', error)
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred'
      alert(`Error transitioning to LOE: ${errorMessage}`)
    } finally {
      setSaving(false)
    }
  }

  // Delete session function
  const handleDelete = async () => {
    if (!sessionId) return
    
    if (!confirm('Are you sure you want to delete this SOW session? This action cannot be undone.')) {
      return
    }
    
    try {
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'DELETE'
      })
      
      const result = await response.json()
      
      if (result.success) {
        console.log('✅ SOW session deleted successfully')
        // Redirect to dashboard
        window.location.href = '/dashboard'
      } else {
        console.log('❌ Failed to delete session:', result.error)
      }
    } catch (error: unknown) {
      console.error('💥 Delete error:', error)
    }
  }

  // Load session from URL on mount
  useEffect(() => {
    const loadSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionParam = urlParams.get('session')
      
      if (sessionParam) {
        console.log(`🔄 Loading SOW session from URL: ${sessionParam}`)
        
        try {
          const response = await fetch(`/api/sessions/${sessionParam}?type=sow`)
          const result = await response.json()
          
          if (result.success && result.session.data) {
            const data = result.session.data as SOWSessionData
            
            // Restore session data
            setSessionId(sessionParam)
            setSessionData(data)
            setActiveMainTab(data.uiState.activeMainTab)
            setLastSaved(new Date(data.lastSaved))
            console.log(`✅ SOW session loaded: "${data.basic.title}"`)
          } else {
            console.log('❌ Failed to load SOW session:', result.error)
            // Remove invalid session from URL
            window.history.replaceState({}, '', '/sow')
          }
        } catch (error: unknown) {
          console.error('💥 Error loading SOW session:', error)
          window.history.replaceState({}, '', '/sow')
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
          window.location.href = '/auth/login'
        }
      } catch (error: unknown) {
        console.error('Error fetching user:', error)
        window.location.href = '/auth/login'
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  // Auto-save every 10 seconds
  useEffect(() => {
    const interval = setInterval(autoSave, 10000) // 10 seconds
    return () => clearInterval(interval)
  }, [autoSave])

  // Keyboard shortcuts for SOW tabs
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
      
      // SOW tab shortcuts
      const tabMap: { [key: string]: string } = {
        '1': 'basic',
        '2': 'project',
        '3': 'scope',
        '4': 'clauses',
        '5': 'timeline'
      }
      
      if (tabMap[event.key]) {
        event.preventDefault()
        setActiveMainTab(tabMap[event.key])
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown)
    }
  }, [])

  // Mark as unsaved when data changes
  useEffect(() => {
    setHasUnsavedChanges(true)
  }, [sessionData])

  // Update UI state in session data when activeMainTab changes
  useEffect(() => {
    setSessionData(prev => ({
      ...prev,
      uiState: {
        ...prev.uiState,
        activeMainTab
      }
    }))
  }, [activeMainTab])

  // Helper functions for managing objectives
  const addObjective = () => {
    const newId = Math.max(...sessionData.project.objectives.map(obj => obj.id)) + 1
    setSessionData(prev => ({
      ...prev,
      project: {
        ...prev.project,
        objectives: [...prev.project.objectives, { id: newId, text: '' }]
      }
    }))
  }

  const removeObjective = (id: number) => {
    if (sessionData.project.objectives.length === 1) return
    setSessionData(prev => ({
      ...prev,
      project: {
        ...prev.project,
        objectives: prev.project.objectives.filter(obj => obj.id !== id)
      }
    }))
  }

  const updateObjective = (id: number, text: string) => {
    setSessionData(prev => ({
      ...prev,
      project: {
        ...prev.project,
        objectives: prev.project.objectives.map(obj => 
          obj.id === id ? { ...obj, text } : obj
        )
      }
    }))
  }

  // Helper functions for managing deliverables
  const addDeliverable = () => {
    const newId = Math.max(...sessionData.scope.deliverables.map(del => del.id)) + 1
    setSessionData(prev => ({
      ...prev,
      scope: {
        ...prev.scope,
        deliverables: [...prev.scope.deliverables, { 
          id: newId, 
          deliverable: '', 
          keyFeatures: '', 
          primaryArtifacts: '' 
        }]
      }
    }))
  }

  const removeDeliverable = (id: number) => {
    if (sessionData.scope.deliverables.length === 1) return
    setSessionData(prev => ({
      ...prev,
      scope: {
        ...prev.scope,
        deliverables: prev.scope.deliverables.filter(del => del.id !== id)
      }
    }))
  }

  const updateDeliverable = (id: number, field: 'deliverable' | 'keyFeatures' | 'primaryArtifacts', value: string) => {
    setSessionData(prev => ({
      ...prev,
      scope: {
        ...prev.scope,
        deliverables: prev.scope.deliverables.map(del => 
          del.id === id ? { ...del, [field]: value } : del
        )
      }
    }))
  }

  // Helper functions for managing functional requirements
  const addFunctionalRequirement = () => {
    const newId = Math.max(...sessionData.clauses.functionalRequirements.map(req => req.id)) + 1
    setSessionData(prev => ({
      ...prev,
      clauses: {
        ...prev.clauses,
        functionalRequirements: [...prev.clauses.functionalRequirements, { id: newId, text: '' }]
      }
    }))
  }

  const removeFunctionalRequirement = (id: number) => {
    if (sessionData.clauses.functionalRequirements.length === 1) return
    setSessionData(prev => ({
      ...prev,
      clauses: {
        ...prev.clauses,
        functionalRequirements: prev.clauses.functionalRequirements.filter(req => req.id !== id)
      }
    }))
  }

  const updateFunctionalRequirement = (id: number, text: string) => {
    setSessionData(prev => ({
      ...prev,
      clauses: {
        ...prev.clauses,
        functionalRequirements: prev.clauses.functionalRequirements.map(req => 
          req.id === id ? { ...req, text } : req
        )
      }
    }))
  }

  // Helper functions for managing non-functional requirements
  const addNonFunctionalRequirement = () => {
    const newId = Math.max(...sessionData.clauses.nonFunctionalRequirements.map(req => req.id)) + 1
    setSessionData(prev => ({
      ...prev,
      clauses: {
        ...prev.clauses,
        nonFunctionalRequirements: [...prev.clauses.nonFunctionalRequirements, { id: newId, text: '' }]
      }
    }))
  }

  const removeNonFunctionalRequirement = (id: number) => {
    if (sessionData.clauses.nonFunctionalRequirements.length === 1) return
    setSessionData(prev => ({
      ...prev,
      clauses: {
        ...prev.clauses,
        nonFunctionalRequirements: prev.clauses.nonFunctionalRequirements.filter(req => req.id !== id)
      }
    }))
  }

  const updateNonFunctionalRequirement = (id: number, text: string) => {
    setSessionData(prev => ({
      ...prev,
      clauses: {
        ...prev.clauses,
        nonFunctionalRequirements: prev.clauses.nonFunctionalRequirements.map(req => 
          req.id === id ? { ...req, text } : req
        )
      }
    }))
  }

  // Helper functions for managing phases
  const addPhase = () => {
    const newId = Math.max(...sessionData.timeline.phases.map(phase => phase.id)) + 1
    const lastPhase = sessionData.timeline.phases[sessionData.timeline.phases.length - 1]
    const newStart = lastPhase ? lastPhase.weeksEnd + 1 : 1
    setSessionData(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        phases: [...prev.timeline.phases, { 
          id: newId, 
          phase: '', 
          keyActivities: '', 
          weeksStart: newStart, 
          weeksEnd: newStart + 3 
        }]
      }
    }))
  }

  const removePhase = (id: number) => {
    if (sessionData.timeline.phases.length === 1) return
    setSessionData(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        phases: prev.timeline.phases.filter(phase => phase.id !== id)
      }
    }))
  }

  const updatePhase = (id: number, field: 'phase' | 'keyActivities', value: string) => {
    setSessionData(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        phases: prev.timeline.phases.map(phase => 
          phase.id === id ? { ...phase, [field]: value } : phase
        )
      }
    }))
  }

  const adjustWeeks = (id: number, direction: 'up' | 'down') => {
    setSessionData(prev => ({
      ...prev,
      timeline: {
        ...prev.timeline,
        phases: prev.timeline.phases.map(phase => 
          phase.id === id ? { 
            ...phase, 
            weeksEnd: direction === 'up' ? phase.weeksEnd + 1 : Math.max(phase.weeksStart, phase.weeksEnd - 1)
          } : phase
        )
      }
    }))
  }

  // Preview SOW PDF function
  const handlePreviewSOWPDF = async () => {
    if (!sessionData) return
    
    setLoadingStates(prev => ({ ...prev, previewing: true }))
    
    try {
      console.log('🔍 Previewing SOW PDF...')
      
      const response = await fetch('/api/sow/preview-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionData: collectCurrentData(),
          sessionId
        }),
      })
      
      if (response.ok) {
        // Get PDF blob from response
        const pdfBlob = await response.blob()
        
        // Create URL and open PDF in new tab for preview
        const pdfUrl = URL.createObjectURL(pdfBlob)
        window.open(pdfUrl, '_blank')
        
        console.log('✅ SOW PDF preview opened')
      } else {
        const errorText = await response.text()
        console.log('❌ Preview failed:', errorText)
        alert('Failed to generate PDF preview. Please try again.')
      }
    } catch (error: unknown) {
      console.error('💥 Preview error:', error)
      alert('Error generating PDF preview. Please try again.')
    } finally {
      setLoadingStates(prev => ({ ...prev, previewing: false }))
    }
  }

  // Download SOW PDF function
  const handleDownloadSOWPDF = async () => {
    if (!sessionData) return
    
    setLoadingStates(prev => ({ ...prev, generating: true }))
    
    try {
      console.log('💾 Downloading SOW PDF...')
      
      const response = await fetch('/api/sow/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionData: collectCurrentData(),
          sessionId
        }),
      })
      
      if (response.ok) {
        const pdfBlob = await response.blob()
        const url = URL.createObjectURL(pdfBlob)
        
        // Create download link
        const link = document.createElement('a')
        link.href = url
        link.download = `SOW_${sessionData.basic.title || 'Document'}_${new Date().toISOString().split('T')[0]}.pdf`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        
        // Clean up object URL
        URL.revokeObjectURL(url)
        console.log('✅ SOW PDF download completed')
      } else {
        const errorText = await response.text()
        console.log('❌ Download failed:', errorText)
        alert('Failed to generate PDF download. Please try again.')
      }
    } catch (error: unknown) {
      console.error('💥 Download error:', error)
      alert('Error generating PDF download. Please try again.')
    } finally {
      setLoadingStates(prev => ({ ...prev, generating: false }))
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
      currentPage="Statement of Work"
    >
      <div className="nexa-background nexa-page-wrapper p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Tab Navigation Row */}
          <div className="flex items-end justify-between mb-0">
            {/* Left: Label + Tab Strip */}
            <div className="flex items-end gap-8">
              {/* SOW Label */}
              <div className="flex items-center gap-2 text-white pb-3 ml-16">
                <FileText className="w-4 h-4" />
                <span>Statement of Work</span>
              </div>
              
              {/* Main Tabs */}
              <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
                <TabsList>
                  <TabsTrigger value="basic">
                    Basic
                  </TabsTrigger>
                  <TabsTrigger value="project">
                    Project
                  </TabsTrigger>
                  <TabsTrigger value="scope">
                    Scope
                  </TabsTrigger>
                  <TabsTrigger value="clauses">
                    Clauses
                  </TabsTrigger>
                  <TabsTrigger value="timeline">
                    Timeline
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
            
            {/* Action tabs aligned right */}
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

          {/* Content Card */}
          <Card variant="nexa" className="rounded-tr-none border-t border-nexa-border p-8 mt-0">
            <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
              
              {/* Basic Tab Content */}
              <TabsContent value="basic">
                <h2 className="text-white text-xl font-semibold mb-6">Basic Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="date">
                      Date
                    </Label>
                    <Input
                      variant="nexa"
                      type="date"
                      id="date"
                      value={sessionData.basic.date}
                      onChange={(e) => setSessionData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, date: e.target.value }
                      }))}
                    />
                  </div>
                  
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="engineer">
                      Engineer Name
                    </Label>
                    <Input
                      variant="nexa"
                      id="engineer"
                      placeholder="e.g., John Rockstar Engineer"
                      value={sessionData.basic.engineer}
                      onChange={(e) => setSessionData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, engineer: e.target.value }
                      }))}
                      required
                    />
                  </div>
                  
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="title">
                      Project Title
                    </Label>
                    <Input
                      variant="nexa"
                      id="title"
                      placeholder="Enter project title..."
                      value={sessionData.basic.title}
                      onChange={(e) => setSessionData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, title: e.target.value }
                      }))}
                    />
                  </div>
                  
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="client">
                      Client
                    </Label>
                    <Input
                      variant="nexa"
                      id="client"
                      placeholder="Enter client name..."
                      value={sessionData.basic.client}
                      onChange={(e) => setSessionData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, client: e.target.value }
                      }))}
                      required
                    />
                  </div>
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                  <div />
                  
                  <Button
                    onClick={() => setActiveMainTab('project')}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Project Tab Content */}
              <TabsContent value="project">
                <h2 className="text-white text-xl font-semibold mb-6">Project & Background</h2>
                
                {/* Project Purpose & Background */}
                <div className="nexa-form-group mb-6">
                  <Label variant="nexa" htmlFor="background">
                    Project Purpose & Background
                  </Label>
                  <Textarea
                    variant="nexa"
                    id="background"
                    rows={4}
                    placeholder="Describe the project purpose and background..."
                    value={sessionData.project.background}
                    onChange={(e) => setSessionData(prev => ({
                      ...prev,
                      project: { ...prev.project, background: e.target.value }
                    }))}
                    required
                  />
                </div>

                {/* Objectives Management */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label variant="nexa">Project Objectives</Label>
                    <Button
                      onClick={addObjective}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Objective
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {sessionData.project.objectives.map((objective) => (
                      <div key={objective.id} className="flex gap-2">
                        <Textarea
                          variant="nexa"
                          rows={2}
                          placeholder="Enter project objective..."
                          value={objective.text}
                          onChange={(e) => updateObjective(objective.id, e.target.value)}
                          className="flex-1"
                          required
                        />
                        <Button
                          onClick={() => removeObjective(objective.id)}
                          disabled={sessionData.project.objectives.length === 1}
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

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                  <Button
                    onClick={() => setActiveMainTab('basic')}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <Button
                    onClick={() => setActiveMainTab('scope')}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Scope Tab Content */}
              <TabsContent value="scope">
                <h2 className="text-white text-xl font-semibold mb-6">Scope</h2>
                
                {/* Deliverables Table */}
                <div className="mb-6">
                  <div className="flex items-center justify-between mb-4">
                    <Label variant="nexa">In-Scope Deliverables</Label>
                    <Button
                      onClick={addDeliverable}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Deliverable
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border border-nexa-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gray-800">
                          <th className="text-white text-left p-3 border-b border-nexa-border" style={{width: '30%'}}>
                            Deliverable
                          </th>
                          <th className="text-white text-left p-3 border-b border-nexa-border" style={{width: '35%'}}>
                            Key Features
                          </th>
                          <th className="text-white text-left p-3 border-b border-nexa-border" style={{width: '30%'}}>
                            Primary Artifacts
                          </th>
                          <th className="text-white text-center p-3 border-b border-nexa-border" style={{width: '5%'}}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionData.scope.deliverables.map((deliverable, index) => (
                          <tr key={deliverable.id} className="border-b border-nexa-border">
                            <td className="p-3">
                              <Textarea
                                variant="nexa"
                                rows={2}
                                placeholder="Enter deliverable name..."
                                value={deliverable.deliverable}
                                onChange={(e) => updateDeliverable(deliverable.id, 'deliverable', e.target.value)}
                                className="border-0 bg-transparent resize-none"
                              />
                            </td>
                            <td className="p-3">
                              <Textarea
                                variant="nexa"
                                rows={2}
                                placeholder="Describe key features..."
                                value={deliverable.keyFeatures}
                                onChange={(e) => updateDeliverable(deliverable.id, 'keyFeatures', e.target.value)}
                                className="border-0 bg-transparent resize-none"
                              />
                            </td>
                            <td className="p-3">
                              <Textarea
                                variant="nexa"
                                rows={2}
                                placeholder="List primary artifacts..."
                                value={deliverable.primaryArtifacts}
                                onChange={(e) => updateDeliverable(deliverable.id, 'primaryArtifacts', e.target.value)}
                                className="border-0 bg-transparent resize-none"
                              />
                            </td>
                            <td className="p-3 text-center">
                              {index > 0 && (
                                <Button
                                  onClick={() => removeDeliverable(deliverable.id)}
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

                {/* Out-of-Scope Section */}
                <div className="nexa-form-group">
                  <Label variant="nexa" htmlFor="outOfScope">
                    Out-of-Scope
                  </Label>
                  <Textarea
                    variant="nexa"
                    id="outOfScope"
                    rows={3}
                    placeholder="Define what is explicitly out of scope for this project..."
                    value={sessionData.scope.outOfScope}
                    onChange={(e) => setSessionData(prev => ({
                      ...prev,
                      scope: { ...prev.scope, outOfScope: e.target.value }
                    }))}
                  />
                </div>

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                  <Button
                    onClick={() => setActiveMainTab('project')}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <Button
                    onClick={() => setActiveMainTab('clauses')}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Clauses Tab Content */}
              <TabsContent value="clauses">
                <h2 className="text-white text-xl font-semibold mb-6">Requirements</h2>
                
                {/* Functional Requirements */}
                <div className="mb-8">
                  <div className="flex items-center justify-between mb-4">
                    <Label variant="nexa">Functional Requirements</Label>
                    <Button
                      onClick={addFunctionalRequirement}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Requirement
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {sessionData.clauses.functionalRequirements.map((requirement) => (
                      <div key={requirement.id} className="flex gap-2">
                        <Textarea
                          variant="nexa"
                          rows={2}
                          placeholder="Enter functional requirement..."
                          value={requirement.text}
                          onChange={(e) => updateFunctionalRequirement(requirement.id, e.target.value)}
                          className="flex-1"
                          required
                        />
                        <Button
                          onClick={() => removeFunctionalRequirement(requirement.id)}
                          disabled={sessionData.clauses.functionalRequirements.length === 1}
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

                {/* Non-Functional Requirements */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label variant="nexa">Non-Functional Requirements</Label>
                    <Button
                      onClick={addNonFunctionalRequirement}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Requirement
                    </Button>
                  </div>
                  
                  <div className="space-y-3">
                    {sessionData.clauses.nonFunctionalRequirements.map((requirement) => (
                      <div key={requirement.id} className="flex gap-2">
                        <Textarea
                          variant="nexa"
                          rows={2}
                          placeholder="Enter non-functional requirement (performance, security, usability, etc.)..."
                          value={requirement.text}
                          onChange={(e) => updateNonFunctionalRequirement(requirement.id, e.target.value)}
                          className="flex-1"
                          required
                        />
                        <Button
                          onClick={() => removeNonFunctionalRequirement(requirement.id)}
                          disabled={sessionData.clauses.nonFunctionalRequirements.length === 1}
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

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                  <Button
                    onClick={() => setActiveMainTab('scope')}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <Button
                    onClick={() => setActiveMainTab('timeline')}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </TabsContent>

              {/* Timeline Tab Content */}
              <TabsContent value="timeline">
                <h2 className="text-white text-xl font-semibold mb-6">Project Timeline</h2>
                
                {/* Quick Actions - PDF Buttons */}
                <div className="flex gap-2 mb-6">
                  <Button
                    onClick={handlePreviewSOWPDF}
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
                    onClick={handleDownloadSOWPDF}
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
                
                {/* Project Phases & Timeline */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label variant="nexa">Project Phases & Timeline</Label>
                    <Button
                      onClick={addPhase}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Phase
                    </Button>
                  </div>
                  
                  <div className="overflow-x-auto">
                    <table className="w-full border border-nexa-border rounded-lg overflow-hidden">
                      <thead>
                        <tr className="bg-gray-800">
                          <th className="text-white text-left p-3 border-b border-nexa-border" style={{width: '25%'}}>
                            Phase
                          </th>
                          <th className="text-white text-left p-3 border-b border-nexa-border" style={{width: '45%'}}>
                            Key Activities
                          </th>
                          <th className="text-white text-center p-3 border-b border-nexa-border" style={{width: '20%'}}>
                            Weeks
                          </th>
                          <th className="text-white text-center p-3 border-b border-nexa-border" style={{width: '10%'}}>
                            Actions
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {sessionData.timeline.phases.map((phase, index) => (
                          <tr key={phase.id} className="border-b border-nexa-border">
                            <td className="p-3">
                              <Textarea
                                variant="nexa"
                                rows={2}
                                placeholder="Enter phase name..."
                                value={phase.phase}
                                onChange={(e) => updatePhase(phase.id, 'phase', e.target.value)}
                                className="border-0 bg-transparent resize-none"
                              />
                            </td>
                            <td className="p-3">
                              <Textarea
                                variant="nexa"
                                rows={2}
                                placeholder="Describe key activities..."
                                value={phase.keyActivities}
                                onChange={(e) => updatePhase(phase.id, 'keyActivities', e.target.value)}
                                className="border-0 bg-transparent resize-none"
                              />
                            </td>
                            <td className="p-3">
                              <div className="flex items-center justify-center gap-2">
                                <span className="text-white font-mono">
                                  {phase.weeksStart}-{phase.weeksEnd}
                                </span>
                                <div className="flex flex-col gap-1">
                                  <Button
                                    onClick={() => adjustWeeks(phase.id, 'up')}
                                    variant="outline"
                                    size="sm"
                                    className="h-5 w-5 p-0 border-nexa-border text-white hover:bg-white/10"
                                    title="Increase end week"
                                  >
                                    <ChevronUp className="h-3 w-3" />
                                  </Button>
                                  <Button
                                    onClick={() => adjustWeeks(phase.id, 'down')}
                                    variant="outline"
                                    size="sm"
                                    className="h-5 w-5 p-0 border-nexa-border text-white hover:bg-white/10"
                                    title="Decrease end week"
                                  >
                                    <ChevronDown className="h-3 w-3" />
                                  </Button>
                                </div>
                              </div>
                            </td>
                            <td className="p-3 text-center">
                              {index > 0 && (
                                <Button
                                  onClick={() => removePhase(phase.id)}
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

                {/* Navigation buttons */}
                <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                  <Button
                    onClick={() => setActiveMainTab('clauses')}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  {/* "To LOE →" button - only show when SOW data is valid */}
                  {hasValidSOWData() && (
                    <Button
                      onClick={handleTransitionToLOE}
                      disabled={saving}
                      className={`
                        relative overflow-hidden px-6 py-3 rounded-lg font-medium transition-all duration-300
                        bg-gradient-to-r from-purple-500/20 to-blue-500/20 
                        border border-purple-400/30 text-white
                        hover:from-purple-500/30 hover:to-blue-500/30 hover:border-purple-400/50
                        disabled:opacity-50 disabled:cursor-not-allowed
                        backdrop-blur-sm
                        before:absolute before:inset-0 before:bg-gradient-to-r before:from-white/5 before:to-white/10 
                        before:opacity-0 before:transition-opacity before:duration-300 hover:before:opacity-100
                      `}
                    >
                      <span className="relative z-10 flex items-center">
                        {saving ? 'Generating LOE...' : 'To LOE →'}
                      </span>
                    </Button>
                  )}
                </div>
              </TabsContent>

            </Tabs>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}