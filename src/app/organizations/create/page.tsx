'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft, Building, Globe, Mail, MapPin } from 'lucide-react'
import { DashboardLayout } from '@/components/layout/dashboard-layout'

export default function CreateOrganizationPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const [formData, setFormData] = useState({
    name: '',
    domain: '',
    website: '',
    industry: '',
    billingEmail: ''
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const response = await fetch('/api/organizations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData)
      })

      if (response.ok) {
        const result = await response.json()
        if (result.success) {
          router.push('/profile?tab=organizations')
        } else {
          setError(result.error || 'Failed to create organization')
        }
      } else {
        const errorData = await response.json()
        setError(errorData.error || 'Failed to create organization')
      }
    } catch (error: unknown) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }))
  }

  return (
    <DashboardLayout>
      <div className="nexa-background min-h-screen p-6">
        <div className="max-w-2xl mx-auto">
          {/* Back link */}
          <Link 
            href="/profile?tab=organizations"
            className="inline-flex items-center gap-2 text-white hover:text-nexa-accent transition-colors mb-6"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Profile
          </Link>

          <Card variant="nexa" className="p-8">
            {/* Header */}
            <div className="text-center mb-8">
              <div className="w-16 h-16 bg-nexa-accent rounded-lg flex items-center justify-center mx-auto mb-4">
                <Building className="w-8 h-8 text-black" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Create Organization</h1>
              <p className="text-nexa-muted">Set up a new organization to collaborate with your team</p>
            </div>

            {error && (
              <Alert variant="nexaError" className="mb-6">
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Organization Name */}
              <div>
                <Label htmlFor="name" className="text-nexa-muted">
                  Organization Name <span className="text-red-400">*</span>
                </Label>
                <Input
                  id="name"
                  type="text"
                  value={formData.name}
                  onChange={(e) => handleInputChange('name', e.target.value)}
                  className="mt-2"
                  placeholder="Enter organization name"
                  required
                />
                <p className="text-sm text-nexa-muted mt-1">
                  This will be visible to all members and used in invitations
                </p>
              </div>

              {/* Domain */}
              <div>
                <Label htmlFor="domain" className="text-nexa-muted">
                  Organization Domain
                </Label>
                <div className="relative mt-2">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nexa-muted" />
                  <Input
                    id="domain"
                    type="text"
                    value={formData.domain}
                    onChange={(e) => handleInputChange('domain', e.target.value)}
                    className="pl-10"
                    placeholder="company.com"
                  />
                </div>
                <p className="text-sm text-nexa-muted mt-1">
                  Used for email-based invitations and SSO (optional)
                </p>
              </div>

              {/* Website */}
              <div>
                <Label htmlFor="website" className="text-nexa-muted">
                  Website
                </Label>
                <div className="relative mt-2">
                  <Globe className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nexa-muted" />
                  <Input
                    id="website"
                    type="url"
                    value={formData.website}
                    onChange={(e) => handleInputChange('website', e.target.value)}
                    className="pl-10"
                    placeholder="https://www.company.com"
                  />
                </div>
              </div>

              {/* Industry */}
              <div>
                <Label htmlFor="industry" className="text-nexa-muted">
                  Industry
                </Label>
                <div className="relative mt-2">
                  <Building className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nexa-muted" />
                  <Input
                    id="industry"
                    type="text"
                    value={formData.industry}
                    onChange={(e) => handleInputChange('industry', e.target.value)}
                    className="pl-10"
                    placeholder="Technology, Finance, Healthcare, etc."
                  />
                </div>
              </div>

              {/* Billing Email */}
              <div>
                <Label htmlFor="billingEmail" className="text-nexa-muted">
                  Billing Email
                </Label>
                <div className="relative mt-2">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-nexa-muted" />
                  <Input
                    id="billingEmail"
                    type="email"
                    value={formData.billingEmail}
                    onChange={(e) => handleInputChange('billingEmail', e.target.value)}
                    className="pl-10"
                    placeholder="billing@company.com"
                  />
                </div>
                <p className="text-sm text-nexa-muted mt-1">
                  Where we'll send invoices and billing notifications
                </p>
              </div>

              {/* Submit Buttons */}
              <div className="flex gap-3 pt-4">
                <Button 
                  type="submit" 
                  className="flex-1"
                  disabled={loading || !formData.name.trim()}
                >
                  {loading ? 'Creating...' : 'Create Organization'}
                </Button>
                <Link href="/profile?tab=organizations" className="flex-1">
                  <Button variant="outline" className="w-full">
                    Cancel
                  </Button>
                </Link>
              </div>
            </form>

            {/* Info Box */}
            <div className="mt-8 p-4 bg-nexa-card/50 border border-nexa-border rounded-lg">
              <h3 className="text-white font-medium mb-2">What happens next?</h3>
              <ul className="text-sm text-nexa-muted space-y-1">
                <li>• You'll become the organization owner with full admin rights</li>
                <li>• You can invite team members via email</li>
                <li>• Organization settings can be modified later</li>
                <li>• Free plan includes up to 5 team members</li>
              </ul>
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  )
}

