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
  RotateCw
} from 'lucide-react'
import type { AuthUser } from '@/types'

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

interface LOEData {
  basic: {
    project: string
    client: string
    preparedBy: string
    date: string
  }
  overview: string
  workstreams: Workstream[]
  resources: Resource[]
  buffer: {
    weeks: number
    hours: number
  }
  assumptions: Assumption[]
  goodOptions: GoodOption[]
  bestOptions: BestOption[]
}

export default function LOEPage() {
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [currentStep, setCurrentStep] = useState(1)
  
  // LOE Data State
  const [loeData, setLOEData] = useState<LOEData>({
    basic: {
      project: '',
      client: '',
      preparedBy: 'Dry Ground Partners',
      date: new Date().toISOString().split('T')[0]
    },
    overview: '',
    workstreams: [
      { id: 1, workstream: '', activities: '', duration: 2 }
    ],
    resources: [
      { id: 1, role: 'Project Manager', personWeeks: 3.0, personHours: 60 },
      { id: 2, role: 'Solution Architect', personWeeks: 4.0, personHours: 80 },
      { id: 3, role: 'Developer', personWeeks: 8.0, personHours: 160 },
      { id: 4, role: 'Quality Assurance', personWeeks: 2.0, personHours: 40 },
      { id: 5, role: 'Business Analyst', personWeeks: 3.0, personHours: 60 }
    ],
    buffer: {
      weeks: 1.0,
      hours: 20
    },
    assumptions: [
      { id: 1, text: 'Client will provide necessary access and resources in a timely manner' },
      { id: 2, text: 'All stakeholders will be available for interviews and feedback sessions' },
      { id: 3, text: 'Technical infrastructure requirements will be defined during requirements phase' }
    ],
    goodOptions: [
      { id: 1, feature: '', hours: 0, weeks: 0 }
    ],
    bestOptions: [
      { id: 1, feature: '', hours: 0, weeks: 0 }
    ]
  })

  // Loading states
  const [loadingStates, setLoadingStates] = useState({
    previewing: false,
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
      if (!loeData.basic.project || !loeData.basic.client || !loeData.basic.preparedBy) {
        alert('Please fill in all required fields (Project, Client, and Prepared By).')
        return
      }
      if (!loeData.overview.trim()) {
        alert('Please provide a project overview.')
        return
      }
      if (loeData.workstreams.some(ws => !ws.workstream.trim() || !ws.activities.trim() || ws.duration < 1)) {
        alert('Please complete all workstream fields with valid durations (minimum 1 week).')
        return
      }
    }
    setCurrentStep(2)
  }

  const prevStep = () => {
    setCurrentStep(1)
  }

  // Calculation helpers
  const weeksToHours = (weeks: number) => Math.round(weeks * 20)
  const hoursToWeeks = (hours: number) => Math.round((hours / 20) * 2) / 2 // Round to nearest 0.5

  // Workstream functions
  const addWorkstream = () => {
    const newId = Math.max(...loeData.workstreams.map(ws => ws.id)) + 1
    setLOEData(prev => ({
      ...prev,
      workstreams: [...prev.workstreams, { id: newId, workstream: '', activities: '', duration: 2 }]
    }))
  }

  const removeWorkstream = (id: number) => {
    if (loeData.workstreams.length === 1) return
    setLOEData(prev => ({
      ...prev,
      workstreams: prev.workstreams.filter(ws => ws.id !== id)
    }))
  }

  const updateWorkstream = (id: number, field: keyof Workstream, value: string | number) => {
    setLOEData(prev => ({
      ...prev,
      workstreams: prev.workstreams.map(ws => 
        ws.id === id ? { ...ws, [field]: value } : ws
      )
    }))
  }

  // Resource functions
  const addResource = () => {
    const newId = Math.max(...loeData.resources.map(res => res.id)) + 1
    setLOEData(prev => ({
      ...prev,
      resources: [...prev.resources, { id: newId, role: '', personWeeks: 1.0, personHours: 20 }]
    }))
  }

  const removeResource = (id: number) => {
    if (loeData.resources.length === 1) return
    setLOEData(prev => ({
      ...prev,
      resources: prev.resources.filter(res => res.id !== id)
    }))
  }

  const updateResource = (id: number, field: keyof Resource, value: string | number) => {
    setLOEData(prev => ({
      ...prev,
      resources: prev.resources.map(res => {
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
    }))
  }

  // Buffer functions
  const updateBuffer = (field: 'weeks' | 'hours', value: number) => {
    setLOEData(prev => ({
      ...prev,
      buffer: {
        weeks: field === 'weeks' ? value : hoursToWeeks(value),
        hours: field === 'hours' ? value : weeksToHours(value)
      }
    }))
  }

  // Assumption functions
  const addAssumption = () => {
    const newId = Math.max(...loeData.assumptions.map(ass => ass.id)) + 1
    setLOEData(prev => ({
      ...prev,
      assumptions: [...prev.assumptions, { id: newId, text: '' }]
    }))
  }

  const removeAssumption = (id: number) => {
    if (loeData.assumptions.length === 1) return
    setLOEData(prev => ({
      ...prev,
      assumptions: prev.assumptions.filter(ass => ass.id !== id)
    }))
  }

  const updateAssumption = (id: number, text: string) => {
    setLOEData(prev => ({
      ...prev,
      assumptions: prev.assumptions.map(ass => 
        ass.id === id ? { ...ass, text } : ass
      )
    }))
  }

  // Good Option functions
  const addGoodOption = () => {
    const newId = Math.max(...loeData.goodOptions.map(opt => opt.id)) + 1
    setLOEData(prev => ({
      ...prev,
      goodOptions: [...prev.goodOptions, { id: newId, feature: '', hours: 0, weeks: 0 }]
    }))
  }

  const removeGoodOption = (id: number) => {
    if (loeData.goodOptions.length === 1) return
    setLOEData(prev => ({
      ...prev,
      goodOptions: prev.goodOptions.filter(opt => opt.id !== id)
    }))
  }

  const updateGoodOption = (id: number, field: keyof GoodOption, value: string | number) => {
    setLOEData(prev => ({
      ...prev,
      goodOptions: prev.goodOptions.map(opt => {
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
    }))
  }

  // Best Option functions
  const addBestOption = () => {
    const newId = Math.max(...loeData.bestOptions.map(opt => opt.id)) + 1
    setLOEData(prev => ({
      ...prev,
      bestOptions: [...prev.bestOptions, { id: newId, feature: '', hours: 0, weeks: 0 }]
    }))
  }

  const removeBestOption = (id: number) => {
    if (loeData.bestOptions.length === 1) return
    setLOEData(prev => ({
      ...prev,
      bestOptions: prev.bestOptions.filter(opt => opt.id !== id)
    }))
  }

  const updateBestOption = (id: number, field: keyof BestOption, value: string | number) => {
    setLOEData(prev => ({
      ...prev,
      bestOptions: prev.bestOptions.map(opt => {
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
    }))
  }

  // Calculation functions
  const getTotalResourceHours = () => {
    return loeData.resources.reduce((total, res) => total + res.personHours, 0)
  }

  const getTotalResourceWeeks = () => {
    return loeData.resources.reduce((total, res) => total + res.personWeeks, 0)
  }

  const getBufferPercentage = () => {
    const totalHours = getTotalResourceHours()
    return totalHours > 0 ? Math.round((loeData.buffer.hours / totalHours) * 100) : 0
  }

  const getGoodTotalReduction = () => {
    return {
      hours: loeData.goodOptions.reduce((total, opt) => total + opt.hours, 0),
      weeks: loeData.goodOptions.reduce((total, opt) => total + opt.weeks, 0)
    }
  }

  const getBestTotalAddition = () => {
    return {
      hours: loeData.bestOptions.reduce((total, opt) => total + opt.hours, 0),
      weeks: loeData.bestOptions.reduce((total, opt) => total + opt.weeks, 0)
    }
  }

  // Action functions
  const handlePreviewPDF = () => {
    setLoadingStates(prev => ({ ...prev, previewing: true }))
    setTimeout(() => {
      alert('LOE PDF Preview would open in a new tab here')
      setLoadingStates(prev => ({ ...prev, previewing: false }))
    }, 1000)
  }

  const handleGeneratePDF = () => {
    setLoadingStates(prev => ({ ...prev, generating: true }))
    setTimeout(() => {
      alert('LOE PDF would be generated and downloaded here')
      setLoadingStates(prev => ({ ...prev, generating: false }))
    }, 2000)
  }

  const handleSave = () => {
    setLoadingStates(prev => ({ ...prev, saving: true }))
    setTimeout(() => {
      alert('LOE session saved successfully!')
      setLoadingStates(prev => ({ ...prev, saving: false }))
    }, 1000)
  }

  const handleDelete = () => {
    if (confirm('Are you sure you want to delete this LOE session?')) {
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
      currentPage="Level of Effort" 
      user={user ? {
        fullName: user.fullName,
        email: user.email
      } : undefined}
    >
      <div className="container mx-auto p-6">
        <div className="max-w-5xl mx-auto">
          
          {/* Page Title Section */}
          <div className="text-center mb-8">
            <h1 className="text-white text-4xl font-bold mb-2">Level of Effort</h1>
            <p className="text-nexa-muted text-lg">Estimate project complexity and resource requirements</p>
          </div>

          <Card variant="nexa" className="p-10">
            
            {/* Step 1: Overview & Workstreams */}
            {currentStep === 1 && (
              <div className="space-y-8">
                <h2 className="text-white text-xl font-semibold mb-6">Overview & Workstreams</h2>
                
                {/* Basic Information (2x2 Grid) */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="nexa-form-group">
                    <Label variant="nexa" htmlFor="project">
                      Project Name *
                    </Label>
                    <Input
                      variant="nexa"
                      id="project"
                      placeholder="Enter project name..."
                      value={loeData.basic.project}
                      onChange={(e) => setLOEData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, project: e.target.value }
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
                      value={loeData.basic.client}
                      onChange={(e) => setLOEData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, client: e.target.value }
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
                      value={loeData.basic.preparedBy}
                      onChange={(e) => setLOEData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, preparedBy: e.target.value }
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
                      value={loeData.basic.date}
                      onChange={(e) => setLOEData(prev => ({
                        ...prev,
                        basic: { ...prev.basic, date: e.target.value }
                      }))}
                      required
                    />
                  </div>
                </div>

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
                    value={loeData.overview}
                    onChange={(e) => setLOEData(prev => ({ ...prev, overview: e.target.value }))}
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
                        {loeData.workstreams.map((workstream, index) => (
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

                {/* Step Navigation */}
                <div className="flex justify-center mt-8">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black font-semibold">
                        1
                      </div>
                      <span className="text-white text-sm">Overview & Workstreams</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full border-2 border-nexa-border text-nexa-muted font-semibold">
                        2
                      </div>
                      <span className="text-nexa-muted text-sm">Resources & Assumptions</span>
                    </div>
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

            {/* Step 2: Resources & Assumptions */}
            {currentStep === 2 && (
              <div className="space-y-8">
                <h2 className="text-white text-xl font-semibold mb-6">Resources & Assumptions</h2>
                
                {/* Action Buttons Bar */}
                <div className="flex flex-wrap gap-2 p-4 bg-gray-900 rounded-lg border border-nexa-border">
                  <Button
                    onClick={handlePreviewPDF}
                    disabled={loadingStates.previewing}
                    variant="outline"
                    size="sm"
                    className="h-8 w-8 p-0 bg-blue-600 border-blue-500 text-white hover:bg-blue-700"
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
                    title="Save"
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
                    title="Delete"
                  >
                    {loadingStates.deleting ? (
                      <RotateCw className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>

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
                        {loeData.resources.map((resource, index) => (
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
                        value={loeData.buffer.weeks}
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
                        value={loeData.buffer.hours}
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

                {/* Assumptions Section */}
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <Label variant="nexa">Assumptions</Label>
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
                    {loeData.assumptions.map((assumption, index) => (
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
                          disabled={loeData.assumptions.length === 1}
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
                          {loeData.goodOptions.map((option, index) => (
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
                          {loeData.bestOptions.map((option, index) => (
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

                {/* Step Navigation */}
                <div className="flex justify-center mt-8">
                  <div className="flex items-center gap-6">
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-green-600 text-white font-semibold">
                        1
                      </div>
                      <span className="text-green-400 text-sm">Overview & Workstreams</span>
                    </div>
                    
                    <div className="flex items-center gap-4">
                      <div className="flex items-center justify-center w-8 h-8 rounded-full bg-white text-black font-semibold">
                        2
                      </div>
                      <span className="text-white text-sm">Resources & Assumptions</span>
                    </div>
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

