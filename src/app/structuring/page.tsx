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
  
  // Tab state
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
        if (response.ok) {
          const result = await response.json()
          if (result.success) {
            setUser(result.user)
          }
        }
      } catch (error) {
        console.error('Error fetching user:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [])

  const addContentTab = () => {
    const newId = Math.max(...contentTabs.map(tab => tab.id)) + 1
    const newTab = { id: newId, text: '' }
    setContentTabs([...contentTabs, newTab])
    setActiveContentTab(newId)
  }

  const deleteContentTab = () => {
    if (contentTabs.length <= 1) return
    
    const updatedTabs = contentTabs.filter(tab => tab.id !== activeContentTab)
    setContentTabs(updatedTabs)
    setActiveContentTab(updatedTabs[0]?.id || 1)
  }

  const updateContentTab = (id: number, text: string) => {
    setContentTabs(contentTabs.map(tab => 
      tab.id === id ? { ...tab, text } : tab
    ))
  }

  const addSolutionTab = () => {
    const newId = Math.max(...solutionTabs.map(tab => tab.id)) + 1
    const newTab = { id: newId, text: '' }
    setSolutionTabs([...solutionTabs, newTab])
    setActiveSolutionTab(newId)
  }

  const deleteSolutionTab = () => {
    if (solutionTabs.length <= 1) return
    
    const updatedTabs = solutionTabs.filter(tab => tab.id !== activeSolutionTab)
    setSolutionTabs(updatedTabs)
    setActiveSolutionTab(updatedTabs[0]?.id || 1)
  }

  const updateSolutionTab = (id: number, text: string) => {
    setSolutionTabs(solutionTabs.map(tab => 
      tab.id === id ? { ...tab, text } : tab
    ))
  }

  const handleDiagnose = async () => {
    setDiagnosing(true)
    
    // Simulate AI diagnosis
    setTimeout(() => {
      alert('Analysis complete! Found potential optimization opportunities.')
      setDiagnosing(false)
    }, 3000)
  }

  const handleGenerateSolution = async () => {
    setGenerating(true)
    
    // Simulate AI solution generation
    setTimeout(() => {
      alert('Solution generated! Check the Solution tabs for recommendations.')
      setGenerating(false)
    }, 3000)
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

  const handleNextTab = () => {
    if (activeMainTab === 'project') {
      setActiveMainTab('content')
    } else if (activeMainTab === 'content') {
      setActiveMainTab('solution')
    }
  }

  const handlePreviousTab = () => {
    if (activeMainTab === 'solution') {
      setActiveMainTab('content')
    } else if (activeMainTab === 'content') {
      setActiveMainTab('project')
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
          {/* Tab system with seamless folder-like design */}
          <Tabs value={activeMainTab} className="w-full" onValueChange={setActiveMainTab}>
            {/* Header row with Structuring label and Tabs */}
            <div className="flex items-end justify-between mb-0">
              <div className="flex items-end gap-8">
                {/* Structuring label - positioned inline with tabs */}
                <div className="inline-flex items-center justify-center gap-2 text-white pb-3">
                  <Layers className="w-4 h-4" />
                  <span className="text-center">Structuring</span>
                </div>

                {/* Tab strip */}
                <TabsList className="mb-0">
                  <TabsTrigger value="project" className="flex items-center gap-2">
                    <FileText className="w-4 h-4" />
                    Project
                  </TabsTrigger>
                  <TabsTrigger value="content" className="flex items-center gap-2">
                    <Search className="w-4 h-4" />
                    Content
                  </TabsTrigger>
                  <TabsTrigger value="solution" className="flex items-center gap-2">
                    <Lightbulb className="w-4 h-4" />
                    Solution
                  </TabsTrigger>
                </TabsList>
              </div>

              {/* Action tabs aligned right */}
              <TabsList className="mb-0">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-nexa-card border-t border-l border-r border-nexa-border text-white rounded-t-lg relative hover:text-white hover:bg-nexa-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20"
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
                  className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-nexa-card border-t border-l border-r border-red-600 text-red-500 rounded-t-lg relative hover:text-red-500 hover:bg-nexa-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-500/20"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </button>
              </TabsList>
            </div>

            {/* Card container with rounded corners and seamless tab integration */}
            <Card variant="nexa" className="border-t border-nexa-border p-8 mt-0 relative z-0 rounded-tl-lg rounded-bl-lg rounded-br-lg rounded-tr-none">
              
              {/* Project Tab */}
              <TabsContent value="project" className="mt-0">
                <div className="mb-8">
                  <h2 className="text-white text-xl font-semibold mb-6">Project Information</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="nexa-form-group">
                      <Label variant="nexa" htmlFor="title">
                        Title
                      </Label>
                      <Input
                        variant="nexa"
                        id="title"
                        placeholder="Enter project title..."
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
                        placeholder="Enter client name..."
                        value={client}
                        onChange={(e) => setClient(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>

              {/* Content Tab */}
              <TabsContent value="content" className="mt-0">
                <div className="space-y-8">
                  {/* Content Section */}
                  <div>
                    <h2 className="text-white text-xl font-semibold mb-4">Content</h2>
                    
                    <Tabs value={activeContentTab.toString()} onValueChange={(value) => setActiveContentTab(parseInt(value))}>
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-black border-b border-nexa-border flex-1 justify-start">
                          {contentTabs.map((tab) => (
                            <TabsTrigger key={tab.id} value={tab.id.toString()}>
                              {tab.id}
                            </TabsTrigger>
                          ))}
                          <button
                            onClick={addContentTab}
                            className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg relative hover:text-white hover:bg-nexa-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ml-1"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </TabsList>
                        <button
                          onClick={deleteContentTab}
                          disabled={contentTabs.length === 1}
                          className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg relative hover:text-white hover:bg-nexa-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50 disabled:pointer-events-none ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {contentTabs.map((tab) => (
                        <TabsContent key={tab.id} value={tab.id.toString()} className="mt-4">
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
                      variant="outline"
                      className="w-full border-nexa-border text-white glassmorphism p-6 text-lg font-medium transition-all duration-300 group"
                    >
                      {diagnosing ? (
                        <>
                          <RotateCw className={`h-6 w-6 mr-3 ${diagnosing ? 'animate-spin' : ''}`} />
                          Diagnosing...
                        </>
                      ) : (
                        <>
                          <Search className="h-6 w-6 mr-3" />
                          <span className="group-hover:neon-gradient-text">
                            Diagnose
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Solution Tab */}
              <TabsContent value="solution" className="mt-0">
                <div className="space-y-8">
                  {/* Solution Section */}
                  <div>
                    <h2 className="text-white text-xl font-semibold mb-4">Solution</h2>
                    
                    <Tabs value={activeSolutionTab.toString()} onValueChange={(value) => setActiveSolutionTab(parseInt(value))}>
                      <div className="flex items-center justify-between mb-4">
                        <TabsList className="bg-black border-b border-nexa-border flex-1 justify-start">
                          {solutionTabs.map((tab) => (
                            <TabsTrigger key={tab.id} value={tab.id.toString()}>
                              {tab.id}
                            </TabsTrigger>
                          ))}
                          <button
                            onClick={addSolutionTab}
                            className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg relative hover:text-white hover:bg-nexa-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 ml-1"
                          >
                            <Plus className="h-4 w-4" />
                          </button>
                        </TabsList>
                        <button
                          onClick={deleteSolutionTab}
                          disabled={solutionTabs.length === 1}
                          className="inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all bg-nexa-card border-t border-l border-r border-nexa-border text-nexa-muted rounded-t-lg relative hover:text-white hover:bg-nexa-card/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/20 disabled:opacity-50 disabled:pointer-events-none ml-2"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                      
                      {solutionTabs.map((tab) => (
                        <TabsContent key={tab.id} value={tab.id.toString()} className="mt-4">
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
                      variant="outline"
                      className="w-full border-nexa-border text-white glassmorphism p-6 text-lg font-medium transition-all duration-300 group"
                    >
                      {generating ? (
                        <>
                          <RotateCw className={`h-6 w-6 mr-3 ${generating ? 'animate-spin' : ''}`} />
                          Generating...
                        </>
                      ) : (
                        <>
                          <Lightbulb className="h-6 w-6 mr-3" />
                          <span className="group-hover:neon-gradient-text">
                            Generate Solution
                          </span>
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </TabsContent>

              {/* Navigation Buttons */}
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
                    variant="outline"
                    className="border-nexa-border text-white hover:bg-white/10"
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
    </DashboardLayout>
  )
}