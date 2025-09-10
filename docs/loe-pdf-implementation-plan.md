# LOE PDF Implementation Plan

## Overview

This document outlines the plan to implement PDF preview and download functionality for the `/loe` page using the same WeasyPrint approach successfully implemented for the SOW page.

## Current LOE Page Analysis

### Existing Structure

The LOE page already has:
- ✅ PDF buttons (Preview PDF/Download PDF) positioned in Variations tab
- ✅ Loading states for PDF operations (`loadingStates.previewing`, `loadingStates.generating`)
- ✅ Handlers (`handlePreviewPDF`, `handleGeneratePDF`) - but likely non-functional
- ✅ Complete data structure with all sections

### LOE Data Structure

Based on analysis of `/loe/page.tsx`, the data structure includes:

```typescript
interface LOEData {
  info: {
    project: string
    client: string  
    preparedBy: string
    date: string
  }
  workstreams: {
    overview: string
    workstreams: Array<{
      id: number
      workstream: string
      activities: string
      duration: number
    }>
  }
  resources: {
    resources: Array<{
      id: number
      role: string
      personWeeks: number
      personHours: number
    }>
    buffer: {
      weeks: number
      hours: number
    }
  }
  assumptions: {
    assumptions: Array<{
      id: number
      text: string
    }>
  }
  variations: {
    goodOptions: Array<{
      id: number
      feature: string
      hours: number
      weeks: number
    }>
    bestOptions: Array<{
      id: number
      feature: string
      hours: number
      weeks: number
    }>
  }
}
```

## Implementation Plan

### Phase 1: Python Script Creation

**File**: `pdf-service/generate_loe_standalone.py`

**Based on**: Exact copy from `pdf_generator.py` lines 1150-1683 (`generate_loe_pdf_document`)

**Key Components**:
1. **Stdin/Stdout Pattern**: Follow SOW script pattern
2. **Logo Handling**: Base64 embedding from `public/dg.png`
3. **Date Formatting**: Convert YYYY-MM-DD to "Month DD, YYYY"
4. **Calculations**: Total weeks/hours, Good/Best option calculations
5. **Template Rendering**: Jinja2 with all variables

**Data Transformation Requirements**:
```python
# Expected input format (from LOE page):
{
  "basic": {
    "project": "...",
    "client": "...", 
    "prepared_by": "...",
    "date": "..."
  },
  "overview": "...",
  "workstreams": [...],
  "resources": [...],
  "buffer": {...},
  "assumptions": [...],
  "goodOptions": [...],
  "bestOptions": [...]
}
```

### Phase 2: Next.js API Routes

**Files to Create**:
- `src/app/api/loe/preview-pdf/route.ts`
- `src/app/api/loe/generate-pdf/route.ts`

**Data Mapping** (LOE page → Python script):
```javascript
const pythonData = {
  basic: {
    project: loeData.info?.project || 'Untitled LOE',
    client: loeData.info?.client || 'Unknown Client',
    prepared_by: loeData.info?.preparedBy || 'Unknown Engineer',
    date: loeData.info?.date || new Date().toISOString().split('T')[0]
  },
  overview: loeData.workstreams?.overview || '',
  workstreams: loeData.workstreams?.workstreams || [],
  resources: loeData.resources?.resources || [],
  buffer: loeData.resources?.buffer || { weeks: 0, hours: 0 },
  assumptions: (loeData.assumptions?.assumptions || []).map(a => a.text).filter(Boolean),
  goodOptions: loeData.variations?.goodOptions || [],
  bestOptions: loeData.variations?.bestOptions || []
}
```

### Phase 3: Frontend Integration

**File**: `src/app/loe/page.tsx`

**Current Status**: PDF buttons exist but handlers need implementation

**Required Changes**:

1. **Update Import**:
```typescript
// Already imported: FileText, Download, RotateCw
```

2. **Update Handlers**:
```typescript
const handlePreviewPDF = async () => {
  if (!loeData) return
  setLoadingStates(prev => ({ ...prev, previewing: true }))
  
  try {
    const response = await fetch('/api/loe/preview-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loeData })
    })
    
    if (response.ok) {
      const pdfBlob = await response.blob()
      const pdfUrl = URL.createObjectURL(pdfBlob)
      window.open(pdfUrl, '_blank')
    } else {
      alert('Failed to generate PDF preview. Please try again.')
    }
  } catch (error) {
    alert('Error generating PDF preview. Please try again.')
  } finally {
    setLoadingStates(prev => ({ ...prev, previewing: false }))
  }
}

const handleGeneratePDF = async () => {
  if (!loeData) return
  setLoadingStates(prev => ({ ...prev, generating: true }))
  
  try {
    const response = await fetch('/api/loe/generate-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ loeData })
    })
    
    if (response.ok) {
      const pdfBlob = await response.blob()
      const url = URL.createObjectURL(pdfBlob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `LOE_${loeData.info.project || 'Document'}_${new Date().toISOString().split('T')[0]}.pdf`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      URL.revokeObjectURL(url)
    } else {
      alert('Failed to generate PDF download. Please try again.')
    }
  } catch (error) {
    alert('Error generating PDF download. Please try again.')
  } finally {
    setLoadingStates(prev => ({ ...prev, generating: false }))
  }
}
```

3. **Update Button Styling** (match SOW/solutioning):
```typescript
<Button
  onClick={handlePreviewPDF}
  disabled={loadingStates.previewing}
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0 bg-blue-900/40 border-blue-600 text-blue-200 hover:bg-blue-800/60"
  title="Preview PDF"
>
  {loadingStates.previewing ? (
    <RotateCw className="h-4 w-4 animate-spin" />
  ) : (
    <FileText className="h-4 w-4" />
  )}
</Button>

<Button
  onClick={handleGeneratePDF}
  disabled={loadingStates.generating}
  variant="outline"
  size="sm"
  className="h-8 w-8 p-0 bg-green-900/40 border-green-600 text-green-200 hover:bg-green-800/60"
  title="Generate PDF"
>
  {loadingStates.generating ? (
    <RotateCw className="h-4 w-4 animate-spin" />
  ) : (
    <Download className="h-4 w-4" />
  )}
</Button>
```

## Technical Implementation Details

### 1. Python Script Structure

```python
#!/usr/bin/env python3

import json
import sys
import os
import base64
import datetime
from weasyprint import HTML
from jinja2 import Template

def generate_loe_pdf_from_json(loe_data):
    """Generate LOE PDF from JSON data and return PDF bytes."""
    try:
        # Logo handling (same as SOW)
        curr_dir = os.path.dirname(os.path.abspath(__file__))
        dg_logo_path = os.path.join(curr_dir, '../public/dg.png')
        if not os.path.exists(dg_logo_path):
            dg_logo_path = os.path.join(curr_dir, 'dg.png')
        
        dg_logo_base64 = ""
        if os.path.exists(dg_logo_path):
            with open(dg_logo_path, 'rb') as f:
                dg_logo_base64 = base64.b64encode(f.read()).decode('utf-8')
        
        # Date formatting (same as SOW)
        date_str = loe_data.get('basic', {}).get('date', '')
        try:
            date_obj = datetime.datetime.strptime(date_str, '%Y-%m-%d')
            formatted_date = date_obj.strftime('%B %d, %Y')
        except:
            formatted_date = date_str
        
        # Calculations (exact copy from original)
        total_weeks = 0
        total_hours = 0
        # ... calculation logic ...
        
        # HTML Template (exact copy from pdf_generator.py lines 1174-1623)
        html_template = """..."""
        
        # Render and generate PDF
        template = Template(html_template)
        html_content = template.render(
            loe_data=loe_data,
            formatted_date=formatted_date,
            dg_logo_base64=dg_logo_base64,
            total_weeks=total_weeks,
            total_hours=total_hours,
            # ... all calculation variables ...
        )
        
        html_doc = HTML(string=html_content)
        pdf_bytes = html_doc.write_pdf()
        return pdf_bytes
        
    except Exception as e:
        print(f"Error generating PDF: {str(e)}", file=sys.stderr)
        return None

def main():
    try:
        input_data = sys.stdin.read()
        loe_data = json.loads(input_data)
        pdf_bytes = generate_loe_pdf_from_json(loe_data)
        
        if pdf_bytes:
            sys.stdout.buffer.write(pdf_bytes)
            sys.exit(0)
        else:
            sys.exit(1)
    except Exception as e:
        print(f"Script error: {str(e)}", file=sys.stderr)
        sys.exit(1)

if __name__ == '__main__':
    main()
```

### 2. API Route Pattern

Both routes follow the exact SOW pattern:
- **Preview**: `Content-Disposition: inline` 
- **Download**: `Content-Disposition: attachment`
- **Subprocess integration**: Same spawn pattern
- **Error handling**: Same error collection and logging

### 3. Data Structure Mapping

**Critical**: The LOE page uses different field names than the original system expects:

| LOE Page Field | Original System Field | Mapping Required |
|---|---|---|
| `info.project` | `basic.project` | ✅ |
| `info.client` | `basic.client` | ✅ |
| `info.preparedBy` | `basic.prepared_by` | ✅ |
| `workstreams.overview` | `overview` | ✅ |
| `workstreams.workstreams` | `workstreams` | ✅ |
| `resources.resources` | `resources` | ✅ |
| `assumptions.assumptions` | `assumptions` | ✅ Extract `.text` |
| `variations.goodOptions` | `goodOptions` | ✅ |
| `variations.bestOptions` | `bestOptions` | ✅ |

## File Structure

```
pdf-service/
├── generate_loe_standalone.py    # NEW: LOE Python script
├── generate_sow_standalone.py    # Existing SOW script
└── pdf_generator.py              # Original reference

src/app/api/loe/                   # NEW: LOE API directory
├── preview-pdf/route.ts           # NEW: Preview route
└── generate-pdf/route.ts          # NEW: Download route

src/app/loe/page.tsx              # UPDATE: Handler functions
```

## Testing Strategy

1. **Python Script Test**:
```bash
echo '{"basic":{"project":"Test","client":"Test",...}}' | python3 pdf-service/generate_loe_standalone.py > test_loe.pdf
```

2. **API Route Test**:
- Fill out LOE form
- Click Preview PDF → new tab opens
- Click Download PDF → file downloads

3. **Validation**:
- All sections render correctly
- Tables with proper styling
- Calculations accurate
- Logo displays
- Page numbering works

## Expected Outcomes

After implementation:
- ✅ LOE PDF preview opens in new tab
- ✅ LOE PDF download with smart filename
- ✅ All sections (Overview, Workstreams, Resources, Assumptions, Options)
- ✅ Professional styling matching original system
- ✅ Accurate calculations for totals and variations
- ✅ Consistent UI with SOW/solutioning pages

## Implementation Priority

1. **High**: Python script with exact template copy
2. **High**: API routes with proper data mapping  
3. **Medium**: Frontend handler updates
4. **Low**: Button styling consistency

This implementation will provide the LOE page with the same high-quality PDF generation capabilities as the SOW page, using the proven WeasyPrint approach.
