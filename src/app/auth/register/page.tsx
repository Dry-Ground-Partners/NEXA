'use client'

import { useState } from 'react'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import { Building, User, Mail, Users, CheckCircle, AlertCircle } from 'lucide-react'
import { extractDomain, isFreeEmailDomain, isValidEmail } from '@/lib/email'

type RegistrationType = 'solo' | 'create' | 'join'

interface FormData {
  email: string
  password: string
  confirmPassword: string
  firstName: string
  lastName: string
  organizationName: string
}

export default function RegisterPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const invitationToken = searchParams.get('token')

  const [registrationType, setRegistrationType] = useState<RegistrationType>(
    invitationToken ? 'join' : 'solo'
  )
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [domainSuggestion, setDomainSuggestion] = useState<string | null>(null)
  
  const [formData, setFormData] = useState<FormData>({
    email: '',
    password: '',
    confirmPassword: '',
    firstName: '',
    lastName: '',
    organizationName: ''
  })

  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  })

  const handleEmailChange = async (email: string) => {
    setFormData(prev => ({ ...prev, email }))
    
    if (isValidEmail(email) && !isFreeEmailDomain(email)) {
      const domain = extractDomain(email)
      // Check if organization exists for this domain
      try {
        const response = await fetch(`/api/organizations/check-domain?domain=${domain}`)
        if (response.ok) {
          const data = await response.json()
          if (data.exists) {
            setDomainSuggestion(data.organizationName)
            if (registrationType === 'solo') {
              setRegistrationType('join')
            }
          }
        }
      } catch (error: unknown) {
        // Silently handle error
      }
    } else {
      setDomainSuggestion(null)
    }
  }

  const validatePassword = (password: string) => {
    const checks = [
      { test: password.length >= 8, message: 'At least 8 characters' },
      { test: /[A-Z]/.test(password), message: 'At least one uppercase letter' },
      { test: /[a-z]/.test(password), message: 'At least one lowercase letter' },
      { test: /\d/.test(password), message: 'At least one number' },
      { test: /[!@#$%^&*(),.?":{}|<>]/.test(password), message: 'At least one special character' }
    ]

    const passedChecks = checks.filter(check => check.test).length
    const feedback = checks.filter(check => !check.test).map(check => check.message)

    setPasswordStrength({
      score: passedChecks,
      feedback
    })
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setSuccess('')
    setLoading(true)

    // Validation
    if (!formData.email || !formData.password || !formData.firstName || !formData.lastName) {
      setError('All fields are required')
      setLoading(false)
      return
    }

    if (!isValidEmail(formData.email)) {
      setError('Please enter a valid email address')
      setLoading(false)
      return
    }

    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match')
      setLoading(false)
      return
    }

    if (passwordStrength.score < 3) {
      setError('Password is too weak. Please follow the requirements.')
      setLoading(false)
      return
    }

    if (registrationType === 'create' && !formData.organizationName.trim()) {
      setError('Organization name is required')
      setLoading(false)
      return
    }

    try {
      const response = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          firstName: formData.firstName,
          lastName: formData.lastName,
          organizationName: formData.organizationName,
          organizationType: registrationType,
          invitationToken
        })
      })

      const data = await response.json()

      if (data.success) {
        setSuccess(data.message)
        // Redirect to verification pending page after 2 seconds
        setTimeout(() => {
          router.push(`/auth/verify-email-pending?email=${encodeURIComponent(formData.email)}`)
        }, 2000)
      } else {
        setError(data.error || 'Registration failed')
      }
    } catch (error: unknown) {
      setError('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score <= 2) return 'text-red-400'
    if (passwordStrength.score <= 3) return 'text-yellow-400'
    return 'text-green-400'
  }

  const getPasswordStrengthText = () => {
    if (passwordStrength.score <= 2) return 'Weak'
    if (passwordStrength.score <= 3) return 'Medium'
    return 'Strong'
  }

  return (
    <div className="min-h-screen flex items-center justify-center nexa-background p-5">
      <Card variant="nexa" className="w-full max-w-md p-10">
        {/* Logo Section */}
        <div className="text-center">
          <img
            src="/images/nexaicon.png?v=1"
            onError={(e) => {
              const img = e.target as HTMLImageElement
              console.log('Image failed to load:', img.src)
              img.src = '/images/nexanonameicon.png?v=1'
            }}
            alt="NEXA"
            className="h-[168px] w-auto mx-auto object-contain"
          />
          <p className="text-nexa-muted mb-8">
            {invitationToken 
              ? 'Complete your registration to join the organization'
              : 'Start building AI-powered architecture solutions'
            }
          </p>
        </div>

        {error && (
          <Alert variant="nexaError" className="mb-6">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {success && (
          <Alert variant="nexaSuccess" className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{success}</AlertDescription>
          </Alert>
        )}

        {domainSuggestion && (
          <Alert variant="nexaInfo" className="mb-6">
            <Building className="h-4 w-4" />
            <AlertDescription>
              We found an organization for <strong>{extractDomain(formData.email)}</strong>: 
              <strong> {domainSuggestion}</strong>. 
              You can join automatically by registering with your work email.
            </AlertDescription>
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">


          {/* Personal Information */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="firstName" className="text-nexa-muted">
                First Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                className="mt-1"
                placeholder="John"
                required
                disabled={loading}
              />
            </div>

            <div>
              <Label htmlFor="lastName" className="text-nexa-muted">
                Last Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                className="mt-1"
                placeholder="Doe"
                required
                disabled={loading}
              />
            </div>
          </div>

          {/* Email */}
          <div>
            <Label htmlFor="email" className="text-nexa-muted">
              Email Address <span className="text-red-400">*</span>
            </Label>
            <Input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => handleEmailChange(e.target.value)}
              className="mt-1"
              placeholder="john@company.com"
              required
              disabled={loading}
            />
          </div>

          {/* Organization Name (if creating) */}
          {registrationType === 'create' && (
            <div>
              <Label htmlFor="organizationName" className="text-nexa-muted">
                Organization Name <span className="text-red-400">*</span>
              </Label>
              <Input
                id="organizationName"
                type="text"
                value={formData.organizationName}
                onChange={(e) => setFormData(prev => ({ ...prev, organizationName: e.target.value }))}
                className="mt-1"
                placeholder="Your Company Name"
                required
                disabled={loading}
              />
            </div>
          )}

          {/* Password */}
          <div>
            <Label htmlFor="password" className="text-nexa-muted">
              Password <span className="text-red-400">*</span>
            </Label>
            <Input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => {
                setFormData(prev => ({ ...prev, password: e.target.value }))
                validatePassword(e.target.value)
              }}
              className="mt-1"
              placeholder="Create a strong password"
              required
              disabled={loading}
            />
            {formData.password && (
              <div className="mt-2">
                <div className={`text-sm ${getPasswordStrengthColor()}`}>
                  Password strength: {getPasswordStrengthText()}
                </div>
                {passwordStrength.feedback.length > 0 && (
                  <ul className="text-xs text-nexa-muted mt-1">
                    {passwordStrength.feedback.map((feedback, index) => (
                      <li key={index}>• {feedback}</li>
                    ))}
                  </ul>
                )}
              </div>
            )}
          </div>

          {/* Confirm Password - Only show if password is entered */}
          {formData.password && (
            <div>
              <Label htmlFor="confirmPassword" className="text-nexa-muted">
                Confirm Password <span className="text-red-400">*</span>
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                className="mt-1"
                placeholder="Confirm your password"
                required
                disabled={loading}
              />
              {formData.confirmPassword && formData.password !== formData.confirmPassword && (
                <p className="text-red-400 text-sm mt-1">Passwords do not match</p>
              )}
            </div>
          )}

          {/* Submit Button */}
          <Button 
            type="submit" 
            className="w-full" 
            disabled={loading || passwordStrength.score < 3}
          >
            {loading ? 'Creating Account...' : 'Create Account'}
          </Button>
        </form>

        {/* Login Link */}
        <div className="text-center mt-6">
          <p className="text-nexa-muted">
            Already have an account?{' '}
            <Link href="/auth/login" className="text-nexa-accent hover:underline">
              Sign in
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}