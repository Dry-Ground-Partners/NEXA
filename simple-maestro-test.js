#!/usr/bin/env node

const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');

async function testMaestroTemplate(sessionId) {
  console.log(`🔍 Testing Maestro template for session: ${sessionId}`);
  
  if (!sessionId) {
    console.error('❌ Please provide a session ID as argument');
    process.exit(1);
  }
  
  try {
    // Mock session data for testing (replace with actual session data when available)
    const mockSessionData = {
      basic: {
        title: "AI-Powered Document Management System",
        engineer: "Mauricio Dry Ground",
        recipient: "Test Client",
        date: "2024-01-15"
      },
      solutions: {
        "1": {
          structure: {
            title: "Data Processing Pipeline",
            steps: "1. Ingest documents\n2. Process with AI\n3. Store in database\n4. Generate insights",
            approach: "We will use cloud-native architecture with microservices to ensure scalability and reliability.",
            difficulty: 3,
            layout: 1
          },
          additional: {
            imageData: null
          }
        },
        "2": {
          structure: {
            title: "User Interface Design",
            steps: "1. Design wireframes\n2. Create prototypes\n3. User testing\n4. Final implementation",
            approach: "Modern React-based interface with responsive design and accessibility features.",
            difficulty: 2,
            layout: 2
          },
          additional: {
            imageData: null
          }
        }
      }
    };
    
    console.log('📊 Mock session data prepared');
    console.log(`   Title: ${mockSessionData.basic.title}`);
    console.log(`   Solutions: ${Object.keys(mockSessionData.solutions).length}`);
    
    // Call the Python script directly to generate HTML
    console.log('🎯 Calling Python script to generate HTML template...');
    
    const htmlTemplate = await callPythonScript(mockSessionData, sessionId);
    
    if (!htmlTemplate) {
      throw new Error('Failed to generate HTML template');
    }
    
    console.log('✅ HTML template generated successfully');
    console.log(`   Template length: ${htmlTemplate.length} characters`);
    
    // Analyze the template
    const analysis = analyzeTemplate(htmlTemplate);
    
    // Generate report
    const report = generateReport(sessionId, mockSessionData, htmlTemplate, analysis);
    
    // Save to file
    const outputFile = `maestro-template-${sessionId}-${Date.now()}.md`;
    fs.writeFileSync(outputFile, report, 'utf8');
    
    console.log('✅ Report generated successfully!');
    console.log(`📁 Output file: ${outputFile}`);
    console.log(`📊 Template length: ${htmlTemplate.length.toLocaleString()} characters`);
    console.log(`📄 Solution pages: ${analysis.solutionPages}`);
    console.log(`🎨 Layout variants: [${analysis.layoutVariants.join(', ')}]`);
    
    return outputFile;
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    throw error;
  }
}

async function callPythonScript(sessionData, sessionId) {
  return new Promise((resolve, reject) => {
    const pythonData = {
      basic: sessionData.basic,
      solutions: Object.values(sessionData.solutions || {}).map((solution, index) => ({
        title: solution.structure?.title || `Solution ${index + 1}`,
        steps: solution.structure?.steps || '',
        approach: solution.structure?.approach || '',
        difficulty: solution.structure?.difficulty || 0,
        layout: solution.structure?.layout || 1,
        imageData: solution.additional?.imageData || null
      })),
      sessionProtocol: sessionId.split('-')[0].toUpperCase()
    };
    
    const scriptPath = path.join(__dirname, 'pdf-service', 'generate_solutioning_html.py');
    console.log(`🐍 Python script path: ${scriptPath}`);
    
    const python = spawn('python3', [scriptPath], {
      stdio: ['pipe', 'pipe', 'pipe']
    });
    
    let htmlOutput = '';
    let errorOutput = '';
    
    python.stdout.on('data', (data) => {
      htmlOutput += data.toString();
    });
    
    python.stderr.on('data', (data) => {
      errorOutput += data.toString();
      console.log('🐍 Python stderr:', data.toString().trim());
    });
    
    python.on('close', (code) => {
      if (code === 0 && htmlOutput.trim()) {
        resolve(htmlOutput);
      } else {
        reject(new Error(`Python script failed with code ${code}: ${errorOutput}`));
      }
    });
    
    python.on('error', (error) => {
      reject(new Error(`Failed to start Python process: ${error.message}`));
    });
    
    // Send data to Python script
    python.stdin.write(JSON.stringify(pythonData));
    python.stdin.end();
  });
}

function analyzeTemplate(htmlTemplate) {
  return {
    totalLength: htmlTemplate.length,
    hasStylesSection: htmlTemplate.includes('<style>'),
    hasCoverPage: htmlTemplate.includes('cover-container'),
    solutionPages: (htmlTemplate.match(/class="layout-page"/g) || []).length,
    layoutVariants: [1, 2, 3, 4, 5].filter(i => htmlTemplate.includes(`layout-${i}-`)),
    hasLogos: htmlTemplate.includes('data:image/png;base64,'),
    hasFooter: htmlTemplate.includes('footer-disclaimer'),
    cssRulesCount: (htmlTemplate.match(/\{[^}]*\}/g) || []).length,
    hasJinjaTemplating: htmlTemplate.includes('{{') || htmlTemplate.includes('{%'),
    pageBreaks: (htmlTemplate.match(/page-break/g) || []).length
  };
}

function generateReport(sessionId, sessionData, htmlTemplate, analysis) {
  const timestamp = new Date().toISOString();
  
  return `# Maestro Template Analysis Report

**Generated:** ${timestamp}  
**Session ID:** ${sessionId}  
**Session Title:** ${sessionData.basic?.title || 'Untitled'}  

## 📊 Template Analysis

- **Total Length:** ${analysis.totalLength.toLocaleString()} characters
- **Has Styles Section:** ${analysis.hasStylesSection ? '✅ Yes' : '❌ No'}
- **Has Cover Page:** ${analysis.hasCoverPage ? '✅ Yes' : '❌ No'}
- **Solution Pages:** ${analysis.solutionPages}
- **Layout Variants Detected:** [${analysis.layoutVariants.join(', ')}]
- **Has Embedded Logos:** ${analysis.hasLogos ? '✅ Yes' : '❌ No'}
- **Has Footer:** ${analysis.hasFooter ? '✅ Yes' : '❌ No'}
- **CSS Rules Count:** ~${analysis.cssRulesCount}
- **Has Jinja Templating:** ${analysis.hasJinjaTemplating ? '✅ Yes (template variables)' : '❌ No (rendered)'}
- **Page Break Rules:** ${analysis.pageBreaks}

## 🎯 Session Data Summary

\`\`\`json
{
  "basic": {
    "title": "${sessionData.basic?.title || 'N/A'}",
    "engineer": "${sessionData.basic?.engineer || 'N/A'}",
    "recipient": "${sessionData.basic?.recipient || 'N/A'}",
    "date": "${sessionData.basic?.date || 'N/A'}"
  },
  "solutions_count": ${Object.keys(sessionData.solutions || {}).length},
  "session_protocol": "${sessionId.split('-')[0].toUpperCase()}"
}
\`\`\`

## 📄 Solutions Overview

${Object.entries(sessionData.solutions || {}).map(([key, solution], index) => `
### Solution ${index + 1}: ${solution.structure?.title || 'Untitled'}
- **Layout:** ${solution.structure?.layout || 1}
- **Difficulty:** ${solution.structure?.difficulty || 0}%
- **Steps Length:** ${(solution.structure?.steps || '').length} chars
- **Approach Length:** ${(solution.structure?.approach || '').length} chars
- **Has Image:** ${solution.additional?.imageData ? '✅ Yes' : '❌ No'}
`).join('')}

## 🎭 What Maestro Sees

This is the EXACT HTML template that gets sent to Maestro for modification.

**Key Observations:**
- Template is ${analysis.hasJinjaTemplating ? 'NOT YET RENDERED (contains Jinja2 variables)' : 'FULLY RENDERED (ready for maestro)'}
- Contains ${analysis.solutionPages} solution page(s)
- Uses layout variants: [${analysis.layoutVariants.join(', ')}]
- Includes ${analysis.cssRulesCount} CSS rules for styling

### Template Structure
1. **Document Head**: CSS styles and meta information
2. **Cover Page**: Title, engineer, recipient, logo, legal disclaimer
3. **Solution Pages**: Each with header, content, and footer
4. **Layout Variants**: Different arrangements based on solution.layout value

### CSS Classes of Interest
- \`.cover-container\`: Main cover page layout
- \`.layout-page\`: Individual solution pages
- \`.layout-X-*\`: Specific styling for each layout variant
- \`.solution-title\`: Solution titles
- \`.layout-X-box\`: Content boxes for steps/approach

\`\`\`html
${htmlTemplate}
\`\`\`

---

*This report shows exactly what the Maestro AI agent receives for document modification.*
*The template ${analysis.hasJinjaTemplating ? 'contains Jinja2 variables that need rendering' : 'is fully rendered and ready for AI modification'}.*
`;
}

// Run the test
const sessionId = process.argv[2];
testMaestroTemplate(sessionId)
  .then(outputFile => {
    console.log(`\n🎉 Success! Check the file: ${outputFile}`);
  })
  .catch(error => {
    console.error('\n💥 Failed:', error.message);
    process.exit(1);
  });

