import { NextRequest, NextResponse } from 'next/server'
import { getUserByEmail, verifyPassword, generateToken, updateLastLogin, recordFailedLogin, isAccountLocked } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json(
        { success: false, error: 'Email and password are required' },
        { status: 400 }
      )
    }

    // Check if account is locked
    const locked = await isAccountLocked(email)
    if (locked) {
      return NextResponse.json(
        { success: false, error: 'Account is temporarily locked due to too many failed login attempts. Please try again later.' },
        { status: 423 }
      )
    }

    // Verify credentials
    const isValidPassword = await verifyPassword(email, password)
    if (!isValidPassword) {
      await recordFailedLogin(email)
      return NextResponse.json(
        { success: false, error: 'Invalid email or password' },
        { status: 401 }
      )
    }

    // Get user data
    const user = await getUserByEmail(email)
    if (!user) {
      return NextResponse.json(
        { success: false, error: 'User not found' },
        { status: 404 }
      )
    }

    // Check if user account is active
    if (user.status !== 'active') {
      if (user.status === 'pending') {
        return NextResponse.json(
          { 
            success: false, 
            error: 'Please verify your email address before logging in',
            requiresVerification: true 
          },
          { status: 403 }
        )
      } else {
        return NextResponse.json(
          { success: false, error: 'Account is suspended or deactivated' },
          { status: 403 }
        )
      }
    }

    // Generate JWT token
    const token = generateToken(user)

    // Update last login
    await updateLastLogin(user.id)

    // Create response with auth cookie
    const response = NextResponse.json({
      success: true,
      message: 'Login successful',
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName
      }
    })

    // Set httpOnly cookie with JWT token
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}