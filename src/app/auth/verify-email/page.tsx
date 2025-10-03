'use client'

import { useEffect, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'

export default function VerifyEmailPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams?.get('token')
  
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading')
  const [message, setMessage] = useState('')

  useEffect(() => {
    if (!token) {
      setStatus('error')
      setMessage('No verification token provided')
      return
    }

    verifyEmail(token)
  }, [token])

  const verifyEmail = async (verificationToken: string) => {
    try {
      const response = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: verificationToken })
      })

      const data = await response.json()

      if (data.success) {
        setStatus('success')
        setMessage(data.message)
        // Redirect to login after 3 seconds
        setTimeout(() => {
          router.push('/auth/login?verified=true')
        }, 3000)
      } else {
        setStatus('error')
        setMessage(data.error || 'Verification failed')
      }
    } catch (error: unknown) {
      setStatus('error')
      setMessage('Network error occurred')
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center nexa-background p-5">
      <Card variant="nexa" className="w-full max-w-md p-8 text-center">
        {/* Logo */}
        <div className="mb-6">
          <img
            src="/images/nexaicon.png?v=1"
            onError={(e) => {
              const img = e.target as HTMLImageElement
              console.log('Image failed to load:', img.src)
              img.src = '/images/nexanonameicon.png?v=1'
            }}
            alt="NEXA"
            className="h-[80px] w-auto mx-auto mb-4 object-contain"
          />
        </div>

        {status === 'loading' && (
          <div>
            <div className="w-16 h-16 bg-nexa-accent rounded-full flex items-center justify-center mx-auto mb-4">
              <Loader2 className="w-8 h-8 text-black animate-spin" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Verifying Your Email</h1>
            <p className="text-nexa-muted">Please wait while we verify your account...</p>
          </div>
        )}

        {status === 'success' && (
          <div>
            <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <CheckCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Email Verified!</h1>
            <p className="text-nexa-muted mb-4">{message}</p>
            
            <Alert variant="nexaSuccess" className="mb-6">
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                Your account is now active. Redirecting to login...
              </AlertDescription>
            </Alert>

            <Link href="/auth/login">
              <Button className="w-full">
                Continue to Login
              </Button>
            </Link>
          </div>
        )}

        {status === 'error' && (
          <div>
            <div className="w-16 h-16 bg-red-500 rounded-full flex items-center justify-center mx-auto mb-4">
              <AlertCircle className="w-8 h-8 text-white" />
            </div>
            <h1 className="text-xl font-bold text-white mb-2">Verification Failed</h1>
            
            <Alert variant="nexaError" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{message}</AlertDescription>
            </Alert>

            <div className="space-y-3">
              <Link href="/auth/verify-email-pending">
                <Button variant="outline" className="w-full">
                  Resend Verification Email
                </Button>
              </Link>
              
              <Link href="/auth/login">
                <Button variant="outline" className="w-full">
                  Back to Login
                </Button>
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}

