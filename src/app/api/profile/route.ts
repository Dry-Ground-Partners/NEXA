import { NextRequest, NextResponse } from 'next/server'
import { getCurrentUser, updateUserProfile } from '@/lib/auth'

export async function PUT(request: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json(
        { success: false, error: 'Not authenticated' },
        { status: 401 }
      )
    }

    const body = await request.json()
    const { firstName, lastName, company } = body

    // Validate input
    if (!firstName || !lastName) {
      return NextResponse.json(
        { success: false, error: 'First name and last name are required' },
        { status: 400 }
      )
    }

    const fullName = `${firstName} ${lastName}`.trim()
    
    // Update profile data
    const profileData = {
      ...user.profileData,
      company: company || user.profileData?.company || ''
    }

    const updatedUser = await updateUserProfile(user.id, {
      firstName,
      lastName,
      fullName,
      profileData
    })

    if (!updatedUser) {
      return NextResponse.json(
        { success: false, error: 'Failed to update profile' },
        { status: 500 }
      )
    }

    return NextResponse.json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        fullName: updatedUser.fullName,
        avatarUrl: updatedUser.avatarUrl,
        profileData: updatedUser.profileData
      }
    })
  } catch (error: unknown) {
    console.error('Profile update error:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}