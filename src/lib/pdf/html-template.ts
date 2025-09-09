export interface TemplateData {
  title: string
  engineer: string
  client: string
  date: string
  isMultiSolution?: boolean
  solutions?: Array<{
    id: number
    title: string
    steps: string
    approach: string
    difficulty: number
    layout: number
    imageData: string | null
  }>
  totalSolutions?: number
  sessionProtocol?: string
}

function generateSolutionPageHTML(solution: any, index: number, data: TemplateData, formattedDate: string): string {
  const layout = solution.layout || 1;
  const imageContent = solution.imageData ? 
    `<img src="${solution.imageData}" class="layout-1-image" alt="Solution Image">` : 
    '<div style="text-align: center; color: #777;">No image available</div>';
  
  let layoutHTML = '';
  
  if (layout === 2) {
    layoutHTML = `
    <!-- Layout 2: White borders with divisor line -->
    <div class="layout-1-container">
        <div class="solution-title">${solution.title || 'Untitled Solution'}</div>
        
        <div class="layout-2-boxes-container-image">
            ${imageContent}
        </div>
        
        <div class="layout-1-boxes-container">
            <div class="layout-2-box">${solution.steps || 'No steps defined'}</div>
            <div class="layout-1-spacer"></div>
            <div class="layout-2-box">${solution.approach || 'No approach defined'}</div>
        </div>
    </div>`;
  } else if (layout === 3) {
    layoutHTML = `
    <!-- Layout 3: Boxes first, then image -->
    <div class="layout-1-container">
        <div class="solution-title">${solution.title || 'Untitled Solution'}</div>
        
        <div class="layout-3-boxes-container">
            <div class="layout-1-box">${solution.steps || 'No steps defined'}</div>
            <div class="layout-1-spacer"></div>
            <div class="layout-1-box">${solution.approach || 'No approach defined'}</div>
        </div>
        
        <div class="layout-1-boxes-container-image">
            ${imageContent}
        </div>
    </div>`;
  } else if (layout === 4) {
    layoutHTML = `
    <!-- Layout 4: Image first, then full-width stacked boxes -->
    <div class="layout-4-container">
        <div class="solution-title">${solution.title || 'Untitled Solution'}</div>
        
        <div class="layout-2-boxes-container-image">
            ${imageContent}
        </div>
        
        <div class="layout-4-full-width-box">${solution.steps || 'No steps defined'}</div>
        
        <div class="layout-4-full-width-box">${solution.approach || 'No approach defined'}</div>
    </div>`;
  } else if (layout === 5) {
    layoutHTML = `
    <!-- Layout 5: Layout 1 structure with white borders and sharp boxes -->
    <div class="layout-1-container">
        <div class="solution-title">${solution.title || 'Untitled Solution'}</div>
        
        <div class="layout-2-boxes-container-image">
            ${imageContent}
        </div>
        <br>
        <div class="layout-1-boxes-container">
            <div class="layout-5-box">${solution.steps || 'No steps defined'}</div>
            <div class="layout-1-spacer"></div>
            <div class="layout-5-box">${solution.approach || 'No approach defined'}</div>
        </div>
    </div>`;
  } else {
    layoutHTML = `
    <!-- Layout 1: Default black borders -->
    <div class="layout-1-container">
        <div class="solution-title">${solution.title || 'Untitled Solution'}</div>
        
        <div class="layout-1-boxes-container-image">
            ${imageContent}
        </div>
        <br>
        <div class="layout-1-boxes-container">
            <div class="layout-1-box">${solution.steps || 'No steps defined'}</div>
            <div class="layout-1-spacer"></div>
            <div class="layout-1-box">${solution.approach || 'No approach defined'}</div>
        </div>
    </div>`;
  }
  
  return `
<div class="layout-page">
    <!-- DG Header -->
    <div class="page-header">
        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMTAwIiBoZWlnaHQ9IjYwIiB2aWV3Qm94PSIwIDAgMTAwIDYwIiBmaWxsPSJub25lIiB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciPgo8cmVjdCB3aWR0aD0iMTAwIiBoZWlnaHQ9IjYwIiBmaWxsPSIjZmZmZmZmIi8+Cjx0ZXh0IHg9IjUwIiB5PSIzNSIgZm9udC1mYW1pbHk9IkFyaWFsLCBzYW5zLXNlcmlmIiBmb250LXNpemU9IjE0IiBmb250LXdlaWdodD0iYm9sZCIgdGV4dC1hbmNob3I9Im1pZGRsZSIgZmlsbD0iIzAwMDAwMCI+REcgTE9HTzwvdGV4dD4KPHN2Zz4K" alt="DG Logo" class="page-header-image">
    </div>
    
    <div class="solution-divider">
        <div class="solution-divider-line"></div>
        <div class="solution-divider-text">
            Solution ${index + 1} of ${data.totalSolutions || (data.solutions?.length || 0)} developed by the engineer ${data.engineer} with the estimated difficulty of ${solution.difficulty}%.
        </div>
    </div>
    
    ${layoutHTML}
    
    <!-- Solution page footer - EXACT COPY FROM OLD SYSTEM -->
    <div class="solution-footer">
        <div class="solution-footer-line"></div>
        <div class="solution-footer-text">
            Dry Ground AI — ${data.title} — Protocol ${data.sessionProtocol || 'SH123'} Glyph — LS${layout}DL${solution.difficulty} at ${formattedDate}
        </div>
    </div>
</div>`;
}

export function generateCoverHTML(data: TemplateData): string {
  // Format date exactly like the old system
  const formattedDate = formatDate(data.date)
  
  // Format title with line breaks if it contains colon (exactly like old system)
  const formattedTitle = data.title.includes(':') 
    ? data.title.split(':', 1)[0] + ':<br>' + data.title.split(':', 2)[1]?.trim()
    : data.title

  // Get current year for footer
  const currentYear = new Date().getFullYear()

  return `
<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<title>PDF Report</title>
<style>
    @page {
        size: A4;
        margin: 0;
    }
    @page :first {
        margin: 0;
        @bottom-center {
            content: element(footer);
            vertical-align: bottom;
        }
    }
    html, body {
        font-family: Arial, Helvetica, sans-serif;
        margin: 0;
        padding: 0;
        color: #000;
    }
    .cover-container {
        position: relative;
        width: 794px;  /* A4 width in pixels at 96 DPI */
        height: 1122px; /* A4 height in pixels at 96 DPI */
        min-height: 1122px;
        min-width: 794px;
        box-sizing: border-box;
        background: #fff;
        display: flex;
        flex-direction: column;
        align-items: center;
        page-break-after: always;
        padding-bottom: 80px;
    }
    .sol-overview-container {
        margin-top: 200px;  /* Moved up from 200px */
        margin-bottom: 200px;  /* Extra spacing below like breakline */
        width: 350px;
        text-align: center;
        position: relative;
    }
    .sol-overview {
        font-size: 20px;
        font-weight: 800;
        text-align: center;
        letter-spacing: 0.02em;
        position: relative;
        display: inline-block;
        padding: 10px 0;  /* EXACT match to working system */
    }
    .sol-overview-top-line {
        width: 300px;
        border-top: 3px solid #000;
        position: absolute;
        top: 24px;  /* Move line DOWN closer to text */
        left: 25px;
    }
    .sol-overview-bottom-line {
        width: 300px;
        border-top: 3px solid #000;
        position: absolute;
        bottom: 4px;  /* Move line UP closer to text */
        right: 25px;
    }
    .content-section {
        width: 100%;
        position: relative;
        margin-top: 10px;
    }
    .headline-wrapper {
        position: relative;
        width: 100%;
        max-width: 800px;
        margin: 0 auto;
    }
    .meta-prepared-for {
        position: absolute;
        right: 97px;  /* Fixed: calc(50% - 300px) + 100px = 97px for 794px width */
        bottom: 100%;
        margin-bottom: 10px;
        font-size: 14px;
        font-weight: bold;
        line-height: 1.2;
        text-align: right;
        z-index: 2;
        width: 300px;
    }
    .meta-prepared-for-value {
        font-weight: normal;
        margin-top: 3px;
    }
    .date {
        position: absolute;
        left: 97px;  /* Fixed: align with left side of content area */
        bottom: 100%;
        margin-bottom: 10px;
        font-size: 12px;
        font-weight: normal;
        line-height: 1.2;
        color: #000;
        z-index: 2;
        text-align: left;
        padding: 0;
        white-space: nowrap;
    }
    .headline-block {
        width: 100%;
        text-align: center;
        margin: 30px auto 0;  /* Extra spacing before title like breakline */
        position: relative;
        padding: 10px 0;  /* Symmetric padding */
    }
    .top-line {
        width: 600px;
        border-top: 4px solid #000;
        position: absolute;
        top: 0px;  /* Small gap above title */
        left: 50%;
        margin-left: -300px;
    }
    .bottom-line {
        width: 600px;
        border-top: 4px solid #000;
        position: absolute;
        bottom: -20px;  /* Put back at bottom edge for more space below title */
        left: 50%;
        margin-left: -300px;
    }
    .headline {
        font-size: 42px;
        font-weight: bold;
        line-height: 1;  /* Tight line height to remove spacing */
        letter-spacing: 0.01em;
        color: #000;
        margin: 0;
        padding: 0;
        max-width: 500px;  /* Limited width to encourage wrapping */
        margin-left: auto;
        margin-right: auto;
        width: auto;
        display: inline-block;
        word-wrap: break-word;
        hyphens: auto;
    }
    .headline-spacer {
        line-height: 1;  /* Tight line height to remove spacing */
        letter-spacing: 0.01em;
        max-width: 500px;  /* Limited width to encourage wrapping */
        margin-left: auto;
        margin-right: auto;
    }
    .meta-prepared-by {
        position: absolute;
        right: 97px;  /* Fixed: calc(50% - 300px) + 100px = 97px */
        top: 100%;
        margin-top: 15px;
        font-size: 12px;
        text-align: right;
        font-weight: normal;
        line-height: 1.4;
        z-index: 2;
        width: 300px;
    }
    .meta-prepared-by-name {
        margin-bottom: 0;
        margin-top: 2px;
    }
    .meta-prepared-by-title {
        margin-top: 0;
        margin-bottom: 2px;
    }
    .meta-prepared-by-company {
        font-weight: bold;
        font-size: 13px;
        letter-spacing: 0.02em;
        margin-top: 10;
    }
    .logo-section {
        margin-top: 100px;
        text-align: center;
        width: 100%;
    }
    .logo {
        width: 300px;
        max-width: 100%;
        height: auto;
        display: block;
        margin: 0 auto;
    }
    .footer-container {
        position: absolute;
        width: 100%;
        text-align: center;
        bottom: 30px;  /* Fixed at bottom of page */
        left: 0;
        padding-bottom: 0;
        box-sizing: border-box;
    }
    .footer-line {
        width: 98%;
        margin: 0 auto 20px;
        border-top: 1px solid #d1d1d1;
    }
    .footer-disclaimer {
        width: 98%;
        min-width: 750px;
        margin: 0 auto;
        text-align: justify;
        font-size: 8px;
        color: #7d7d7d;
        font-family: Arial, Helvetica, sans-serif;
        letter-spacing: 0.01em;
        line-height: 1.3;
        font-style: italic;
        box-sizing: border-box;
        max-width: 780px;
        white-space: normal;
        word-wrap: normal;
        padding: 0 5px;
    }
    
    /* Solution Page Styles - EXACT COPY FROM OLD SYSTEM */
    .layout-page {
        position: relative;
        width: 794px;
        height: 1122px;
        min-height: 1122px;
        box-sizing: border-box;
        background: #fff;
        page-break-before: always;
        page-break-after: always;
        padding: 40px;
    }
    
    .page-header {
        text-align: left;
        margin-bottom: 30px;
    }
    
    .page-header-image {
        height: 60px;
        width: auto;
    }
    
    .solution-divider {
        width: 80%;
        margin: 15px auto;
        text-align: center;
    }
    
    .solution-divider-line {
        width: 100%;
        border-top: 1px solid #888888;
        margin: 0 auto;
    }
    
    .solution-divider-text {
        font-size: 8px;
        font-style: italic;
        color: #555555;
        margin-top: 2px;
        text-align: center;
        line-height: 1.2;
    }
    
    /* Layout 1 Styles - EXACT COPY FROM OLD SYSTEM */
    .layout-1-container {
        display: flex;
        flex-direction: column;
        min-height: calc(962px - 60px);
        max-width: 100%;
        margin: 0 auto;
    }
    
    .solution-title {
        font-family: Verdana, sans-serif;
        font-size: 40px;
        font-weight: normal;
        text-align: center;
        margin: 20px 0 10px 0;
        color: #000;
    }
    
    .layout-1-boxes-container-image {
        border: 1px solid #000;
        border-radius: 42px;
        padding: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 20px;
        height: 300px;
        box-sizing: border-box;
    }
    
    .layout-1-image {
        width: 90%;
        height: auto;
        object-fit: contain;
        display: block;
        margin: 0 auto;
    }
    
    .layout-1-boxes-container {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
        align-items: flex-start;
    }
    
    .layout-1-box {
        width: 48%;
        border: 1px solid #000;
        border-radius: 30px;
        padding: 20px;
        box-sizing: border-box;
        white-space: pre-line;
        font-size: 12px;
        line-height: 1.5;
        text-align: justify;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }

    .layout-1-spacer {
        width: 1%;
    }
    
    /* Layout 2 Styles - White borders variant */
    .layout-2-boxes-container-image {
        border: 1px solid #fff;
        border-radius: 30px;
        padding: 20px;
        display: flex;
        justify-content: center;
        align-items: center;
        margin-top: 20px;
        height: 300px;
        box-sizing: border-box;
    }
    
    .layout-2-box {
        width: 48%;
        border: 1px solid #fff;
        border-radius: 30px;
        padding: 20px;
        box-sizing: border-box;
        overflow: auto;
        white-space: pre-line;
        font-size: 12px;
        line-height: 1.5;
        text-align: justify;
    }
    
    .layout-divisor-line {
        width: 100%;
        height: 3px;
        background-color: #000;
        margin: 20px 0;
    }
    
    /* Layout 3 Styles - Boxes first, then image */
    .layout-3-boxes-container {
        display: flex;
        justify-content: space-between;
        margin-top: 20px;
        align-items: flex-start;
    }
    
    /* Layout 4 Styles - Full width stacked boxes */
    .layout-4-container {
        display: flex;
        flex-direction: column;
        min-height: calc(962px - 60px);
        max-width: 100%;
        margin: 0 auto;
    }
    
    .layout-4-full-width-box {
        width: 714px;
        border: 1px solid #000;
        border-radius: 30px;
        padding: 20px;
        box-sizing: border-box;
        margin: 10px auto;
        text-align: justify;
        font-size: 12px;
        line-height: 1.5;
        white-space: pre-line;
        word-wrap: break-word;
        overflow-wrap: break-word;
    }
    
    /* Layout 5 Styles - White borders with sharp (non-rounded) boxes */
    .layout-5-box {
        width: 48%;
        border: 1px solid #000;
        border-radius: 0;
        padding: 20px;
        box-sizing: border-box;
        overflow: auto;
        white-space: pre-line;
        font-size: 12px;
        line-height: 1.5;
        text-align: justify;
    }
    
    .solution-footer {
        position: absolute;
        width: 100%;
        text-align: center;
        bottom: 20px;
        left: 0;
        padding-bottom: 20px;
        box-sizing: border-box;
    }
    
    .solution-footer-line {
        width: 98%;
        margin: 0 auto 20px;
        border-top: 1px solid #888888;
    }
    
    .solution-footer-text {
        width: 98%;
        min-width: 750px;
        margin: 0 auto;
        text-align: center;
        font-size: 8px;
        color: #1a1a1a;
        font-family: Arial, Helvetica, sans-serif;
        letter-spacing: 0.01em;
        line-height: 1.3;
        font-style: italic;
        box-sizing: border-box;
        max-width: 780px;
        white-space: normal;
        word-wrap: normal;
        padding: 0 5px;
    }
</style>
</head>
<body>
<!-- Cover Page -->
<div class="cover-container">
    <div class="sol-overview-container">
        <div class="sol-overview">
            <div class="sol-overview-top-line"></div>
            ${data.isMultiSolution ? 'Multi-Solution Overview' : 'Solution Overview'}
            <div class="sol-overview-bottom-line"></div>
        </div>
    </div>
    
    <div class="content-section">
        <div class="headline-wrapper">
            <div class="headline-block">
                <div class="date"> <br> ${formattedDate}</div>
                
                <div class="meta-prepared-for">
                    Prepared For:<br>
                    <div class="meta-prepared-for-value">${data.client}</div>
                </div>
                
                <div class="top-line"></div>
                <div class="headline">
                    ${formattedTitle}
                </div>
                <div class="headline-spacer"> </div>
                <div class="bottom-line"></div>
                
                <div class="meta-prepared-by">
                    Prepared By:<br>
                    <p class="meta-prepared-by-name">${data.engineer}</p>
                    <p class="meta-prepared-by-title">Solutions Engineer</p>
                </div>
            </div>
        </div>
    </div>
    <br><br><br>
    <div class="logo-section">
        <img src="data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMzAwIiBoZWlnaHQ9IjEwMCIgdmlld0JveD0iMCAwIDMwMCAxMDAiIGZpbGw9Im5vbmUiIHhtbG5zPSJodHRwOi8vd3d3LnczLm9yZy8yMDAwL3N2ZyI+CjxyZWN0IHdpZHRoPSIzMDAiIGhlaWdodD0iMTAwIiBmaWxsPSIjZmZmZmZmIi8+Cjx0ZXh0IHg9IjE1MCIgeT0iNTUiIGZvbnQtZmFtaWx5PSJBcmlhbCwgc2Fucy1zZXJpZiIgZm9udC1zaXplPSIyNCIgZm9udC13ZWlnaHQ9ImJvbGQiIHRleHQtYW5jaG9yPSJtaWRkbGUiIGZpbGw9IiMwMDAwMDAiPkRSWSBHUk9VTkQgQUk8L3RleHQ+Cjwvc3ZnPgo=" alt="Dry Ground AI Logo" class="logo" />
    </div>
    <br><br>
    <!-- Primary footer that uses running element positioning -->
    <div class="footer-container">
        <div class="footer-line"></div>
        <div class="footer-disclaimer">
            This document and the information contained herein are the confidential and proprietary property of Dry Ground AI. It is intended solely for the use of the recipient(s) and may not be copied, distributed, reproduced, or disclosed—whether in whole or in part—without the express written consent of Dry Ground AI. Unauthorized use, disclosure, or duplication is strictly prohibited. All rights reserved © ${currentYear}.
        </div>
    </div>
</div>

<!-- Solution Pages -->
${data.solutions ? data.solutions.map((solution, index) => generateSolutionPageHTML(solution, index, data, formattedDate)).join('') : ''}

</body>
</html>
`
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

