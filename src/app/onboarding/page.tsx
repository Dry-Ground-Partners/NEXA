'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Building2, User, ArrowRight, Loader2, CheckCircle } from 'lucide-react'
import type { AuthUser } from '@/types'

type OnboardingStep = 'choice' | 'organization-form' | 'creating' | 'complete'

export default function OnboardingPage() {
  const router = useRouter()
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [step, setStep] = useState<OnboardingStep>('choice')
  const [organizationData, setOrganizationData] = useState({
    name: '',
    description: '',
    website: '',
    industry: ''
  })
  
  // Check for offboarded user context from URL params
  const [wasOffboarded, setWasOffboarded] = useState(false)
  const [previousOrgName, setPreviousOrgName] = useState<string | null>(null)

  useEffect(() => {
    // Check URL parameters for offboarding context
    const urlParams = new URLSearchParams(window.location.search)
    const offboarded = urlParams.get('offboarded') === 'true'
    const orgName = urlParams.get('org')
    
    if (offboarded) {
      setWasOffboarded(true)
      setPreviousOrgName(orgName)
    }

    const fetchUser = async () => {
      try {
        const response = await fetch('/api/auth/me')
        const data = await response.json()
        
        if (data.success) {
          setUser(data.user)
          
          // If user already has organization, redirect to dashboard
          if (data.user.organizationMemberships?.length > 0) {
            router.push('/dashboard')
            return
          }
        } else {
          // Not authenticated, redirect to login
          router.push('/auth/login')
          return
        }
      } catch (error: unknown) {
        console.error('Error fetching user:', error)
        router.push('/auth/login')
        return
      } finally {
        setLoading(false)
      }
    }

    fetchUser()
  }, [router])

  const handleSoloChoice = async () => {
    setStep('creating')
    
    try {
      console.log('🏠 Creating personal workspace for:', user?.email)
      
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'solo'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setStep('complete')
        console.log('✅ Personal workspace created:', result.organization.name)
        
        // Redirect to dashboard after brief success message
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        console.error('❌ Failed to create personal workspace:', result.error)
        alert(`Failed to create workspace: ${result.error}`)
        setStep('choice')
      }
    } catch (error: unknown) {
      console.error('💥 Error creating personal workspace:', error)
      alert('Failed to create workspace. Please try again.')
      setStep('choice')
    }
  }

  const handleOrganizationChoice = () => {
    setStep('organization-form')
  }

  const handleOrganizationSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setStep('creating')
    
    try {
      console.log('🏢 Creating organization:', organizationData.name)
      
      const response = await fetch('/api/onboarding', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'organization',
          ...organizationData
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setStep('complete')
        console.log('✅ Organization created:', result.organization.name)
        
        // Redirect to dashboard after brief success message
        setTimeout(() => {
          router.push('/dashboard')
        }, 2000)
      } else {
        console.error('❌ Failed to create organization:', result.error)
        alert(`Failed to create organization: ${result.error}`)
        setStep('organization-form')
      }
    } catch (error: unknown) {
      console.error('💥 Error creating organization:', error)
      alert('Failed to create organization. Please try again.')
      setStep('organization-form')
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
    <div className="min-h-screen nexa-background flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <img
            src="/images/nexaicon.png?v=1"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              console.log('Image failed to load:', target.src)
              target.src = '/images/nexanonameicon.png?v=1'
            }}
            alt="NEXA"
            className="h-[60px] w-auto mx-auto mb-4 object-contain"
          />
          <h1 className="text-3xl font-bold text-white mb-2">
            Welcome to NEXA, {user?.fullName?.split(' ')[0] || 'there'}! 👋
          </h1>
          <p className="text-nexa-muted text-lg">
            Let's set up your workspace to get started
          </p>
        </div>

        {/* Offboarded User Banner */}
        {wasOffboarded && (
          <div className="mb-6 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-lg">
            <div className="flex items-start gap-3">
              <div className="w-5 h-5 text-yellow-400 flex-shrink-0 mt-0.5">⚠️</div>
              <div>
                <div className="text-yellow-200 font-medium mb-1">
                  You've been removed from {previousOrgName || 'an organization'}
                </div>
                <div className="text-yellow-300/80 text-sm">
                  Don't worry! Your account is safe. Create a personal workspace below to continue using NEXA.
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Choice Step */}
        {step === 'choice' && (
          <div className="grid md:grid-cols-2 gap-6">
            {/* Solo Option */}
            <Card 
              variant="nexa" 
              className="p-8 cursor-pointer hover:border-nexa-accent transition-all duration-200 group"
              onClick={handleSoloChoice}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-blue-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-blue-500/30 transition-colors">
                  <User className="w-8 h-8 text-blue-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">
                  {wasOffboarded ? 'Your Personal Workspace' : 'Personal Workspace'}
                </h3>
                <p className="text-nexa-muted mb-6">
                  {wasOffboarded 
                    ? 'Continue your work with a private workspace. All your data is safe and ready for you!' 
                    : 'Perfect for individual use. We\'ll create your personal workspace automatically.'
                  }
                </p>
                <div className="flex items-center justify-center text-blue-400 group-hover:text-blue-300">
                  <span className="mr-2">Get Started</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>

            {/* Organization Option */}
            <Card 
              variant="nexa" 
              className="p-8 cursor-pointer hover:border-nexa-accent transition-all duration-200 group"
              onClick={handleOrganizationChoice}
            >
              <div className="text-center">
                <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-green-500/30 transition-colors">
                  <Building2 className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-bold text-white mb-3">Organization</h3>
                <p className="text-nexa-muted mb-6">
                  Setting up for your team or company? Create an organization to collaborate.
                </p>
                <div className="flex items-center justify-center text-green-400 group-hover:text-green-300">
                  <span className="mr-2">Create Organization</span>
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </Card>
          </div>
        )}

        {/* Organization Form Step */}
        {step === 'organization-form' && (
          <Card variant="nexa" className="p-8">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                <Building2 className="w-8 h-8 text-green-400" />
              </div>
              <h2 className="text-2xl font-bold text-white mb-2">Create Your Organization</h2>
              <p className="text-nexa-muted">Tell us about your organization</p>
            </div>

            <form onSubmit={handleOrganizationSubmit} className="space-y-6">
              <div>
                <Label htmlFor="orgName" className="text-white">
                  Organization Name *
                </Label>
                <Input
                  id="orgName"
                  variant="nexa"
                  placeholder="e.g., Acme Corporation"
                  value={organizationData.name}
                  onChange={(e) => setOrganizationData(prev => ({ ...prev, name: e.target.value }))}
                  required
                />
              </div>

              <div>
                <Label htmlFor="description" className="text-white">
                  Description
                </Label>
                <Textarea
                  id="description"
                  variant="nexa"
                  placeholder="What does your organization do?"
                  value={organizationData.description}
                  onChange={(e) => setOrganizationData(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="website" className="text-white">
                    Website
                  </Label>
                  <Input
                    id="website"
                    variant="nexa"
                    placeholder="https://example.com"
                    value={organizationData.website}
                    onChange={(e) => setOrganizationData(prev => ({ ...prev, website: e.target.value }))}
                  />
                </div>

                <div>
                  <Label htmlFor="industry" className="text-white">
                    Industry
                  </Label>
                  <Input
                    id="industry"
                    variant="nexa"
                    placeholder="e.g., Technology"
                    value={organizationData.industry}
                    onChange={(e) => setOrganizationData(prev => ({ ...prev, industry: e.target.value }))}
                  />
                </div>
              </div>

              <div className="flex gap-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setStep('choice')}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  className="flex-1 bg-green-600 hover:bg-green-700"
                >
                  Create Organization
                </Button>
              </div>
            </form>
          </Card>
        )}

        {/* Creating Step */}
        {step === 'creating' && (
          <Card variant="nexa" className="p-8 text-center">
            <div className="w-16 h-16 bg-nexa-accent/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-nexa-accent animate-spin" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">Setting up your workspace...</h2>
            <p className="text-nexa-muted">This will just take a moment</p>
          </Card>
        )}

        {/* Complete Step */}
        {step === 'complete' && (
          <Card variant="nexa" className="p-8 text-center">
            <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-green-400" />
            </div>
            <h2 className="text-2xl font-bold text-white mb-2">All set! 🎉</h2>
            <p className="text-nexa-muted">Your workspace is ready. Redirecting to dashboard...</p>
          </Card>
        )}
      </div>
    </div>
  )
}







