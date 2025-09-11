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
  Info,
  Plus,
  ArrowRight,
  ArrowLeft,
  Eye,
  Cpu,
  RefreshCw,
  Zap,
  Edit3,
  Camera,
  Layers,
  FileText,
  Download,
  Save,
  Trash2,
  Upload,
  X,
  RotateCw,
  Cog,
  Aperture,
  Palette,
  Target,
  Wand2
} from 'lucide-react'
import type { AuthUser } from '@/types'
import type { SolutioningSessionData, SessionResponse } from '@/lib/sessions'
import { createDefaultSolutioningData } from '@/lib/sessions'

interface Solution {
  id: number
  additional: {
    imageData: string | null
    imageUrl: string | null
  }
  variables: {
    aiAnalysis: string
    solutionExplanation: string
  }
  structure: {
    title: string
    steps: string
    approach: string
    difficulty: number
    layout: number
    stack: string
  }
}

export default function SolutioningPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaved, setLastSaved] = useState<Date | null>(null)
  const [saving, setSaving] = useState(false)
  
  // Tab state
  const [activeMainTab, setActiveMainTab] = useState('basic')
  const [activeSubTab, setActiveSubTab] = useState('additional') // 'additional' or 'structured'
  
  // Session data
  const [sessionData, setSessionData] = useState<SolutioningSessionData>(createDefaultSolutioningData())

  // Modal states
  const [modals, setModals] = useState({
    imagePreview: false,
    aiAnalysis: false,
    explanation: false,
    imageActions: false,
    stackModal: false,
    layoutModal: false,
    difficultyModal: false
  })

  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    vision: false,
    structuring: false,
    enhancing: false,
    generating: false,
    uploading: false,
    analysisInProgress: false,
    autoFormatting: false
  })

  // Image states for color-coding
  const getImageState = (solution: any) => {
    if (!solution.additional.imageData) return 'empty'
    if (loadingStates.uploading) return 'uploading' 
    if (loadingStates.analysisInProgress) return 'analyzing'
    if ((solution.additional as any).analysisError) return 'error'
    if (solution.variables.aiAnalysis) return 'success'
    if (solution.additional.imageData && !solution.variables.aiAnalysis) return 'loaded'
    return 'empty'
  }

  const getImageStateColors = (state: string) => {
    switch (state) {
      case 'empty': return 'bg-nexa-input border-nexa-border'
      case 'uploading': return 'bg-blue-900/30 border-blue-500 animate-pulse'
      case 'loaded': return 'bg-nexa-input border-nexa-border' // Normal styling when loaded but not analyzed
      case 'analyzing': return 'bg-blue-900/30 border-blue-500 shimmer'
      case 'success': return 'bg-green-900/30 border-green-500'
      case 'error': return 'bg-red-900/30 border-red-500'
      default: return 'bg-nexa-input border-nexa-border'
    }
  }

  // Edit states for structured solution
  const [editStates, setEditStates] = useState({
    title: false,
    steps: false,
    approach: false
  })

  // Load session from URL on mount
  useEffect(() => {
    const loadSession = async () => {
      const urlParams = new URLSearchParams(window.location.search)
      const sessionParam = urlParams.get('session')
      
      if (sessionParam) {
        console.log(`🔄 Loading solutioning session from URL: ${sessionParam}`)
        
        try {
          const response = await fetch(`/api/sessions/${sessionParam}?type=solutioning`)
          const result = await response.json()
          
          if (result.success && result.session.data) {
            const data = result.session.data as SolutioningSessionData
            
            console.log('✅ Loaded solutioning session data:', data)
            console.log(`📊 Solutions loaded: ${Object.keys(data.solutions).length}`)
            
            // Restore session data
            setSessionId(sessionParam)
            setSessionData(data)
            setHasUnsavedChanges(false)
            setLastSaved(new Date(data.lastSaved || Date.now()))
            
            // Restore UI state if present
            if (data.uiState) {
              setActiveMainTab(data.uiState.activeMainTab || 'basic')
              setActiveSubTab(data.uiState.activeSubTab || 'additional')
            }
            
            console.log(`✅ Session loaded successfully: "${data.basic.title}"`)
          } else {
            console.log('❌ Session is not a solutioning session or failed to load, redirecting...')
            // Redirect to appropriate page based on session type
            if (result.session?.sessionType === 'structuring') {
              window.location.href = `/structuring?session=${sessionParam}`
            } else if (result.session?.sessionType === 'visuals') {
              window.location.href = `/visuals?session=${sessionParam}`
            } else if (result.session?.sessionType === 'sow') {
              window.location.href = `/sow?session=${sessionParam}`
            } else if (result.session?.sessionType === 'loe') {
              window.location.href = `/loe?session=${sessionParam}`
            } else {
              console.log('❌ Failed to load session:', result.error)
              // Remove invalid session from URL
              window.history.replaceState({}, '', '/solutioning')
            }
          }
        } catch (error) {
          console.error('💥 Error loading session:', error)
          window.history.replaceState({}, '', '/solutioning')
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
      } catch (error) {
        console.error('Error fetching user:', error)
        window.location.href = '/auth/login'
      } finally {
        setLoading(false)
      }
    }
    
    fetchUser()
  }, [])

  // Collect current data for saving
  const collectCurrentData = useCallback((): SolutioningSessionData => {
    return {
      basic: sessionData.basic,
      currentSolution: sessionData.currentSolution,
      solutionCount: sessionData.solutionCount,
      solutions: sessionData.solutions,
      uiState: {
        activeMainTab,
        activeSubTab
      },
      lastSaved: new Date().toISOString(),
      version: sessionData.version || 0
    }
  }, [sessionData, activeMainTab, activeSubTab])

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!sessionId || saving || !hasUnsavedChanges) return
    
    try {
      const currentData = collectCurrentData()
      console.log('💾 Auto-saving solutioning session...')
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: currentData,
          title: currentData.basic.title,
          client: currentData.basic.recipient
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
  }, [sessionId, saving, hasUnsavedChanges, collectCurrentData])

  // Manual save function
  const handleSave = async () => {
    setSaving(true)
    
    try {
      const currentData = collectCurrentData()
      console.log('💾 Saving solutioning session...', { sessionId, title: currentData.basic.title, client: currentData.basic.recipient })
      
      if (sessionId) {
        // Update existing session
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: currentData,
            title: currentData.basic.title,
            client: currentData.basic.recipient
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
            sessionType: 'solutioning',
            data: currentData,
            title: currentData.basic.title,
            client: currentData.basic.recipient
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setSessionId(result.session.uuid)
          setSessionData(currentData)
          setHasUnsavedChanges(false)
          setLastSaved(new Date())
          console.log(`✅ New solutioning session created: ${result.session.uuid}`)
          
          // Update URL to include session ID
          window.history.replaceState({}, '', `/solutioning?session=${result.session.uuid}`)
        } else {
          console.error('❌ Failed to create session:', result.error)
          alert(`Failed to save session: ${result.error}`)
        }
      }
    } catch (error) {
      console.error('💥 Save error:', error)
      alert('An error occurred while saving the session')
    } finally {
      setSaving(false)
    }
  }

  // Track changes for auto-save
  useEffect(() => {
    const trackingData = [
      sessionData.basic,
      sessionData.currentSolution,
      sessionData.solutionCount,
      JSON.stringify(sessionData.solutions),
      activeMainTab,
      activeSubTab
    ]
    
    if (sessionId) {
      setHasUnsavedChanges(true)
    }
  }, [
    sessionData.basic,
    sessionData.currentSolution,
    sessionData.solutionCount,
    sessionData.solutions,
    activeMainTab,
    activeSubTab,
    sessionId
  ])

  // Auto-save debounced
  useEffect(() => {
    if (hasUnsavedChanges && sessionId) {
      const autoSaveTimer = setTimeout(autoSave, 3000) // Auto-save after 3 seconds of inactivity
      return () => clearTimeout(autoSaveTimer)
    }
  }, [hasUnsavedChanges, sessionId, autoSave])

  // Add paste event listener for image upload
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      handlePaste(event)
    }

    document.addEventListener('paste', handleGlobalPaste)
    
    return () => {
      document.removeEventListener('paste', handleGlobalPaste)
    }
  }, [modals.imageActions])

  // Get current solution
  const currentSolution = sessionData.solutions[sessionData.currentSolution]

  // Navigation functions for Additional Content section
  const handleAdditionalNext = () => {
    // From Additional Content, Next toggles to Structured Solution in same tab
    setActiveSubTab('structured')
  }

  const handleAdditionalPrevious = () => {
    // From Additional Content, Back goes to previous main tab
    if (activeMainTab.startsWith('solution-')) {
      const currentSolutionNum = parseInt(activeMainTab.split('-')[1])
      if (currentSolutionNum === 1) {
        setActiveMainTab('basic')
      } else {
        const prevSolution = currentSolutionNum - 1
        setActiveMainTab(`solution-${prevSolution}`)
        setActiveSubTab('structured') // Go to Structured Solution of previous tab
        switchSolution(prevSolution)
      }
    }
  }

  // Navigation functions for Structured Solution section
  const handleStructuredNext = () => {
    // From Structured Solution, Next goes to next main tab
    const currentSolutionNum = parseInt(activeMainTab.split('-')[1])
    const nextSolution = Math.min(currentSolutionNum + 1, sessionData.solutionCount)
    if (nextSolution > currentSolutionNum) {
      setActiveMainTab(`solution-${nextSolution}`)
      setActiveSubTab('additional') // Go to Additional Content of next tab
      switchSolution(nextSolution)
    }
  }

  const handleStructuredPrevious = () => {
    // From Structured Solution, Back toggles to Additional Content in same tab
    setActiveSubTab('additional')
  }

  // Main tab navigation (for Basic tab)
  const handleBasicNext = () => {
    setActiveMainTab('solution-1')
    setActiveSubTab('additional')
    switchSolution(1)
  }

  // Solution management
  const addSolution = () => {
    const newSolutionId = sessionData.solutionCount + 1
    const newSolution: Solution = {
      id: newSolutionId,
      additional: { imageData: null, imageUrl: null },
      variables: { aiAnalysis: '', solutionExplanation: '' },
      structure: { title: '', steps: '', approach: '', difficulty: 50, layout: 1, stack: '' }
    }
    
    setSessionData(prev => ({
      ...prev,
      solutionCount: newSolutionId,
      currentSolution: newSolutionId,
      solutions: {
        ...prev.solutions,
        [newSolutionId]: newSolution
      }
    }))
    setActiveMainTab(`solution-${newSolutionId}`)
    setActiveSubTab('additional')
  }

  const switchSolution = (solutionId: number) => {
    setSessionData(prev => ({
      ...prev,
      currentSolution: solutionId
    }))
    setActiveMainTab(`solution-${solutionId}`)
    // Reset to Additional Content when switching solutions via tab click
    setActiveSubTab('additional')
  }

  // Notification function
  const showAnimatedNotification = (message: string, type: 'success' | 'error') => {
    if (type === 'success') {
      alert(`✅ ${message}`)
    } else {
      alert(`❌ ${message}`)
    }
  }

  // Auto-trigger vision analysis after image upload
  const triggerVisionAnalysis = async (imageData: string) => {
    setLoadingStates(prev => ({ ...prev, analysisInProgress: true }))
    
    // Clear any previous analysis error
    setSessionData(prev => ({
      ...prev,
      solutions: {
        ...prev.solutions,
        [prev.currentSolution]: {
          ...prev.solutions[prev.currentSolution],
          additional: {
            ...prev.solutions[prev.currentSolution].additional,
            analysisError: false
          }
        }
      }
    }))
    
    try {
      console.log('🔍 Starting vision analysis...')
      
      const response = await fetch('/api/solutioning/analyze-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          imageData: imageData,
          additionalContext: currentSolution.variables.solutionExplanation || 'No additional context provided'
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Vision analysis failed')
      }

      console.log('✅ Auto vision analysis completed successfully')
      
      // Update the session data with the analysis
      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            variables: {
              ...prev.solutions[prev.currentSolution].variables,
              aiAnalysis: result.analysis
            }
          }
        }
      }))
      
    } catch (error) {
      console.error('❌ Auto vision analysis failed:', error)
      // Set error state for visual feedback
      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            additional: {
              ...prev.solutions[prev.currentSolution].additional,
              analysisError: true
            }
          }
        }
      }))
    } finally {
      setLoadingStates(prev => ({ ...prev, analysisInProgress: false }))
    }
  }

  // Manual re-analysis (for retry button) - Always trigger analysis
  const runVisionAnalysis = async () => {
    if (!currentSolution.additional.imageData) {
      alert('Please upload an image first.')
      return
    }
    console.log('🔄 Manual re-analysis triggered')
    await triggerVisionAnalysis(currentSolution.additional.imageData)
  }

  // Auto-formatting function
  const autoFormatContent = async () => {
    const title = currentSolution.structure.title
    const steps = currentSolution.structure.steps
    const approach = currentSolution.structure.approach
    
    if (!title && !steps && !approach) {
      alert('Please add some content to title, steps, or approach before formatting.')
      return
    }

    setLoadingStates(prev => ({ ...prev, autoFormatting: true }))
    
    try {
      console.log('🎨 Starting auto-formatting...')
      
      const response = await fetch('/api/solutioning/auto-format', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          title,
          steps,
          approach
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Auto-formatting failed')
      }

      console.log('✅ Auto-formatting completed successfully')
      
      // Update the session data with the formatted content
      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            structure: {
              ...prev.solutions[prev.currentSolution].structure,
              title: result.formatted.title || title,
              steps: result.formatted.steps || steps,
              approach: result.formatted.approach || approach
            }
          }
        }
      }))

      showAnimatedNotification('Content formatted successfully with HTML enhancements!', 'success')
      
    } catch (error) {
      console.error('❌ Auto-formatting failed:', error)
      showAnimatedNotification('Auto-formatting failed. Please try again.', 'error')
    } finally {
      setLoadingStates(prev => ({ ...prev, autoFormatting: false }))
    }
  }

  const structureSolution = async () => {
    const explanation = currentSolution.variables.solutionExplanation
    const analysis = currentSolution.variables.aiAnalysis
    
    if (!explanation && !analysis) {
      alert('Please provide solution explanation or run vision analysis first.')
      return
    }

    setLoadingStates(prev => ({ ...prev, structuring: true }))
    
    try {
      const response = await fetch('/api/solutioning/structure-solution', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          aiAnalysis: analysis,
          solutionExplanation: explanation
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Solution structuring failed')
      }

      // Update the session data with the structured solution
      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            structure: {
              ...prev.solutions[prev.currentSolution].structure,
              ...result.structure
            }
          }
        }
      }))

      showAnimatedNotification('Solution structured successfully!', 'success')
      
      // Auto-click Next button after successful structuring
      setTimeout(() => {
        setActiveSubTab('structured')
      }, 1000)
      
    } catch (error) {
      console.error('❌ Solution structuring failed:', error)
      showAnimatedNotification('Solution structuring failed. Please try again.', 'error')
    } finally {
      setLoadingStates(prev => ({ ...prev, structuring: false }))
    }
  }

  const enhanceExplanation = async () => {
    if (!currentSolution.variables.solutionExplanation.trim()) {
      alert('Please provide some explanation text to enhance.')
      return
    }

    setLoadingStates(prev => ({ ...prev, enhancing: true }))
    
    try {
      const response = await fetch('/api/solutioning/enhance-text', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: currentSolution.variables.solutionExplanation
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Text enhancement failed')
      }
      
      // Update the session data with the enhanced text
      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            variables: {
              ...prev.solutions[prev.currentSolution].variables,
              solutionExplanation: result.enhancedText
            }
          }
        }
      }))
      
      showAnimatedNotification('Text enhanced successfully!', 'success')
      
    } catch (error) {
      console.error('❌ Text enhancement failed:', error)
      showAnimatedNotification('Text enhancement failed. Please try again.', 'error')
    } finally {
      setLoadingStates(prev => ({ ...prev, enhancing: false }))
    }
  }

  const generateStack = async () => {
    const analysis = currentSolution.variables.aiAnalysis
    const steps = currentSolution.structure.steps
    
    if (!analysis && !steps) {
      alert('Please provide AI analysis or structure the solution first.')
      return
    }

    setLoadingStates(prev => ({ ...prev, generating: true }))
    
    try {
      // Concatenate AI analysis and solution steps as context
      const context = [
        analysis && `AI ANALYSIS: ${analysis}`,
        steps && `SOLUTION STEPS: ${steps}`
      ].filter(Boolean).join('\n\n')

      const response = await fetch('/api/solutioning/analyze-pernode', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          context: context
        })
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Per-node stack analysis failed')
      }

      // Update the session data with the stack analysis
      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            structure: {
              ...prev.solutions[prev.currentSolution].structure,
              stack: result.analysis
            }
          }
        }
      }))

      showAnimatedNotification('Per-node stack analysis generated successfully!', 'success')
      
    } catch (error) {
      console.error('❌ Per-node stack analysis failed:', error)
      showAnimatedNotification('Per-node stack analysis failed. Please try again.', 'error')
    } finally {
      setLoadingStates(prev => ({ ...prev, generating: false }))
    }
  }

  const handleSaveSolution = async () => {
    setLoadingStates(prev => ({ ...prev, saving: true }))
    setTimeout(() => {
      alert('Solution saved successfully!')
      setLoadingStates(prev => ({ ...prev, saving: false }))
    }, 1000)
  }

  const deleteSolution = async () => {
    if (confirm('Are you sure you want to delete this solution?')) {
      if (sessionData.solutionCount === 1) {
        alert('Cannot delete the last remaining solution.')
        return
      }
      
      // Remove current solution and switch to solution 1
      const newSolutions = { ...sessionData.solutions }
      delete newSolutions[sessionData.currentSolution]
      
      setSessionData(prev => ({
        ...prev,
        currentSolution: 1,
        solutions: newSolutions
      }))
      setActiveMainTab('solution-1')
    }
  }

  // Delete function with blur effect - deletes current tab or session
  const handleDelete = async () => {
    // If on Basic tab, ignore silently
    if (activeMainTab === 'basic') {
      return
    }
    
    // If on a solution tab, delete that specific solution
    if (activeMainTab.startsWith('solution-')) {
      const solutionId = parseInt(activeMainTab.replace('solution-', ''))
      
      if (sessionData.solutionCount === 1) {
        // If last solution, delete entire session
        if (confirm('Are you sure you want to delete this solutioning session? This is the last solution.')) {
      window.location.href = '/dashboard'
    }
        return
      }
      
      // Add blur effect to button immediately
      const deleteButton = document.querySelector('button[data-delete-btn]') as HTMLElement
      if (deleteButton) {
        deleteButton.style.filter = 'blur(3px)'
        deleteButton.style.opacity = '0.7'
      }
      
      // Remove the solution immediately (no waiting for animation)
      const newSolutions = { ...sessionData.solutions }
      delete newSolutions[solutionId]
      
      // Update solution count
      const newSolutionCount = sessionData.solutionCount - 1
      
      // Switch to Basic tab or first available solution
      const remainingSolutions = Object.keys(newSolutions).map(Number)
      const nextTab = remainingSolutions.length > 0 ? `solution-${remainingSolutions[0]}` : 'basic'
      const nextSolution = remainingSolutions.length > 0 ? remainingSolutions[0] : 1
      
      setSessionData(prev => ({
        ...prev,
        currentSolution: nextSolution,
        solutionCount: newSolutionCount,
        solutions: newSolutions
      }))
      setActiveMainTab(nextTab)
      
      // Remove blur effect after a short delay
      setTimeout(() => {
        if (deleteButton) {
          deleteButton.style.filter = ''
          deleteButton.style.opacity = ''
        }
      }, 300)
    }
  }

  // PDF functions
  const previewPDF = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, generating: true }))
      
      console.log('🔍 PDF Preview: Starting preview...')
      
      const response = await fetch('/api/solutioning/preview-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionData, sessionId })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          // Import client-side converter dynamically
          const { generatePDFFromHTMLClient } = await import('@/lib/pdf/client-converter')
          
          console.log('🔄 Generating PDF for preview...')
          
          // Generate PDF on client-side
          const pdfBlob = await generatePDFFromHTMLClient(result.templateData)
          
          // Create URL and open PDF in new tab for preview
          const pdfUrl = URL.createObjectURL(pdfBlob)
          window.open(pdfUrl, '_blank')
          
          console.log('✅ PDF Preview: PDF opened in new tab successfully')
          showAnimatedNotification('PDF preview opened in new tab!', 'success')
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } else {
        const errorData = await response.json()
        console.error('❌ PDF Preview: Error response:', errorData)
        showAnimatedNotification('Failed to generate PDF preview. Please try again.', 'error')
      }
    } catch (error) {
      console.error('❌ PDF Preview: Error:', error)
      showAnimatedNotification('Failed to generate PDF preview. Please check the console for details.', 'error')
    } finally {
      setLoadingStates(prev => ({ ...prev, generating: false }))
    }
  }

  const generatePDF = async () => {
    try {
      setLoadingStates(prev => ({ ...prev, generating: true }))
      
      console.log('🔍 PDF Generate: Starting download...')
      
      const response = await fetch('/api/solutioning/generate-pdf', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ sessionData, sessionId })
      })

      if (response.ok) {
        const result = await response.json()
        
        if (result.success) {
          // Import client-side converter dynamically
          const { generatePDFFromHTMLClient } = await import('@/lib/pdf/client-converter')
          
          console.log('🔄 Generating PDF on client-side...')
          
          // Generate PDF on client-side
          const pdfBlob = await generatePDFFromHTMLClient(result.templateData)
          
          // Create download link
          const url = URL.createObjectURL(pdfBlob)
          const a = document.createElement('a')
          a.href = url
          a.download = result.filename || 'NEXA_Report.pdf'
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          
          // Clean up
          URL.revokeObjectURL(url)
          
          console.log('✅ PDF Generate: Downloaded successfully')
          showAnimatedNotification('PDF generated and downloaded successfully!', 'success')
        } else {
          throw new Error(result.error || 'Unknown error')
        }
      } else {
        const errorData = await response.json()
        console.error('❌ PDF Generate: Error response:', errorData)
        showAnimatedNotification('Failed to generate PDF. Please try again.', 'error')
      }
    } catch (error) {
      console.error('❌ PDF Generate: Error:', error)
      showAnimatedNotification('Failed to generate PDF. Please check the console for details.', 'error')
    } finally {
      setLoadingStates(prev => ({ ...prev, generating: false }))
    }
  }

  // File handling with ImgBB upload
  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    await processImageFile(file)
  }

  const processImageFile = async (file: File) => {
    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
      alert('Please upload a valid image file (JPEG, PNG, GIF, or WebP)')
      return
    }

    // Validate file size (max 32MB)
    const maxSize = 32 * 1024 * 1024
    if (file.size > maxSize) {
      alert('File too large. Maximum size is 32MB.')
      return
    }

    setLoadingStates(prev => ({ ...prev, uploading: true }))

    try {
      console.log('📤 Uploading image to ImgBB...')
      
      // Upload to ImgBB
      const formData = new FormData()
      formData.append('image', file)

      const response = await fetch('/api/solutioning/upload-image', {
        method: 'POST',
        body: formData
      })

      const result = await response.json()

      if (!result.success) {
        throw new Error(result.error || 'Image upload failed')
      }

      console.log('✅ Image uploaded successfully:', result.imageUrl)

      // Also create base64 for immediate preview and vision analysis
      const reader = new FileReader()
      reader.onload = async (e) => {
        const base64Data = e.target?.result as string
        
        // Update session data with both ImgBB URL and base64 data
        setSessionData(prev => ({
          ...prev,
          solutions: {
            ...prev.solutions,
            [prev.currentSolution]: {
              ...prev.solutions[prev.currentSolution],
              additional: {
                ...prev.solutions[prev.currentSolution].additional,
                imageData: base64Data, // For vision analysis
                imageUrl: result.imageUrl, // ImgBB URL for display/sharing
                imageMetadata: result.imageData
              }
            }
          }
        }))

        // Auto-trigger vision analysis after upload (always trigger)
        setTimeout(() => {
          triggerVisionAnalysis(base64Data)
        }, 500) // Small delay to ensure state updates
      }
      reader.readAsDataURL(file)
      
    } catch (error) {
      console.error('❌ Image upload failed:', error)
      showAnimatedNotification('Image upload failed. Please try again.', 'error')
    } finally {
      setLoadingStates(prev => ({ ...prev, uploading: false }))
    }
  }

  const handlePaste = async (event: ClipboardEvent) => {
    if (!modals.imageActions) return

    const items = event.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault()
        const file = item.getAsFile()
        if (file) {
          console.log('📋 Pasting image from clipboard:', file.type, file.size)
          await processImageFile(file)
          setModals(prev => ({ ...prev, imageActions: false }))
        }
        break
      }
    }
  }

  // Edit handlers for structured solution
  const handleStructureEdit = (field: 'title' | 'steps' | 'approach', value: string) => {
    setSessionData(prev => ({
      ...prev,
      solutions: {
        ...prev.solutions,
        [prev.currentSolution]: {
          ...prev.solutions[prev.currentSolution],
          structure: {
            ...prev.solutions[prev.currentSolution].structure,
            [field]: value
          }
        }
      }
    }))
  }

  const toggleEdit = (field: 'title' | 'steps' | 'approach') => {
    setEditStates(prev => ({
      ...prev,
      [field]: !prev[field]
    }))
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
      currentPage="Solutioning" 
      user={user ? {
        fullName: user.fullName,
        email: user.email
      } : undefined}
    >
      <div className="nexa-background min-h-screen p-6">
        <div className="max-w-6xl mx-auto">
          {/* Tab system with seamless folder-like design */}
          <Tabs value={activeMainTab} className="w-full" onValueChange={setActiveMainTab}>
            {/* Header row with Solutioning label and Tabs */}
            <div className="flex items-end justify-between mb-0">
              <div className="flex items-end gap-8">
                {/* Solutioning label - positioned inline with tabs */}
                <div className="inline-flex items-center justify-center gap-2 text-white pb-3 ml-16">
                  <Cog className="w-4 h-4" />
                  <span className="text-center">Solutioning</span>
                </div>

                {/* Tab strip with Basic separate from scrollable container */}
                <div className="flex items-center">
                  <TabsList className="mb-0 mr-2">
                  <TabsTrigger value="basic" className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Basic
                  </TabsTrigger>
                  </TabsList>
                  <div className="scrollable-tabs-container relative">
                    <TabsList className="scrollable-tabs mb-0 flex overflow-x-auto scrollbar-hide">
                  {Object.keys(sessionData.solutions).map(solutionId => (
                    <TabsTrigger 
                      key={solutionId}
                      value={`solution-${solutionId}`} 
                          className="flex items-center gap-2 flex-shrink-0"
                      onClick={() => switchSolution(parseInt(solutionId))}
                    >
                      {solutionId}
                    </TabsTrigger>
                  ))}
                    </TabsList>
                    {/* Fade effect overlays */}
                    <div className="tab-fade-left"></div>
                    <div className="tab-fade-right"></div>
                  </div>
                  <button
                    onClick={addSolution}
                    className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg relative hover:text-white hover:bg-nexa-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ml-1 flex-shrink-0"
                  >
                    <Plus className="h-4 w-4" />
                  </button>
                </div>
              </div>

              {/* Action tabs aligned right */}
              <TabsList className="mb-0">
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
                  data-delete-btn
                  className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-red-500/10 text-red-500 border-t border-l border-r border-red-600 rounded-t-lg relative hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </TabsList>
            </div>

            {/* Card container with rounded corners and seamless tab integration */}
            <Card variant="nexa" className="border-t border-nexa-border p-8 mt-0 relative z-0 rounded-tl-lg rounded-bl-lg rounded-br-lg rounded-tr-none">
              
              {/* Basic Tab */}
              <TabsContent value="basic" className="mt-0">
                <div className="space-y-6">
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
                  </div>

                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="title">
                      Report Title
                    </Label>
                    <Input
                      variant="nexa"
                      id="title"
                      placeholder="e.g., Intelligent Client Engine: From Data to Dynamic Engagement"
                      value={sessionData.basic.title}
                      onChange={(e) => setSessionData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, title: e.target.value }
                      }))}
                      required
                    />
                    <div className="text-nexa-muted text-xs mt-1">
                      Use colon (:) to separate title and subtitle
                    </div>
                  </div>

                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="recipient">
                      Prepared For
                    </Label>
                    <Input
                      variant="nexa"
                      id="recipient"
                      placeholder="e.g., Valued Client LLC"
                      value={sessionData.basic.recipient}
                      onChange={(e) => setSessionData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, recipient: e.target.value }
                      }))}
                      required
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Solution Tabs */}
              {Object.keys(sessionData.solutions).map(solutionId => (
                <TabsContent key={solutionId} value={`solution-${solutionId}`} className="mt-0">
                  <div className="space-y-8">
                    
                    {/* Additional Content Section */}
                    {activeSubTab === 'additional' && (
                      <div>
                        <h2 className="text-white text-xl font-semibold mb-6">Additional Content</h2>
                
                {/* Solution Image Section */}
                <div className="space-y-4">
                  <Label variant="nexa">Solution Image</Label>
                  <div className="flex gap-3 items-center">
                    <div className="flex-1">
                      <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                        disabled={loadingStates.uploading || loadingStates.vision}
                        className="hidden"
                        id="solution-image-upload"
                      />
                      <Button
                        onClick={() => document.getElementById('solution-image-upload')?.click()}
                        disabled={loadingStates.uploading || loadingStates.vision}
                        variant="outline"
                        className={`w-full justify-start border transition-all duration-300 ${getImageStateColors(getImageState(currentSolution))} hover:bg-white/10`}
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        {currentSolution.additional.imageData ? 'Change Image' : 'Choose File'}
                      </Button>
                    </div>
                    
                    <Button
                      onClick={() => setModals(prev => ({ ...prev, imagePreview: true }))}
                      disabled={!currentSolution.additional.imageData}
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 border-nexa-border text-white hover:bg-white/10"
                      title="View Image"
                    >
                        <Eye className="h-4 w-4" />
                    </Button>
                    
                    <Button
                      onClick={() => setModals(prev => ({ ...prev, aiAnalysis: true }))}
                      disabled={!currentSolution.variables.aiAnalysis}
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 border-nexa-border text-white hover:bg-white/10"
                      title="View AI Analysis"
                    >
                      <Cpu className="h-4 w-4" />
                    </Button>
                    
                    {(currentSolution.additional as any).analysisError && (
                      <Button
                        onClick={runVisionAnalysis}
                        variant="outline"
                        size="sm"
                        className="h-10 border-red-500 text-red-400 hover:bg-red-900/20"
                        title="Retry Analysis"
                      >
                        <RefreshCw className="h-4 w-4" />
                      </Button>
                    )}
                    
                    {currentSolution.variables.aiAnalysis && (
                      <Button
                        onClick={runVisionAnalysis}
                        variant="outline"
                        size="sm"
                        className="h-10 border-nexa-border text-white hover:bg-white/10"
                      >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Re-analyze
                      </Button>
                    )}
                  </div>
                </div>

                <br/>
                {/* Solution Explanation Section */}
                <div className="space-y-4">
                  <Label variant="nexa">Solution Explanation</Label>
                  <div className="relative">
                    <Textarea
                      variant="nexa"
                      rows={8}
                      placeholder="Provide a detailed explanation of your solution..."
                      value={currentSolution.variables.solutionExplanation}
                      onChange={(e) => setSessionData(prev => ({
                        ...prev,
                        solutions: {
                          ...prev.solutions,
                          [prev.currentSolution]: {
                            ...prev.solutions[prev.currentSolution],
                            variables: {
                              ...prev.solutions[prev.currentSolution].variables,
                              solutionExplanation: e.target.value
                            }
                          }
                        }
                      }))}
                    />
                    <Button
                      onClick={enhanceExplanation}
                      disabled={loadingStates.enhancing}
                      variant="outline"
                      size="sm"
                      className="absolute top-3 right-3 border-nexa-border text-white hover:bg-white/10"
                    >
                      {loadingStates.enhancing ? (
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Enhance
                    </Button>
                  </div>
                </div>

                        {/* Navigation buttons for Additional Content */}
                        <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                          {parseInt(solutionId) === 1 ? (
                            <Button
                              onClick={() => setActiveMainTab('basic')}
                              variant="outline"
                              className="border-nexa-border text-white hover:bg-white/10"
                            >
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Previous
                            </Button>
                          ) : (
                            <Button
                              onClick={handleAdditionalPrevious}
                              variant="outline"
                              className="border-nexa-border text-white hover:bg-white/10"
                            >
                              <ArrowLeft className="h-4 w-4 mr-2" />
                              Previous
                            </Button>
                          )}
                          
                          <div className="flex gap-3">
                            <Button
                              onClick={handleAdditionalNext}
                              className="bg-white text-black hover:bg-gray-100"
                            >
                              Next
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                            <button
                              onClick={structureSolution}
                              disabled={loadingStates.structuring}
                              className="border border-nexa-border text-white bg-transparent h-10 px-4 py-2 text-sm font-medium rounded-lg border-draw-button structure-solution-button flex items-center"
                            >
                                <Layers className="h-4 w-4 mr-2" />
                              Structure Solution
                            </button>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Structured Solution Section */}
                    {activeSubTab === 'structured' && (
                      <div>
                        <h2 className="text-white text-xl font-semibold mb-6">Structured Solution</h2>
                
                {/* Quick Access Toolbar */}
                <div className="flex flex-wrap gap-2 mb-6">
                  <Button
                    onClick={() => setModals(prev => ({ ...prev, aiAnalysis: true }))}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10"
                    title="View/Edit AI Analysis"
                  >
                    <Cpu className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => setModals(prev => ({ ...prev, explanation: true }))}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10"
                    title="View/Edit Solution Explanation"
                  >
                    <Edit3 className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => setModals(prev => ({ ...prev, imagePreview: true }))}
                    disabled={!currentSolution.additional.imageData}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10"
                    title="View Solution Image"
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => setModals(prev => ({ ...prev, imageActions: true }))}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10"
                    title="Image Actions"
                  >
                    <Camera className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={structureSolution}
                    disabled={loadingStates.structuring}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-gray-800 border-nexa-border text-white hover:bg-gray-700"
                    title="Restructure Solution"
                  >
                    <Zap className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => setModals(prev => ({ ...prev, stackModal: true }))}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10"
                    title="View Per Node Stack"
                  >
                    <Layers className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => setModals(prev => ({ ...prev, layoutModal: true }))}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10"
                    title="Select Layout"
                  >
                    <Palette className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => setModals(prev => ({ ...prev, difficultyModal: true }))}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10"
                    title="Set Difficulty"
                  >
                    <Target className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={autoFormatContent}
                    disabled={loadingStates.autoFormatting}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 border-nexa-border text-white hover:bg-white/10"
                    title="Auto-Formatting"
                  >
                    {loadingStates.autoFormatting ? (
                      <RotateCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Wand2 className="h-4 w-4" />
                    )}
                  </Button>
                  
                  
                  <Button
                    onClick={previewPDF}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-blue-900/40 border-blue-600 text-blue-200 hover:bg-blue-800/60"
                    title="Preview PDF"
                    disabled={loadingStates.generating}
                  >
                    {loadingStates.generating ? (
                      <RotateCw className="h-4 w-4 animate-spin" />
                    ) : (
                    <FileText className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={generatePDF}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-green-900/40 border-green-600 text-green-200 hover:bg-green-800/60"
                    title="Generate PDF"
                    disabled={loadingStates.generating}
                  >
                    {loadingStates.generating ? (
                      <RotateCw className="h-4 w-4 animate-spin" />
                    ) : (
                    <Download className="h-4 w-4" />
                    )}
                  </Button>
                </div>

                {/* Structured Content Fields */}
                <div className="space-y-6">
                  {/* Solution Title */}
                  <div>
                    <Label variant="nexa" className="cursor-pointer" onClick={() => toggleEdit('title')}>
                      Solution Title
                    </Label>
                    {editStates.title ? (
                      <Input
                        variant="nexa"
                        value={currentSolution.structure.title}
                        onChange={(e) => handleStructureEdit('title', e.target.value)}
                        onBlur={() => toggleEdit('title')}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => toggleEdit('title')}
                        className="min-h-[40px] p-3 bg-nexa-input border border-nexa-border rounded-lg cursor-pointer text-white"
                        dangerouslySetInnerHTML={{
                          __html: currentSolution.structure.title || 'No content yet...'
                        }}
                      />
                    )}
                  </div>

                  {/* Solution Steps and Technical Approach - Side by Side */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Solution Steps */}
                  <div>
                    <Label variant="nexa" className="cursor-pointer" onClick={() => toggleEdit('steps')}>
                        Solution Steps
                    </Label>
                    {editStates.steps ? (
                      <Textarea
                        variant="nexa"
                        rows={6}
                        value={currentSolution.structure.steps}
                        onChange={(e) => handleStructureEdit('steps', e.target.value)}
                        onBlur={() => toggleEdit('steps')}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => toggleEdit('steps')}
                        className="min-h-[150px] p-3 bg-nexa-input border border-nexa-border rounded-lg cursor-pointer text-white whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: currentSolution.structure.steps || 'No content yet...'
                          }}
                        />
                    )}
                  </div>

                  {/* Technical Approach */}
                  <div>
                    <Label variant="nexa" className="cursor-pointer" onClick={() => toggleEdit('approach')}>
                        Technical Approach
                    </Label>
                    {editStates.approach ? (
                      <Textarea
                        variant="nexa"
                          rows={6}
                        value={currentSolution.structure.approach}
                        onChange={(e) => handleStructureEdit('approach', e.target.value)}
                        onBlur={() => toggleEdit('approach')}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => toggleEdit('approach')}
                          className="min-h-[150px] p-3 bg-nexa-input border border-nexa-border rounded-lg cursor-pointer text-white whitespace-pre-wrap"
                          dangerouslySetInnerHTML={{
                            __html: currentSolution.structure.approach || 'No content yet...'
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* AI Enhancement Button */}
                        <Button
                    onClick={() => alert('AI Enhancement would improve all content')}
                    className="w-full border border-nexa-border text-gray-800 bg-gray-100 hover:bg-gray-200 p-6 text-lg font-medium rounded-xl border-draw-button generate-solution-button"
                  >
                    <Aperture className="h-6 w-6 mr-3" />
                    <span>Enhance</span>
                        </Button>


                        </div>

                        {/* Navigation buttons for Structured Solution */}
                        <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                          <Button
                            onClick={handleStructuredPrevious}
                            variant="outline"
                            className="border-nexa-border text-white hover:bg-white/10"
                          >
                            <ArrowLeft className="h-4 w-4 mr-2" />
                            Previous
                          </Button>
                          
                          {parseInt(solutionId) < sessionData.solutionCount ? (
                            <Button
                              onClick={handleStructuredNext}
                              className="bg-white text-black hover:bg-gray-100"
                            >
                              Next
                              <ArrowRight className="h-4 w-4 ml-2" />
                            </Button>
                          ) : (
                            <div />
                          )}
                        </div>
                      </div>
                    )}

                  </div>
                </TabsContent>
              ))}

              {/* Navigation Buttons for Basic Tab */}
              {activeMainTab === 'basic' && (
                <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                  <div />
                  <Button
                    onClick={handleBasicNext}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              )}
            </Card>
          </Tabs>
        </div>
      </div>

      {/* Modals */}
      
      {/* Image Preview Modal */}
      {modals.imagePreview && currentSolution.additional.imageData && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-4xl mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <h3 className="text-white text-lg font-semibold">Solution Image Preview</h3>
              <Button
                onClick={() => setModals(prev => ({ ...prev, imagePreview: false }))}
                variant="outline"
                size="sm"
                className="border-nexa-border text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 text-center">
              <img 
                src={currentSolution.additional.imageData} 
                alt="Solution Diagram" 
                className="max-w-full max-h-[60vh] object-contain mx-auto"
              />
            </div>
          </div>
        </div>
      )}

      {/* AI Analysis Modal */}
      {modals.aiAnalysis && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <h3 className="text-white text-lg font-semibold">AI Analysis</h3>
              <Button
                onClick={() => setModals(prev => ({ ...prev, aiAnalysis: false }))}
                variant="outline"
                size="sm"
                className="border-nexa-border text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="max-h-[400px] overflow-y-auto mb-4">
                <pre className="text-white whitespace-pre-wrap font-mono text-sm">
                  {currentSolution.variables.aiAnalysis || 'No analysis available. Run vision analysis first.'}
                </pre>
              </div>
              {currentSolution.variables.aiAnalysis && (
                <Button
                  onClick={() => {
                    setSessionData(prev => ({
                      ...prev,
                      solutions: {
                        ...prev.solutions,
                        [prev.currentSolution]: {
                          ...prev.solutions[prev.currentSolution],
                          variables: {
                            ...prev.solutions[prev.currentSolution].variables,
                            solutionExplanation: prev.solutions[prev.currentSolution].variables.solutionExplanation + 
                              (prev.solutions[prev.currentSolution].variables.solutionExplanation ? '\n\n' : '') + 
                              prev.solutions[prev.currentSolution].variables.aiAnalysis
                          }
                        }
                      }
                    }))
                    setModals(prev => ({ ...prev, aiAnalysis: false }))
                  }}
                  className="bg-white text-black hover:bg-gray-100"
                >
                  Use in Explanation
                </Button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Solution Explanation Modal */}
      {modals.explanation && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-3xl mx-4">
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <h3 className="text-white text-lg font-semibold">Solution Explanation</h3>
              <Button
                onClick={() => setModals(prev => ({ ...prev, explanation: false }))}
                variant="outline"
                size="sm"
                className="border-nexa-border text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <Textarea
                variant="nexa"
                rows={12}
                value={currentSolution.variables.solutionExplanation}
                onChange={(e) => setSessionData(prev => ({
                  ...prev,
                  solutions: {
                    ...prev.solutions,
                    [prev.currentSolution]: {
                      ...prev.solutions[prev.currentSolution],
                      variables: {
                        ...prev.solutions[prev.currentSolution].variables,
                        solutionExplanation: e.target.value
                      }
                    }
                  }
                }))}
                placeholder="Enter detailed solution explanation..."
              />
              <div className="flex justify-end gap-3 mt-4">
                <Button
                  onClick={() => setModals(prev => ({ ...prev, explanation: false }))}
                  variant="outline"
                  className="border-nexa-border text-white hover:bg-white/10"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Image Actions Modal */}
      {modals.imageActions && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <div className="flex items-center gap-2">
                <Camera className="h-5 w-5 text-white" />
                <h3 className="text-white text-lg font-semibold">Edit Image - Diagram</h3>
              </div>
              <Button
                onClick={() => setModals(prev => ({ ...prev, imageActions: false }))}
                variant="outline"
                size="sm"
                className="border-nexa-border text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              {/* Upload Area */}
              <div 
                className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
                  loadingStates.uploading 
                    ? 'border-nexa-border bg-white/5' 
                    : 'border-nexa-border hover:border-white/30 hover:bg-white/5'
                }`}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDragEnter={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                }}
                onDrop={async (e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  const files = e.dataTransfer?.files
                  if (files && files.length > 0) {
                    const file = files[0]
                    if (file.type.startsWith('image/')) {
                      await processImageFile(file)
                  setModals(prev => ({ ...prev, imageActions: false }))
                    }
                  }
                }}
              >
                {loadingStates.uploading ? (
                  <>
                    <RotateCw className="h-12 w-12 text-nexa-muted mx-auto mb-4 animate-spin" />
                    <div className="text-white font-medium mb-2">Uploading Image...</div>
                  </>
                ) : (
                  <>
                    <Upload className="h-12 w-12 text-nexa-muted mx-auto mb-4" />
                    <div className="text-white font-medium mb-2">Upload Solution Diagram</div>
                    <div className="text-nexa-muted text-sm mb-4">
                      Drag & drop, upload from device, or Ctrl+V to paste from clipboard
                    </div>
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    handleImageUpload(e)
                    setModals(prev => ({ ...prev, imageActions: false }))
                  }}
                  className="hidden"
                  id="new-image-upload"
                />
                <Button
                      variant="outline"
                      className="border-nexa-border text-white hover:bg-white/10 mb-4"
                  onClick={() => document.getElementById('new-image-upload')?.click()}
                      disabled={loadingStates.uploading}
                >
                  <Upload className="h-4 w-4 mr-2" />
                      Upload from Device
                </Button>
                  </>
                )}
              </div>
              
              {/* Action Buttons */}
              {currentSolution.additional.imageData && (
                <div className="mt-4 space-y-2">
                  <Button
                    onClick={() => {
                      runVisionAnalysis()
                      setModals(prev => ({ ...prev, imageActions: false }))
                    }}
                    className="w-full border border-nexa-border text-white bg-transparent hover:bg-white/10"
                    disabled={loadingStates.analysisInProgress}
                  >
                    {loadingStates.analysisInProgress ? (
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <RefreshCw className="h-4 w-4 mr-2" />
                    )}
                    Trigger Analysis Again
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Difficulty Modal */}
      {modals.difficultyModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-lg mx-4">
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <div className="flex items-center gap-2">
                <Target className="h-5 w-5 text-white" />
                <h3 className="text-white text-lg font-semibold">Set Difficulty</h3>
              </div>
              <Button
                onClick={() => setModals(prev => ({ ...prev, difficultyModal: false }))}
                variant="outline"
                size="sm"
                className="border-nexa-border text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="space-y-6">
                <div className="text-center">
                  <div className="text-2xl font-bold text-white mb-2">
                    {currentSolution.structure.difficulty}%
                  </div>
                  <div className="text-sm text-nexa-muted">
                    Estimated difficulty level for this solution
                  </div>
                </div>
                
                <div className="difficulty-slider-container">
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={currentSolution.structure.difficulty}
                    onChange={(e) => setSessionData(prev => ({
                      ...prev,
                      solutions: {
                        ...prev.solutions,
                        [prev.currentSolution]: {
                          ...prev.solutions[prev.currentSolution],
                          structure: {
                            ...prev.solutions[prev.currentSolution].structure,
                            difficulty: parseInt(e.target.value)
                          }
                        }
                      }
                    }))}
                    className="difficulty-slider w-full"
                  />
                  <div className="difficulty-track"></div>
                  <div 
                    className="difficulty-fill"
                    style={{ width: `${currentSolution.structure.difficulty}%` }}
                  ></div>
                  <div 
                    className="difficulty-red-overlay"
                    style={{ 
                      width: `${currentSolution.structure.difficulty}%`,
                      opacity: currentSolution.structure.difficulty / 100
                    }}
                  ></div>
                </div>
                
                <div className="grid grid-cols-5 gap-2 text-xs text-nexa-muted">
                  <div className="text-center">0%<br/>Trivial</div>
                  <div className="text-center">25%<br/>Easy</div>
                  <div className="text-center">50%<br/>Medium</div>
                  <div className="text-center">75%<br/>Hard</div>
                  <div className="text-center">100%<br/>Expert</div>
                </div>
              </div>
              
              <div className="mt-6 pt-4 border-t border-nexa-border flex justify-end">
                <Button
                  onClick={() => setModals(prev => ({ ...prev, difficultyModal: false }))}
                  variant="outline"
                  className="border-nexa-border text-white hover:bg-white/10"
                >
                  Done
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Glass Blur Overlay for Structuring */}
      {loadingStates.structuring && (
        <div className="glass-blur-overlay">
          <div className="flex flex-col items-center">
            <img
              src="/images/nexanonameicon.png?v=1"
              alt="NEXA"
              className="nexa-structuring-icon"
            />
            <div className="mt-6 blur-scroll-loading structure-loading">
              {"Structuring Solution...".split("").map((letter, index) => (
                <span key={index} className="blur-scroll-letter">
                  {letter === " " ? "\u00A0" : letter}
                </span>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Layout Modal */}
      {modals.layoutModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-2xl mx-4">
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <div className="flex items-center gap-2">
                <Palette className="h-5 w-5 text-white" />
                <h3 className="text-white text-lg font-semibold">Choose Layout</h3>
              </div>
              <Button
                onClick={() => setModals(prev => ({ ...prev, layoutModal: false }))}
                variant="outline"
                size="sm"
                className="border-nexa-border text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-5 gap-4">
                {[
                  { num: 1, name: 'Classic', desc: 'Black borders, standard layout' },
                  { num: 2, name: 'White', desc: 'White borders, same structure' },
                  { num: 3, name: 'Text First', desc: 'Text boxes above, image below' },
                  { num: 4, name: 'Stacked', desc: 'Image top, full-width text boxes' },
                  { num: 5, name: 'Sharp', desc: 'Square corners, black borders' }
                ].map(layout => (
                  <div key={layout.num} className="text-center">
                    <Button
                      onClick={() => {
                        setSessionData(prev => ({
                          ...prev,
                          solutions: {
                            ...prev.solutions,
                            [prev.currentSolution]: {
                              ...prev.solutions[prev.currentSolution],
                              structure: {
                                ...prev.solutions[prev.currentSolution].structure,
                                layout: layout.num
                              }
                            }
                          }
                        }))
                        setModals(prev => ({ ...prev, layoutModal: false }))
                      }}
                      variant="outline"
                      className={`h-16 w-full mb-2 ${
                        currentSolution.structure.layout === layout.num
                          ? 'border-white bg-gray-800'
                          : 'border-nexa-border hover:bg-white/10'
                      } text-white flex flex-col items-center justify-center`}
                    >
                      <div className="text-lg font-bold">{layout.num}</div>
                      <div className="text-xs">{layout.name}</div>
                    </Button>
                    <div className="text-xs text-nexa-muted">{layout.desc}</div>
                  </div>
                ))}
              </div>
              <div className="mt-6 pt-4 border-t border-nexa-border">
                <div className="text-sm text-nexa-muted text-center">
                  Current: Layout {currentSolution.structure.layout} - {
                    [
                      '', 'Classic', 'White', 'Text First', 'Stacked', 'Sharp'
                    ][currentSolution.structure.layout]
                  }
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stack Modal */}
      {modals.stackModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-3xl mx-4 max-h-[90vh] overflow-auto">
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <div className="flex items-center gap-2">
                <Layers className="h-5 w-5 text-white" />
                <h3 className="text-white text-lg font-semibold">Per Node Stack</h3>
              </div>
              <Button
                onClick={() => setModals(prev => ({ ...prev, stackModal: false }))}
                variant="outline"
                size="sm"
                className="border-nexa-border text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6">
              {currentSolution.structure.stack ? (
                <div className="min-h-[200px] max-h-[400px] overflow-y-auto">
                  <pre className="text-white whitespace-pre-wrap font-mono text-sm">
                    {currentSolution.structure.stack}
                  </pre>
                </div>
              ) : (
                <div className="text-center py-8">
                  <div className="text-nexa-muted mb-4">No stack analysis available</div>
                  <Button
                    onClick={generateStack}
                    disabled={loadingStates.generating}
                    className="border border-nexa-border text-white bg-transparent hover:bg-white/10"
                  >
                    {loadingStates.generating ? (
                      <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                    ) : (
                      <Zap className="h-4 w-4 mr-2" />
                    )}
                    Generate Stack Analysis
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Loading Overlay for Structuring */}
      {loadingStates.structuring && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg p-8 text-center">
            <div className="relative">
              <div className="w-16 h-16 border-4 border-blue-600 rounded-full mx-auto mb-4 animate-pulse"></div>
              <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-blue-400 rounded-full mx-auto animate-spin"></div>
            </div>
            <div className="text-white font-medium">Structuring your solution...</div>
            <div className="text-nexa-muted text-sm mt-2">This may take a few moments</div>
          </div>
        </div>
      )}

    </DashboardLayout>
  )
}

