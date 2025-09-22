#!/usr/bin/env node

/**
 * Test script to extract and inspect the template that Maestro sees
 * Usage: node test-maestro-template.js <sessionId>
 * Example: node test-maestro-template.js 0af4dd2b-582d-4aaf-84b5-f1979216c266
 */

const fs = require('fs');
const path = require('path');

async function main() {
  const sessionId = process.argv[2];
  const authToken = process.argv[3];
  
  if (!sessionId) {
    console.error('❌ Usage: node test-maestro-template.js <sessionId> [authToken]');
    console.error('❌ Example: node test-maestro-template.js 0af4dd2b-582d-4aaf-84b5-f1979216c266');
    console.error('❌ With auth: node test-maestro-template.js 0af4dd2b-582d-4aaf-84b5-f1979216c266 "your-jwt-token"');
    console.error('');
    console.error('🔑 To get your auth token:');
    console.error('   1. Login to the app in your browser');
    console.error('   2. Open Developer Tools > Application > Cookies');
    console.error('   3. Copy the value of "auth-token" cookie');
    console.error('   4. Use it as the second parameter');
    process.exit(1);
  }
  
  console.log(`🔍 Testing Maestro template extraction for session: ${sessionId}`);
  if (authToken) {
    console.log(`🔑 Using provided auth token: ${authToken.substring(0, 20)}...`);
  } else {
    console.log('⚠️  No auth token provided - will try without authentication');
  }
  
  try {
    // Step 1: Fetch session data from the API
    console.log('📊 Step 1: Fetching session data...');
    
    const headers = {
      'Content-Type': 'application/json'
    };
    
    // Add auth token as cookie if provided
    if (authToken) {
      headers['Cookie'] = `auth-token=${authToken}`;
    }
    
    const sessionResponse = await fetch(`http://localhost:5000/api/sessions/${sessionId}`, {
      method: 'GET',
      headers
    });
    
    if (!sessionResponse.ok) {
      throw new Error(`Failed to fetch session data: ${sessionResponse.status} ${sessionResponse.statusText}`);
    }
    
    const sessionResult = await sessionResponse.json();
    const sessionData = sessionResult.data;
    
    console.log('✅ Session data loaded successfully');
    console.log(`   Title: ${sessionData.basic?.title || 'Untitled'}`);
    console.log(`   Engineer: ${sessionData.basic?.engineer || 'Unknown'}`);
    console.log(`   Solutions: ${Object.keys(sessionData.solutions || {}).length}`);
    
    // Step 2: Extract HTML template using the same API maestro uses
    console.log('🎯 Step 2: Extracting HTML template...');
    
    const templateHeaders = {
      'Content-Type': 'application/json'
    };
    
    // Add auth token as cookie if provided
    if (authToken) {
      templateHeaders['Cookie'] = `auth-token=${authToken}`;
    }
    
    const templateResponse = await fetch('http://localhost:5000/api/solutioning/preview-html', {
      method: 'POST',
      headers: templateHeaders,
      body: JSON.stringify({
        sessionData,
        sessionId
      })
    });
    
    if (!templateResponse.ok) {
      throw new Error(`Failed to extract template: ${templateResponse.status} ${templateResponse.statusText}`);
    }
    
    const htmlTemplate = await templateResponse.text();
    
    console.log('✅ HTML template extracted successfully');
    console.log(`   Template length: ${htmlTemplate.length} characters`);
    
    // Step 3: Analyze the template
    console.log('🔍 Step 3: Analyzing template...');
    
    const analysis = {
      totalLength: htmlTemplate.length,
      hasStylesSection: htmlTemplate.includes('<style>'),
      hasCoverPage: htmlTemplate.includes('cover-container'),
      solutionPages: (htmlTemplate.match(/class="layout-page"/g) || []).length,
      layoutVariants: [],
      hasLogos: htmlTemplate.includes('data:image/png;base64,'),
      hasFooter: htmlTemplate.includes('footer-disclaimer'),
      cssRulesCount: (htmlTemplate.match(/\{[^}]*\}/g) || []).length
    };
    
    // Detect layout variants
    for (let i = 1; i <= 5; i++) {
      if (htmlTemplate.includes(`layout-${i}-`)) {
        analysis.layoutVariants.push(i);
      }
    }
    
    // Step 4: Generate report
    console.log('📝 Step 4: Generating report...');
    
    const timestamp = new Date().toISOString();
    const reportContent = `# Maestro Template Analysis Report

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

This is the EXACT HTML template that gets sent to Maestro for modification:

\`\`\`html
${htmlTemplate}
\`\`\`

## 🎯 Key Template Sections

### CSS Styles
The template includes comprehensive CSS for:
- A4 page layout (794x1122px)
- Cover page styling
- 5 different solution layout variants
- Header/footer positioning
- Typography and spacing

### Cover Page Elements
- Solution/Multi-Solution Overview header
- Title with decorative lines
- Engineer and recipient information
- Date formatting
- Dry Ground AI logo
- Legal disclaimer footer

### Solution Pages
Each solution page includes:
- DG logo header
- Solution divider with metadata
- Title and content based on layout variant
- Solution-specific footer with protocol info

### Layout Variants
${analysis.layoutVariants.map(variant => `- **Layout ${variant}:** ${getLayoutDescription(variant)}`).join('\n')}

## 🔧 Maestro Modification Points

Maestro can modify:
1. **Text Content:** Solution titles, steps, approaches
2. **Styling:** CSS rules for layout, colors, spacing
3. **Layout Structure:** HTML elements and their organization
4. **Dynamic Values:** Difficulty percentages, dates, metadata

---

*This report shows exactly what the Maestro AI agent receives for document modification.*
`;

    // Step 5: Save report
    const outputFile = `maestro-template-${sessionId}-${Date.now()}.md`;
    const outputPath = path.join(process.cwd(), outputFile);
    
    fs.writeFileSync(outputPath, reportContent, 'utf8');
    
    console.log('✅ Report generated successfully!');
    console.log(`📁 Output file: ${outputFile}`);
    console.log(`📍 Full path: ${outputPath}`);
    console.log(`📊 Report size: ${reportContent.length.toLocaleString()} characters`);
    
    // Step 6: Display summary
    console.log('\n🎯 SUMMARY:');
    console.log(`   Template Length: ${analysis.totalLength.toLocaleString()} chars`);
    console.log(`   Solution Pages: ${analysis.solutionPages}`);
    console.log(`   Layout Variants: [${analysis.layoutVariants.join(', ')}]`);
    console.log(`   Has Logos: ${analysis.hasLogos ? 'Yes' : 'No'}`);
    console.log(`   CSS Rules: ~${analysis.cssRulesCount}`);
    console.log(`\n📁 Open ${outputFile} to see the full template!`);
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    process.exit(1);
  }
}

function getLayoutDescription(variant) {
  const descriptions = {
    1: 'Default black borders - Image first, then side-by-side boxes',
    2: 'White borders with divisor line - Image first, then side-by-side boxes',
    3: 'Side-by-side boxes first, then image below',
    4: 'Image first (white border), then full-width stacked boxes',
    5: 'Layout 1 structure with white borders and sharp (non-rounded) boxes'
  };
  return descriptions[variant] || 'Unknown layout variant';
}

// Use Node.js built-in modules for HTTP requests
const https = require('https');
const http = require('http');

// Simple fetch polyfill using Node.js built-in modules
if (typeof fetch === 'undefined') {
  global.fetch = async function(url, options = {}) {
    return new Promise((resolve, reject) => {
      const urlObj = new URL(url);
      const isHttps = urlObj.protocol === 'https:';
      const httpModule = isHttps ? https : http;
      
      const reqOptions = {
        hostname: urlObj.hostname,
        port: urlObj.port || (isHttps ? 443 : 80),
        path: urlObj.pathname + urlObj.search,
        method: options.method || 'GET',
        headers: options.headers || {}
      };
      
      const req = httpModule.request(reqOptions, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
          resolve({
            ok: res.statusCode >= 200 && res.statusCode < 300,
            status: res.statusCode,
            statusText: res.statusMessage,
            text: () => Promise.resolve(data),
            json: () => Promise.resolve(JSON.parse(data))
          });
        });
      });
      
      req.on('error', reject);
      
      if (options.body) {
        req.write(options.body);
      }
      
      req.end();
    });
  };
}

main().catch(console.error);
