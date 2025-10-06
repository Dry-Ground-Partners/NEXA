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

      if (!response.ok) {
        const error = await response.json().catch(() => ({ error: 'Unknown error' }))
        throw new Error(`PDF service error: ${error.error || response.statusText}`)
      }

      const arrayBuffer = await response.arrayBuffer()
      return Buffer.from(arrayBuffer)
    } catch (error: unknown) {
      console.error('❌ Solutioning PDF service error:', error)
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
