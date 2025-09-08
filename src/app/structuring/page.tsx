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
  Search, 
  Lightbulb, 
  Save, 
  Trash2, 
  Plus, 
  RotateCw,
  FileText,
  Layers,
  ArrowLeft,
  ArrowRight,
  RotateCcw,
  Check,
  Settings,
  Radio,
  Activity,
  BarChart3
} from 'lucide-react'
import type { AuthUser } from '@/types'
import type { StructuringSessionData, SessionResponse } from '@/lib/sessions'
import { createDefaultStructuringData } from '@/lib/sessions'

interface ContentTab {
  id: number
  text: string
}

interface SolutionTab {
  id: number
  text: string
}

export default function StructuringPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<StructuringSessionData>(createDefaultStructuringData())
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  
  // Main tab state
  const [activeMainTab, setActiveMainTab] = useState('project')
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [engineer, setEngineer] = useState('')
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  
  // Content tabs state
  const [contentTabs, setContentTabs] = useState<ContentTab[]>([{ id: 1, text: '' }])
  const [activeContentTab, setActiveContentTab] = useState(1)
  
  // Solution tabs state
  const [solutionTabs, setSolutionTabs] = useState<SolutionTab[]>([{ id: 1, text: '' }])
  const [activeSolutionTab, setActiveSolutionTab] = useState(1)
  
  // Report state
  const [reportData, setReportData] = useState<string>('')
  const [showReportModal, setShowReportModal] = useState(false)
  const [editingReport, setEditingReport] = useState(false)
  const [editedReport, setEditedReport] = useState<string>('')
  
  // Solution Overview modal state
  const [showOverviewModal, setShowOverviewModal] = useState(false)
  const [editingOverview, setEditingOverview] = useState(false)
  const [editedOverview, setEditedOverview] = useState<string>('')
  
  // Solution generation state
  const [originalPainPoints, setOriginalPainPoints] = useState<SolutionTab[]>([]) // Backup for rollback
  const [generatedSolutions, setGeneratedSolutions] = useState<string[]>([]) // Generated solutions
  const [solutionOverview, setSolutionOverview] = useState<string>('') // HTML overview
  const [isRolledBack, setIsRolledBack] = useState(false) // Track rollback state

  // Toggle states for input controls
  const [useContextEcho, setUseContextEcho] = useState(true) // Context Echo toggle
  const [useTracebackReport, setUseTracebackReport] = useState(true) // Traceback Report toggle
  
  // Loading states
  const [diagnosing, setDiagnosing] = useState(false)
  const [generatingSolution, setGeneratingSolution] = useState(false)
  const [saving, setSaving] = useState(false)

  // Helper function to create blur-scroll text effect
  const createBlurScrollText = (text: string, className: string) => {
    return (
      <div className={`blur-scroll-loading ${className}`}>
        {text.split('').map((letter, index) => (
          <span key={index} className="blur-scroll-letter">
            {letter === ' ' ? '\u00A0' : letter}
          </span>
        ))}
      </div>
    )
  }

  // Load session from URL on mount
  useEffect(() => {
    const loadSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionParam = urlParams.get('session')
      
      if (sessionParam) {
        console.log(`🔄 Loading session from URL: ${sessionParam}`)
        
        try {
          const response = await fetch(`/api/sessions/${sessionParam}`)
          const result = await response.json()
          
          if (result.success && result.session.data) {
            const data = result.session.data as StructuringSessionData
            
            // Restore session data
            setSessionId(sessionParam)
            setSessionData(data)
            
            // Restore form state
            setDate(data.basic.date)
            setEngineer(data.basic.engineer)
            setTitle(data.basic.title)
            setClient(data.basic.client)
            setContentTabs(data.contentTabs)
            setSolutionTabs(data.solutionTabs)
            setReportData(data.reportData)
            setSolutionOverview(data.solutionOverview)
            setOriginalPainPoints(data.originalPainPoints)
            setGeneratedSolutions(data.generatedSolutions)
            
            // Restore UI state
            if (data.uiState) {
              setActiveMainTab(data.uiState.activeMainTab)
              setActiveContentTab(data.uiState.activeContentTab)
              setActiveSolutionTab(data.uiState.activeSolutionTab)
              setIsRolledBack(data.uiState.isRolledBack)
              setUseContextEcho(data.uiState.useContextEcho)
              setUseTracebackReport(data.uiState.useTracebackReport)
            }
            
            setLastSaved(new Date(data.lastSaved))
            console.log(`✅ Session loaded: "${data.basic.title}"`)
          } else {
            console.log('❌ Failed to load session:', result.error)
            // Remove invalid session from URL
            window.history.replaceState({}, '', '/structuring')
          }
        } catch (error) {
          console.error('💥 Error loading session:', error)
          window.history.replaceState({}, '', '/structuring')
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

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!sessionId || saving || !hasUnsavedChanges) return
    
    try {
      const currentData = collectCurrentData()
      console.log('💾 Auto-saving session...')
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: currentData
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSessionData(currentData)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
        console.log('✅ Auto-save successful')
      } else {
        console.error('❌ Auto-save failed:', result.error)
      }
    } catch (error) {
      console.error('💥 Auto-save error:', error)
    }
  }, [sessionId, saving, hasUnsavedChanges])

  // Track changes for auto-save
  useEffect(() => {
    if (sessionId) {
      setHasUnsavedChanges(true)
    }
  }, [
    date, engineer, title, client, 
    contentTabs, solutionTabs, 
    reportData, solutionOverview,
    originalPainPoints, generatedSolutions,
    activeMainTab, activeContentTab, activeSolutionTab,
    isRolledBack, useContextEcho, useTracebackReport,
    sessionId
  ])

  // Auto-save debounced
  useEffect(() => {
    if (hasUnsavedChanges && sessionId) {
      const autoSaveTimer = setTimeout(autoSave, 3000) // Auto-save after 3 seconds of inactivity
      return () => clearTimeout(autoSaveTimer)
    }
  }, [hasUnsavedChanges, sessionId, autoSave])

  // Content tab management
  const addContentTab = () => {
    const newId = Math.max(...contentTabs.map(tab => tab.id)) + 1
    setContentTabs([...contentTabs, { id: newId, text: '' }])
    setActiveContentTab(newId)
  }

  const deleteContentTab = () => {
    if (contentTabs.length === 1) return // Prevent deleting last tab
    
    const filteredTabs = contentTabs.filter(tab => tab.id !== activeContentTab)
    setContentTabs(filteredTabs)
    setActiveContentTab(filteredTabs[0]?.id || 1)
  }

  const updateContentTab = (id: number, text: string) => {
    setContentTabs(contentTabs.map(tab => 
      tab.id === id ? { ...tab, text } : tab
    ))
  }

  // Solution tab management
  const addSolutionTab = () => {
    const newId = Math.max(...solutionTabs.map(tab => tab.id)) + 1
    setSolutionTabs([...solutionTabs, { id: newId, text: '' }])
    setActiveSolutionTab(newId)
  }

  const deleteSolutionTab = () => {
    if (solutionTabs.length === 1) return // Prevent deleting last tab
    
    const filteredTabs = solutionTabs.filter(tab => tab.id !== activeSolutionTab)
    setSolutionTabs(filteredTabs)
    setActiveSolutionTab(filteredTabs[0]?.id || 1)
  }

  const updateSolutionTab = (id: number, text: string) => {
    setSolutionTabs(solutionTabs.map(tab => 
      tab.id === id ? { ...tab, text } : tab
    ))
  }

  // AI Functions - Real LangChain Integration
  const handleDiagnose = async () => {
    const allContent = contentTabs.map(tab => tab.text).join('\n\n').trim()
    
    console.log(`🔍 Processing ${contentTabs.length} content tabs (${allContent.length} characters)`)
    
    if (!allContent) {
      alert('Please add content before diagnosing.')
      return
    }

    setDiagnosing(true)
    
    try {
      console.log('🔍 Starting pain point diagnosis with LangChain...')
      
      const requestPayload = {
        content: contentTabs.map(tab => tab.text)
      }
      
      console.log('📡 Sending request to API...')
      
      // Call the LangChain API endpoint
      const response = await fetch('/api/structuring/analyze-pain-points', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(requestPayload)
      })
      
      const result = await response.json()
      
      if (!result.success) {
        console.error('❌ Pain point analysis failed:', result.error)
        alert(`Analysis failed: ${result.error}`)
        return
      }
      
      console.log('✅ Pain point analysis completed!')
      console.log(`📊 Found ${result.data.pain_points.length} pain points`)
      console.log(`📄 Report length: ${result.data.report?.length || 0} characters`)
      
      // Store the report data
      setReportData(result.data.report || '')
      
      // Replace solution tabs with pain points (start fresh)
      const newSolutionTabs: SolutionTab[] = result.data.pain_points.map((painPoint: string, index: number) => ({
        id: index + 1,
        text: painPoint
      }))
      
      setSolutionTabs(newSolutionTabs)
      setActiveSolutionTab(1)
      
      // Switch to solution tab to show results
      setActiveMainTab('solution')
      
      // Auto-switch to solution tab (no popup needed)
      console.log(`✅ Analysis complete! Found ${result.data.pain_points.length} pain points. Auto-switching to Solution tab.`)
      
    } catch (error) {
      console.error('💥 Error during pain point analysis:', error)
      alert('Analysis failed. Please check the console for details.')
    } finally {
      setDiagnosing(false)
    }
  }

  // Report management functions
  const handleOpenReport = () => {
    setEditedReport(reportData)
    setShowReportModal(true)
    setEditingReport(false)
  }

  const handleCloseReport = () => {
    setShowReportModal(false)
    setEditingReport(false)
  }

  const handleEditReport = () => {
    setEditingReport(true)
  }

  const handleSaveReport = () => {
    setReportData(editedReport)
    setEditingReport(false)
    setShowReportModal(false)
  }

  const handleCancelEdit = () => {
    setEditedReport(reportData)
    setEditingReport(false)
  }

  // Solution Overview modal functions
  const handleOpenOverview = () => {
    setEditedOverview(solutionOverview)
    setShowOverviewModal(true)
    setEditingOverview(false)
  }

  const handleCloseOverview = () => {
    setShowOverviewModal(false)
    setEditingOverview(false)
  }

  const handleEditOverview = () => {
    setEditingOverview(true)
  }

  const handleSaveOverview = () => {
    setSolutionOverview(editedOverview)
    setEditingOverview(false)
    setShowOverviewModal(false)
  }

  const handleCancelOverviewEdit = () => {
    setEditedOverview(solutionOverview)
    setEditingOverview(false)
  }

  // Solution generation functions
  const handleGenerateSolution = async () => {
    // Backup current pain points for rollback
    setOriginalPainPoints([...solutionTabs])
    
    setGeneratingSolution(true)
    
    try {
      console.log('🔍 Starting solution generation with LangChain...')
      
      // Prepare content based on toggles
      const contextContent = useContextEcho 
        ? contentTabs.map(tab => tab.text).join('\n\n').trim() 
        : " "
      
      const reportContent = useTracebackReport 
        ? reportData 
        : " "
      
      // Get current solution content (pain points)
      const solutionContent = solutionTabs.map(tab => tab.text)
      
      console.log(`📝 Context Echo: ${useContextEcho ? 'ON' : 'OFF'} (${contextContent.length} chars)`)
      console.log(`📄 Traceback Report: ${useTracebackReport ? 'ON' : 'OFF'} (${reportContent.length} chars)`)
      
      // Call API
      const response = await fetch('/api/structuring/generate-solution', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          solutionContent,
          content: contextContent,
          report: reportContent
        })
      })
      
      const result = await response.json()
      console.log('📦 Raw API response:', result)
      
      if (!result.success) {
        console.error('❌ Solution generation failed:', result.error)
        alert(`Solution generation failed: ${result.error}`)
        return
      }
      
      console.log('✅ Solution generation completed!')
      console.log('🔍 Full API response:', result)
      
      // Validate response structure
      if (!result.data) {
        console.error('❌ No data in response:', result)
        alert('Solution generation failed: No data received from API')
        return
      }
      
      if (!result.data.solution_parts || !Array.isArray(result.data.solution_parts)) {
        console.error('❌ Invalid solution_parts in response:', result.data)
        alert('Solution generation failed: Invalid response format - missing solution_parts array')
      return
    }

      console.log(`📊 Generated ${result.data.solution_parts.length} solution parts`)
      console.log(`📄 Overview length: ${result.data.overview?.length || 0} characters`)
      
      // Store generated data
      setGeneratedSolutions(result.data.solution_parts)
      setSolutionOverview(result.data.overview || '')
      
      // Replace solution tabs with generated solutions
      const newSolutionTabs: SolutionTab[] = result.data.solution_parts.map((solution: string, index: number) => ({
        id: index + 1,
        text: solution
      }))
      
      setSolutionTabs(newSolutionTabs)
      setActiveSolutionTab(1)
      setIsRolledBack(false)
      
      // Log success (no popup needed)
      console.log(`✅ Solution generation complete! Generated ${result.data.solution_parts.length} solutions with overview.`)
      
    } catch (error) {
      console.error('💥 Error during solution generation:', error)
      alert('Solution generation failed. Please check the console for details.')
    } finally {
      setGeneratingSolution(false)
    }
  }

  const handleRollback = () => {
    // Restore original pain points
    setSolutionTabs([...originalPainPoints])
    setActiveSolutionTab(1)
    setIsRolledBack(true)
    console.log('🔄 Rolled back to original pain points')
  }

  const handleApply = () => {
    // Restore generated solutions
    const restoredSolutions: SolutionTab[] = generatedSolutions.map((solution: string, index: number) => ({
      id: index + 1,
      text: solution
    }))
    
    setSolutionTabs(restoredSolutions)
    setActiveSolutionTab(1)
    setIsRolledBack(false)
    console.log('✅ Applied generated solutions')
  }



  const collectCurrentData = (): StructuringSessionData => {
    return {
      basic: {
        date,
        engineer,
        title,
        client
      },
      contentTabs,
      solutionTabs,
      reportData,
      solutionOverview,
      originalPainPoints,
      generatedSolutions,
      uiState: {
        activeMainTab,
        activeContentTab,
        activeSolutionTab,
        isRolledBack,
        useContextEcho,
        useTracebackReport
      },
      lastSaved: new Date().toISOString(),
      version: sessionData.version || 0
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const currentData = collectCurrentData()
      console.log('💾 Saving structuring session...', { sessionId, title, client })
      
      if (sessionId) {
        // Update existing session
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: currentData
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setSessionData(currentData)
          setHasUnsavedChanges(false)
          setLastSaved(new Date())
          console.log('✅ Session updated successfully')
        } else {
          console.error('❌ Failed to update session:', result.error)
          alert(`Failed to save session: ${result.error}`)
        }
      } else {
        // Create new session
        const response = await fetch('/api/sessions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            type: 'structuring',
            data: currentData
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setSessionId(result.session.uuid)
          setSessionData(currentData)
          setHasUnsavedChanges(false)
          setLastSaved(new Date())
          console.log(`✅ New session created: ${result.session.uuid}`)
          
          // Update URL to include session ID
          window.history.replaceState({}, '', `/structuring?session=${result.session.uuid}`)
        } else {
          console.error('❌ Failed to create session:', result.error)
          alert(`Failed to save session: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('💥 Error saving session:', error)
      alert('Failed to save session. Please try again.')
    } finally {
      setSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!sessionId) {
      window.location.href = '/dashboard'
      return
    }
    
    if (confirm('Are you sure you want to delete this structuring session?')) {
      try {
        console.log(`🗑️ Deleting session: ${sessionId}`)
        
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'DELETE'
        })
        
        const result = await response.json()
        
        if (result.success) {
          console.log('✅ Session deleted successfully')
      window.location.href = '/dashboard'
        } else {
          console.error('❌ Failed to delete session:', result.error)
          alert(`Failed to delete session: ${result.error}`)
        }
      } catch (error) {
        console.error('💥 Error deleting session:', error)
        alert('Failed to delete session. Please try again.')
      }
    }
  }

  // Main tab navigation
  const handlePreviousTab = () => {
    if (activeMainTab === 'content') {
      setActiveMainTab('project')
    } else if (activeMainTab === 'solution') {
      setActiveMainTab('content')
    }
  }

  const handleNextTab = () => {
    if (activeMainTab === 'project') {
      setActiveMainTab('content')
    } else if (activeMainTab === 'content') {
      setActiveMainTab('solution')
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
      currentPage="Structuring" 
      user={user ? {
        fullName: user.fullName,
        email: user.email
      } : undefined}
    >
      <div className="nexa-background min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Tab Navigation Row */}
          <div className="flex items-end justify-between mb-0">
            {/* Left: Label + Tab Strip */}
            <div className="flex items-end gap-8">
              {/* Structuring Label */}
              <div className="flex items-center gap-2 text-white pb-3 ml-16">
                <Layers className="w-4 h-4" />
                <span>Structuring</span>
              </div>
              
              {/* Main Tabs */}
              <Tabs value={activeMainTab} onValueChange={setActiveMainTab}>
                <TabsList>
                  <TabsTrigger value="project">
                    <FileText className="w-4 h-4 mr-2" />
                    Project
                  </TabsTrigger>
                  <TabsTrigger value="content">
                    <Search className="w-4 h-4 mr-2" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="solution">
                    <Lightbulb className="w-4 h-4 mr-2" />
                    Solution
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
                <>
                {saving ? (
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                    <Save className="h-4 w-4 mr-2" />
                  )}
                  <span className={saving ? "shimmer-text" : ""}>
                    {hasUnsavedChanges ? 'Save*' : 'Save'}
                  </span>
                  </>
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
              
              {/* Project Tab Content */}
              <TabsContent value="project">
                <h2 className="text-white text-xl font-semibold mb-6">Project Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-2">
                    <Label variant="nexa" htmlFor="date">Date</Label>
                    <Input
                      variant="nexa"
                      type="date"
                      id="date"
                      value={date}
                      onChange={(e) => setDate(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label variant="nexa" htmlFor="engineer">Engineer Name</Label>
                    <Input
                      variant="nexa"
                      id="engineer"
                      placeholder="e.g., John Rockstar Engineer"
                      value={engineer}
                      onChange={(e) => setEngineer(e.target.value)}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label variant="nexa" htmlFor="title">Title</Label>
                    <Input
                      variant="nexa"
                      id="title"
                      placeholder="Enter project title..."
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label variant="nexa" htmlFor="client">Client</Label>
                    <Input
                      variant="nexa"
                      id="client"
                      placeholder="Enter client name..."
                      value={client}
                      onChange={(e) => setClient(e.target.value)}
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Content Tab Content */}
              <TabsContent value="content">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-white text-xl font-semibold mb-4">Content</h2>
                    
                    <Tabs value={activeContentTab.toString()} onValueChange={(value) => setActiveContentTab(parseInt(value))}>
                      {/* Content Tab Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-black border-b border-nexa-border flex-1 justify-start">
                          {contentTabs.map((tab) => (
                            <TabsTrigger key={tab.id} value={tab.id.toString()}>
                              {tab.id}
                            </TabsTrigger>
                          ))}
                          <button 
                            onClick={addContentTab}
                            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg hover:text-white hover:bg-nexa-card/80 transition-all ml-1"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </TabsList>
                        
                        <button 
                          onClick={deleteContentTab}
                          disabled={contentTabs.length === 1}
                          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg hover:text-white hover:bg-nexa-card/80 transition-all disabled:opacity-50 disabled:pointer-events-none ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Content Tab Areas */}
                      {contentTabs.map((tab) => (
                        <TabsContent key={tab.id} value={tab.id.toString()}>
                          <Textarea
                            variant="nexa"
                            placeholder="Enter your content here..."
                            rows={8}
                            value={tab.text}
                            onChange={(e) => updateContentTab(tab.id, e.target.value)}
                            className="resize-none"
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>

                  {/* Diagnose Section */}
                  <div>
                    <Button
                      onClick={handleDiagnose}
                      disabled={diagnosing}
                      className="w-full border border-nexa-border text-white bg-transparent p-6 text-lg font-medium rounded-xl border-draw-button diagnose-button"
                    >
                      {diagnosing ? (
                        createBlurScrollText('Diagnosing...', 'diagnose-loading')
                      ) : (
                        <>
                          <Search className="h-6 w-6 mr-3" />
                          <span className="diagnose-text">Diagnose</span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Solution Tab Content */}
              <TabsContent value="solution">
                <div className="space-y-8">
                  <div>
                    <h2 className="text-white text-xl font-semibold mb-4">Solution</h2>
                    
                    
                    {/* Quick Action Buttons */}
                    <div className="flex flex-wrap gap-2 mb-6">
                      {/* Context Echo Toggle */}
                      <Button
                        onClick={() => setUseContextEcho(!useContextEcho)}
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10 ${
                          useContextEcho ? 'bg-blue-600 border-blue-500' : ''
                        }`}
                        title="Context Echo"
                      >
                        <Radio className="h-4 w-4" />
                      </Button>
                      
                      {/* Traceback Report Toggle */}
                      <Button
                        onClick={() => setUseTracebackReport(!useTracebackReport)}
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10 ${
                          useTracebackReport ? 'bg-green-600 border-green-500' : ''
                        }`}
                        title="Traceback Report"
                      >
                        <Activity className="h-4 w-4" />
                      </Button>
                      
                      {/* Rollback/Apply Toggle Button */}
                      <Button
                        onClick={() => {
                          if (originalPainPoints.length === 0) return // No action if no backup
                          if (isRolledBack) {
                            handleApply()
                          } else {
                            handleRollback()
                          }
                        }}
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10 ${
                          originalPainPoints.length === 0 ? 'opacity-40 cursor-not-allowed' : ''
                        } ${
                          isRolledBack ? 'bg-green-600 border-green-500' : 'bg-yellow-600 border-yellow-500'
                        }`}
                        title={originalPainPoints.length === 0 ? 'Generate solutions first' : isRolledBack ? 'Apply Generated Solutions' : 'Rollback to Pain Points'}
                        disabled={originalPainPoints.length === 0}
                      >
                        {isRolledBack ? <Check className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                      </Button>
                      
                      {/* Analysis Report Button */}
                      <Button
                        onClick={reportData ? handleOpenReport : undefined}
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10 ${
                          !reportData ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                        title={reportData ? 'Analysis Report' : 'Run Diagnose first'}
                        disabled={!reportData}
                      >
                        <FileText className="h-4 w-4" />
                      </Button>
                      
                      {/* Solution Overview Button */}
                      <Button
                        onClick={solutionOverview ? handleOpenOverview : undefined}
                        variant="outline"
                        size="sm"
                        className={`h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10 ${
                          !solutionOverview ? 'opacity-40 cursor-not-allowed' : ''
                        }`}
                        title={solutionOverview ? 'Solution Overview' : 'Generate solutions first'}
                        disabled={!solutionOverview}
                      >
                        <BarChart3 className="h-4 w-4" />
                      </Button>
                    </div>
                    
                    <Tabs value={activeSolutionTab.toString()} onValueChange={(value) => setActiveSolutionTab(parseInt(value))}>
                      {/* Solution Tab Navigation */}
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-black border-b border-nexa-border flex-1 justify-start">
                          {solutionTabs.map((tab) => (
                            <TabsTrigger key={tab.id} value={tab.id.toString()}>
                              {tab.id}
                            </TabsTrigger>
                          ))}
                          <button 
                            onClick={addSolutionTab}
                            className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg hover:text-white hover:bg-nexa-card/80 transition-all ml-1"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </TabsList>
                        
                        <button 
                          onClick={deleteSolutionTab}
                          disabled={solutionTabs.length === 1}
                          className="inline-flex items-center justify-center px-6 py-3 text-sm font-medium bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg hover:text-white hover:bg-nexa-card/80 transition-all disabled:opacity-50 disabled:pointer-events-none ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {/* Solution Tab Areas */}
                      {solutionTabs.map((tab) => (
                        <TabsContent key={tab.id} value={tab.id.toString()}>
                          <Textarea
                            variant="nexa"
                            placeholder="Enter your solution here..."
                            rows={8}
                            value={tab.text}
                            onChange={(e) => updateSolutionTab(tab.id, e.target.value)}
                            className="resize-none"
                          />
                        </TabsContent>
                      ))}
                    </Tabs>
                  </div>

                  {/* Generate Solution Section */}
                  <div className="space-y-4">
                    {/* Action Buttons */}
                    <div className="flex items-center space-x-3">
                    <Button
                      onClick={handleGenerateSolution}
                        disabled={generatingSolution}
                        className="flex-1 border border-nexa-border text-white bg-transparent p-6 text-lg font-medium rounded-xl border-draw-button generate-solution-button"
                      >
                        {generatingSolution ? (
                          createBlurScrollText('Generating Solution...', 'generate-loading')
                      ) : (
                        <>
                          <Lightbulb className="h-6 w-6 mr-3" />
                          <span className="generate-solution-text">Generate Solution</span>
                        </>
                      )}
                    </Button>
                      
                    </div>
                  </div>
                </div>
              </TabsContent>

            </Tabs>

            {/* Navigation Controls */}
            <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
              {activeMainTab !== 'project' ? (
                <Button 
                  onClick={handlePreviousTab} 
                  variant="outline"
                  className="border-nexa-border text-white hover:bg-white/10"
                >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Previous
                </Button>
              ) : (
                <div />
              )}
              
              {activeMainTab !== 'solution' ? (
                <Button 
                  onClick={handleNextTab}
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
        </div>
      </div>

      {/* Report Modal */}
      {showReportModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <div className="flex items-center space-x-3">
                <FileText className="h-6 w-6 text-nexa-accent" />
                <h3 className="text-white text-xl font-semibold">Analysis Report</h3>
              </div>
              <div className="flex items-center space-x-3">
                {!editingReport && (
                  <Button
                    onClick={handleEditReport}
                    variant="outline"
                    size="sm"
                    className="border-nexa-border hover:border-white/20"
                  >
                    Edit
                  </Button>
                )}
                {editingReport && (
                  <>
                    <Button
                      onClick={handleSaveReport}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={handleCancelEdit}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border hover:border-white/20"
                    >
                      Cancel
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleCloseReport}
                  variant="outline"
                  size="sm"
                  className="border-nexa-border hover:border-white/20"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {editingReport ? (
                <Textarea
                  value={editedReport}
                  onChange={(e) => setEditedReport(e.target.value)}
                  className="w-full h-96 bg-black border-nexa-border text-white resize-none"
                  placeholder="Enter report content..."
                />
              ) : (
                <div 
                  className="prose prose-invert max-w-none text-nexa-text-primary"
                  dangerouslySetInnerHTML={{ __html: reportData }}
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Solution Overview Modal */}
      {showOverviewModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-4xl mx-4 max-h-[80vh] flex flex-col shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <div className="flex items-center space-x-3">
                <BarChart3 className="h-6 w-6 text-nexa-accent" />
                <h3 className="text-white text-xl font-semibold">Solution Overview</h3>
              </div>
              <div className="flex items-center space-x-3">
                {!editingOverview && (
                  <Button
                    onClick={handleEditOverview}
                    variant="outline"
                    size="sm"
                    className="border-nexa-border hover:border-white/20"
                  >
                    Edit
                  </Button>
                )}
                {editingOverview && (
                  <>
                    <Button
                      onClick={handleSaveOverview}
                      size="sm"
                      className="bg-green-600 hover:bg-green-700"
                    >
                      Save
                    </Button>
                    <Button
                      onClick={handleCancelOverviewEdit}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border hover:border-white/20"
                    >
                      Cancel
                    </Button>
                  </>
                )}
                <Button
                  onClick={handleCloseOverview}
                  variant="outline"
                  size="sm"
                  className="border-nexa-border hover:border-white/20"
                >
                  Close
                </Button>
              </div>
            </div>

            {/* Modal Content */}
            <div className="flex-1 overflow-auto p-6">
              {editingOverview ? (
                <Textarea
                  value={editedOverview}
                  onChange={(e) => setEditedOverview(e.target.value)}
                  className="w-full h-96 bg-nexa-dark border-nexa-border text-white resize-none"
                  placeholder="Enter solution overview..."
                />
              ) : (
                <div 
                  className="prose prose-invert max-w-none text-nexa-text-primary"
                  dangerouslySetInnerHTML={{ __html: solutionOverview }}
                />
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
