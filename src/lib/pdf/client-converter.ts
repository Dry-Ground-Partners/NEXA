import html2canvas from 'html2canvas'
import jsPDF from 'jspdf'
import { generateCoverHTML, type TemplateData } from './html-template'

export interface CoverPageData {
  title: string
  engineer: string
  client: string
  date: string
  isMultiSolution?: boolean
}

export async function generatePDFFromHTMLClient(data: CoverPageData): Promise<Blob> {
  return new Promise((resolve, reject) => {
    try {
      // Generate the exact HTML template
      const html = generateCoverHTML(data)
      
      // Create a temporary container
      const container = document.createElement('div')
      container.innerHTML = html
      container.style.position = 'absolute'
      container.style.left = '-9999px'
      container.style.top = '0'
      container.style.width = '794px'
      container.style.height = 'auto' // Allow full height
      
      // Add to DOM temporarily
      document.body.appendChild(container)
      
      // Get all page elements
      const pages = container.querySelectorAll('.cover-container, .layout-page')
      console.log('🔍 Found pages:', pages.length)
      
      // Create PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'px',
        format: [794, 1122]
      })
      
      // Process each page separately
      let pagePromises = Array.from(pages).map((page, index) => {
        return new Promise<string>((pageResolve, pageReject) => {
          // Create container for single page
          const pageContainer = document.createElement('div')
          pageContainer.appendChild(page.cloneNode(true))
          pageContainer.style.position = 'absolute'
          pageContainer.style.left = '-9999px'
          pageContainer.style.top = '0'
          pageContainer.style.width = '794px'
          pageContainer.style.height = '1122px'
          
          document.body.appendChild(pageContainer)
          
          html2canvas(pageContainer, {
            width: 794,
            height: 1122,
            scale: 2,
            useCORS: true,
            allowTaint: true,
            backgroundColor: '#ffffff'
          }).then(canvas => {
            // Remove page container
            document.body.removeChild(pageContainer)
            
            const imgData = canvas.toDataURL('image/png')
            pageResolve(imgData)
          }).catch(error => {
            if (document.body.contains(pageContainer)) {
              document.body.removeChild(pageContainer)
            }
            pageReject(error)
          })
        })
      })
      
      Promise.all(pagePromises).then(pageImages => {
        // Remove main container
        document.body.removeChild(container)
        
        // Add each page to PDF
        pageImages.forEach((imgData, index) => {
          if (index > 0) pdf.addPage()
          pdf.addImage(imgData, 'PNG', 0, 0, 794, 1122)
        })
        
        console.log('✅ Generated PDF with', pageImages.length, 'pages')
        
        // Return as blob
        const pdfBlob = pdf.output('blob')
        resolve(pdfBlob)
        
      }).catch(error => {
        // Remove main container on error
        if (document.body.contains(container)) {
          document.body.removeChild(container)
        }
        reject(error)
      })
      
    } catch (error) {
      reject(error)
    }
  })
}

export function openHTMLPreview(data: CoverPageData): void {
  // Generate the exact HTML template
  const html = generateCoverHTML(data)
  
  // Open in new window
  const previewWindow = window.open('', '_blank')
  if (previewWindow) {
    previewWindow.document.write(html)
    previewWindow.document.close()
  }
}

