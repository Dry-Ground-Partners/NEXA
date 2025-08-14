'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Card } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'

export default function LoginPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    rememberMe: false
  })
  const [error, setError] = useState('')

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)
    setError('')

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          password: formData.password,
          rememberMe: formData.rememberMe
        }),
      })

      const data = await response.json()

      if (data.success) {
        // Redirect to dashboard
        window.location.replace('/dashboard')
      } else {
        setError(data.message || 'Login failed')
      }
    } catch (err) {
      setError('An error occurred during login')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }))
  }

  return (
    <div className="min-h-screen flex items-center justify-center nexa-background p-5">
      <Card variant="nexa" className="w-full max-w-md p-10">
        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="mb-8">
            <img
              src="/images/nexaicon.png"
              onError={(e) => {
                console.log('Image failed to load:', e.target.src)
                e.target.src = '/images/nexanonameicon.png'
              }}
              alt="NEXA"
              className="h-[180px] w-auto mx-auto mb-8 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-white text-xl font-semibold text-center mb-8">
          Sign In
        </h2>

        {/* Error Alert */}
        {error && (
          <Alert variant="nexaError" className="mb-6">
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Login Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          {/* Email Field */}
          <div className="nexa-form-group">
            <Label variant="nexa" htmlFor="email">
              Email
            </Label>
            <Input
              variant="nexa"
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          {/* Password Field */}
          <div className="nexa-form-group">
            <Label variant="nexa" htmlFor="password">
              Password
            </Label>
            <Input
              variant="nexa"
              id="password"
              name="password"
              type="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInputChange}
              required
              disabled={isLoading}
            />
          </div>

          {/* Remember Me */}
          <div className="flex items-center space-x-2 mb-5">
            <Checkbox
              id="rememberMe"
              name="rememberMe"
              checked={formData.rememberMe}
              onCheckedChange={(checked) => 
                setFormData(prev => ({ ...prev, rememberMe: !!checked }))
              }
              className="data-[state=checked]:bg-white data-[state=checked]:text-black"
            />
            <Label 
              htmlFor="rememberMe" 
              className="text-sm text-nexa-muted cursor-pointer"
            >
              Remember Me
            </Label>
          </div>

          {/* Submit Button */}
          <Button
            type="submit"
            variant="nexa"
            size="nexaDefault"
            className="w-full"
            disabled={isLoading}
          >
            {isLoading ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

        {/* Links */}
        <div className="text-center mt-5">
          <p className="text-nexa-muted text-sm">
            Don't have an account?{' '}
            <Link 
              href="/auth/register" 
              className="text-white hover:underline transition-all duration-200"
            >
              Sign up here
            </Link>
          </p>
        </div>
      </Card>
    </div>
  )
}
