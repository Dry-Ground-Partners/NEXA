# PDF Microservice Architecture

## Overview

Separate Python/Flask microservice for all PDF generation in NEXA platform.

## Why Separate Service?

1. **System Dependencies:** WeasyPrint requires Cairo, Pango, GDK-Pixbuf
2. **Render Compatibility:** Node.js environment doesn't include Python dependencies
3. **Isolation:** PDF generation isolated from main app
4. **Scalability:** Can scale independently
5. **Reliability:** Failures don't crash main app

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────┐
│                     NEXA Main App (Next.js)                  │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │  API Routes                                       │       │
│  │  - /api/solutioning/preview-pdf                  │       │
│  │  - /api/hyper-canvas/template-to-pdf             │       │
│  │  - /api/sow/generate-pdf                         │       │
│  │  - /api/loe/generate-pdf                         │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────┐       │
│  │  PDF Service Client (@/lib/pdf/pdf-service-client)│       │
│  │  - generatePDF()                                  │       │
│  │  - generateSolutioningPDF()                       │       │
│  │  - generateSOWPDF()                               │       │
│  │  - generateLOEPDF()                               │       │
│  └──────────────────┬───────────────────────────────┘       │
└────────────────────┼─────────────────────────────────────────┘
                      │
                      │ HTTPS
                      │
┌────────────────────▼─────────────────────────────────────────┐
│         PDF Microservice (Python/Flask/WeasyPrint)           │
│         https://nexa-pdf-service.onrender.com                │
│                                                               │
│  ┌──────────────────────────────────────────────────┐       │
│  │  Flask App (app.py)                              │       │
│  │  - CORS configured for NEXA app                  │       │
│  │  - Gunicorn production server                    │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────┐       │
│  │  API Endpoints                                    │       │
│  │  - POST /api/generate-pdf                        │       │
│  │  - POST /api/generate-solutioning-pdf            │       │
│  │  - POST /api/generate-sow-pdf                    │       │
│  │  - POST /api/generate-loe-pdf                    │       │
│  │  - GET  /health                                  │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────┐       │
│  │  PDF Templates (pdf_templates/)                  │       │
│  │  - solutioning.py                                │       │
│  │  - sow.py                                        │       │
│  │  - loe.py                                        │       │
│  └──────────────────┬───────────────────────────────┘       │
│                     │                                         │
│  ┌──────────────────▼───────────────────────────────┐       │
│  │  WeasyPrint                                      │       │
│  │  - HTML → PDF conversion                        │       │
│  │  - Jinja2 templating                            │       │
│  │  - System deps: Cairo, Pango, GDK-Pixbuf        │       │
│  └──────────────────────────────────────────────────┘       │
│                     │                                         │
│                     ▼                                         │
│                   [PDF]                                       │
└──────────────────────────────────────────────────────────────┘
```

## Communication Flow

### Example: Hyper-Canvas PDF Generation

1. **User Action:** User clicks "Refresh" in Hyper-Canvas modal
2. **Frontend:** React calls `generatePreviewBlob()`
3. **Next.js API:** `/api/solutioning/preview-pdf` receives request
4. **PDF Client:** `pdfServiceClient.generateSolutioningPDF()` called
5. **HTTP Request:** POST to `$PDF_SERVICE_URL/api/generate-solutioning-pdf`
6. **Flask App:** Receives JSON with sessionData
7. **Template:** `solutioning.py` generates HTML from data
8. **WeasyPrint:** Converts HTML to PDF bytes
9. **Response:** PDF bytes returned via HTTP
10. **PDF Client:** Receives Buffer
11. **API Route:** Returns PDF to frontend
12. **Browser:** Displays PDF in iframe

## Data Flow

```
sessionData (JSON) 
  → API Route 
  → PDF Service Client 
  → HTTP POST 
  → Flask App 
  → Template Generator (HTML)
  → WeasyPrint (PDF)
  → Buffer 
  → HTTP Response 
  → API Route 
  → Browser (Blob URL)
```

## Environment Variables

### Main NEXA App
- `PDF_SERVICE_URL` - PDF microservice URL (required for production)

### PDF Microservice
- `PORT` - Server port (Render sets automatically)
- `ALLOWED_ORIGIN` - CORS allowed origin (main app URL)

## Deployment

### Main App (Already Deployed)
- Platform: Render Web Service
- Environment: Node.js
- URL: https://nexa-tlje.onrender.com

### PDF Microservice (New)
- Platform: Render Web Service
- Environment: Python 3
- Root Directory: `pdf-service-root`
- URL: https://nexa-pdf-service-XXXX.onrender.com

## Local Development

### Terminal 1: Main App
```bash
export PDF_SERVICE_URL=http://localhost:5000
npm run dev
```

### Terminal 2: PDF Service
```bash
cd pdf-service-root
pip install -r requirements.txt
python app.py
```

## Benefits

1. **Reliability:** WeasyPrint dependencies isolated
2. **Performance:** Dedicated resources for PDF generation
3. **Scalability:** Can scale PDF service independently
4. **Maintainability:** Clear separation of concerns
5. **Deployment:** No Python dependencies in Node build

## Monitoring

- Health Check: `GET /health`
- Logs: Render Dashboard → PDF Service → Logs
- Metrics: Render Dashboard → PDF Service → Metrics

## Cost

**Free Tier:**
- Spins down after 15 min inactivity
- ~30-60s cold start on first request

**Starter Plan ($7/mo):**
- Always running
- No cold starts
- Recommended for production
