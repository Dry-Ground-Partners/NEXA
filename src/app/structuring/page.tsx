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
  BarChart3,
  Edit,
  Eye
} from 'lucide-react'
import { QuickActionButton } from '@/components/ui/quick-action-button'
import { fetchWithLogging, activityLogger } from '@/lib/activity-logger'
import type { AuthUser } from '@/types'
import type { StructuringSessionData, SessionResponse, VisualsSessionData } from '@/lib/sessions'
import { createDefaultStructuringData } from '@/lib/sessions'
import { useUser } from '@/contexts/user-context'
import { MarkdownRenderer } from '@/components/structuring/MarkdownRenderer'

interface ContentTab {
  id: number
  text: string
}

interface SolutionTab {
  id: number
  text: string
}

export default function StructuringPage() {
  // Get organization context for usage tracking
  const { selectedOrganization } = useUser()
  
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
  const [editingContentTab, setEditingContentTab] = useState<number | null>(null) // Track which content tab is in edit mode
  
  // Solution tabs state
  const [solutionTabs, setSolutionTabs] = useState<SolutionTab[]>([{ id: 1, text: '' }])
  const [activeSolutionTab, setActiveSolutionTab] = useState(1)
  const [editingSolutionTab, setEditingSolutionTab] = useState<number | null>(null) // Track which solution tab is in edit mode
  
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
  const [transitioning, setTransitioning] = useState(false)
  const [solutionGenerated, setSolutionGenerated] = useState(false)

  // Streaming states
  const [streamingReport, setStreamingReport] = useState(false)
  const [streamingOverview, setStreamingOverview] = useState(false)

  // Helper function to stream text character-by-character (blazingly fast - 3ms per char)
  // Removed streaming simulation - instant display for better performance

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
          const response = await fetch(`/api/sessions/${sessionParam}?type=structuring`)
          const result = await response.json()
          
          if (result.success && result.session.data) {
            const data = result.session.data as StructuringSessionData
            
            // Restore session data
            setSessionId(sessionParam)
            setSessionData(data)
            
            // Restore form state
            setDate(data.basic.date)
            setEngineer(data.basic.engineer)
            // Only load if this is structuring data
            if (result.session.sessionType === 'structuring' && data.basic && data.contentTabs && data.solutionTabs) {
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
                setActiveMainTab(data.uiState.activeMainTab || 'project')
                setActiveContentTab(data.uiState.activeContentTab || 1)
                setActiveSolutionTab(data.uiState.activeSolutionTab || 1)
                setIsRolledBack(data.uiState.isRolledBack || false)
                setUseContextEcho(data.uiState.useContextEcho || true)
                setUseTracebackReport(data.uiState.useTracebackReport || false)
              }
              
              setLastSaved(new Date(data.lastSaved))
              console.log(`✅ Session loaded: "${data.basic.title}"`)
            } else {
              console.log('❌ Session is not a structuring session, redirecting...')
              // Redirect to appropriate page based on session type
              if (result.session.sessionType === 'visuals') {
                window.location.href = `/visuals?session=${sessionParam}`
              } else if (result.session.sessionType === 'solutioning') {
                window.location.href = `/solutioning?session=${sessionParam}`
              } else if (result.session.sessionType === 'sow') {
                window.location.href = `/sow?session=${sessionParam}`
              } else if (result.session.sessionType === 'loe') {
                window.location.href = `/loe?session=${sessionParam}`
              } else {
                window.history.replaceState({}, '', '/structuring')
              }
              return
            }
          } else {
            console.log('❌ Failed to load session:', result.error)
            // Remove invalid session from URL
            window.history.replaceState({}, '', '/structuring')
          }
        } catch (error: unknown) {
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
      } catch (error: unknown) {
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
    } catch (error: unknown) {
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

  // Keyboard shortcuts for structuring tabs
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
      
      // Structuring tab shortcuts
      const tabMap: { [key: string]: string } = {
        '1': 'project',
        '2': 'content',
        '3': 'solution'
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

  // Content tab management
  const addContentTab = () => {
    const newId = Math.max(...contentTabs.map(tab => tab.id)) + 1
    setContentTabs([...contentTabs, { id: newId, text: '' }])
    setActiveContentTab(newId)
  }

  const deleteContentTab = () => {
    if (contentTabs.length === 1) return // Prevent deleting last tab
    
    const currentActiveTab = activeContentTab || 1
    const filteredTabs = contentTabs.filter(tab => tab.id !== currentActiveTab)
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
    
    const currentActiveSolutionTab = activeSolutionTab || 1
    const filteredTabs = solutionTabs.filter(tab => tab.id !== currentActiveSolutionTab)
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
    // Validate organization selection
    if (!selectedOrganization) {
      alert('⚠️ Please select an organization before using AI features.')
      return
    }

    const allContent = contentTabs.map(tab => tab.text).join('\n\n').trim()
    
    console.log(`🔍 Processing ${contentTabs.length} content tabs (${allContent.length} characters)`)
    
    if (!allContent) {
      alert('Please add content before diagnosing.')
      return
    }

    setDiagnosing(true)
    
    try {
      const orgId = selectedOrganization.organization.id
      console.log(`🔍 Starting pain point diagnosis for org ${orgId}...`)
      
      const requestPayload = {
        content: contentTabs.map(tab => tab.text),
        echo: useContextEcho,
        traceback: useTracebackReport,
        sessionId: sessionId
      }
      
      console.log('📡 Step 1/2: Getting pain points...')
      console.log(`🏛️ Organization: ${selectedOrganization.organization.name}`)
      
      // STEP 1: Get pain points
      const response = await fetchWithLogging(
        `/api/organizations/${orgId}/structuring/analyze-pain-points`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(requestPayload)
        },
        {
          workflow: 'structuring',
          actionLabel: 'Diagnosed pain points'
        }
      )
      
      const result = await response.json()
      
      if (!result.success) {
        console.error('❌ Pain point analysis failed:', result.error)
        alert(`Analysis failed: ${result.error}`)
        setDiagnosing(false)
        return
      }
      
      console.log('✅ Pain point analysis completed!')
      console.log(`📊 Found ${result.data.pain_points.length} pain points`)
      
      // Log usage tracking info
      if (result.usage) {
        console.log(`💰 Credits consumed: ${result.usage.creditsConsumed}`)
        console.log(`💵 Credits remaining: ${result.usage.remainingCredits}`)
        console.log(`🎫 Usage event ID: ${result.usage.usageEventId}`)
        
        // Show warning if near limit
        if (result.usage.warning?.isNearLimit) {
          console.warn(`⚠️ Credit usage at ${result.usage.warning.percentageUsed}%`)
          alert(`⚠️ Warning: You've used ${result.usage.warning.percentageUsed}% of your credits. ${result.usage.remainingCredits} credits remaining.`)
        }
        
        // Block if over limit
        if (result.usage.warning?.isOverLimit) {
          alert(`🚫 Credit limit exceeded! ${result.usage.warning.recommendedAction}`)
          setDiagnosing(false)
          return
        }
      }
      
      // Store pain points in solution tabs (no streaming for pain points)
      
      // Replace solution tabs with pain points (start fresh)
      const newSolutionTabs: SolutionTab[] = result.data.pain_points.map((painPoint: string, index: number) => ({
        id: index + 1,
        text: painPoint
      }))
      
      setSolutionTabs(newSolutionTabs)
      setActiveSolutionTab(1)
      
      // Switch to solution tab to show results
      setActiveMainTab('solution')
      
      console.log(`✅ Step 1/2 complete! Found ${result.data.pain_points.length} pain points.`)
      
      // STEP 2: Generate analysis report (sequential, after pain points)
      console.log('📡 Step 2/2: Generating analysis report...')
      setStreamingReport(true)
      
      try {
        const reportResponse = await fetchWithLogging(
          `/api/organizations/${orgId}/structuring/generate-analysis-report`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              pain_points: result.data.pain_points,
              sessionId: sessionId
            })
          },
          {
            workflow: 'structuring',
            actionLabel: 'Generated analysis report'
          }
        )
        
        const reportResult = await reportResponse.json()
        
        if (reportResult.success && reportResult.data?.report) {
          console.log('✅ Analysis report received!')
          console.log(`📄 Report length: ${reportResult.data.report.length} characters`)
          
          // Instant display for better performance
          setReportData(reportResult.data.report)
          
          console.log('✨ Report displayed!')
        } else {
          console.warn('⚠️ Analysis report generation failed, using fallback')
          setReportData('Analysis report could not be generated.')
        }
      } catch (reportError) {
        console.error('⚠️ Error generating analysis report:', reportError)
        setReportData('Analysis report could not be generated.')
      } finally {
        setStreamingReport(false)
      }
      
      console.log(`🎉 Diagnosis complete! ${newSolutionTabs.length} pain points analyzed.`)
      
    } catch (error: unknown) {
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
    // Validate organization selection
    if (!selectedOrganization) {
      alert('⚠️ Please select an organization before using AI features.')
      return
    }

    // Backup current pain points for rollback
    setOriginalPainPoints([...solutionTabs])
    
    setGeneratingSolution(true)
    
    try {
      const orgId = selectedOrganization.organization.id
      console.log(`🔍 Starting solution generation for org ${orgId}...`)
      
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
      console.log(`🏛️ Organization: ${selectedOrganization.organization.name}`)
      
      // Build action label with feature flags
      const features: string[] = []
      if (useContextEcho) features.push('with context')
      if (useTracebackReport) features.push('with traceback')
      const actionLabel = `Generated solution${features.length > 0 ? ' ' + features.join(' ') : ''}`
      
      // Call organization-scoped API with usage tracking
      const response = await fetchWithLogging(
        `/api/organizations/${orgId}/structuring/generate-solution`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            solutionContent,
            content: contextContent,
            report: reportContent,
            echo: useContextEcho,
            traceback: useTracebackReport,
            sessionId: sessionId
          })
        },
        {
          workflow: 'structuring',
          actionLabel
        }
      )
      
      const result = await response.json()
      console.log('📦 Raw API response:', result)
      
      if (!result.success) {
        console.error('❌ Solution generation failed:', result.error)
        alert(`Solution generation failed: ${result.error}`)
        return
      }
      
      console.log('✅ Step 1/2: Solution generation completed!')
      console.log('🔍 Full API response:', result)
      
      // Log usage tracking info
      if (result.usage) {
        console.log(`💰 Credits consumed: ${result.usage.creditsConsumed}`)
        console.log(`💵 Credits remaining: ${result.usage.remainingCredits}`)
        console.log(`🎫 Usage event ID: ${result.usage.usageEventId}`)
        
        // Show warning if near limit
        if (result.usage.warning?.isNearLimit) {
          console.warn(`⚠️ Credit usage at ${result.usage.warning.percentageUsed}%`)
          alert(`⚠️ Warning: You've used ${result.usage.warning.percentageUsed}% of your credits. ${result.usage.remainingCredits} credits remaining.`)
        }
        
        // Block if over limit
        if (result.usage.warning?.isOverLimit) {
          alert(`🚫 Credit limit exceeded! ${result.usage.warning.recommendedAction}`)
          setGeneratingSolution(false)
          return
        }
      }
      
      // Validate response structure
      if (!result.data) {
        console.error('❌ No data in response:', result)
        alert('Solution generation failed: No data received from API')
        setGeneratingSolution(false)
        return
      }
      
      if (!result.data.solution_parts || !Array.isArray(result.data.solution_parts)) {
        console.error('❌ Invalid solution_parts in response:', result.data)
        alert('Solution generation failed: Invalid response format - missing solution_parts array')
        setGeneratingSolution(false)
        return
      }

      console.log(`📊 Generated ${result.data.solution_parts.length} solution parts`)
      
      // Store generated data
      setGeneratedSolutions(result.data.solution_parts)
      
      // Replace solution tabs with generated solutions
      const newSolutionTabs: SolutionTab[] = result.data.solution_parts.map((solution: string, index: number) => ({
        id: index + 1,
        text: solution
      }))
      
      setSolutionTabs(newSolutionTabs)
      setActiveSolutionTab(1)
      setIsRolledBack(false)
      setSolutionGenerated(true)
      
      console.log(`✅ Step 1/2 complete! Generated ${result.data.solution_parts.length} solutions.`)
      
      // STEP 2: Generate solution overview (sequential, after solutions)
      console.log('📡 Step 2/2: Generating solution overview...')
      setStreamingOverview(true)
      
      try {
        const overviewResponse = await fetchWithLogging(
          `/api/organizations/${orgId}/structuring/generate-solution-overview`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              solutions: result.data.solution_parts,
              sessionId: sessionId
            })
          },
          {
            workflow: 'structuring',
            actionLabel: 'Generated solution overview'
          }
        )
        
        const overviewResult = await overviewResponse.json()
        
        if (overviewResult.success && overviewResult.data?.overview) {
          console.log('✅ Solution overview received!')
          console.log(`📄 Overview length: ${overviewResult.data.overview.length} characters`)
          
          // Instant display for better performance
          setSolutionOverview(overviewResult.data.overview)
          
          console.log('✨ Overview displayed!')
        } else {
          console.warn('⚠️ Solution overview generation failed, using fallback')
          setSolutionOverview('Solution overview could not be generated.')
        }
      } catch (overviewError) {
        console.error('⚠️ Error generating solution overview:', overviewError)
        setSolutionOverview('Solution overview could not be generated.')
      } finally {
        setStreamingOverview(false)
      }
      
      console.log(`🎉 Solution generation complete! ${newSolutionTabs.length} solutions created.`)
      
    } catch (error: unknown) {
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
    
    // Log activity
    activityLogger.log({
      workflow: 'structuring',
      action: 'Rolled back to original pain points',
      status: 'success'
    })
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
    
    // Log activity
    activityLogger.log({
      workflow: 'structuring',
      action: 'Applied generated solutions',
      status: 'success'
    })
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
            sessionType: 'structuring',
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
    } catch (error: unknown) {
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
      } catch (error: unknown) {
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

  // Data transformation function for structuring → visuals
  const createVisualsDataFromStructuring = (structuringData: StructuringSessionData): VisualsSessionData => {
    return {
      // Copy basic information
      basic: {
        date: structuringData.basic.date,
        engineer: structuringData.basic.engineer,
        title: structuringData.basic.title,
        client: structuringData.basic.client
      },
      
      // Transform solutions to diagram sets
      diagramSets: (() => {
        const nonEmptySolutions = structuringData.solutionTabs
          .filter(tab => tab.text.trim() !== '') // Only include non-empty solutions
          .map((solution, index) => ({
            id: index + 1,
            ideation: solution.text,        // Solution becomes ideation
            planning: '',                   // Empty for user to fill
            sketch: '',                     // Empty for user to fill
            image: null,                    // Empty for user to upload
            expandedContent: '',
            isExpanded: false
          }))
        
        // Ensure at least one diagram set exists
        return nonEmptySolutions.length > 0 ? nonEmptySolutions : [{
          id: 1,
          ideation: '',
          planning: '',
          sketch: '',
          image: null,
          expandedContent: '',
          isExpanded: false
        }]
      })(),
      
      // Default UI state
      uiState: {
        activeDiagramTab: 1,
        activeMainTab: 'diagrams'
      },
      
      // Metadata
      lastSaved: new Date().toISOString(),
      version: 1
    }
  }

  // Transition to visuals handler
  const handleTransitionToVisuals = async () => {
    if (!sessionId) {
      alert('Please save your session first before transitioning to visuals.')
      return
    }

    setSaving(true) // Use existing saving state for UI feedback
    setTransitioning(true) // Start transition animation
    
    try {
      // 1. Get current structuring data
      // Validate organization selection
      if (!selectedOrganization) {
        alert('⚠️ Please select an organization before pushing features.')
        return
      }

      const orgId = selectedOrganization.organization.id
      console.log(`🚀 Pushing to visuals for org ${orgId}...`)

      const currentStructuringData = collectCurrentData()
      
      // 2. Create visuals data structure
      const visualsData = createVisualsDataFromStructuring(currentStructuringData)
      
      // 3. Update same session row with visual data (org-scoped)
      const response = await fetchWithLogging(
        `/api/organizations/${orgId}/sessions/${sessionId}/add-visuals`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ visualsData })
        },
        {
          workflow: 'structuring',
          actionLabel: 'Pushed to Visuals'
        }
      )
      
      const result = await response.json()
      
      // Log usage tracking info
      if (result.usage) {
        console.log(`💰 Credits consumed: ${result.usage.creditsConsumed}`)
        console.log(`💵 Credits remaining: ${result.usage.remainingCredits}`)
        
        if (result.usage.warning?.isNearLimit) {
          alert(`⚠️ Warning: You've used ${result.usage.warning.percentageUsed}% of your credits.`)
        }
      }
      
      if (result.success) {
        // 4. Navigate to visuals with session loaded - animation continues until new page loads
        window.location.href = `/visuals?session=${sessionId}`
      } else {
        alert('Failed to transition to visuals. Please try again.')
        setSaving(false)
        setTransitioning(false)
      }
    } catch (error: unknown) {
      console.error('Error transitioning to visuals:', error)
      alert('Error transitioning to visuals. Please try again.')
      setSaving(false)
      setTransitioning(false)
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
    >
      <div className="nexa-background nexa-page-wrapper p-6">
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
                    
                    <Tabs value={(activeContentTab || 1).toString()} onValueChange={(value) => setActiveContentTab(parseInt(value))}>
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
                          <div className="relative">
                            {/* Toggle Button (top-right) */}
                            <div className="absolute top-2 right-2 z-10">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingContentTab(
                                  editingContentTab === tab.id ? null : tab.id
                                )}
                                className="bg-black/50 backdrop-blur-sm border border-nexa-border hover:bg-black/70"
                              >
                                {editingContentTab === tab.id ? (
                                  <>
                                    <Eye className="h-4 w-4 mr-1" />
                                    Display
                                  </>
                                ) : (
                                  <>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {/* Content: Edit or Display Mode */}
                            {editingContentTab === tab.id ? (
                              <Textarea
                                variant="nexa"
                                placeholder="Enter your content here (markdown supported)..."
                                value={tab.text}
                                onChange={(e) => updateContentTab(tab.id, e.target.value)}
                                className="resize-none min-h-[400px] h-auto"
                              />
                            ) : (
                              <div className="border border-nexa-border rounded-lg p-4 bg-black/50 min-h-[400px] overflow-auto">
                                {tab.text ? (
                                  <MarkdownRenderer content={tab.text} />
                                ) : (
                                  <p className="text-nexa-text-secondary italic">No content yet. Click "Edit" to add content...</p>
                                )}
                              </div>
                            )}
                          </div>
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
                      <QuickActionButton
                        icon={<Radio className="h-4 w-4" />}
                        title="Context Echo"
                        description="When enabled, the AI will include all content from the Content tab as context when generating solutions. This helps the AI understand the full scope and provide more relevant solutions. Disable to generate solutions based only on pain points."
                        onClick={() => setUseContextEcho(!useContextEcho)}
                        variant={useContextEcho ? 'active' : 'default'}
                      />
                      
                      {/* Traceback Report Toggle */}
                      <QuickActionButton
                        icon={<Activity className="h-4 w-4" />}
                        title="Traceback Report"
                        description="When enabled, the AI will reference the diagnostic analysis report when generating solutions. This provides continuity and ensures solutions address the identified pain points. Disable for a fresh perspective without prior analysis."
                        onClick={() => setUseTracebackReport(!useTracebackReport)}
                        variant={useTracebackReport ? 'active' : 'default'}
                      />
                      
                      {/* Rollback/Apply Toggle Button */}
                      <QuickActionButton
                        icon={isRolledBack ? <Check className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
                        title={isRolledBack ? 'Apply Solutions' : 'Rollback'}
                        description={isRolledBack 
                          ? 'Restore the AI-generated solutions, replacing the current pain points. Use this after reviewing the original pain points to return to the enhanced solutions.'
                          : 'Revert to the original pain points before AI solution generation. Useful for comparing the raw analysis with the AI-enhanced solutions.'}
                        onClick={() => {
                          if (originalPainPoints.length === 0) return
                          if (isRolledBack) {
                            handleApply()
                          } else {
                            handleRollback()
                          }
                        }}
                        disabled={originalPainPoints.length === 0}
                        variant={isRolledBack ? 'success' : 'warning'}
                      />
                      
                      {/* Analysis Report Button */}
                      <QuickActionButton
                        icon={<FileText className="h-4 w-4" />}
                        title="Analysis Report"
                        description="View the comprehensive diagnostic analysis report generated from your content. This report contains detailed insights, patterns, and pain points identified by the AI. Available after running Diagnose."
                        onClick={reportData ? handleOpenReport : undefined}
                        disabled={!reportData}
                      />
                      
                      {/* Solution Overview Button */}
                      <QuickActionButton
                        icon={<BarChart3 className="h-4 w-4" />}
                        title="Solution Overview"
                        description="View a high-level summary of all generated solutions. This overview provides a bird's-eye view of the recommendations, making it easier to understand the complete solution landscape. Available after generating solutions."
                        onClick={solutionOverview ? handleOpenOverview : undefined}
                        disabled={!solutionOverview}
                      />
                    </div>
                    
                    <Tabs value={(activeSolutionTab || 1).toString()} onValueChange={(value) => setActiveSolutionTab(parseInt(value))}>
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
                          <div className="relative">
                            {/* Toggle Button (top-right) */}
                            <div className="absolute top-2 right-2 z-10">
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setEditingSolutionTab(
                                  editingSolutionTab === tab.id ? null : tab.id
                                )}
                                className="bg-black/50 backdrop-blur-sm border border-nexa-border hover:bg-black/70"
                              >
                                {editingSolutionTab === tab.id ? (
                                  <>
                                    <Eye className="h-4 w-4 mr-1" />
                                    Display
                                  </>
                                ) : (
                                  <>
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </>
                                )}
                              </Button>
                            </div>
                            
                            {/* Content: Edit or Display Mode */}
                            {editingSolutionTab === tab.id ? (
                              <Textarea
                                variant="nexa"
                                placeholder="Enter your solution here (markdown supported)..."
                                value={tab.text}
                                onChange={(e) => updateSolutionTab(tab.id, e.target.value)}
                                className="resize-none min-h-[400px] h-auto"
                              />
                            ) : (
                              <div className="border border-nexa-border rounded-lg p-4 bg-black/50 min-h-[400px] overflow-auto">
                                {tab.text ? (
                                  <MarkdownRenderer content={tab.text} />
                                ) : (
                                  <p className="text-nexa-text-secondary italic">No solution yet. Click "Edit" to add a solution...</p>
                                )}
                              </div>
                            )}
                          </div>
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
              ) : solutionGenerated ? (
                <button
                  onClick={handleTransitionToVisuals}
                  disabled={saving}
                  className="group backdrop-blur-md bg-gradient-to-br from-slate-800/50 to-blue-800/30 border border-slate-700/50 rounded-lg px-3 py-1.5 hover:border-slate-600/60 active:from-slate-600/60 active:to-blue-600/60 active:border-blue-500/50 transition-all duration-300 shadow-md hover:shadow-lg text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <div className="flex items-center gap-2">
                    {saving ? (
                      <>
                        <RotateCw className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Transitioning...</span>
                      </>
                    ) : (
                      <>
                        <ArrowRight className="h-4 w-4" />
                        <span className="text-sm">To visuals</span>
                      </>
                    )}
                  </div>
                </button>
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
                  className="w-full min-h-[600px] h-auto bg-black border-nexa-border text-white resize-none"
                  placeholder="Enter report content (markdown supported)..."
                />
              ) : (
                <MarkdownRenderer 
                  content={reportData}
                  className="text-nexa-text-primary"
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
                  className="w-full min-h-[600px] h-auto bg-nexa-dark border-nexa-border text-white resize-none"
                  placeholder="Enter solution overview (markdown supported)..."
                />
              ) : (
                <MarkdownRenderer 
                  content={solutionOverview}
                  className="text-nexa-text-primary"
                />
              )}
            </div>
          </div>
        </div>
      )}

      {/* Glass Blur Overlay for Transitioning to Visuals */}
      {transitioning && (
        <div className="glass-blur-overlay">
          <div className="flex flex-col items-center">
            <img
              src="/images/nexanonameicon.png?v=1"
              alt="NEXA"
              className="nexa-structuring-icon"
            />
            <div className="mt-6 blur-scroll-loading transitioning-loading">
              {"Transitioning...".split("").map((letter, index) => (
                <span key={index} className="blur-scroll-letter">
                  {letter === " " ? "\u00A0" : letter}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}
