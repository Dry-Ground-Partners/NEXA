const fs = require('fs');
const { spawn } = require('child_process');

// Simple test that writes directly to file
const testData = {
  basic: {
    title: "Test Project for Maestro Analysis",
    engineer: "Test Engineer", 
    recipient: "Test Client",
    date: "2024-01-15"
  },
  solutions: [
    {
      title: "Solution 1: Data Processing",
      steps: "1. Collect data\n2. Process with AI\n3. Generate insights",
      approach: "Cloud-native microservices architecture",
      difficulty: 3,
      layout: 1,
      imageData: null
    },
    {
      title: "Solution 2: User Interface",  
      steps: "1. Design wireframes\n2. Build components\n3. Test usability",
      approach: "React-based responsive design",
      difficulty: 2,
      layout: 2,
      imageData: null
    }
  ],
  sessionProtocol: "0AF4DD2B"
};

console.log('🔍 Generating template for maestro analysis...');

const python = spawn('python3', ['pdf-service/generate_solutioning_html.py'], {
  stdio: ['pipe', 'pipe', 'pipe']
});

let output = '';
let errors = '';

python.stdout.on('data', (data) => {
  output += data.toString();
});

python.stderr.on('data', (data) => {
  errors += data.toString();
});

python.on('close', (code) => {
  console.log(`Python process exited with code: ${code}`);
  
  if (code === 0 && output.length > 0) {
    const outputFile = `maestro-template-test-${Date.now()}.md`;
    
    const analysis = {
      length: output.length,
      hasStyles: output.includes('<style>'),
      hasCover: output.includes('cover-container'),
      solutionPages: (output.match(/layout-page/g) || []).length,
      layouts: [],
      hasLogos: output.includes('data:image/png;base64,')
    };
    
    for (let i = 1; i <= 5; i++) {
      if (output.includes(`layout-${i}-`)) {
        analysis.layouts.push(i);
      }
    }
    
    const report = `# Maestro Template Test Analysis

Generated: ${new Date().toISOString()}

## Analysis Results

- **Template Length:** ${analysis.length.toLocaleString()} characters
- **Has CSS Styles:** ${analysis.hasStyles ? 'Yes' : 'No'}  
- **Has Cover Page:** ${analysis.hasCover ? 'Yes' : 'No'}
- **Solution Pages:** ${analysis.solutionPages}
- **Layout Variants:** [${analysis.layouts.join(', ')}]
- **Has Embedded Logos:** ${analysis.hasLogos ? 'Yes' : 'No'}

## Test Data Used

\`\`\`json
${JSON.stringify(testData, null, 2)}
\`\`\`

## Generated HTML Template

This is what Maestro receives for modification:

\`\`\`html
${output}
\`\`\`

## Key Template Sections

### CSS Styles
The template includes comprehensive A4 page layout CSS with multiple layout variants.

### Cover Page
Includes title, engineer info, recipient, date, and logo with legal disclaimer.

### Solution Pages  
Each solution gets its own page with:
- Header with DG logo
- Solution title and metadata
- Content boxes for steps/approach (layout dependent)
- Footer with protocol information

### Layout Variants Detected
${analysis.layouts.map(l => `- Layout ${l}: Uses layout-${l}- CSS classes`).join('\n')}

---

**This is the EXACT template Maestro sees and can modify.**
`;

    fs.writeFileSync(outputFile, report);
    console.log(`✅ Report saved to: ${outputFile}`);
    console.log(`📊 Template length: ${analysis.length} characters`);
    console.log(`📄 Solution pages: ${analysis.solutionPages}`);
    console.log(`🎨 Layout variants: [${analysis.layouts.join(', ')}]`);
    
  } else {
    console.error(`❌ Python script failed with code: ${code}`);
    console.error(`❌ Errors: ${errors}`);
    
    // Save error info
    fs.writeFileSync(`maestro-test-error-${Date.now()}.txt`, `
Python exit code: ${code}
Errors: ${errors}
Output length: ${output.length}
Output preview: ${output.substring(0, 500)}
`);
  }
});

python.stdin.write(JSON.stringify(testData));
python.stdin.end();

