import jsPDF from 'jspdf'

export interface CoverPageData {
  title: string
  engineer: string
  client: string
  date: string
  isMultiSolution?: boolean
}

// A4 dimensions at 96 DPI (same as old system)
const A4_WIDTH = 794
const A4_HEIGHT = 1122

export async function generateProfessionalCoverPDF(data: CoverPageData): Promise<jsPDF> {
  // Create new PDF document with exact A4 dimensions
  const doc = new jsPDF({
    unit: 'px',
    format: [A4_WIDTH, A4_HEIGHT]
  })
  
  // Set default font
  doc.setFont('helvetica')
  
  // **1. TOP SECTION - "Solution Overview" with STYLIZED decorative lines**
  // Position: 200px from top, centered in 350px container
  const overviewY = 200
  const overviewText = data.isMultiSolution ? 'Multi-Solution Overview' : 'Solution Overview'
  
  // Container positioning (350px wide, centered)
  const containerWidth = 350
  const containerX = (A4_WIDTH - containerWidth) / 2
  
  // "Solution Overview" text
  doc.setFontSize(20)
  doc.setFont('helvetica', 'bold')
  const overviewWidth = doc.getTextWidth(overviewText)
  const overviewX = (A4_WIDTH - overviewWidth) / 2
  doc.text(overviewText, overviewX, overviewY)
  
  // STYLIZED decorative lines (300px wide, 2px thick, OFFSET for visual appeal)
  const lineWidth = 300
  doc.setLineWidth(2)
  
  // Top line: starts 25px from LEFT of container
  const topLineX = containerX + 25
  doc.line(topLineX, overviewY - 25, topLineX + lineWidth, overviewY - 25)
  
  // Bottom line: starts 25px from RIGHT edge (offset styling)
  const bottomLineX = containerX + containerWidth - 25 - lineWidth
  doc.line(bottomLineX, overviewY + 15, bottomLineX + lineWidth, overviewY + 15)
  
  // **2. MAIN CONTENT SECTION - EDGE ALIGNED**
  // Position: Starting around 280px from top (200 + 80 margin-bottom)
  const contentY = 360
  
  // Format date
  const formattedDate = formatDate(data.date)
  
  // Date (BOTTOM LEFT, 97px from left edge, positioned above headline)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(formattedDate, 97, contentY - 45)
  
  // "Prepared For:" (BOTTOM RIGHT, 97px from right edge, positioned above headline)
  doc.setFontSize(14)
  doc.setFont('helvetica', 'bold')
  doc.text('Prepared For:', A4_WIDTH - 97, contentY - 55, { align: 'right' })
  
  // Client name (under "Prepared For:", right aligned)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text(data.client, A4_WIDTH - 97, contentY - 40, { align: 'right' })
  
  // **3. MAIN HEADLINE SECTION**
  // Top decorative line (600px wide, 4px thick)
  const headlineLineWidth = 600
  const headlineLineX = (A4_WIDTH - headlineLineWidth) / 2
  doc.setLineWidth(4)
  doc.line(headlineLineX, contentY, headlineLineX + headlineLineWidth, contentY)
  
  // Main headline/title (centered, 42px, bold)
  doc.setFontSize(42)
  doc.setFont('helvetica', 'bold')
  
  // Handle title with line breaks if it contains colon (like old system)
  let titleLines: string[] = []
  if (data.title.includes(':')) {
    const parts = data.title.split(':', 2)
    titleLines = [parts[0] + ':', parts[1].trim()]
  } else {
    titleLines = [data.title]
  }
  
  // Calculate title positioning with proper line height
  const titleLineHeight = 46 // Slightly larger for 42px font
  const totalTitleHeight = titleLines.length * titleLineHeight
  const titleStartY = contentY + 35 + (70 - totalTitleHeight) / 2
  
  titleLines.forEach((line, index) => {
    const titleWidth = doc.getTextWidth(line)
    const titleX = (A4_WIDTH - titleWidth) / 2
    doc.text(line, titleX, titleStartY + (index * titleLineHeight))
  })
  
  // Bottom decorative line (600px wide, 4px thick)
  doc.line(headlineLineX, contentY + 105, headlineLineX + headlineLineWidth, contentY + 105)
  
  // "Prepared By:" section (TOP RIGHT, 97px from right edge, positioned below headline)
  doc.setFontSize(12)
  doc.setFont('helvetica', 'normal')
  doc.text('Prepared By:', A4_WIDTH - 97, contentY + 125, { align: 'right' })
  
  // Engineer name (right aligned)
  doc.text(data.engineer, A4_WIDTH - 97, contentY + 140, { align: 'right' })
  
  // "Solutions Engineer" title (right aligned)  
  doc.text('Solutions Engineer', A4_WIDTH - 97, contentY + 155, { align: 'right' })
  
  // **4. LOGO SECTION**
  // Position: Around 100px margin from previous content
  const logoY = contentY + 250
  
  // Add DG logo image (300px wide, centered)
  try {
    // For now, use styled text that matches the logo appearance
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    const logoText = 'DRY GROUND AI'
    const logoWidth = doc.getTextWidth(logoText)
    const logoX = (A4_WIDTH - logoWidth) / 2
    doc.text(logoText, logoX, logoY)
    
    // Add a subtle underline to mimic logo styling
    doc.setLineWidth(1)
    doc.line(logoX, logoY + 5, logoX + logoWidth, logoY + 5)
  } catch (error) {
    console.warn('Logo image not available, using text fallback')
    doc.setFontSize(24)
    doc.setFont('helvetica', 'bold')
    const logoText = 'DRY GROUND AI'
    const logoWidth = doc.getTextWidth(logoText)
    const logoX = (A4_WIDTH - logoWidth) / 2
    doc.text(logoText, logoX, logoY)
  }
  
  // **5. FOOTER DISCLAIMER**
  // Position: Near bottom of page
  const footerY = A4_HEIGHT - 120
  
  // Footer line (98% width, 1px)
  const footerLineWidth = A4_WIDTH * 0.98
  const footerLineX = (A4_WIDTH - footerLineWidth) / 2
  doc.setLineWidth(1)
  doc.setDrawColor(209, 209, 209) // #d1d1d1
  doc.line(footerLineX, footerY - 20, footerLineX + footerLineWidth, footerY - 20)
  
  // Disclaimer text
  doc.setFontSize(8)
  doc.setFont('helvetica', 'italic')
  doc.setTextColor(125, 125, 125) // #7d7d7d
  
  const currentYear = new Date().getFullYear()
  const disclaimerText = `This document and the information contained herein are the confidential and proprietary property of Dry Ground AI. It is intended solely for the use of the recipient(s) and may not be copied, distributed, reproduced, or disclosed—whether in whole or in part—without the express written consent of Dry Ground AI. Unauthorized use, disclosure, or duplication is strictly prohibited. All rights reserved © ${currentYear}.`
  
  // Split disclaimer into multiple lines to fit width
  const maxWidth = 780
  const disclaimerLines = doc.splitTextToSize(disclaimerText, maxWidth)
  doc.text(disclaimerLines, (A4_WIDTH - maxWidth) / 2, footerY, { align: 'justify' })
  
  // Reset color for potential future content
  doc.setTextColor(0, 0, 0)
  doc.setDrawColor(0, 0, 0)
  
  return doc
}

function formatDate(dateString: string): string {
  try {
    const date = new Date(dateString)
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long', 
      day: 'numeric'
    })
  } catch {
    return dateString
  }
}

export function generateProfessionalCoverPDFBlob(data: CoverPageData): Promise<Blob> {
  return generateProfessionalCoverPDF(data).then(doc => doc.output('blob'))
}
