'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { 
  ArrowRight, 
  ArrowDown,
  ArrowLeft,
  Plus,
  Trash2, 
  Save, 
  Upload,
  RotateCw,
  Info,
  Grid3X3,
  Eye
} from 'lucide-react'
import type { AuthUser } from '@/types'
import type { VisualsSessionData } from '@/lib/sessions'
import { createDefaultVisualsData } from '@/lib/sessions'
import { useCallback } from 'react'

interface DiagramSet {
  id: number
  ideation: string
  planning: string
  sketch: string
  image: string | null
  expandedContent: string
  isExpanded: boolean
}

interface DiagramModal {
  isOpen: boolean
  diagramId: number | null
  field: string | null
  title: string
  content: string
  isImageField: boolean
}

export default function VisualsPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Tab state
  const [activeMainTab, setActiveMainTab] = useState('information')
  
  // Form state
  const [date, setDate] = useState(new Date().toISOString().split('T')[0])
  const [engineer, setEngineer] = useState('')
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  
  // Diagram sets state
  const [diagramSets, setDiagramSets] = useState<DiagramSet[]>([
    {
      id: 1,
      ideation: '',
      planning: '',
      sketch: '',
      image: null,
      expandedContent: '',
      isExpanded: false
    }
  ])
  const [activeDiagramTab, setActiveDiagramTab] = useState(1)
  
  // Modal state
  const [modal, setModal] = useState<DiagramModal>({
    isOpen: false,
    diagramId: null,
    field: null,
    title: '',
    content: '',
    isImageField: false
  })
  
  // Loading states
  const [generatingDescription, setGeneratingDescription] = useState<number | null>(null)
  const [generatingSketch, setGeneratingSketch] = useState<number | null>(null)
  const [saving, setSaving] = useState(false)
  const [uploadingImage, setUploadingImage] = useState(false)

  // Session management
  const [sessionId, setSessionId] = useState<string | null>(null)
  const [sessionData, setSessionData] = useState<VisualsSessionData | null>(null)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [isLoadingSession, setIsLoadingSession] = useState(false)


  // Image upload utilities
  const validateImage = (file: File): string | null => {
    const validTypes = ['image/png', 'image/jpeg', 'image/jpg', 'image/gif', 'image/svg+xml']
    const maxSize = 5 * 1024 * 1024 // 5MB

    if (!validTypes.includes(file.type)) {
      return 'Invalid file type. Please upload PNG, JPG, GIF, or SVG images.'
    }

    if (file.size > maxSize) {
      return 'File size too large. Please upload images smaller than 5MB.'
    }

    return null
  }

  const processImageFile = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      
      reader.onload = (e) => {
        const result = e.target?.result as string
        resolve(result)
      }
      
      reader.onerror = () => {
        reject(new Error('Failed to read image file'))
      }
      
      reader.readAsDataURL(file)
    })
  }

  const handleImageUpload = async (file: File) => {
    if (!modal.diagramId) return

    setUploadingImage(true)
    console.log('📸 Processing image upload:', file.name, file.type, file.size)

    try {
      // Validate image
      const validationError = validateImage(file)
      if (validationError) {
        alert(validationError)
        return
      }

      // Process image to base64
      const imageDataUrl = await processImageFile(file)
      console.log('✅ Image processed successfully')

      // Update diagram set
      updateDiagramSet(modal.diagramId, 'image', imageDataUrl)
      
      // Close modal
      closeModal()

    } catch (error) {
      console.error('❌ Error processing image:', error)
      alert('Failed to process image. Please try again.')
    } finally {
      setUploadingImage(false)
    }
  }

  const handleFileInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      handleImageUpload(file)
    }
  }

  const handlePaste = async (event: ClipboardEvent) => {
    if (!modal.isOpen || !modal.isImageField) return

    const items = event.clipboardData?.items
    if (!items) return

    for (let i = 0; i < items.length; i++) {
      const item = items[i]
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault()
        const file = item.getAsFile()
        if (file) {
          console.log('📋 Pasting image from clipboard:', file.type, file.size)
          await handleImageUpload(file)
        }
        break
      }
    }
  }

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (data.success) {
          setUser(data.user)
          
          // After user is authenticated, try to load session from URL
          const urlParams = new URLSearchParams(window.location.search)
          const sessionParam = urlParams.get('session')
          
          if (sessionParam) {
            console.log(`🔗 Loading session from URL: ${sessionParam}`)
            setIsLoadingSession(true)
            try {
              const sessionResponse = await fetch(`/api/sessions/${sessionParam}`)
              const sessionResult = await sessionResponse.json()
              
              if (sessionResult.success && sessionResult.session?.data) {
                const loadedData = sessionResult.session.data
                console.log('✅ Loaded session data:', loadedData)
                console.log('📊 Diagram sets in loaded data:', loadedData.diagramSets)
                
                // Set session ID
                setSessionId(sessionParam)
                
                // Load basic info
                setDate(loadedData.basic?.date || new Date().toISOString().split('T')[0])
                setEngineer(loadedData.basic?.engineer || '')
                setTitle(loadedData.basic?.title || '')
                setClient(loadedData.basic?.client || '')
                
                // Load diagram sets
                if (loadedData.diagramSets && loadedData.diagramSets.length > 0) {
                  console.log(`🎨 Setting ${loadedData.diagramSets.length} diagram sets:`, loadedData.diagramSets)
                  setDiagramSets(loadedData.diagramSets)
                  setActiveDiagramTab(loadedData.diagramSets[0].id)
                }
                
                // Load UI state
                if (loadedData.uiState) {
                  setActiveDiagramTab(loadedData.uiState.activeDiagramTab || 1)
                  setActiveMainTab(loadedData.uiState.activeMainTab || 'diagrams')
                }
                
                // Set session data for comparison
                setSessionData(loadedData)
                setHasUnsavedChanges(false)
                
                console.log(`🎯 Session loaded successfully! Diagram sets: ${loadedData.diagramSets?.length || 0}`)
              } else {
                console.log('❌ Failed to load session, removing from URL')
                window.history.replaceState({}, '', '/visuals')
              }
            } catch (error) {
              console.error('💥 Error loading session:', error)
              window.history.replaceState({}, '', '/visuals')
            } finally {
              setIsLoadingSession(false)
            }
          }
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

  // Debug: Log diagram sets changes
  useEffect(() => {
    console.log('📋 Diagram sets updated:', diagramSets.map(set => ({ 
      id: set.id, 
      sketchLength: set.sketch?.length || 0,
      sketchPreview: set.sketch?.substring(0, 50) || 'empty'
    })))
  }, [diagramSets])

  // Auto-save functionality
  const autoSave = useCallback(async () => {
    if (!sessionId || saving || !hasUnsavedChanges) return
    
    try {
      const currentData = collectCurrentData()
      console.log('💾 Auto-saving visuals session...')
      
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          data: currentData,
          sessionType: 'visuals'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setHasUnsavedChanges(false)
        setSessionData(currentData)
        console.log('✅ Auto-save successful')
      } else {
        console.error('❌ Auto-save failed:', result.error)
      }
    } catch (error) {
      console.error('💥 Auto-save error:', error)
    }
  }, [sessionId, saving, hasUnsavedChanges, diagramSets, date, engineer, title, client, activeDiagramTab, activeMainTab])

  // Track changes for auto-save (but not during initial session loading)
  useEffect(() => {
    if (sessionId && !isLoadingSession) {
      setHasUnsavedChanges(true)
    }
  }, [
    date, engineer, title, client,
    diagramSets, activeDiagramTab, activeMainTab,
    sessionId, isLoadingSession
  ])

  // Auto-save debounced (but not during initial session loading)
  useEffect(() => {
    if (!isLoadingSession) {
      const timer = setTimeout(() => {
        autoSave()
      }, 2000) // 2 second delay

      return () => clearTimeout(timer)
    }
  }, [autoSave, isLoadingSession])

  // Add paste event listener for image upload
  useEffect(() => {
    const handleGlobalPaste = (event: ClipboardEvent) => {
      handlePaste(event)
    }

    document.addEventListener('paste', handleGlobalPaste)
    
    return () => {
      document.removeEventListener('paste', handleGlobalPaste)
    }
  }, [modal.isOpen, modal.isImageField, modal.diagramId])

  // Diagram set management
  const addDiagramSet = () => {
    const newId = Math.max(...diagramSets.map(set => set.id)) + 1
    const newDiagram = {
      id: newId,
      ideation: '',
      planning: '',
      sketch: '',
      image: null,
      expandedContent: '',
      isExpanded: false
    }
    setDiagramSets([...diagramSets, newDiagram])
    setActiveDiagramTab(newId)
  }

  const deleteDiagramSet = () => {
    if (diagramSets.length <= 1) return
    
    const updatedDiagrams = diagramSets.filter(set => set.id !== activeDiagramTab)
    setDiagramSets(updatedDiagrams)
    setActiveDiagramTab(updatedDiagrams[0]?.id || 1)
  }

  const updateDiagramSet = (id: number, field: keyof DiagramSet, value: any) => {
    console.log('🔄 updateDiagramSet called:', { id, field, valueType: typeof value, valueLength: value?.length })
    console.log('📄 Value preview:', typeof value === 'string' ? value.substring(0, 100) : value)
    
    setDiagramSets(prevSets => {
      const updatedSets = prevSets.map(set => 
        set.id === id ? { ...set, [field]: value } : set
      )
      const updatedValue = updatedSets.find(set => set.id === id)?.[field]
      console.log('📊 Updated diagram sets:', typeof updatedValue === 'string' ? updatedValue.substring(0, 100) : updatedValue)
      return updatedSets
    })
  }

  // Modal management
  const openModal = (diagramId: number, field: string) => {
    const diagramSet = diagramSets.find(set => set.id === diagramId)
    const isImageField = field === 'image'
    const content = isImageField ? '' : (diagramSet?.[field as keyof DiagramSet] as string || '')
    
    console.log('🔓 openModal called:', { diagramId, field, contentLength: content.length })
    console.log('📄 Modal content preview:', typeof content === 'string' ? content.substring(0, 100) : content)
    
    setModal({
      isOpen: true,
      diagramId,
      field,
      title: `Edit ${field.charAt(0).toUpperCase() + field.slice(1)} - Diagram ${diagramId}`,
      content,
      isImageField
    })
  }

  const closeModal = () => {
    setModal({
      isOpen: false,
      diagramId: null,
      field: null,
      title: '',
      content: '',
      isImageField: false
    })
  }

  const saveModal = () => {
    if (modal.diagramId && modal.field) {
      if (!modal.isImageField) {
        // Special handling for sketch to update both content and expansion in one go
        if (modal.field === 'sketch' && modal.content.trim()) {
          setDiagramSets(prevSets => prevSets.map(set => 
            set.id === modal.diagramId 
              ? { ...set, sketch: modal.content, isExpanded: true }
              : set
          ))
        } else {
          updateDiagramSet(modal.diagramId, modal.field as keyof DiagramSet, modal.content)
        }
      }
      // For image fields, the upload handlers already update the state and close modal
    }
    closeModal()
  }

  // AI Functions - LangSmith Integration
  const generateDescription = async (diagramId: number) => {
    const diagramSet = diagramSets.find(set => set.id === diagramId)
    if (!diagramSet?.ideation.trim()) {
      alert('Please add ideation content first.')
      return
    }

    setGeneratingDescription(diagramId)
    
    try {
      console.log('🎨 Starting planning generation from ideation...')
      console.log('📝 Ideation content:', diagramSet.ideation)

      const response = await fetch('/api/visuals/generate-planning', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          solution: diagramSet.ideation
        })
      })

      const result = await response.json()
      console.log('📊 API response:', result)

      if (!result.success) {
        console.error('❌ Planning generation failed:', result.error)
        alert(`Planning generation failed: ${result.error}`)
        return
      }

      console.log('✅ Planning generated successfully')
      console.log('📄 Planning content:', result.data)

      // Update the planning field with the generated content
      updateDiagramSet(diagramId, 'planning', result.data)

    } catch (error) {
      console.error('❌ Error generating planning:', error)
      alert('Failed to generate planning. Please try again.')
    } finally {
      setGeneratingDescription(null)
    }
  }

  const generateSketch = async (diagramId: number) => {
    const diagramSet = diagramSets.find(set => set.id === diagramId)
    if (!diagramSet?.planning.trim()) {
      alert('Please add planning content first.')
      return
    }

    setGeneratingSketch(diagramId)
    
    try {
      console.log('🎨 Starting sketch generation from planning...')
      console.log('📝 Planning content:', diagramSet.planning)

      const response = await fetch('/api/visuals/generate-sketch', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          planning: diagramSet.planning
        })
      })

      const result = await response.json()
      console.log('📊 API response:', result)

      if (!result.success) {
        console.error('❌ Sketch generation failed:', result.error)
        alert(`Sketch generation failed: ${result.error}`)
        return
      }

      console.log('✅ Sketch generated successfully')
      console.log('📄 Sketch content type:', typeof result.data)
      console.log('📄 Sketch content length:', result.data?.length)
      console.log('📄 Sketch content preview:', result.data?.substring(0, 200))
      console.log('📄 Full sketch content:', result.data)

      // Update the sketch field with the generated content and expand
      console.log('🔄 Updating diagram set with sketch content...')
      updateDiagramSet(diagramId, 'sketch', result.data)
      updateDiagramSet(diagramId, 'isExpanded', true)
      console.log('✅ Diagram set updated')

    } catch (error) {
      console.error('❌ Error generating sketch:', error)
      alert('Failed to generate sketch. Please try again.')
    } finally {
      setGeneratingSketch(null)
    }
  }

  // Data collection
  const collectCurrentData = (): VisualsSessionData => {
    return {
      basic: {
        date,
        engineer,
        title,
        client
      },
      diagramSets: diagramSets.map(set => ({
        id: set.id,
        ideation: set.ideation,
        planning: set.planning,
        sketch: set.sketch,
        image: set.image,
        expandedContent: set.expandedContent,
        isExpanded: set.isExpanded
      })),
      uiState: {
        activeDiagramTab,
        activeMainTab
      },
      lastSaved: new Date().toISOString(),
      version: sessionData?.version || 0
    }
  }

  const handleSave = async () => {
    setSaving(true)
    
    try {
      const currentData = collectCurrentData()
      console.log('💾 Saving visuals session...', { sessionId, title, client })
      
      if (sessionId) {
        // Update existing session
        const response = await fetch(`/api/sessions/${sessionId}`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            data: currentData,
            sessionType: 'visuals'
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setHasUnsavedChanges(false)
          setSessionData(currentData)
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
            title: title || 'Untitled Visuals Session',
            client: client || '',
            sessionType: 'visuals',
            data: currentData
          })
        })
        
        const result = await response.json()
        
        if (result.success) {
          setSessionId(result.session.uuid)
          setHasUnsavedChanges(false)
          setSessionData(currentData)
          console.log('✅ New session created:', result.session.uuid)
          
          // Update URL with session ID
          const newUrl = `/visuals?session=${result.session.uuid}`
          window.history.pushState({}, '', newUrl)
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
    if (confirm('Are you sure you want to delete this visuals session?')) {
      window.location.href = '/dashboard'
    }
  }

  const handleNextTab = () => {
    if (activeMainTab === 'information') {
      setActiveMainTab('diagrams')
    }
  }

  const handlePreviousTab = () => {
    if (activeMainTab === 'diagrams') {
      setActiveMainTab('information')
    }
  }

  const openDrawIo = (diagramId: number) => {
    const diagramSet = diagramSets.find(set => set.id === diagramId)
    
    if (!diagramSet?.sketch.trim()) {
      alert('No sketch content available to download. Please generate a sketch first.')
      return
    }

    console.log('📥 Downloading XML file for diagram:', diagramId)
    console.log('📄 XML content length:', diagramSet.sketch.length)

    try {
      // Create XML content (the sketch should already be XML format)
      const xmlContent = diagramSet.sketch

      // Create a blob with the XML content
      const blob = new Blob([xmlContent], { type: 'application/xml' })
      
      // Create a temporary URL for the blob
      const url = URL.createObjectURL(blob)
      
      // Create a temporary anchor element and trigger download
      const link = document.createElement('a')
      link.href = url
      link.download = `diagram-${diagramId}-sketch.xml`
      
      // Append to body, click, and remove
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      // Clean up the URL
      URL.revokeObjectURL(url)
      
      console.log('✅ XML file download triggered successfully')
      
    } catch (error) {
      console.error('❌ Error downloading XML file:', error)
      alert('Failed to download XML file. Please try again.')
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
      currentPage="Visuals" 
      user={user ? {
        fullName: user.fullName,
        email: user.email
      } : undefined}
    >
      <div className="nexa-background min-h-screen p-6">
        <div className="max-w-7xl mx-auto">
          {/* Tab system with seamless folder-like design */}
          <Tabs value={activeMainTab} className="w-full" onValueChange={setActiveMainTab}>
            {/* Header row with Visuals label and Tabs */}
            <div className="flex items-end justify-between mb-0">
              <div className="flex items-end gap-8">
                {/* Visuals label - positioned inline with tabs */}
                <div className="inline-flex items-center justify-center gap-2 text-white pb-3 ml-16">
                  <Eye className="w-4 h-4" />
                  <span className="text-center">Visuals</span>
                </div>

                {/* Tab strip */}
                <TabsList className="mb-0">
                  <TabsTrigger value="information" className="flex items-center gap-2">
                    <Info className="w-4 h-4" />
                    Information
                  </TabsTrigger>
                  <TabsTrigger value="diagrams" className="flex items-center gap-2">
                    <Grid3X3 className="w-4 h-4" />
                    Diagrams
                  </TabsTrigger>
                </TabsList>
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
                  className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-red-500/10 text-red-500 border-t border-l border-r border-red-600 rounded-t-lg relative hover:bg-red-500/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </TabsList>
            </div>

            {/* Card container with rounded corners and seamless tab integration */}
            <Card variant="nexa" className="border-t border-nexa-border p-8 mt-0 relative z-0 rounded-tl-lg rounded-bl-lg rounded-br-lg rounded-tr-none">
              
              {/* Information Tab */}
              <TabsContent value="information" className="mt-0">
            
            {/* Basic Information Section */}
            <div className="mb-8">
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
                    value={date}
                    onChange={(e) => setDate(e.target.value)}
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
                    value={engineer}
                    onChange={(e) => setEngineer(e.target.value)}
                    required
                  />
                </div>
                
                <div className="nexa-form-group">
                  <Label variant="nexa" htmlFor="title">
                    Title
                  </Label>
                  <Input
                    variant="nexa"
                    id="title"
                    placeholder="Enter project title"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                  />
                </div>
                <div className="nexa-form-group">
                  <Label variant="nexa" htmlFor="client">
                    Client
                  </Label>
                  <Input
                    variant="nexa"
                    id="client"
                    placeholder="Enter client name"
                    value={client}
                    onChange={(e) => setClient(e.target.value)}
                  />
                </div>
              </div>
            </div>
              </TabsContent>

              {/* Diagrams Tab */}
              <TabsContent value="diagrams" className="mt-0">
            {/* Diagram Mapping Section */}
            <div className="mb-8">
              <h2 className="text-white text-xl font-semibold mb-4">Diagram Mapping</h2>
              
              <Tabs value={activeDiagramTab.toString()} onValueChange={(value) => setActiveDiagramTab(parseInt(value))}>
                <div className="flex items-center justify-between mb-4">
                  <TabsList className="bg-black border-b border-nexa-border flex-1 justify-start">
                    {diagramSets.map((diagramSet) => (
                      <TabsTrigger key={diagramSet.id} value={diagramSet.id.toString()}>
                        {diagramSet.id}
                      </TabsTrigger>
                    ))}
                    <button
                      onClick={addDiagramSet}
                      className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg relative hover:text-white hover:bg-nexa-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ml-1"
                    >
                      <Plus className="h-4 w-4" />
                    </button>
                  </TabsList>
                  <button
                    onClick={deleteDiagramSet}
                    disabled={diagramSets.length === 1}
                    className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg relative hover:text-white hover:bg-nexa-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50 disabled:pointer-events-none ml-2"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
                
                {diagramSets.map((diagramSet) => (
                  <TabsContent key={diagramSet.id} value={diagramSet.id.toString()} className="mt-4">
                  <div key={diagramSet.id} className="space-y-4">
                    {/* Main Row - 5 Column Grid */}
                    <div className="grid grid-cols-12 gap-4 items-center">
                      {/* Ideation (3/12) */}
                      <div className="col-span-3">
                        <div
                          onClick={() => openModal(diagramSet.id, 'ideation')}
                          className={`h-20 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                            diagramSet.ideation.trim() 
                              ? 'bg-green-500/10 border border-green-500 hover:bg-green-500/20 hover:border-green-400' 
                              : 'bg-black border border-nexa-border hover:bg-gray-900 hover:border-gray-600'
                          }`}
                        >
                          <div className="text-nexa-muted text-xs mb-1 font-medium">Ideation</div>
                          <div className="text-white text-sm overflow-hidden line-clamp-2">
                            {diagramSet.ideation || 'Click to add ideation details...'}
                          </div>
                        </div>
                      </div>

                      {/* Arrow 1 (1/12) */}
                      <div className="col-span-1 flex justify-center">
                        <Button
                          onClick={() => generateDescription(diagramSet.id)}
                          disabled={!diagramSet.ideation.trim() || generatingDescription === diagramSet.id}
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 border-nexa-border text-white hover:bg-white/10"
                        >
                          {generatingDescription === diagramSet.id ? (
                            <RotateCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Planning (3/12) */}
                      <div className="col-span-3">
                        <div
                          onClick={() => openModal(diagramSet.id, 'planning')}
                          className={`h-20 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                            diagramSet.planning.trim() 
                              ? 'bg-green-500/10 border border-green-500 hover:bg-green-500/20 hover:border-green-400' 
                              : 'bg-black border border-nexa-border hover:bg-gray-900 hover:border-gray-600'
                          }`}
                        >
                          <div className="text-nexa-muted text-xs mb-1 font-medium">Planning</div>
                          <div className="text-white text-sm overflow-hidden line-clamp-2">
                            {diagramSet.planning || 'Click to add planning details...'}
                          </div>
                        </div>
                      </div>

                      {/* Arrow 2 (1/12) */}
                      <div className="col-span-1 flex justify-center">
                        <Button
                          onClick={() => generateSketch(diagramSet.id)}
                          disabled={!diagramSet.planning.trim() || generatingSketch === diagramSet.id}
                          variant="outline"
                          size="sm"
                          className="h-10 w-10 p-0 border-nexa-border text-white hover:bg-white/10"
                        >
                          {generatingSketch === diagramSet.id ? (
                            <RotateCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <ArrowRight className="h-4 w-4" />
                          )}
                        </Button>
                      </div>

                      {/* Sketch (3/12) */}
                      <div className="col-span-3">
                        <div
                          onClick={() => openModal(diagramSet.id, 'sketch')}
                          className={`h-20 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                            diagramSet.sketch.trim() 
                              ? 'bg-green-500/10 border border-green-500 hover:bg-green-500/20 hover:border-green-400' 
                              : 'bg-black border border-nexa-border hover:bg-gray-900 hover:border-gray-600'
                          }`}
                        >
                          <div className="text-nexa-muted text-xs mb-1 font-medium">Sketch</div>
                          <div className="text-white text-sm overflow-hidden line-clamp-1">
                            {diagramSet.sketch || 'Click to add sketch details...'}
                          </div>
                          {/* Debug info */}
                          <div className="text-xs text-gray-500 mt-1">
                            Content: {diagramSet.sketch?.length || 0} chars
                          </div>
                        </div>
                      </div>

                      {/* Spacer (1/12) */}
                      <div className="col-span-1"></div>
                    </div>

                    {/* Expandable Row */}
                    {diagramSet.isExpanded && (
                      <>
                        {/* Vertical Flow Indicator */}
                        <div className="grid grid-cols-12 gap-4">
                          <div className="col-span-3"></div>
                          <div className="col-span-1"></div>
                          <div className="col-span-3"></div>
                          <div className="col-span-1"></div>
                          <div className="col-span-3 flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 p-0 border-nexa-border text-white hover:bg-white/10"
                              disabled
                            >
                              <ArrowDown className="h-4 w-4" />
                            </Button>
                          </div>
                          <div className="col-span-1"></div>
                        </div>

                        {/* Extended Content Areas */}
                        <div className="grid grid-cols-12 gap-4 items-center">
                          <div className="col-span-3"></div>
                          <div className="col-span-1"></div>
                          
                          {/* Image Box (aligned with Planning) */}
                          <div className="col-span-3">
                            <div
                              onClick={() => openModal(diagramSet.id, 'image')}
                              className={`h-20 rounded-lg p-3 cursor-pointer transition-all duration-200 flex items-center justify-center ${
                                diagramSet.image 
                                  ? 'bg-green-500/10 border border-green-500 hover:bg-green-500/20 hover:border-green-400' 
                                  : 'bg-black border border-nexa-border hover:bg-gray-900 hover:border-gray-600'
                              }`}
                            >
                              {diagramSet.image ? (
                                <img 
                                  src={diagramSet.image} 
                                  alt="Diagram" 
                                  className="max-h-full max-w-full object-contain"
                                />
                              ) : (
                                <div className="text-center">
                                  <Upload className="h-6 w-6 text-nexa-muted mx-auto mb-1" />
                                  <div className="text-nexa-muted text-xs">Upload Image</div>
                                </div>
                              )}
                            </div>
                          </div>

                          {/* Left Arrow */}
                          <div className="col-span-1 flex justify-center">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-10 w-10 p-0 border-nexa-border text-white hover:bg-white/10"
                              disabled
                            >
                              <ArrowLeft className="h-4 w-4" />
                            </Button>
                          </div>

                          {/* Expanded Content Box (aligned with Sketch) */}
                          <div className="col-span-3">
                            {diagramSet.sketch.trim() ? (
                              <Button
                                onClick={() => openDrawIo(diagramSet.id)}
                                className="h-20 w-full bg-green-600 text-white hover:bg-green-700 border border-green-500 text-sm font-medium"
                              >
                                <div className="text-center">
                                  <div>Open in Draw.io</div>
                                  <div className="text-xs opacity-75">Advanced Editing</div>
                                </div>
                              </Button>
                            ) : (
                              <div
                                onClick={() => openModal(diagramSet.id, 'expandedContent')}
                                className={`h-20 rounded-lg p-3 cursor-pointer transition-all duration-200 ${
                                  diagramSet.sketch.trim() 
                                    ? 'bg-blue-500/10 border border-blue-500 hover:bg-blue-500/20 hover:border-blue-400' 
                                    : 'bg-black border border-nexa-border hover:bg-gray-900 hover:border-gray-600'
                                }`}
                              >
                                <div className="text-nexa-muted text-xs mb-1 font-medium">Expanded Content</div>
                                <div className="text-white text-sm overflow-hidden line-clamp-2">
                                  {diagramSet.expandedContent || 'Click to add expanded content...'}
                                </div>
                              </div>
                            )}
                          </div>

                          <div className="col-span-1"></div>
                        </div>
                      </>
                    )}
                  </div>
                  </TabsContent>
                ))}
              </Tabs>
            </div>
              </TabsContent>

              {/* Navigation Buttons */}
              <div className="flex justify-between mt-8 pt-8 border-t border-nexa-border">
                {activeMainTab !== 'information' ? (
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
                
                {activeMainTab !== 'diagrams' ? (
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
          </Tabs>
        </div>
      </div>

      {/* Diagram Modal */}
      {modal.isOpen && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-2xl mx-4">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <h3 className="text-white text-lg font-semibold">{modal.title}</h3>
              <Button
                onClick={closeModal}
                variant="outline"
                size="sm"
                className="border-nexa-border text-white hover:bg-white/10"
              >
                ×
              </Button>
            </div>

            {/* Modal Body */}
            <div className="p-6">
              {modal.isImageField ? (
                /* Image Content */
                <div className="space-y-4">
                  <div 
                    className="border-2 border-dashed border-nexa-border rounded-lg p-8 text-center transition-colors hover:border-nexa-light"
                    onDrop={(e) => {
                      e.preventDefault()
                      const files = e.dataTransfer.files
                      if (files.length > 0) {
                        handleImageUpload(files[0])
                      }
                    }}
                    onDragOver={(e) => e.preventDefault()}
                    onDragEnter={(e) => e.preventDefault()}
                  >
                    {uploadingImage ? (
                      <>
                        <RotateCw className="h-12 w-12 text-nexa-muted mx-auto mb-4 animate-spin" />
                        <div className="text-white font-medium mb-2">Processing Image...</div>
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
                          onChange={handleFileInputChange}
                          className="hidden"
                          id="image-upload-input"
                          disabled={uploadingImage}
                        />
                        <Button
                          variant="outline"
                          className="border-nexa-border text-white hover:bg-white/10"
                          onClick={() => document.getElementById('image-upload-input')?.click()}
                          disabled={uploadingImage}
                        >
                          <Upload className="h-4 w-4 mr-2" />
                          Upload from Device
                        </Button>
                      </>
                    )}
                  </div>
                  
                  {/* Current image preview if exists */}
                  {modal.diagramId && diagramSets.find(set => set.id === modal.diagramId)?.image && (
                    <div className="space-y-2">
                      <div className="text-white text-sm font-medium">Current Image:</div>
                      <div className="border border-nexa-border rounded-lg p-2 bg-black/50">
                        <img 
                          src={diagramSets.find(set => set.id === modal.diagramId)?.image || ''} 
                          alt="Current diagram" 
                          className="max-w-full h-32 object-contain mx-auto"
                        />
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-xs border-red-500 text-red-400 hover:bg-red-500/20"
                          onClick={() => {
                            if (modal.diagramId) {
                              updateDiagramSet(modal.diagramId, 'image', null)
                              closeModal()
                            }
                          }}
                        >
                          Remove Image
                        </Button>
                      </div>
                    </div>
                  )}
                  
                  <div className="text-nexa-muted text-xs text-center">
                    Supported formats: PNG, JPG, GIF, SVG • Max size: 5MB
                  </div>
                </div>
              ) : (
                /* Text Content */
                <div className="space-y-4">
                  <Label variant="nexa" htmlFor="modal-content">
                    {modal.field ? modal.field.charAt(0).toUpperCase() + modal.field.slice(1) : ''}
                  </Label>
                  <Textarea
                    variant="nexa"
                    id="modal-content"
                    placeholder="Enter your content here..."
                    rows={8}
                    value={modal.content}
                    onChange={(e) => setModal({...modal, content: e.target.value})}
                    className="resize-none"
                  />
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="flex justify-end gap-3 p-6 border-t border-nexa-border">
              {modal.isImageField ? (
                <Button
                  onClick={closeModal}
                  variant="outline"
                  className="border-nexa-border text-white hover:bg-white/10"
                >
                  Close
                </Button>
              ) : (
                <>
                  <Button
                    onClick={closeModal}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    Cancel
                  </Button>
                  <Button
                    onClick={saveModal}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Save
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

