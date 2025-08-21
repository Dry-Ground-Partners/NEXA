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

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (data.success) {
          setUser(data.user)
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
    setDiagramSets(diagramSets.map(set => 
      set.id === id ? { ...set, [field]: value } : set
    ))
  }

  // Modal management
  const openModal = (diagramId: number, field: string) => {
    const diagramSet = diagramSets.find(set => set.id === diagramId)
    const isImageField = field === 'image'
    const content = isImageField ? '' : (diagramSet?.[field as keyof DiagramSet] as string || '')
    
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
        updateDiagramSet(modal.diagramId, modal.field as keyof DiagramSet, modal.content)
      }
      
      // If sketch content is added, expand the row
      if (modal.field === 'sketch' && modal.content.trim()) {
        updateDiagramSet(modal.diagramId, 'isExpanded', true)
      }
    }
    closeModal()
  }

  // AI Functions (mock for UI-only version)
  const generateDescription = async (diagramId: number) => {
    const diagramSet = diagramSets.find(set => set.id === diagramId)
    if (!diagramSet?.ideation.trim()) {
      alert('Please add ideation content first.')
      return
    }

    setGeneratingDescription(diagramId)
    
    setTimeout(() => {
      const mockDescription = `Generated diagram description based on: "${diagramSet.ideation.substring(0, 50)}..."\n\nNodes:\n- Main Component: Central processing unit\n- Input Interface: User interaction layer\n- Data Store: Information repository\n- Output System: Result delivery mechanism\n\nConnections:\n- User Input → Main Component (data flow)\n- Main Component ↔ Data Store (bidirectional)\n- Main Component → Output System (processed results)`
      
      updateDiagramSet(diagramId, 'planning', mockDescription)
      setGeneratingDescription(null)
    }, 2000)
  }

  const generateSketch = async (diagramId: number) => {
    const diagramSet = diagramSets.find(set => set.id === diagramId)
    if (!diagramSet?.planning.trim()) {
      alert('Please add planning content first.')
      return
    }

    setGeneratingSketch(diagramId)
    
    setTimeout(() => {
      const mockSketch = `Implementation sketch for diagram ${diagramId}:\n\n• Technical Architecture:\n  - Frontend: React components with state management\n  - Backend: RESTful API with database integration\n  - Data Flow: Unidirectional with event handling\n\n• Key Components:\n  - User interface with form validation\n  - Processing engine with error handling\n  - Storage layer with data persistence\n  - Output formatter with multiple formats\n\n• Implementation Notes:\n  - Use responsive design patterns\n  - Implement proper error boundaries\n  - Add comprehensive testing coverage`
      
      updateDiagramSet(diagramId, 'sketch', mockSketch)
      updateDiagramSet(diagramId, 'isExpanded', true)
      setGeneratingSketch(null)
    }, 2000)
  }

  const handleSave = async () => {
    setSaving(true)
    setTimeout(() => {
      alert('Visuals session saved successfully!')
      setSaving(false)
    }, 1000)
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
    // Mock Draw.io integration
    alert(`Opening Draw.io for Diagram ${diagramId}...\nThis would open app.diagrams.net with the diagram data.`)
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
                  className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-white/10 text-white border-t border-l border-r border-white rounded-t-lg relative hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
                >
                  {saving ? (
                    <>
                      <RotateCw className={`h-4 w-4 mr-2 ${saving ? 'animate-spin' : ''}`} />
                      Saving...
                    </>
                  ) : (
                    <>
                      <Save className="h-4 w-4 mr-2" />
                      Save
                    </>
                  )}
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
                          <div className="text-white text-sm overflow-hidden">
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
                          <div className="text-white text-sm overflow-hidden">
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
                          <div className="text-white text-sm overflow-hidden">
                            {diagramSet.sketch || 'Click to add sketch details...'}
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
                                <div className="text-white text-sm overflow-hidden">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                  <div className="border-2 border-dashed border-nexa-border rounded-lg p-8 text-center">
                    <Upload className="h-12 w-12 text-nexa-muted mx-auto mb-4" />
                    <div className="text-white font-medium mb-2">Upload Solution Diagram</div>
                    <div className="text-nexa-muted text-sm mb-4">
                      Upload an image or Ctrl+V to paste from clipboard
                    </div>
                    <Button
                      variant="outline"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload from Device
                    </Button>
                  </div>
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
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  )
}

