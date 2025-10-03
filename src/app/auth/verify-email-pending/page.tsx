'use client'

import { useState, useEffect } from 'react'
import { useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Mail, CheckCircle, Clock, RefreshCw } from 'lucide-react'

export default function VerifyEmailPendingPage() {
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')
  const [email, setEmail] = useState<string | null>(null)
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get email from URL parameters
    const emailParam = searchParams?.get('email')
    if (emailParam) {
      setEmail(emailParam)
    }
  }, [searchParams])

  const handleResendEmail = async () => {
    setLoading(true)
    setMessage('')

    try {
      const response = await fetch('/api/auth/resend-verification', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email
        })
      })

      const data = await response.json()

      if (data.success) {
        setMessage('Verification email sent! Please check your inbox.')
      } else {
        setMessage(data.error || 'Failed to resend email')
      }
    } catch (error: unknown) {
      setMessage('Network error occurred')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center nexa-background p-5">
      <Card variant="nexa" className="w-full max-w-md p-10 text-center">
        {/* Success Icon */}
        <div className="mb-6">
          <div className="w-20 h-20 bg-nexa-accent rounded-full flex items-center justify-center mx-auto mb-4">
            <Mail className="w-10 h-10 text-black" />
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">Check Your Email</h1>
          <p className="text-nexa-muted">
            We've sent a verification link to your email address. 
            Click the link to activate your account and start using NEXA.
          </p>
        </div>

        {/* Instructions */}
        <div className="bg-nexa-card/50 border border-nexa-border rounded-lg p-4 mb-6">
          <div className="flex items-start gap-3 text-sm text-nexa-muted">
            <Clock className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <div className="text-left">
              <p className="font-medium text-white mb-1">What to do next:</p>
              <ul className="space-y-1">
                <li>1. Check your email inbox (and spam folder)</li>
                <li>2. Click the verification link in the email</li>
                <li>3. Return here to sign in to your account</li>
              </ul>
            </div>
          </div>
        </div>

        {!email && (
          <Alert variant="nexaError" className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>
              Unable to determine email address. Please return to the registration page and try again.
            </AlertDescription>
          </Alert>
        )}

        {message && (
          <Alert variant={message.includes('sent') ? 'nexaSuccess' : 'nexaError'} className="mb-6">
            <CheckCircle className="h-4 w-4" />
            <AlertDescription>{message}</AlertDescription>
          </Alert>
        )}

        {/* Actions */}
        <div className="space-y-3">
          <Button 
            onClick={handleResendEmail}
            variant="outline"
            className="w-full"
            disabled={loading || !email}
          >
            {loading ? (
              <>
                <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="w-4 h-4 mr-2" />
                Resend Verification Email
              </>
            )}
          </Button>

          <Link href="/auth/login">
            <Button variant="outline" className="w-full">
              Back to Sign In
            </Button>
          </Link>
        </div>

        {/* Help */}
        <div className="mt-8 pt-6 border-t border-nexa-border">
          <p className="text-sm text-nexa-muted">
            Didn't receive the email? Check your spam folder or contact support if you continue having issues.
          </p>
        </div>
      </Card>
    </div>
  )
}

