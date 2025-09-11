import { generateCoverHTML, type TemplateData } from './html-template'

export interface CoverPageData {
  title: string
  engineer: string
  client: string
  date: string
  isMultiSolution?: boolean
}

export async function generateHTMLCoverPDFBlob(data: CoverPageData): Promise<Blob> {
  // Generate the HTML using the exact template
  const html = generateCoverHTML(data)
  
  // Use html2canvas + jsPDF approach or simple HTML printing
  // For now, let's create a simple blob with the HTML for testing
  const htmlBlob = new Blob([html], { type: 'text/html' })
  
  // TODO: Implement actual HTML-to-PDF conversion
  // Options: Puppeteer, html2canvas + jsPDF, or browser printing
  
  return htmlBlob
}

// Alternative: Use the browser's print functionality
export function openHTMLCoverForPrint(data: CoverPageData): void {
  const html = generateCoverHTML(data)
  
  // Open in new window for printing
  const printWindow = window.open('', '_blank')
  if (printWindow) {
    printWindow.document.write(html)
    printWindow.document.close()
    
    // Wait for load then focus for printing
    printWindow.onload = () => {
      printWindow.focus()
    }
  }
}



