import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser } from '@/lib/auth'

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    
    if (!user) {
      return NextResponse.json(
        { success: false, message: 'Unauthorized' },
        { status: 401 }
      )
    }

    const { fullName, company } = await request.json()

    // Validate input
    if (!fullName || fullName.trim().length === 0) {
      return NextResponse.json(
        { success: false, message: 'Full name is required' },
        { status: 400 }
      )
    }

    if (fullName.trim().length > 255) {
      return NextResponse.json(
        { success: false, message: 'Full name must be less than 255 characters' },
        { status: 400 }
      )
    }

    if (company && company.length > 255) {
      return NextResponse.json(
        { success: false, message: 'Company name must be less than 255 characters' },
        { status: 400 }
      )
    }

    // In a real app, you would update the database here
    // For now, we'll return the updated user data
    const updatedUser = {
      ...user,
      fullName: fullName.trim(),
      profileData: {
        ...user.profileData,
        company: company?.trim() || null
      },
      updatedAt: new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: updatedUser
    })

  } catch (error) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { success: false, message: 'Internal server error' },
      { status: 500 }
    )
  }
}


