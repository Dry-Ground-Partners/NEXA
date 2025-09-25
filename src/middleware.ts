import { NextRequest, NextResponse } from 'next/server'

// Helper function to decode JWT payload (Edge Runtime compatible)
function decodeJWT(token: string) {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const payload = JSON.parse(atob(parts[1]))
    return payload
  } catch {
    return null
  }
}

// Helper function to check if token is expired
function isTokenExpired(payload: any): boolean {
  if (!payload.exp) return true
  return Date.now() >= payload.exp * 1000
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Public routes that don't require authentication
  const publicRoutes = [
    '/auth/login',
    '/auth/register', 
    '/auth/verify-email',
    '/auth/verify-email-pending',
    '/auth/accept-invitation',
    '/auth/reset-password',
    '/invite', // Allow invitation acceptance without authentication
    '/onboarding', // Allow onboarding for authenticated users without orgs
    '/images',
    '/static',
    '/_next',
    '/favicon.ico'
  ]

  // Routes that require authentication but allow unverified email
  const unverifiedEmailAllowedRoutes = [
    '/auth/verify-email-pending'
  ]

  // API routes that don't require authentication
  const publicApiRoutes = [
    '/api/auth/login',
    '/api/auth/register',
    '/api/auth/verify-email',
    '/api/auth/resend-verification',
    '/api/organizations/check-domain',
    '/api/invitations' // Allow invitation validation and acceptance
  ]

  // API routes that require authentication but not organization membership
  const authOnlyApiRoutes = [
    '/api/auth/me',
    '/api/onboarding'
  ]

  // Check if the current path is public
  const isPublicRoute = publicRoutes.some(route => pathname.startsWith(route))
  const isPublicApiRoute = publicApiRoutes.some(route => pathname.startsWith(route))
  const isAuthOnlyApiRoute = authOnlyApiRoutes.some(route => pathname.startsWith(route))

  if (isPublicRoute || isPublicApiRoute) {
    return NextResponse.next()
  }

  // Get token from cookie
  const token = request.cookies.get('auth-token')?.value

  if (!token) {
    console.log('No auth token found, redirecting to login')
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    return NextResponse.redirect(new URL('/auth/login', request.url))
  }

  // Decode and validate token (Edge Runtime compatible)
  const payload = decodeJWT(token)
  
  if (!payload || isTokenExpired(payload)) {
    console.log('Invalid or expired token, redirecting to login')
    
    // Clear the invalid token
    const response = pathname.startsWith('/api/') 
      ? NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
      : NextResponse.redirect(new URL('/auth/login', request.url))
    
    response.cookies.delete('auth-token')
    return response
  }

  // Check if user account is active
  if (payload.status !== 'active') {
    console.log('User account not active, redirecting to login')
    
    const response = pathname.startsWith('/api/') 
      ? NextResponse.json({ error: 'Account not verified' }, { status: 403 })
      : NextResponse.redirect(new URL('/auth/login?error=account-not-verified', request.url))
    
    response.cookies.delete('auth-token')
    return response
  }

  // Check if user has verified email (skip for verification-related paths and APIs)
  const isUnverifiedEmailAllowed = unverifiedEmailAllowedRoutes.some(route => pathname.startsWith(route))
  const isVerificationApiRoute = pathname.startsWith('/api/auth/verify-email') || pathname.startsWith('/api/auth/resend-verification')
  
  if (!isUnverifiedEmailAllowed && !isVerificationApiRoute && !payload.emailVerifiedAt) {
    console.log('User email not verified, redirecting to verify-email-pending')
    
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Email verification required' }, { status: 403 })
    }
    
    return NextResponse.redirect(new URL(`/auth/verify-email-pending?email=${encodeURIComponent(payload.email)}`, request.url))
  }

  // Check if user has organization membership (skip for onboarding-related paths and auth-only APIs)
  const isOnboardingPath = pathname.startsWith('/onboarding')
  
  if (!isOnboardingPath && !isAuthOnlyApiRoute && !payload.hasOrganization) {
    console.log('User has no organization, redirecting to onboarding')
    
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ error: 'Organization required' }, { status: 403 })
    }
    
    // Check if user was recently offboarded (could be enhanced to detect from DB)
    // For now, redirect to onboarding - the onboarding page will check URL params
    return NextResponse.redirect(new URL('/onboarding', request.url))
  }

  // Token is valid, allow the request to proceed
  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}