'use client'

import { useEffect, useState } from 'react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { 
  ArrowRight,
  ArrowLeft,
  Plus,
  Trash2,
  FileText,
  Download,
  Save,
  Database,
  ChevronUp,
  ChevronDown,
  RotateCw
} from 'lucide-react'
import type { AuthUser } from '@/types'

interface Objective {
  id: number
  text: string
}

interface Deliverable {
  id: number
  deliverable: string
  keyFeatures: string
  primaryArtifacts: string
}

interface FunctionalRequirement {
  id: number
  text: string
}

interface NonFunctionalRequirement {
  id: number
  text: string
}

interface ProjectPhase {
  id: number
  phase: string
  keyActivities: string
  weeksStart: number
  weeksEnd: number
}

interface SOWData {
  step1: {
    projectName: string
    client: string
    preparedBy: string
    date: string
    background: string
    objectives: Objective[]
  }
  step2: {
    deliverables: Deliverable[]
    outOfScope: string
    functionalRequirements: FunctionalRequirement[]
  }
  step3: {
    nonFunctionalRequirements: NonFunctionalRequirement[]
    phases: ProjectPhase[]
  }
}

export default function SOWPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  
  // SOW Data State
  const [sowData, setSOWData] = useState<SOWData>({
    step1: {
      projectName: '',
      client: '',
      preparedBy: 'Dry Ground Partners',
      date: new Date().toISOString().split('T')[0],
      background: '',
      objectives: [{ id: 1, text: '' }]
    },
    step2: {
      deliverables: [{ id: 1, deliverable: '', keyFeatures: '', primaryArtifacts: '' }],
      outOfScope: '',
      functionalRequirements: [{ id: 1, text: '' }]
    },
    step3: {
      nonFunctionalRequirements: [{ id: 1, text: '' }],
      phases: [{ id: 1, phase: '', keyActivities: '', weeksStart: 1, weeksEnd: 4 }]
    }
  })

  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    generating: false,
    saving: false,
    deleting: false
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

  // Navigation functions
  const nextStep = () => {
    if (currentStep === 1) {
      // Validate Step 1
      if (!sowData.step1.projectName || !sowData.step1.client || !sowData.step1.background) {
        alert('Please fill in all required fields (Project Name, Client, and Background).')
        return
      }
      if (sowData.step1.objectives.some(obj => !obj.text.trim())) {
        alert('Please fill in all objectives.')
        return
      }
    }
    if (currentStep === 2) {
      // Validate Step 2
      if (sowData.step2.deliverables.some(del => !del.deliverable.trim() || !del.keyFeatures.trim() || !del.primaryArtifacts.trim())) {
        alert('Please fill in all deliverable fields.')
        return
      }
      if (sowData.step2.functionalRequirements.some(req => !req.text.trim())) {
        alert('Please fill in all functional requirements.')
        return
      }
    }
    setCurrentStep(Math.min(3, currentStep + 1))
  }

  const prevStep = () => {
    setCurrentStep(Math.max(1, currentStep - 1))
  }

  // Step 1 Functions - Objectives
  const addObjective = () => {
    const newId = Math.max(...sowData.step1.objectives.map(obj => obj.id)) + 1
    setSOWData(prev => ({
      ...prev,
      step1: {
        ...prev.step1,
        objectives: [...prev.step1.objectives, { id: newId, text: '' }]
      }
    }))
  }

  const removeObjective = (id: number) => {
    if (sowData.step1.objectives.length === 1) return
    setSOWData(prev => ({
      ...prev,
      step1: {
        ...prev.step1,
        objectives: prev.step1.objectives.filter(obj => obj.id !== id)
      }
    }))
  }

  const updateObjective = (id: number, text: string) => {
    setSOWData(prev => ({
      ...prev,
      step1: {
        ...prev.step1,
        objectives: prev.step1.objectives.map(obj => 
          obj.id === id ? { ...obj, text } : obj
        )
      }
    }))
  }

  // Step 2 Functions - Deliverables
  const addDeliverable = () => {
    const newId = Math.max(...sowData.step2.deliverables.map(del => del.id)) + 1
    setSOWData(prev => ({
      ...prev,
      step2: {
        ...prev.step2,
        deliverables: [...prev.step2.deliverables, { 
          id: newId, 
          deliverable: '', 
          keyFeatures: '', 
          primaryArtifacts: '' 
        }]
      }
    }))
  }

  const removeDeliverable = (id: number) => {
    if (sowData.step2.deliverables.length === 1) return
    setSOWData(prev => ({
      ...prev,
      step2: {
        ...prev.step2,
        deliverables: prev.step2.deliverables.filter(del => del.id !== id)
      }
    }))
  }

  const updateDeliverable = (id: number, field: keyof Deliverable, value: string) => {
    setSOWData(prev => ({
      ...prev,
      step2: {
        ...prev.step2,
        deliverables: prev.step2.deliverables.map(del => 
          del.id === id ? { ...del, [field]: value } : del
        )
      }
    }))
  }

  // Step 2 Functions - Functional Requirements
  const addFunctionalRequirement = () => {
    const newId = Math.max(...sowData.step2.functionalRequirements.map(req => req.id)) + 1
    setSOWData(prev => ({
      ...prev,
      step2: {
        ...prev.step2,
        functionalRequirements: [...prev.step2.functionalRequirements, { id: newId, text: '' }]
      }
    }))
  }

  const removeFunctionalRequirement = (id: number) => {
    if (sowData.step2.functionalRequirements.length === 1) return
    setSOWData(prev => ({
      ...prev,
      step2: {
        ...prev.step2,
        functionalRequirements: prev.step2.functionalRequirements.filter(req => req.id !== id)
      }
    }))
  }

  const updateFunctionalRequirement = (id: number, text: string) => {
    setSOWData(prev => ({
      ...prev,
      step2: {
        ...prev.step2,
        functionalRequirements: prev.step2.functionalRequirements.map(req => 
          req.id === id ? { ...req, text } : req
        )
      }
    }))
  }

  // Step 3 Functions - Non-Functional Requirements
  const addNonFunctionalRequirement = () => {
    const newId = Math.max(...sowData.step3.nonFunctionalRequirements.map(req => req.id)) + 1
    setSOWData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        nonFunctionalRequirements: [...prev.step3.nonFunctionalRequirements, { id: newId, text: '' }]
      }
    }))
  }

  const removeNonFunctionalRequirement = (id: number) => {
    if (sowData.step3.nonFunctionalRequirements.length === 1) return
    setSOWData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        nonFunctionalRequirements: prev.step3.nonFunctionalRequirements.filter(req => req.id !== id)
      }
    }))
  }

  const updateNonFunctionalRequirement = (id: number, text: string) => {
    setSOWData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        nonFunctionalRequirements: prev.step3.nonFunctionalRequirements.map(req => 
          req.id === id ? { ...req, text } : req
        )
      }
    }))
  }

  // Step 3 Functions - Project Phases
  const addPhase = () => {
    const lastPhase = sowData.step3.phases[sowData.step3.phases.length - 1]
    const newId = Math.max(...sowData.step3.phases.map(phase => phase.id)) + 1
    const newStart = lastPhase ? lastPhase.weeksEnd + 1 : 1
    const newEnd = newStart + 3
    
    setSOWData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        phases: [...prev.step3.phases, { 
          id: newId, 
          phase: '', 
          keyActivities: '', 
          weeksStart: newStart, 
          weeksEnd: newEnd 
        }]
      }
    }))
  }

  const removePhase = (id: number) => {
    if (sowData.step3.phases.length === 1) return
    setSOWData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        phases: prev.step3.phases.filter(phase => phase.id !== id)
      }
    }))
  }

  const updatePhase = (id: number, field: keyof ProjectPhase, value: string | number) => {
    setSOWData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        phases: prev.step3.phases.map(phase => 
          phase.id === id ? { ...phase, [field]: value } : phase
        )
      }
    }))
  }

  const adjustWeeks = (id: number, direction: 'up' | 'down') => {
    setSOWData(prev => ({
      ...prev,
      step3: {
        ...prev.step3,
        phases: prev.step3.phases.map(phase => {
          if (phase.id === id) {
            const newEnd = direction === 'up' 
              ? Math.max(phase.weeksStart, phase.weeksEnd + 1)
              : Math.max(phase.weeksStart, phase.weeksEnd - 1)
            return { ...phase, weeksEnd: newEnd }
          }
          return phase
        })
      }
    }))
  }

  // Action Functions
  const handlePreviewPDF = () => {
    alert('PDF Preview would open in a new tab here')
  }

  const handleGeneratePDF = () => {
    setLoadingStates(prev => ({ ...prev, generating: true }))
    setTimeout(() => {
      alert('SOW PDF would be generated and downloaded here')
      setLoadingStates(prev => ({ ...prev, generating: false }))
    }, 2000)
  }

  const handleSave = () => {
    setLoadingStates(prev => ({ ...prev, saving: true }))
    setTimeout(() => {
      alert('SOW session saved successfully!')
      setLoadingStates(prev => ({ ...prev, saving: false }))
    }, 1000)
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this SOW session?')) {
      setLoadingStates(prev => ({ ...prev, deleting: true }))
      setTimeout(() => {
        window.location.href = '/dashboard'
      }, 1000)
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
      user={user ? {
        fullName: user.fullName,
        email: user.email
      } : undefined}
    >
      <div className="container mx-auto p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* Page Header */}
          <div className="text-center mb-8">
            <h1 className="text-white text-3xl font-bold mb-4">Statement of Work Generator</h1>
            <div className="flex justify-center gap-4 mb-6">
              {[1, 2, 3].map(step => (
                <div
                  key={step}
                  className={`flex items-center justify-center w-10 h-10 rounded-full border-2 font-semibold ${
                    currentStep === step
                      ? 'bg-white text-black border-white'
                      : currentStep > step
                      ? 'bg-green-600 text-white border-green-600'
                      : 'bg-transparent text-white border-nexa-border'
                  }`}
                >
                  {step}
                </div>
              ))}
            </div>
          </div>

          <Card variant="nexa" className="p-8">
            
            {/* Step 1: Project Details & Objectives */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <h2 className="text-white text-xl font-semibold mb-6">Project Details & Objectives</h2>
                
                {/* Basic Project Information */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="projectName">
                      Project Name *
                    </Label>
                    <Input
                      variant="nexa"
                      id="projectName"
                      placeholder="Project Name - Enter project name..."
                      value={sowData.step1.projectName}
                      onChange={(e) => setSOWData(prev => ({
                        ...prev,
                        step1: { ...prev.step1, projectName: e.target.value }
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
                      placeholder="Client - Enter client name..."
                      value={sowData.step1.client}
                      onChange={(e) => setSOWData(prev => ({
                        ...prev,
                        step1: { ...prev.step1, client: e.target.value }
                      }))}
                      required
                    />
                  </div>
                  
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="preparedBy">
                      Prepared By
                    </Label>
                    <Input
                      variant="nexa"
                      id="preparedBy"
                      placeholder="Prepared By - Enter your name..."
                      value={sowData.step1.preparedBy}
                      onChange={(e) => setSOWData(prev => ({
                        ...prev,
                        step1: { ...prev.step1, preparedBy: e.target.value }
                      }))}
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
                      value={sowData.step1.date}
                      onChange={(e) => setSOWData(prev => ({
                        ...prev,
                        step1: { ...prev.step1, date: e.target.value }
                      }))}
                      required
                    />
                  </div>
                </div>

                {/* Project Purpose & Background */}
                <div className="nexa-form-group">
                  <Label variant="nexa" htmlFor="background">
                    Project Purpose & Background *
                  </Label>
                  <Textarea
                    variant="nexa"
                    id="background"
                    rows={4}
                    placeholder="Describe the project purpose and background..."
                    value={sowData.step1.background}
                    onChange={(e) => setSOWData(prev => ({
                      ...prev,
                      step1: { ...prev.step1, background: e.target.value }
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
                    {sowData.step1.objectives.map((objective) => (
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
                          disabled={sowData.step1.objectives.length === 1}
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

                <div className="flex justify-end">
                  <Button
                    onClick={nextStep}
                    className="bg-gray-800 text-white hover:bg-gray-700"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 2: In-Scope Deliverables & Functional Requirements */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <h2 className="text-white text-xl font-semibold mb-6">In-Scope Deliverables & Functional Requirements</h2>
                
                {/* Deliverables Table */}
                <div>
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
                        {sowData.step2.deliverables.map((deliverable, index) => (
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
                    value={sowData.step2.outOfScope}
                    onChange={(e) => setSOWData(prev => ({
                      ...prev,
                      step2: { ...prev.step2, outOfScope: e.target.value }
                    }))}
                  />
                </div>

                {/* Functional Requirements */}
                <div>
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
                    {sowData.step2.functionalRequirements.map((requirement) => (
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
                          disabled={sowData.step2.functionalRequirements.length === 1}
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

                <div className="flex justify-between">
                  <Button
                    onClick={prevStep}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                  
                  <Button
                    onClick={nextStep}
                    className="bg-gray-800 text-white hover:bg-gray-700"
                  >
                    Next
                    <ArrowRight className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </div>
            )}

            {/* Step 3: Non-Functional Requirements & Timeline */}
            {currentStep === 3 && (
              <div className="space-y-6">
                <h2 className="text-white text-xl font-semibold mb-6">Non-Functional Requirements & Timeline</h2>
                
                {/* Action Buttons Toolbar */}
                <div className="flex flex-wrap gap-2 mb-6 p-4 bg-gray-900 rounded-lg border border-nexa-border">
                  <Button
                    onClick={handlePreviewPDF}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
                    title="Preview PDF"
                  >
                    <FileText className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={handleGeneratePDF}
                    disabled={loadingStates.generating}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-green-600 border-green-500 text-white hover:bg-green-700"
                    title="Generate PDF"
                  >
                    {loadingStates.generating ? (
                      <RotateCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Download className="h-4 w-4" />
                    )}
                  </Button>
                  
                  <Button
                    onClick={handleSave}
                    disabled={loadingStates.saving}
                    variant="outline"
                    size="sm"
                    className="h-8 w-24 bg-gray-800 border-nexa-border text-white hover:bg-gray-700"
                    title="Save SoW"
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
                    onClick={() => alert('Save to Database functionality')}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-yellow-600 border-yellow-500 text-white hover:bg-yellow-700 hidden"
                    title="Save to Database"
                  >
                    <Database className="h-4 w-4" />
                  </Button>
                  
                  <Button
                    onClick={handleDelete}
                    disabled={loadingStates.deleting}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-red-600 border-red-500 text-white hover:bg-red-700"
                    title="Delete SoW"
                  >
                    {loadingStates.deleting ? (
                      <RotateCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
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
                    {sowData.step3.nonFunctionalRequirements.map((requirement) => (
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
                          disabled={sowData.step3.nonFunctionalRequirements.length === 1}
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
                        {sowData.step3.phases.map((phase, index) => (
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

                <div className="flex justify-start">
                  <Button
                    onClick={prevStep}
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
                  >
                    <ArrowLeft className="h-4 w-4 mr-2" />
                    Previous
                  </Button>
                </div>
              </div>
            )}

          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

