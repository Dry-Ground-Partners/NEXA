# WeasyPrint PDF Implementation for SOW Generation

## Overview

This document explains how the SOW PDF generation was implemented using WeasyPrint, including all the technical details that made it work successfully.

## Architecture

```
React Frontend ↔️ Next.js API Routes ↔️ Python Script ↔️ WeasyPrint ↔️ PDF
```

The implementation uses a standalone Python script approach instead of a Flask microservice, which provides better isolation and simpler deployment.

## Technical Stack

- **WeasyPrint v60.1**: Python HTML/CSS to PDF renderer
- **Jinja2**: Template engine for dynamic HTML generation
- **Node.js subprocess**: For calling Python script from Next.js
- **Next.js API Routes**: `/api/sow/preview-pdf` and `/api/sow/generate-pdf`

## Key Components

### 1. Python Script (`pdf-service/generate_sow_standalone.py`)

**Purpose**: Standalone script that reads JSON from stdin and outputs PDF to stdout.

**Key Features**:
- Base64 logo embedding
- Date formatting 
- Dynamic refinement period calculation
- Exact HTML template copy from original system
- Proper error handling with stderr logging

**Critical Implementation Details**:

```python
# Date formatting
try:
    date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d')
    formatted_date = date_obj.strftime('%B %d, %Y')
except:
    formatted_date = date_str

# Logo handling with fallback
dg_logo_path = os.path.join(curr_dir, '../public/dg.png')
if not os.path.exists(dg_logo_path):
    dg_logo_path = os.path.join(curr_dir, 'dg.png')

# WeasyPrint generation
html_doc = HTML(string=html_content)
pdf_bytes = html_doc.write_pdf()
sys.stdout.buffer.write(pdf_bytes)
```

### 2. HTML Template (Exact Copy from Original System)

**Source**: Lines 794-1132 from `pdf_generator.py` → `generate_sow_pdf_document()`

**Critical CSS Features**:
- `@page` rules for A4 size and 2cm margins
- Page numbering with `@bottom-center`
- Proper table styling with borders
- Professional color scheme (`#f5f5f5`, `#666`, `#000`)
- Section styling with uppercase titles

**Key CSS Classes**:
```css
@page {
    size: A4;
    margin: 2cm;
    margin-bottom: 3cm;
    @bottom-center {
        content: "Page " counter(page) " of " counter(pages);
        font-size: 10px;
        color: #666;
    }
}

.deliverables-table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
}

.deliverables-table th {
    background-color: #f5f5f5;
    border: 1px solid #000;
    padding: 8px;
    text-align: left;
    font-weight: bold;
    font-size: 10px;
}
```

### 3. Next.js API Routes

**Preview Route** (`/api/sow/preview-pdf`):
- Returns PDF with `Content-Disposition: inline`
- Opens in new tab for preview

**Download Route** (`/api/sow/generate-pdf`):
- Returns PDF with `Content-Disposition: attachment`
- Automatic filename generation

**Data Transformation**:
```javascript
// Transform SOW session data to match original system structure
const pythonData = {
  project: sessionData.basic?.title || 'Untitled SOW',
  client: sessionData.basic?.client || 'Unknown Client',
  prepared_by: sessionData.basic?.engineer || 'Unknown Engineer',
  
  // Critical: Use original field names
  in_scope_deliverables: (sessionData.scope?.deliverables || []).map(...),
  project_phases_timeline: {
    phases: (sessionData.timeline?.phases || []).map(...)
  }
}
```

### 4. Subprocess Integration

**Implementation**:
```javascript
const python = spawn('python3', [scriptPath], {
  stdio: ['pipe', 'pipe', 'pipe']
})

// Send JSON to stdin
python.stdin.write(JSON.stringify(data))
python.stdin.end()

// Collect PDF from stdout
python.stdout.on('data', (chunk) => {
  chunks.push(chunk)
})
```

## Critical Success Factors

### 1. WeasyPrint Version Compatibility

**Problem**: `PDF.__init__() takes 1 positional argument but 3 were given`

**Solution**: Upgraded WeasyPrint and pydyf packages:
```bash
pip3 install --upgrade weasyprint pydyf
```

**Result**: WeasyPrint v60.1 with compatible pydyf version

### 2. Data Structure Mapping

**Critical**: Field names must match original system exactly:
- `in_scope_deliverables` (not `deliverables`)
- `project_phases_timeline.phases` (not flat `phases`)
- `weeks_display` property for timeline formatting

### 3. Template Accuracy

**Approach**: Direct copy-paste from original `pdf_generator.py`
- No modifications to CSS styling
- Preserved all original colors and spacing
- Maintained exact table structures

### 4. Error Handling

**Python Script**:
```python
try:
    html_doc = HTML(string=html_content)
    pdf_bytes = html_doc.write_pdf()
    return pdf_bytes
except Exception as pdf_error:
    print(f"WeasyPrint error: {str(pdf_error)}", file=sys.stderr)
    return None
```

**Node.js API**:
```javascript
python.on('close', (code) => {
  if (code === 0 && chunks.length > 0) {
    const pdfBuffer = Buffer.concat(chunks)
    resolve(pdfBuffer)
  } else {
    const errorMessage = Buffer.concat(errorChunks).toString()
    reject(new Error(`Python script failed with code: ${code}`))
  }
})
```

## File Structure

```
pdf-service/
├── generate_sow_standalone.py    # Main Python script
├── pdf_generator.py             # Original system reference
└── requirements.txt             # Python dependencies

src/app/api/sow/
├── preview-pdf/route.ts         # Preview API route
└── generate-pdf/route.ts        # Download API route

public/
└── dg.png                       # Logo file
```

## Testing and Validation

**Test Command**:
```bash
echo '{"project":"Test","client":"Test",...}' | python3 pdf-service/generate_sow_standalone.py > test.pdf
```

**Validation**:
- PDF file size: ~65KB for full content
- All sections rendered correctly
- Tables with proper borders and colors
- Page numbering working
- Logo embedding successful

## Advantages of This Approach

1. **Superior pagination**: WeasyPrint handles page breaks perfectly
2. **Exact margins**: 2cm margins with no cutoffs
3. **Professional styling**: Tables, borders, and typography
4. **Template consistency**: Exact copy from original system
5. **Error isolation**: Python script failures don't crash Node.js
6. **Simple deployment**: No additional Flask service needed

## Maintenance Notes

- **Logo path**: Ensure `public/dg.png` exists and is accessible
- **Python dependencies**: Keep WeasyPrint version compatible
- **Template updates**: Always copy from original system for consistency
- **Data mapping**: Maintain field name compatibility with original system

## Performance

- **Generation time**: ~1-2 seconds for full SOW
- **Memory usage**: Minimal (subprocess isolation)
- **File size**: 50-70KB for typical SOW documents
- **Concurrent handling**: Node.js can spawn multiple Python processes

This implementation provides a robust, scalable solution for SOW PDF generation with exact visual fidelity to the original system.
