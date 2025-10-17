import { NextRequest, NextResponse } from 'next/server'
import pdf from 'pdf-parse'
import mammoth from 'mammoth'

export const runtime = 'nodejs'

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  pdf: 10 * 1024 * 1024,  // 10MB
  docx: 5 * 1024 * 1024,  // 5MB
  txt: 1 * 1024 * 1024,   // 1MB
  md: 1 * 1024 * 1024     // 1MB
}

/**
 * Extract text from PDF files using pdf-parse
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    console.log('📄 Extracting text from PDF...')
    const data = await pdf(buffer)
    console.log(`✅ PDF extraction successful: ${data.numpages} pages, ${data.text.length} characters`)
    return data.text
  } catch (error) {
    console.error('❌ PDF extraction failed:', error)
    throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.')
  }
}

/**
 * Extract text from DOCX files using mammoth
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    console.log('📝 Extracting text from DOCX...')
    const result = await mammoth.extractRawText({ buffer })
    
    // Check for warnings
    if (result.messages.length > 0) {
      console.warn('⚠️ DOCX extraction warnings:', result.messages)
    }
    
    console.log(`✅ DOCX extraction successful: ${result.value.length} characters`)
    return result.value
  } catch (error) {
    console.error('❌ DOCX extraction failed:', error)
    throw new Error('Failed to extract text from DOCX. The file may be corrupted or in an unsupported format.')
  }
}

/**
 * Extract text from plain text files (TXT, MD)
 */
async function extractPlainText(buffer: Buffer): Promise<string> {
  try {
    console.log('📋 Reading plain text file...')
    const text = buffer.toString('utf-8')
    console.log(`✅ Plain text extraction successful: ${text.length} characters`)
    return text
  } catch (error) {
    console.error('❌ Plain text extraction failed:', error)
    throw new Error('Failed to read text file. The file may be corrupted or use an unsupported encoding.')
  }
}

/**
 * POST endpoint to extract text from uploaded files
 */
export async function POST(request: NextRequest) {
  try {
    console.log('📡 File upload request received')
    
    // Parse multipart form data
    const formData = await request.formData()
    const file = formData.get('file') as File | null
    
    if (!file) {
      console.error('❌ No file provided in request')
      return NextResponse.json(
        { success: false, error: 'No file provided' },
        { status: 400 }
      )
    }
    
    console.log(`📎 File received: ${file.name} (${file.size} bytes, ${file.type})`)
    
    // Get file extension
    const fileName = file.name.toLowerCase()
    const extension = fileName.split('.').pop()
    
    // Validate file type
    if (!extension || !['pdf', 'docx', 'txt', 'md'].includes(extension)) {
      console.error(`❌ Unsupported file type: ${extension}`)
      return NextResponse.json(
        { 
          success: false, 
          error: `Unsupported file type: .${extension}. Supported formats: .pdf, .docx, .txt, .md` 
        },
        { status: 400 }
      )
    }
    
    // Validate file size
    const sizeLimit = FILE_SIZE_LIMITS[extension as keyof typeof FILE_SIZE_LIMITS]
    if (file.size > sizeLimit) {
      console.error(`❌ File too large: ${file.size} bytes (limit: ${sizeLimit} bytes)`)
      return NextResponse.json(
        { 
          success: false, 
          error: `File too large. Maximum size for .${extension} files is ${Math.round(sizeLimit / 1024 / 1024)}MB` 
        },
        { status: 400 }
      )
    }
    
    // Convert file to buffer
    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    
    // Extract text based on file type
    let extractedText: string
    
    switch (extension) {
      case 'pdf':
        extractedText = await extractPdfText(buffer)
        break
        
      case 'docx':
        extractedText = await extractDocxText(buffer)
        break
        
      case 'txt':
      case 'md':
        extractedText = await extractPlainText(buffer)
        break
        
      default:
        throw new Error(`Unhandled file type: ${extension}`)
    }
    
    // Validate extracted text
    const trimmedText = extractedText.trim()
    if (!trimmedText || trimmedText.length < 10) {
      console.warn('⚠️ Extracted text is too short or empty')
      return NextResponse.json(
        { 
          success: false, 
          error: 'No meaningful text found in file. The file may be empty or contain only images.' 
        },
        { status: 400 }
      )
    }
    
    console.log(`🎉 Text extraction successful: ${trimmedText.length} characters extracted from ${file.name}`)
    
    return NextResponse.json({
      success: true,
      text: trimmedText,
      metadata: {
        fileName: file.name,
        fileType: extension,
        fileSize: file.size,
        characterCount: trimmedText.length
      }
    })
    
  } catch (error: unknown) {
    console.error('💥 Unexpected error during file processing:', error)
    
    const errorMessage = error instanceof Error ? error.message : 'Unknown error during file processing'
    
    return NextResponse.json(
      { 
        success: false, 
        error: errorMessage
      },
      { status: 500 }
    )
  }
}

