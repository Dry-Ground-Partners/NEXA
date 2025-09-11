import puppeteer from 'puppeteer'
import { generateCoverHTML, type TemplateData } from './html-template'

export interface CoverPageData {
  title: string
  engineer: string
  client: string
  date: string
  isMultiSolution?: boolean
}

export async function generatePDFFromHTML(data: CoverPageData): Promise<Buffer> {
  let browser
  
  try {
    console.log('🚀 Starting Puppeteer for PDF conversion...')
    
    // Launch browser
    browser = await puppeteer.launch({
      headless: true,
      args: ['--no-sandbox', '--disable-setuid-sandbox']
    })
    
    const page = await browser.newPage()
    
    // Generate the exact HTML template
    const html = generateCoverHTML(data)
    console.log('📄 HTML template generated')
    
    // Set content and wait for it to load
    await page.setContent(html, { 
      waitUntil: 'networkidle0',
      timeout: 30000 
    })
    
    console.log('🔄 Converting HTML to PDF...')
    
    // Generate PDF with A4 format (matching the template)
    const pdfBuffer = await page.pdf({
      format: 'A4',
      printBackground: true,
      margin: {
        top: 0,
        right: 0,
        bottom: 0,
        left: 0
      }
    })
    
    console.log('✅ PDF conversion completed successfully')
    return pdfBuffer
    
  } catch (error) {
    console.error('❌ PDF conversion failed:', error)
    throw new Error(`PDF generation failed: ${error}`)
  } finally {
    if (browser) {
      await browser.close()
      console.log('🔒 Browser closed')
    }
  }
}

export async function generatePDFBlobFromHTML(data: CoverPageData): Promise<Blob> {
  const buffer = await generatePDFFromHTML(data)
  return new Blob([buffer], { type: 'application/pdf' })
}



