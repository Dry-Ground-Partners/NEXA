# NEXA PDF Generation Microservice

## Overview

Separate Python microservice for PDF generation using WeasyPrint + Jinja2.  
Deployed independently from main NEXA Next.js app.

## Architecture

```
Main NEXA App (Next.js) → HTTP Request → PDF Microservice (Python/Flask) → WeasyPrint → PDF
```

## Local Development

### Prerequisites
- Python 3.11+
- System dependencies for WeasyPrint:
  - Cairo
  - Pango
  - GDK-Pixbuf

### Install Dependencies

```bash
cd pdf-service-root
pip install -r requirements.txt
```

### Run Locally

```bash
python app.py
```

Server runs on `http://localhost:5000`

## API Endpoints

### Health Check
```
GET /health
```

### Generate PDF from HTML
```
POST /api/generate-pdf
Content-Type: application/json

{
  "htmlTemplate": "<html>...</html>"
}

Returns: PDF binary
```

### Generate Solutioning PDF
```
POST /api/generate-solutioning-pdf
Content-Type: application/json

{
  "sessionData": { ... },
  "sessionId": "...",
  "mainLogo": "base64...",
  "secondLogo": "base64..."
}

Returns: PDF binary
```

### Generate SOW PDF
```
POST /api/generate-sow-pdf
Content-Type: application/json

{ SOW data structure }

Returns: PDF binary
```

### Generate LOE PDF
```
POST /api/generate-loe-pdf
Content-Type: application/json

{ LOE data structure }

Returns: PDF binary
```

## Render Deployment

### Option 1: Render Dashboard

1. Go to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. **Root Directory:** `pdf-service-root`
5. **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
6. **Start Command:** `gunicorn app:app`
7. **Environment:** `Python 3`
8. Add environment variable:
   - `ALLOWED_ORIGIN` = `https://nexa-tlje.onrender.com`

### Option 2: Render Blueprint

```bash
cd pdf-service-root
render blueprint launch
```

## Environment Variables

- `PORT` - Server port (default: 5000, Render sets this automatically)
- `ALLOWED_ORIGIN` - Main app URL for CORS (e.g., https://nexa-tlje.onrender.com)

## Integration with Main App

Update main NEXA app API routes to call this service:

```typescript
// In Next.js API routes
const PDF_SERVICE_URL = process.env.PDF_SERVICE_URL || 'http://localhost:5000'

const response = await fetch(`${PDF_SERVICE_URL}/api/generate-pdf`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ htmlTemplate })
})

const pdfBlob = await response.blob()
```

## Production Checklist

- [ ] Deploy PDF microservice to Render
- [ ] Note the service URL (e.g., `https://nexa-pdf-service.onrender.com`)
- [ ] Add `PDF_SERVICE_URL` environment variable to main NEXA app
- [ ] Update all PDF generation API routes in main app
- [ ] Test all PDF workflows (Solutioning, SOW, LOE)
- [ ] Verify CORS configuration

## Notes

- WeasyPrint requires system dependencies (Cairo, Pango) which are pre-installed in Render's Python environment
- Service uses Gunicorn for production
- CORS is configured to allow requests from main NEXA app
- Health check endpoint at `/health` for Render monitoring
