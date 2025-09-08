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
      container.style.height = '1122px'
      
      // Add to DOM temporarily
      document.body.appendChild(container)
      
      // Use html2canvas to capture the HTML
      html2canvas(container, {
        width: 794,
        height: 1122,
        scale: 2, // Higher quality
        useCORS: true,
        allowTaint: true,
        backgroundColor: '#ffffff'
      }).then(canvas => {
        // Remove temporary container
        document.body.removeChild(container)
        
        // Create PDF with A4 dimensions
        const pdf = new jsPDF({
          orientation: 'portrait',
          unit: 'px',
          format: [794, 1122]
        })
        
        // Add the canvas as image to PDF
        const imgData = canvas.toDataURL('image/png')
        pdf.addImage(imgData, 'PNG', 0, 0, 794, 1122)
        
        // Return as blob
        const pdfBlob = pdf.output('blob')
        resolve(pdfBlob)
        
      }).catch(error => {
        // Remove temporary container on error
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

