// Email verification and sending utilities

interface EmailVerificationData {
  email: string
  token: string
  userName: string
  organizationName?: string
}

interface InvitationEmailData {
  email: string
  token: string
  inviterName: string
  organizationName: string
  role: string
}

/**
 * Generate a secure verification token
 */
export function generateVerificationToken(): string {
  // Generate a random 32-character token
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'
  let token = ''
  for (let i = 0; i < 32; i++) {
    token += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return token
}

/**
 * Send email verification email via Azure endpoint
 */
export async function sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
  try {
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify-email?token=${data.token}`
    
    const emailData = {
      to: data.email,
      subject: 'Verify your NEXA account',
      template: 'email-verification',
      data: {
        userName: data.userName,
        verificationUrl,
        organizationName: data.organizationName
      }
    }

    // Replace with your Azure endpoint URL
    const azureEndpoint = process.env.AZURE_EMAIL_ENDPOINT

    if (!azureEndpoint) {
      console.error('Azure email endpoint not configured')
      return false
    }

    const response = await fetch(azureEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AZURE_EMAIL_TOKEN}`
      },
      body: JSON.stringify(emailData)
    })

    if (!response.ok) {
      console.error('Failed to send verification email:', await response.text())
      return false
    }

    return true
  } catch (error) {
    console.error('Error sending verification email:', error)
    return false
  }
}

/**
 * Send organization invitation email
 */
export async function sendInvitationEmail(data: InvitationEmailData): Promise<boolean> {
  try {
    const invitationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/accept-invitation?token=${data.token}`
    
    const emailData = {
      to: data.email,
      subject: `You're invited to join ${data.organizationName} on NEXA`,
      template: 'organization-invitation',
      data: {
        inviterName: data.inviterName,
        organizationName: data.organizationName,
        role: data.role,
        invitationUrl
      }
    }

    const azureEndpoint = process.env.AZURE_EMAIL_ENDPOINT

    if (!azureEndpoint) {
      console.error('Azure email endpoint not configured')
      return false
    }

    const response = await fetch(azureEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AZURE_EMAIL_TOKEN}`
      },
      body: JSON.stringify(emailData)
    })

    return response.ok
  } catch (error) {
    console.error('Error sending invitation email:', error)
    return false
  }
}

/**
 * Send welcome email after successful registration
 */
export async function sendWelcomeEmail(email: string, userName: string, organizationName?: string): Promise<boolean> {
  try {
    const emailData = {
      to: email,
      subject: 'Welcome to NEXA!',
      template: 'welcome',
      data: {
        userName,
        organizationName,
        dashboardUrl: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`
      }
    }

    const azureEndpoint = process.env.AZURE_EMAIL_ENDPOINT

    if (!azureEndpoint) {
      console.error('Azure email endpoint not configured')
      return false
    }

    const response = await fetch(azureEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.AZURE_EMAIL_TOKEN}`
      },
      body: JSON.stringify(emailData)
    })

    return response.ok
  } catch (error) {
    console.error('Error sending welcome email:', error)
    return false
  }
}

/**
 * Extract domain from email address
 */
export function extractDomain(email: string): string {
  return email.split('@')[1]?.toLowerCase() || ''
}

/**
 * Validate email format
 */
export function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

/**
 * Check if email domain is in common free email providers
 */
export function isFreeEmailDomain(email: string): boolean {
  const domain = extractDomain(email)
  const freeEmailDomains = [
    'gmail.com', 'yahoo.com', 'hotmail.com', 'outlook.com', 
    'aol.com', 'icloud.com', 'live.com', 'msn.com',
    'protonmail.com', 'proton.me', 'tutanota.com'
  ]
  return freeEmailDomains.includes(domain)
}

