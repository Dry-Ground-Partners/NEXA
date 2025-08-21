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
  Search, 
  Lightbulb, 
  Save, 
  Trash2, 
  Plus, 
  RotateCw,
  FileText,
  Layers,
  ArrowLeft,
  ArrowRight
} from 'lucide-react'
import type { AuthUser } from '@/types'

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
  
  // Main tab state
  const [activeMainTab, setActiveMainTab] = useState('project')
  
  // Form state
  const [title, setTitle] = useState('')
  const [client, setClient] = useState('')
  
  // Content tabs state
  const [contentTabs, setContentTabs] = useState<ContentTab[]>([{ id: 1, text: '' }])
  const [activeContentTab, setActiveContentTab] = useState(1)
  
  // Solution tabs state
  const [solutionTabs, setSolutionTabs] = useState<SolutionTab[]>([{ id: 1, text: '' }])
  const [activeSolutionTab, setActiveSolutionTab] = useState(1)
  
  // Loading states
  const [diagnosing, setDiagnosing] = useState(false)
  const [generating, setGenerating] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (data.success) {
          setUser(data.user)
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

  // AI Functions (non-functional for UI-only version)
  const handleDiagnose = async () => {
    const allContent = contentTabs.map(tab => tab.text).join('\n\n').trim()
    
    if (!allContent) {
      alert('Please add content before diagnosing.')
      return
    }

    setDiagnosing(true)
    
    // Simulate AI processing delay
    setTimeout(() => {
      // Mock: Add some sample pain points as solution tabs
      const mockPainPoints = [
        "Manual processes causing inefficiency and time waste",
        "Data management issues affecting decision making",
        "Communication gaps between teams and stakeholders"
      ]
      
      const newSolutionTabs: SolutionTab[] = mockPainPoints.map((point, index) => ({
        id: solutionTabs.length + index + 1,
        text: point
      }))
      
      setSolutionTabs([...solutionTabs, ...newSolutionTabs])
      setActiveSolutionTab(newSolutionTabs[newSolutionTabs.length - 1].id)
      setDiagnosing(false)
    }, 2000)
  }

  const handleGenerateSolution = async () => {
    const currentTab = solutionTabs.find(tab => tab.id === activeSolutionTab)
    
    if (!currentTab?.text.trim()) {
      alert('Please add content to the current solution tab before generating.')
      return
    }

    setGenerating(true)
    
    // Simulate AI processing delay
    setTimeout(() => {
      const enhancedText = `${currentTab.text}\n\nEnhanced solution: This solution can be improved by implementing automated workflows, establishing clear communication channels, and setting up proper monitoring systems to track progress and identify bottlenecks early.`
      
      updateSolutionTab(activeSolutionTab, enhancedText)
      setGenerating(false)
    }, 2000)
  }

  const handleSave = async () => {
    setSaving(true)
    
    // Simulate save operation
    setTimeout(() => {
      alert('Session saved successfully!')
      setSaving(false)
    }, 1000)
  }

  const handleDelete = async () => {
    if (confirm('Are you sure you want to delete this structuring session?')) {
      // Simulate delete and redirect
      window.location.href = '/dashboard'
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
            
            {/* Right: Action Buttons */}
            <div className="flex">
              <button
                onClick={handleSave}
                disabled={saving}
                className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-white/10 text-white border-t border-l border-r border-white rounded-t-lg relative hover:bg-white/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
              >
                {saving ? (
                  <>
                    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
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
                      className="w-full border border-nexa-border text-white bg-transparent p-6 text-lg font-medium rounded-xl transition-all duration-300 diagnose-button"
                    >
                      {diagnosing ? (
                        <>
                          <RotateCw className="h-6 w-6 mr-3 animate-spin" />
                          Diagnosing...
                        </>
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
                  <div>
                    <Button
                      onClick={handleGenerateSolution}
                      disabled={generating}
                      className="w-full border border-nexa-border text-white bg-transparent p-6 text-lg font-medium rounded-xl transition-all duration-300 generate-solution-button"
                    >
                      {generating ? (
                        <>
                          <RotateCw className="h-6 w-6 mr-3 animate-spin" />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="h-6 w-6 mr-3" />
                          <span className="generate-solution-text">Generate Solution</span>
                        </>
                      )}
                    </Button>
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
    </DashboardLayout>
  )
}
