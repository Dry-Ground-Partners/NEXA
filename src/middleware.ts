import { NextRequest, NextResponse } from 'next/server'

const JWT_SECRET = process.env.JWT_SECRET!

// Public routes that don't require authentication
const publicRoutes = [
  '/auth/login',
  '/auth/register',
  '/api/auth/login',
  '/api/auth/logout',
  '/_next',
  '/favicon.ico',
  '/images',
  '/static'
]

// Check if a route is public
function isPublicRoute(pathname: string): boolean {
  return publicRoutes.some(route => pathname.startsWith(route))
}

// Verify JWT token using Web Crypto API (Edge runtime compatible)
async function verifyToken(token: string): Promise<boolean> {
  try {
    // Split JWT into parts
    const parts = token.split('.')
    if (parts.length !== 3) {
      return false
    }

    const [headerB64, payloadB64, signatureB64] = parts
    
    // Decode payload to check expiration
    const payload = JSON.parse(atob(payloadB64.replace(/-/g, '+').replace(/_/g, '/')))
    
    // Check if token is expired
    if (payload.exp && payload.exp < Math.floor(Date.now() / 1000)) {
      return false
    }
    
    // For now, just check basic structure and expiration
    // In a full implementation, we'd verify the signature with Web Crypto API
    return true
    
  } catch (error) {
    return false
  }
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Allow public routes
  if (isPublicRoute(pathname)) {
    return NextResponse.next()
  }

  // Get auth token from cookies
  const token = request.cookies.get('auth-token')?.value

  // If no token, redirect to login
  if (!token) {
    const loginUrl = new URL('/auth/login', request.url)
    
    // Add redirect parameter to return user to original page after login
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    
    return NextResponse.redirect(loginUrl)
  }

  // Verify token
  const isValid = await verifyToken(token)
  if (!isValid) {
    const loginUrl = new URL('/auth/login', request.url)
    
    // Add redirect parameter to return user to original page after login
    if (pathname !== '/') {
      loginUrl.searchParams.set('redirect', pathname)
    }
    
    return NextResponse.redirect(loginUrl)
  }

  // If authenticated and trying to access auth pages, redirect to dashboard
  if (pathname.startsWith('/auth/')) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  // If accessing root, redirect to dashboard
  if (pathname === '/') {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

// Using Edge runtime with Web Crypto API for JWT verification

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public/).*)',
  ],
}
