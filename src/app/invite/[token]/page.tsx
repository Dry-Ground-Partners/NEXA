'use client'

import { useState, useEffect, use } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { 
  Mail, 
  Building, 
  Shield, 
  Crown, 
  User, 
  CreditCard,
  Eye,
  CheckCircle,
  AlertCircle,
  Loader2
} from 'lucide-react'
import Link from 'next/link'

interface InvitationData {
  id: string
  role: string
  invitedAt: string
  expiresAt: string
  invitedBy: string
  user: {
    email: string
    firstName: string
    lastName: string
    fullName: string
    isExistingUser: boolean
  }
  organization: {
    id: string
    name: string
    slug: string
    logoUrl?: string
  }
}

const roleIcons = {
  owner: Crown,
  admin: Shield,
  member: User,
  viewer: Eye,
  billing: CreditCard
}

const roleDescriptions = {
  owner: 'Complete control over organization and billing',
  admin: 'Administrative access to manage users and settings',
  member: 'Standard access to create and collaborate on sessions',
  viewer: 'Read-only access to view and comment on sessions',
  billing: 'Access to billing and subscription management'
}

export default function InvitePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = use(params)
  const router = useRouter()
  const [invitation, setInvitation] = useState<InvitationData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [accepting, setAccepting] = useState(false)
  const [password, setPassword] = useState('')
  const [currentPassword, setCurrentPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  useEffect(() => {
    loadInvitation()
  }, [token])

  const loadInvitation = async () => {
    try {
      const response = await fetch(`/api/invitations/${token}`)
      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Invalid invitation')
        setLoading(false)
        return
      }

      setInvitation(data.invitation)
    } catch (err) {
      setError('Failed to load invitation')
    } finally {
      setLoading(false)
    }
  }

  const acceptInvitation = async () => {
    if (!invitation) return

    // Validate passwords
    if (!invitation.user.isExistingUser && !password) {
      setError('Password is required')
      return
    }

    if (password && password !== confirmPassword) {
      setError('Passwords do not match')
      return
    }

    if (password && password.length < 8) {
      setError('Password must be at least 8 characters long')
      return
    }

    setAccepting(true)
    setError(null)

    try {
      const response = await fetch(`/api/invitations/${token}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          password: password || undefined,
          currentPassword: currentPassword || undefined
        })
      })

      const data = await response.json()

      if (!response.ok) {
        setError(data.error || 'Failed to accept invitation')
        return
      }

      // Successful acceptance - redirect to organization dashboard
      router.push('/grid')
      
    } catch (err) {
      setError('Failed to accept invitation')
    } finally {
      setAccepting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen nexa-background flex items-center justify-center">
        <div className="flex items-center gap-3 text-white">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading invitation...</span>
        </div>
      </div>
    )
  }

  if (error || !invitation) {
    return (
      <div className="min-h-screen nexa-background flex items-center justify-center p-4">
        <Card variant="nexa" className="max-w-md w-full p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-400 mx-auto mb-4" />
          <h1 className="text-xl font-bold text-white mb-2">Invalid Invitation</h1>
          <p className="text-nexa-muted mb-6">
            {error || 'This invitation link is invalid or has expired.'}
          </p>
          <Link href="/login">
            <Button className="w-full bg-white hover:bg-gray-100 text-black">
              Go to Login
            </Button>
          </Link>
        </Card>
      </div>
    )
  }

  const RoleIcon = roleIcons[invitation.role as keyof typeof roleIcons] || User

  return (
    <div className="min-h-screen nexa-background flex items-center justify-center p-4">
      <Card variant="nexa" className="max-w-lg w-full p-8">
        {/* NEXA Logo */}
        <div className="text-center mb-6">
          <img
            src="/images/nexaicon.png?v=1"
            onError={(e) => {
              const target = e.target as HTMLImageElement
              target.src = '/images/nexanonameicon.png?v=1'
            }}
            alt="NEXA"
            className="h-20 w-auto mx-auto object-contain"
          />
        </div>

        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            {invitation.organization.logoUrl ? (
              <img 
                src={invitation.organization.logoUrl} 
                alt={invitation.organization.name}
                className="w-16 h-16 rounded-lg object-cover"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Building className="w-8 h-8 text-white" />
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white mb-2">
            Join {invitation.organization.name}
          </h1>
          <p className="text-nexa-muted">
            {invitation.invitedBy} has invited you to join their organization
          </p>
        </div>

        {/* Invitation Details */}
        <div className="space-y-4 mb-8">
          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <Mail className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Invitation Details</span>
            </div>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span className="text-nexa-muted">Email:</span>
                <span className="text-white">{invitation.user.email}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-nexa-muted">Name:</span>
                <span className="text-white">{invitation.user.fullName}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-nexa-muted">Role:</span>
                <div className="flex items-center gap-2">
                  <RoleIcon className="w-4 h-4 text-blue-400" />
                  <span className="text-white capitalize">{invitation.role}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white/5 rounded-lg p-4 border border-white/10">
            <div className="flex items-center gap-3 mb-3">
              <RoleIcon className="w-5 h-5 text-blue-400" />
              <span className="text-white font-medium">Your Access Level</span>
            </div>
            <p className="text-sm text-nexa-muted">
              {roleDescriptions[invitation.role as keyof typeof roleDescriptions]}
            </p>
          </div>
        </div>

        {/* Password Section */}
        {(!invitation.user.isExistingUser || password || currentPassword) && (
          <div className="space-y-4 mb-8">
            <h3 className="text-lg font-medium text-white">
              {invitation.user.isExistingUser ? 'Update Password (Optional)' : 'Set Your Password'}
            </h3>
            
            {invitation.user.isExistingUser && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Current Password (if changing password)
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  placeholder="Enter current password..."
                />
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-white mb-2">
                {invitation.user.isExistingUser ? 'New Password' : 'Password'} 
                {!invitation.user.isExistingUser && ' *'}
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                placeholder="Enter password..."
                required={!invitation.user.isExistingUser}
              />
            </div>

            {password && (
              <div>
                <label className="block text-sm font-medium text-white mb-2">
                  Confirm Password *
                </label>
                <input
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-3 py-2 bg-white/5 border border-white/20 rounded-lg text-white placeholder-nexa-muted focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400"
                  placeholder="Confirm password..."
                  required
                />
              </div>
            )}

            {!invitation.user.isExistingUser && !password && (
              <Button
                type="button"
                variant="outline"
                onClick={() => setPassword('')}
                className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                Set Password to Complete Registration
              </Button>
            )}
          </div>
        )}

        {/* Error Message */}
        {error && (
          <div className="bg-red-500/10 border border-red-500/50 rounded-lg p-4 mb-6">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-400" />
              <span className="text-red-400 text-sm">{error}</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        <div className="space-y-3">
          <Button
            onClick={acceptInvitation}
            disabled={accepting}
            className="w-full bg-white hover:bg-gray-100 text-black border border-gray-300"
          >
            {accepting ? (
              <div className="flex items-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Accepting Invitation...</span>
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <CheckCircle className="w-4 h-4" />
                <span>Accept Invitation</span>
              </div>
            )}
          </Button>

          {invitation.user.isExistingUser && (
            <Link href="/login">
              <Button variant="outline" className="w-full bg-white/5 border-white/20 text-white hover:bg-white/10">
                Sign in to Existing Account
              </Button>
            </Link>
          )}
        </div>

        {/* Expiration Warning */}
        <div className="mt-6 text-center">
          <p className="text-xs text-nexa-muted">
            This invitation expires on {new Date(invitation.expiresAt).toLocaleDateString()}
          </p>
        </div>
      </Card>
    </div>
  )
}


