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
 * Send email verification email via Azure Logic App
 */
export async function sendVerificationEmail(data: EmailVerificationData): Promise<boolean> {
  try {
    const verificationUrl = `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/auth/verify-email?token=${data.token}`
    
    const emailPayload = {
      recipient_email: data.email,
      verification_code: data.token,
      verification_url: verificationUrl,
      user_name: data.userName,
      organization_name: data.organizationName || '',
      email_type: 'verification',
      subject: 'Verify your NEXA account'
    }

    const azureEndpoint = 'https://prod-60.westus.logic.azure.com:443/workflows/2becfb6f393d4642890b33e6ba6fc906/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xBWH5M1AaZLVFDlgnotk_Iox9ylXdmOlqklclk_LxJs'

    // Debug log for environment variable
    console.log('KEY_CONAN_2FA env var:', process.env.KEY_CONAN_2FA ? 'SET' : 'NOT SET')
    console.log('KEY_CONAN_2FA length:', (process.env.KEY_CONAN_2FA || '').length)

    const response = await fetch(azureEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'KEY_CONAN_2FA': process.env.KEY_CONAN_2FA || ''
      },
      body: JSON.stringify(emailPayload)
    })

    if (!response.ok) {
      console.error('Failed to send verification email:', await response.text())
      return false
    }

    console.log('Verification email sent successfully to:', data.email)
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
    
    const emailPayload = {
      recipient_email: data.email,
      verification_code: data.token,
      invitation_url: invitationUrl,
      user_name: '',
      organization_name: data.organizationName,
      inviter_name: data.inviterName,
      role: data.role,
      email_type: 'invitation',
      subject: `You're invited to join ${data.organizationName} on NEXA`
    }

    const azureEndpoint = 'https://prod-60.westus.logic.azure.com:443/workflows/2becfb6f393d4642890b33e6ba6fc906/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xBWH5M1AaZLVFDlgnotk_Iox9ylXdmOlqklclk_LxJs'

    const response = await fetch(azureEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'KEY_CONAN_2FA': process.env.KEY_CONAN_2FA || ''
      },
      body: JSON.stringify(emailPayload)
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
    const emailPayload = {
      recipient_email: email,
      verification_code: '',
      verification_url: '',
      user_name: userName,
      organization_name: organizationName || '',
      dashboard_url: `${process.env.NEXTAUTH_URL || 'http://localhost:3000'}/dashboard`,
      email_type: 'welcome',
      subject: 'Welcome to NEXA!'
    }

    const azureEndpoint = 'https://prod-60.westus.logic.azure.com:443/workflows/2becfb6f393d4642890b33e6ba6fc906/triggers/manual/paths/invoke?api-version=2016-06-01&sp=%2Ftriggers%2Fmanual%2Frun&sv=1.0&sig=xBWH5M1AaZLVFDlgnotk_Iox9ylXdmOlqklclk_LxJs'

    const response = await fetch(azureEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'KEY_CONAN_2FA': process.env.KEY_CONAN_2FA || ''
      },
      body: JSON.stringify(emailPayload)
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

