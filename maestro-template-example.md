# Maestro Template Analysis - Example

**Generated:** 2024-12-19 16:30:00  
**Session ID:** 0af4dd2b-582d-4aaf-84b5-f1979216c266  
**Purpose:** Show you exactly what template maestro receives  

## 🎯 What This Script Does

The test script I created (`test-maestro-template.js`) will:

1. **Fetch session data** from your API using the session ID
2. **Extract the HTML template** using the same API maestro uses (`/api/solutioning/preview-html`)
3. **Analyze the template** to understand its structure
4. **Generate a detailed report** showing exactly what maestro sees

## 📊 Expected Template Analysis

When you run:
```bash
node test-maestro-template.js 0af4dd2b-582d-4aaf-84b5-f1979216c266
```

You'll get a report showing:

### Template Characteristics
- **Length:** ~50,000-100,000+ characters
- **Structure:** Complete HTML document with embedded CSS
- **Cover Page:** Title, engineer, recipient, logos
- **Solution Pages:** 1+ pages depending on your solutions
- **Layout Variants:** Different CSS classes based on solution.layout (1-5)
- **Embedded Assets:** Base64-encoded logos and images

### CSS Analysis  
- **A4 Page Layout:** 794px × 1122px dimensions
- **Page Breaks:** Automatic pagination
- **Layout Classes:** `.layout-1-box`, `.layout-2-box`, etc.
- **Typography:** Arial/Helvetica font families
- **Responsive Elements:** Flexbox layouts for content

### Content Structure
```html
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>PDF Report</title>
  <style>
    /* ~500+ lines of CSS for layouts, typography, A4 formatting */
  </style>
</head>
<body>
  <!-- Cover Page -->
  <div class="cover-container">
    <!-- Title, engineer, recipient, logo, legal disclaimer -->
  </div>
  
  <!-- Solution Pages (one per solution) -->
  <div class="layout-page">
    <!-- Header, title, content boxes, footer -->
  </div>
</body>
</html>
```

## 🎭 How Maestro Uses This

When maestro receives this template, it can:

1. **Modify text content** in solution titles, steps, approaches
2. **Adjust CSS styling** for colors, spacing, layouts
3. **Restructure HTML elements** for different presentations
4. **Change layout variants** by modifying CSS classes
5. **Update metadata** like difficulty percentages or dates

## 🔧 To Actually Run the Test

Make sure your dev server is running (`npm run dev`) then:

```bash
# Basic test with mock data
node quick-template-test.js

# Full test with real session data  
node test-maestro-template.js 0af4dd2b-582d-4aaf-84b5-f1979216c266

# Or manually test the Python script
echo '{"basic":{"title":"Test"},"solutions":[],"sessionProtocol":"TEST"}' | python3 pdf-service/generate_solutioning_html.py > test-output.html
```

## 🎯 Expected Output

The script will generate a `.md` file containing:
- Complete template analysis
- Your session data summary  
- The full HTML template that maestro receives
- Detailed breakdown of CSS classes and structure

This gives you 100% visibility into what maestro sees and can modify!

---

**Note:** If the scripts aren't working due to environment issues, you can also manually trigger the template extraction by calling the API directly once your server is running.

