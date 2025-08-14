'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { ArrowLeft } from 'lucide-react'

interface FormData {
  currentPassword: string
  newPassword: string
  confirmPassword: string
}

interface FormErrors {
  [key: string]: string
}

export default function ChangePasswordPage() {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState<FormData>({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  })
  const [errors, setErrors] = useState<FormErrors>({})
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null)

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
    
    // Clear error for this field
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }))
    }
  }

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {}

    if (!formData.currentPassword) {
      newErrors.currentPassword = 'Current password is required'
    }

    if (!formData.newPassword) {
      newErrors.newPassword = 'New password is required'
    } else if (formData.newPassword.length < 6) {
      newErrors.newPassword = 'Password must be at least 6 characters long'
    }

    if (!formData.confirmPassword) {
      newErrors.confirmPassword = 'Please confirm your password'
    } else if (formData.newPassword !== formData.confirmPassword) {
      newErrors.confirmPassword = 'Passwords do not match'
    }

    setErrors(newErrors)
    return Object.keys(newErrors).length === 0
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (!validateForm()) {
      return
    }

    setIsLoading(true)

    try {
      const response = await fetch('/api/profile/change-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      })

      const data = await response.json()

      if (data.success) {
        setMessage({ type: 'success', text: 'Password changed successfully!' })
        setFormData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        })
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to change password' })
      }
    } catch (error) {
      setMessage({ type: 'error', text: 'An error occurred while changing password' })
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center nexa-background p-5">
      <Card variant="nexa" className="w-full max-w-md p-10">
        {/* Back Link */}
        <Link 
          href="/profile" 
          className="inline-flex items-center gap-2 text-white hover:text-white/80 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4" />
          <span className="text-sm">Back to Profile</span>
        </Link>

        {/* Logo Section */}
        <div className="text-center mb-8">
          <div className="mb-8">
            <img
              src="/images/nexaicon.png"
              alt="NEXA"
              className="h-[120px] w-auto mx-auto mb-6 object-contain"
            />
          </div>
        </div>

        {/* Title */}
        <h2 className="text-white text-xl font-semibold text-center mb-8">
          Change Password
        </h2>

        {/* Message Alert */}
        {message && (
          <Alert variant={message.type === 'error' ? 'nexaError' : 'nexaSuccess'} className="mb-6">
            <AlertDescription>{message.text}</AlertDescription>
          </Alert>
        )}

        {/* Change Password Form */}
        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <Label htmlFor="currentPassword" className="text-nexa-muted text-sm font-medium">
              Current Password
            </Label>
            <Input
              id="currentPassword"
              name="currentPassword"
              type="password"
              value={formData.currentPassword}
              onChange={handleInputChange}
              placeholder="Enter your current password"
              className={`mt-2 ${errors.currentPassword ? 'border-red-500' : ''}`}
            />
            {errors.currentPassword && (
              <p className="text-red-400 text-sm mt-1">{errors.currentPassword}</p>
            )}
          </div>

          <div>
            <Label htmlFor="newPassword" className="text-nexa-muted text-sm font-medium">
              New Password
            </Label>
            <Input
              id="newPassword"
              name="newPassword"
              type="password"
              value={formData.newPassword}
              onChange={handleInputChange}
              placeholder="Enter your new password"
              className={`mt-2 ${errors.newPassword ? 'border-red-500' : ''}`}
            />
            <div className="text-nexa-muted text-xs mt-1 mb-3">
              Minimum 6 characters
            </div>
            {errors.newPassword && (
              <p className="text-red-400 text-sm mt-1">{errors.newPassword}</p>
            )}
          </div>

          <div>
            <Label htmlFor="confirmPassword" className="text-nexa-muted text-sm font-medium">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              value={formData.confirmPassword}
              onChange={handleInputChange}
              placeholder="Confirm your new password"
              className={`mt-2 ${errors.confirmPassword ? 'border-red-500' : ''}`}
            />
            {errors.confirmPassword && (
              <p className="text-red-400 text-sm mt-1">{errors.confirmPassword}</p>
            )}
          </div>

          <div className="flex gap-3 pt-3">
            <Button 
              type="submit" 
              disabled={isLoading}
              className="flex-1"
            >
              {isLoading ? 'Changing...' : 'Change Password'}
            </Button>
            <Button 
              asChild
              variant="outline" 
              className="flex-1 border-nexa-border text-white hover:bg-white/10"
            >
              <Link href="/profile">
                Cancel
              </Link>
            </Button>
          </div>
        </form>
      </Card>
    </div>
  )
}
