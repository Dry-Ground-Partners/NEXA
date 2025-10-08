/**
 * PDF Service Client
 * Handles communication with separate PDF microservice
 */

const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://localhost:5000'

export class PDFServiceClient {
  private baseUrl: string

  constructor(baseUrl?: string) {
    this.baseUrl = baseUrl || PDF_SERVICE_URL
  }

  /**
   * Generate PDF from HTML template
   */
  async generatePDF(htmlTemplate: string): Promise<Buffer> {
    try {
      console.log('📄 Calling PDF service:', `${this.baseUrl}/api/generate-pdf`)
      
      const response = await fetch(`${this.baseUrl}/api/generate-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ htmlTemplate })
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`PDF service error: ${error.error || response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error: unknown) {
      console.error('❌ PDF service client error:', error)
      throw error
    }
  }

  /**
   * Generate Solutioning PDF
   */
  async generateSolutioningPDF(sessionData: any, sessionId: string, mainLogo?: string, secondLogo?: string): Promise<Buffer> {
    try {
      console.log('📄 Calling PDF service: Solutioning PDF')
      console.log('   Service URL:', this.baseUrl)
      console.log('   Endpoint:', `${this.baseUrl}/api/generate-solutioning-pdf`)
      
      const response = await fetch(`${this.baseUrl}/api/generate-solutioning-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          sessionData,
          sessionId,
          mainLogo,
          secondLogo
        })
      })

      console.log('📡 PDF service response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok,
        headers: Object.fromEntries(response.headers.entries())
      })

      if (!response.ok) {
        // Try to get detailed error
        let errorDetails
        const contentType = response.headers.get('content-type')
        
        if (contentType?.includes('application/json')) {
          try {
            errorDetails = await response.json()
            console.error('❌ PDF service returned JSON error:', errorDetails)
          } catch (jsonError) {
            console.error('❌ Failed to parse error as JSON:', jsonError)
            errorDetails = { error: 'Unknown error - could not parse response' }
          }
        } else {
          // Response is not JSON, try to read as text
          try {
            const errorText = await response.text()
            console.error('❌ PDF service returned text error:', errorText)
            errorDetails = { error: errorText || 'Unknown error - empty response' }
          } catch (textError) {
            console.error('❌ Failed to read error as text:', textError)
            errorDetails = { error: 'Unknown error - could not read response' }
          }
        }
        
        throw new Error(`PDF service error (${response.status}): ${errorDetails.error || response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      console.log('✅ PDF generated successfully, size:', arrayBuffer.byteLength, 'bytes')
      return Buffer.from(arrayBuffer)
    } catch (error: unknown) {
      console.error('❌ Solutioning PDF service error:', error)
      if (error instanceof Error) {
        console.error('   Error message:', error.message)
        console.error('   Error stack:', error.stack)
      }
      throw error
    }
  }

  /**
   * Generate SOW PDF
   */
  async generateSOWPDF(sowData: any): Promise<Buffer> {
    try {
      console.log('📄 Calling PDF service: SOW PDF')
      
      const response = await fetch(`${this.baseUrl}/api/generate-sow-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(sowData)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`PDF service error: ${error.error || response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error: unknown) {
      console.error('❌ SOW PDF service error:', error)
      throw error
    }
  }

  /**
   * Generate LOE PDF
   */
  async generateLOEPDF(loeData: any): Promise<Buffer> {
    try {
      console.log('📄 Calling PDF service: LOE PDF')
      
      const response = await fetch(`${this.baseUrl}/api/generate-loe-pdf`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loeData)
      })

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`PDF service error: ${error.error || response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error: unknown) {
      console.error('❌ LOE PDF service error:', error)
      throw error
    }
  }

  /**
   * Check service health
   */
  async checkHealth(): Promise<boolean> {
    try {
      const response = await fetch(`${this.baseUrl}/health`, {
        method: 'GET',
      })
      
      return response.ok
    } catch (error: unknown) {
      console.error('❌ PDF service health check failed:', error)
      return false
    }
  }
}

// Export singleton instance
export const pdfServiceClient = new PDFServiceClient()
