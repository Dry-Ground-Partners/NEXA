import { NextRequest, NextResponse } from 'next/server'

export async function POST(request: NextRequest) {
  try {
    console.log('📡 API: Image upload to ImgBB request')
    
    const formData = await request.formData()
    const image = formData.get('image') as File

    if (!image) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'No image file provided' 
        },
        { status: 400 }
      )
    }

    // Validate file type
    const allowedTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
    if (!allowedTypes.includes(image.type)) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'Invalid file type. Please upload JPEG, PNG, GIF, or WebP images.' 
        },
        { status: 400 }
      )
    }

    // Validate file size (max 32MB as per ImgBB limits)
    const maxSize = 32 * 1024 * 1024 // 32MB
    if (image.size > maxSize) {
      return NextResponse.json(
        { 
          success: false, 
          error: 'File too large. Maximum size is 32MB.' 
        },
        { status: 400 }
      )
    }

    // Get ImgBB API key
    const imgbbApiKey = process.env.IMGBB_API_KEY
    if (!imgbbApiKey) {
      console.error('❌ IMGBB_API_KEY not configured')
      return NextResponse.json(
        { 
          success: false, 
          error: 'Image upload service not configured' 
        },
        { status: 500 }
      )
    }

    console.log(`📸 Uploading image: ${image.name} (${image.type}, ${(image.size / 1024 / 1024).toFixed(2)}MB)`)

    // Convert image to base64
    const bytes = await image.arrayBuffer()
    const base64 = Buffer.from(bytes).toString('base64')

    // Upload to ImgBB
    const imgbbFormData = new FormData()
    imgbbFormData.append('key', imgbbApiKey)
    imgbbFormData.append('image', base64)

    const imgbbResponse = await fetch('https://api.imgbb.com/1/upload', {
      method: 'POST',
      body: imgbbFormData
    })

    if (!imgbbResponse.ok) {
      const errorText = await imgbbResponse.text()
      console.error('❌ ImgBB upload failed:', errorText)
      return NextResponse.json(
        { 
          success: false, 
          error: `ImgBB upload failed: ${imgbbResponse.statusText}` 
        },
        { status: 500 }
      )
    }

    const imgbbResult = await imgbbResponse.json()

    if (!imgbbResult.success) {
      console.error('❌ ImgBB upload failed:', imgbbResult)
      return NextResponse.json(
        { 
          success: false, 
          error: 'Failed to upload image to ImgBB' 
        },
        { status: 500 }
      )
    }

    const imageUrl = imgbbResult.data.url
    console.log('✅ Image uploaded successfully to ImgBB:', imageUrl)

    return NextResponse.json({
      success: true,
      imageUrl,
      imageData: {
        url: imageUrl,
        display_url: imgbbResult.data.display_url,
        size: image.size,
        filename: image.name,
        type: image.type
      }
    })

  } catch (error) {
    console.error('❌ API: Error uploading image:', error)
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    )
  }
}
