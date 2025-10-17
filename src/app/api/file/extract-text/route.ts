import { NextRequest, NextResponse } from 'next/server'

export const runtime = 'nodejs'

// File size limits (in bytes)
const FILE_SIZE_LIMITS = {
  pdf: 10 * 1024 * 1024,  // 10MB
  docx: 5 * 1024 * 1024,  // 5MB
  txt: 1 * 1024 * 1024,   // 1MB
  md: 1 * 1024 * 1024     // 1MB
}

/**
 * Extract text from PDF files using pdf2json
 * Node.js-native library, no worker dependencies
 */
async function extractPdfText(buffer: Buffer): Promise<string> {
  try {
    console.log('📄 Extracting text from PDF...')
    
    // Dynamic import
    const PDFParser = (await import('pdf2json')).default
    
    return new Promise((resolve, reject) => {
      const pdfParser = new PDFParser()
      
    // Success handler
    pdfParser.on('pdfParser_dataReady', (pdfData: any) => {
      try {
        // Extract text from all pages
        const pageTexts: string[] = []
        
        if (pdfData.Pages && Array.isArray(pdfData.Pages)) {
          for (const page of pdfData.Pages) {
            const pageText: string[] = []
            
            if (page.Texts && Array.isArray(page.Texts)) {
              for (const text of page.Texts) {
                if (text.R && Array.isArray(text.R)) {
                  for (const run of text.R) {
                    if (run.T) {
                      try {
                        // Try to decode URI component (pdf2json encodes text)
                        pageText.push(decodeURIComponent(run.T))
                      } catch (decodeError) {
                        // If decoding fails, use the raw text
                        // Some PDFs have malformed URI encoding
                        pageText.push(run.T.replace(/%[0-9A-F]{2}/gi, ' '))
                      }
                    }
                  }
                }
              }
            }
            
            pageTexts.push(pageText.join(' '))
          }
        }
        
        const fullText = pageTexts.join('\n\n').trim()
        
        if (!fullText) {
          throw new Error('No text content found in PDF')
        }
        
        console.log(`✅ PDF extraction successful: ${pdfData.Pages?.length || 0} pages, ${fullText.length} characters`)
        resolve(fullText)
      } catch (err) {
        reject(err)
      }
    })
      
      // Error handler
      pdfParser.on('pdfParser_dataError', (error: any) => {
        console.error('❌ PDF parsing error:', error)
        reject(new Error(`PDF parsing failed: ${error.parserError || 'Unknown error'}`))
      })
      
      // Parse the buffer
      pdfParser.parseBuffer(buffer)
    })
  } catch (error) {
    console.error('❌ PDF extraction failed:', error)
    throw new Error('Failed to extract text from PDF. The file may be corrupted or password-protected.')
  }
}

/**
 * Extract text from DOCX files using mammoth
 * Uses dynamic import to avoid build-time issues
 */
async function extractDocxText(buffer: Buffer): Promise<string> {
  try {
    console.log('📝 Extracting text from DOCX...')
    // Dynamic import to avoid build-time issues
    const mammoth = (await import('mammoth')).default
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

