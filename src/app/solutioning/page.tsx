'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
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
  RotateCw
} from 'lucide-react'
import type { AuthUser } from '@/types'

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

interface SessionData {
  basic: {
    date: string
    title: string
    recipient: string
    engineer: string
  }
  currentSolution: number
  solutionCount: number
  solutions: { [key: number]: Solution }
}

export default function SolutioningPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  
  // Current step state
  const [currentStep, setCurrentStep] = useState(1)
  const [currentTab, setCurrentTab] = useState('basic')
  
  // Session data
  const [sessionData, setSessionData] = useState<SessionData>({
    basic: {
      date: new Date().toISOString().split('T')[0],
      title: '',
      recipient: '',
      engineer: ''
    },
    currentSolution: 1,
    solutionCount: 1,
    solutions: {
      1: {
        id: 1,
        additional: {
          imageData: null,
          imageUrl: null
        },
        variables: {
          aiAnalysis: '',
          solutionExplanation: ''
        },
        structure: {
          title: '',
          steps: '',
          approach: '',
          difficulty: 50,
          layout: 1,
          stack: ''
        }
      }
    }
  })

  // Modal states
  const [modals, setModals] = useState({
    imagePreview: false,
    aiAnalysis: false,
    explanation: false,
    imageActions: false,
    stackModal: false
  })

  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    vision: false,
    structuring: false,
    enhancing: false,
    generating: false,
    saving: false
  })

  // Edit states for structured solution
  const [editStates, setEditStates] = useState({
    title: false,
    steps: false,
    approach: false
  })

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

  // Get current solution
  const currentSolution = sessionData.solutions[sessionData.currentSolution]

  // Navigation functions
  const nextStep = () => {
    if (currentStep === 1) {
      // Validate required fields
      if (!sessionData.basic.title || !sessionData.basic.recipient || !sessionData.basic.engineer) {
        alert('Please fill in all required fields.')
        return
      }
    }
    setCurrentStep(currentStep + 1)
  }

  const prevStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1))
  }

  const goToStructuredSolution = () => {
    setCurrentStep(3) // Step 2.1
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
    setCurrentTab(`solution-${newSolutionId}`)
  }

  const switchSolution = (solutionId: number) => {
    setSessionData(prev => ({
      ...prev,
      currentSolution: solutionId
    }))
    setCurrentTab(`solution-${solutionId}`)
  }

  // Mock AI functions
  const runVisionAnalysis = async () => {
    if (!currentSolution.additional.imageData) {
      alert('Please upload an image first.')
      return
    }

    setLoadingStates(prev => ({ ...prev, vision: true }))
    
    setTimeout(() => {
      const mockAnalysis = `AI Vision Analysis Results:

This diagram shows a comprehensive system architecture with the following components:

**Main Components Identified:**
• User Interface Layer: Frontend application with responsive design
• API Gateway: Central routing and authentication hub  
• Processing Engine: Core business logic and data processing
• Database Layer: Persistent data storage with backup systems
• External Integrations: Third-party service connections

**Data Flow Analysis:**
• User requests flow through the UI to the API Gateway
• Authentication and authorization handled at gateway level
• Processing engine receives validated requests and applies business rules
• Database operations are atomic with proper transaction management
• External services integrate through standardized API contracts

**Technical Architecture Observations:**
• Microservices architecture with clear separation of concerns
• Event-driven communication patterns between services
• Redundancy and failover mechanisms built into critical paths
• Scalable design supporting horizontal scaling
• Security implemented at multiple layers`

      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            variables: {
              ...prev.solutions[prev.currentSolution].variables,
              aiAnalysis: mockAnalysis
            }
          }
        }
      }))
      setLoadingStates(prev => ({ ...prev, vision: false }))
    }, 3000)
  }

  const structureSolution = async () => {
    const explanation = currentSolution.variables.solutionExplanation
    const analysis = currentSolution.variables.aiAnalysis
    
    if (!explanation && !analysis) {
      alert('Please provide solution explanation or run vision analysis first.')
      return
    }

    setLoadingStates(prev => ({ ...prev, structuring: true }))
    
    setTimeout(() => {
      const mockStructure = {
        title: 'Intelligent Multi-Layer System Architecture',
        steps: `1. Design and implement the user interface layer with responsive frameworks
2. Develop the API Gateway with authentication and rate limiting capabilities  
3. Build the core processing engine with business logic implementation
4. Set up the database layer with proper indexing and backup strategies
5. Integrate external services with error handling and retry mechanisms
6. Implement monitoring and logging across all system components
7. Deploy with container orchestration and automated scaling
8. Conduct comprehensive testing including load and security testing`,
        approach: 'This solution employs a microservices architecture pattern with event-driven communication. The approach prioritizes scalability, maintainability, and security through proper separation of concerns. Each layer has distinct responsibilities and can be developed, tested, and deployed independently. The architecture supports horizontal scaling and provides multiple points for performance optimization.',
        difficulty: 73
      }

      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            structure: {
              ...prev.solutions[prev.currentSolution].structure,
              ...mockStructure
            }
          }
        }
      }))
      setLoadingStates(prev => ({ ...prev, structuring: false }))
      setCurrentStep(3) // Go to structured solution
    }, 4000)
  }

  const enhanceExplanation = async () => {
    if (!currentSolution.variables.solutionExplanation.trim()) {
      alert('Please provide some explanation text to enhance.')
      return
    }

    setLoadingStates(prev => ({ ...prev, enhancing: true }))
    
    setTimeout(() => {
      const enhanced = currentSolution.variables.solutionExplanation + 
        '\n\nEnhanced Analysis: This solution leverages modern architectural patterns to ensure scalability, reliability, and maintainability. The implementation follows industry best practices for security, performance optimization, and user experience design. Key benefits include improved system resilience, reduced operational overhead, and enhanced developer productivity through clear separation of concerns and well-defined interfaces.'

      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            variables: {
              ...prev.solutions[prev.currentSolution].variables,
              solutionExplanation: enhanced
            }
          }
        }
      }))
      setLoadingStates(prev => ({ ...prev, enhancing: false }))
    }, 2000)
  }

  const generateStack = async () => {
    setLoadingStates(prev => ({ ...prev, generating: true }))
    
    setTimeout(() => {
      const mockStack = `Technical Stack Analysis:

Frontend Layer:
• React 18 with TypeScript for type-safe development
• Next.js for server-side rendering and routing
• TailwindCSS for responsive styling
• State management with Zustand or Redux Toolkit

Backend Layer:
• Node.js with Express.js framework
• TypeScript for enhanced development experience
• PostgreSQL for primary data storage
• Redis for caching and session management

Infrastructure:
• Docker for containerization
• Kubernetes for orchestration
• AWS/Azure for cloud hosting
• Nginx for load balancing and reverse proxy

Development Tools:
• Git for version control
• Jest/Vitest for testing
• ESLint/Prettier for code quality
• CI/CD with GitHub Actions or Jenkins`

      setSessionData(prev => ({
        ...prev,
        solutions: {
          ...prev.solutions,
          [prev.currentSolution]: {
            ...prev.solutions[prev.currentSolution],
            structure: {
              ...prev.solutions[prev.currentSolution].structure,
              stack: mockStack
            }
          }
        }
      }))
      setLoadingStates(prev => ({ ...prev, generating: false }))
    }, 2000)
  }

  const handleSave = async () => {
    setLoadingStates(prev => ({ ...prev, saving: true }))
    setTimeout(() => {
      alert('Solution saved successfully!')
      setLoadingStates(prev => ({ ...prev, saving: false }))
    }, 1000)
  }

  const handleDelete = async () => {
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
      setCurrentTab('solution-1')
    }
  }

  // File handling
  const handleImageUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file) {
      const reader = new FileReader()
      reader.onload = (e) => {
        const imageData = e.target?.result as string
        setSessionData(prev => ({
          ...prev,
          solutions: {
            ...prev.solutions,
            [prev.currentSolution]: {
              ...prev.solutions[prev.currentSolution],
              additional: {
                ...prev.solutions[prev.currentSolution].additional,
                imageData
              }
            }
          }
        }))
      }
      reader.readAsDataURL(file)
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
      <div className="container mx-auto p-6">
        <div className="max-w-4xl mx-auto">
          
          {/* Page Header Section */}
          <div className="text-center mb-8">
            <h1 className="text-white text-3xl font-bold mb-4">Solution Overview Generator</h1>
            {sessionData.solutionCount > 1 && (
              <span className="bg-blue-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                Solution {sessionData.currentSolution} of {sessionData.solutionCount}
              </span>
            )}
          </div>

          {/* Solution Tabs System */}
          <div className="flex gap-2 mb-6 overflow-x-auto">
            <Button
              onClick={() => setCurrentTab('basic')}
              variant={currentTab === 'basic' ? 'default' : 'outline'}
              className={`flex items-center gap-2 ${
                currentTab === 'basic' 
                  ? 'bg-white text-black' 
                  : 'border-nexa-border text-white hover:bg-white/10'
              }`}
            >
              <Info className="h-4 w-4" />
              Basic
            </Button>
            
            {Object.keys(sessionData.solutions).map(solutionId => (
              <Button
                key={solutionId}
                onClick={() => {
                  switchSolution(parseInt(solutionId))
                  setCurrentTab(`solution-${solutionId}`)
                }}
                variant={currentTab === `solution-${solutionId}` ? 'default' : 'outline'}
                className={`${
                  currentTab === `solution-${solutionId}`
                    ? 'bg-white text-black'
                    : 'border-nexa-border text-white hover:bg-white/10'
                }`}
              >
                {solutionId}
              </Button>
            ))}
            
            <Button
              onClick={addSolution}
              variant="outline"
              className="border-nexa-border text-white hover:bg-white/10"
            >
              <Plus className="h-4 w-4" />
            </Button>
          </div>

          <Card variant="nexa" className="p-8">
            
            {/* Step 1: Basic Information */}
            {currentStep === 1 && (
              <div id="step1" className="space-y-6">
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

                <div className="flex justify-end">
                  <Button
                    onClick={nextStep}
                    className="bg-white text-black hover:bg-gray-100"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: Additional Content */}
            {currentStep === 2 && (
              <div id="step2" className="space-y-6">
                <h2 className="text-white text-xl font-semibold mb-6">Additional Content</h2>
                
                {/* Solution Image Section */}
                <div className="space-y-4">
                  <Label variant="nexa">Solution Image</Label>
                  <div className="flex gap-3 items-center">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="bg-nexa-input border-nexa-border text-white flex-1"
                    />
                    
                    <Button
                      onClick={runVisionAnalysis}
                      disabled={!currentSolution.additional.imageData || loadingStates.vision}
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 border-nexa-border text-white hover:bg-white/10"
                    >
                      {loadingStates.vision ? (
                        <RotateCw className="h-4 w-4 animate-spin" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    
                    <Button
                      onClick={() => setModals(prev => ({ ...prev, aiAnalysis: true }))}
                      disabled={!currentSolution.variables.aiAnalysis}
                      variant="outline"
                      size="sm"
                      className="h-10 w-10 p-0 border-nexa-border text-white hover:bg-white/10"
                    >
                      <Cpu className="h-4 w-4" />
                    </Button>
                    
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

                {/* Solution Explanation Section */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <Label variant="nexa">Solution Explanation</Label>
                    <Button
                      onClick={enhanceExplanation}
                      disabled={loadingStates.enhancing}
                      variant="outline"
                      size="sm"
                      className="border-nexa-border text-white hover:bg-white/10"
                    >
                      {loadingStates.enhancing ? (
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Enhance explanation
                    </Button>
                  </div>
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
                </div>

                <div className="flex justify-between">
                  <Button
                    onClick={prevStep}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  <div className="flex gap-3">
                    <Button
                      onClick={structureSolution}
                      disabled={loadingStates.structuring}
                      className="bg-blue-600 text-white hover:bg-blue-700"
                    >
                      {loadingStates.structuring ? (
                        <RotateCw className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Zap className="h-4 w-4 mr-2" />
                      )}
                      Structure Solution
                    </Button>
                    
                    <Button
                      onClick={nextStep}
                      className="bg-white text-black hover:bg-gray-100"
                    >
                      Next
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2.1: Structured Solution */}
            {currentStep === 3 && (
              <div id="step2_1" className="space-y-6">
                <h2 className="text-white text-xl font-semibold mb-6">Structured Solution</h2>
                
                {/* Quick Access Toolbar */}
                <div className="grid grid-cols-5 md:grid-cols-10 gap-2 mb-6">
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
                    onClick={() => alert('PDF Preview would open here')}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                    title="Preview PDF"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={() => alert('PDF generation would start here')}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-green-600 border-green-500 text-white hover:bg-green-700"
                    title="Generate PDF"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={handleSave}
                    disabled={loadingStates.saving}
                    variant="outline"
                    size="sm"
                    className="h-8 w-24 border-nexa-border text-white hover:bg-white/10"
                    title="Save Solution"
                  >
                    {loadingStates.saving ? (
                      <RotateCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <>
                        <Save className="h-4 w-4 mr-1" />
                        Save
                      </>
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleDelete}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-red-600 border-red-500 text-white hover:bg-red-700"
                    title="Delete Solution"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>

                {/* Structured Content Fields */}
                <div className="space-y-6">
                  {/* Solution Title */}
                  <div>
                    <Label variant="nexa" className="cursor-pointer" onClick={() => toggleEdit('title')}>
                      Solution Title (click to edit)
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
                        className="min-h-[40px] p-3 bg-gray-100 border border-nexa-border rounded-lg cursor-pointer text-black"
                      >
                        {currentSolution.structure.title || 'No content yet...'}
                      </div>
                    )}
                  </div>

                  {/* Solution Steps */}
                  <div>
                    <Label variant="nexa" className="cursor-pointer" onClick={() => toggleEdit('steps')}>
                      Solution Steps (click to edit)
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
                        className="min-h-[150px] p-3 bg-gray-100 border border-nexa-border rounded-lg cursor-pointer text-black whitespace-pre-wrap"
                      >
                        {currentSolution.structure.steps || 'No content yet...'}
                      </div>
                    )}
                  </div>

                  {/* AI Enhancement Button */}
                  <Button
                    onClick={() => alert('AI Enhancement would improve all content')}
                    className="w-full bg-gradient-to-r from-purple-600 to-blue-600 text-white hover:from-purple-700 hover:to-blue-700 p-4 text-lg font-medium"
                  >
                    <div className="flex items-center justify-center gap-3">
                      <Zap className="h-6 w-6" />
                      <span>Enhance with AI</span>
                      <div className="flex gap-1">
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.2s'}}></div>
                        <div className="w-2 h-2 bg-white rounded-full animate-pulse" style={{animationDelay: '0.4s'}}></div>
                      </div>
                    </div>
                  </Button>

                  {/* Technical Approach */}
                  <div>
                    <Label variant="nexa" className="cursor-pointer" onClick={() => toggleEdit('approach')}>
                      Technical Approach (click to edit)
                    </Label>
                    {editStates.approach ? (
                      <Textarea
                        variant="nexa"
                        rows={4}
                        value={currentSolution.structure.approach}
                        onChange={(e) => handleStructureEdit('approach', e.target.value)}
                        onBlur={() => toggleEdit('approach')}
                        autoFocus
                      />
                    ) : (
                      <div 
                        onClick={() => toggleEdit('approach')}
                        className="min-h-[100px] p-3 bg-gray-100 border border-nexa-border rounded-lg cursor-pointer text-black"
                      >
                        {currentSolution.structure.approach || 'No content yet...'}
                      </div>
                    )}
                  </div>

                  {/* Difficulty Slider */}
                  <div>
                    <Label variant="nexa">
                      Difficulty: {currentSolution.structure.difficulty}%
                    </Label>
                    <div className="relative">
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
                        className="w-full h-2 bg-gray-700 rounded-lg appearance-none cursor-pointer slider"
                      />
                      <div 
                        className="absolute top-0 h-2 bg-green-500 rounded-lg pointer-events-none"
                        style={{ width: `${currentSolution.structure.difficulty}%` }}
                      />
                      {currentSolution.structure.difficulty >= 70 && (
                        <div 
                          className="absolute top-0 h-2 bg-red-500 rounded-lg pointer-events-none"
                          style={{ 
                            left: '70%', 
                            width: `${Math.min(currentSolution.structure.difficulty - 70, 30)}%` 
                          }}
                        />
                      )}
                    </div>
                  </div>

                  {/* Layout Selection */}
                  <div>
                    <Label variant="nexa">PDF Layout Selection</Label>
                    <div className="grid grid-cols-5 gap-3 mt-3">
                      {[1, 2, 3, 4, 5].map(layoutNum => (
                        <Button
                          key={layoutNum}
                          onClick={() => setSessionData(prev => ({
                            ...prev,
                            solutions: {
                              ...prev.solutions,
                              [prev.currentSolution]: {
                                ...prev.solutions[prev.currentSolution],
                                structure: {
                                  ...prev.solutions[prev.currentSolution].structure,
                                  layout: layoutNum
                                }
                              }
                            }
                          }))}
                          variant="outline"
                          className={`h-10 w-10 p-0 ${
                            currentSolution.structure.layout === layoutNum
                              ? 'border-white bg-gray-800'
                              : 'border-nexa-border hover:bg-white/10'
                          } text-white`}
                        >
                          <div className="text-xs">{layoutNum}</div>
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>

                <div className="flex justify-between">
                  <Button
                    onClick={prevStep}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Back
                  </Button>
                  
                  {sessionData.solutionCount === sessionData.currentSolution && (
                    <Button
                      onClick={addSolution}
                      className="bg-white text-black hover:bg-gray-100"
                    >
                      Next Solution
                      <ArrowRight className="h-4 w-4 ml-2" />
                    </Button>
                  )}
                </div>
              </div>
            )}

          </Card>
        </div>
      </div>

      {/* Modals */}
      
      {/* Image Preview Modal */}
      {modals.imagePreview && currentSolution.additional.imageData && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                  className="bg-blue-600 text-white hover:bg-blue-700"
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-black border border-nexa-border rounded-lg w-full max-w-md mx-4">
            <div className="flex items-center justify-between p-6 border-b border-nexa-border">
              <h3 className="text-white text-lg font-semibold">Image Actions</h3>
              <Button
                onClick={() => setModals(prev => ({ ...prev, imageActions: false }))}
                variant="outline"
                size="sm"
                className="border-nexa-border text-white hover:bg-white/10"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
            <div className="p-6 space-y-4">
              <Button
                onClick={() => {
                  runVisionAnalysis()
                  setModals(prev => ({ ...prev, imageActions: false }))
                }}
                className="w-full bg-blue-600 text-white hover:bg-blue-700"
                disabled={!currentSolution.additional.imageData}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Reanalyze Image
              </Button>
              
              <div>
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
                  onClick={() => document.getElementById('new-image-upload')?.click()}
                  className="w-full bg-green-600 text-white hover:bg-green-700"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  Upload New Image
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Stack Modal */}
      {modals.stackModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
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
                    onClick={() => {
                      generateStack()
                      setModals(prev => ({ ...prev, stackModal: false }))
                    }}
                    disabled={loadingStates.generating}
                    className="bg-blue-600 text-white hover:bg-blue-700"
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

