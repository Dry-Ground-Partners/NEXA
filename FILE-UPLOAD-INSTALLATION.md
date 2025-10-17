# 📦 File Upload Feature - Installation Guide

## Quick Start

### 1. Install Dependencies
```bash
npm install pdf2json mammoth
```

> **Note:** We use `pdf2json` for PDF extraction - it's Node.js-native with no worker dependencies, unlike `pdf-parse` (test file issues) or `pdfjs-dist` (worker issues).

### 2. Test Locally
```bash
npm run dev
```

Navigate to `http://localhost:5000/structuring` and test the upload feature!

---

## Supported File Formats
- ✅ `.pdf` (max 10MB)
- ✅ `.docx` (max 5MB)
- ✅ `.txt` (max 1MB)
- ✅ `.md` (max 1MB)

---

## What Was Implemented
1. **API Route:** `/api/file/extract-text` - Handles file uploads and text extraction
2. **UI Components:** Upload button with loading state
3. **Auto-Diagnose:** Automatically triggers after successful extraction
4. **Error Handling:** Clear error messages for all failure scenarios

---

## Files Changed
- **Created:** `src/app/api/file/extract-text/route.ts`
- **Modified:** `src/app/structuring/page.tsx`

---

## Testing

### Test with sample files:
1. **PDF:** Any text-based PDF document
2. **DOCX:** Any Word document
3. **TXT:** Any plain text file
4. **MD:** Any markdown file

### Expected behavior:
1. Click "Upload File"
2. Select file
3. See "Extracting text..." loading state
4. Success alert with character count
5. Content tab auto-fills
6. Diagnose triggers automatically
7. Pain points and analysis report generated

---

## Deployment to Render
No special configuration needed! Just:
1. Push changes to git
2. Render auto-deploys
3. Dependencies install automatically
4. Feature works in production

---

## Troubleshooting

**Error: Cannot find module 'pdf2json' or 'mammoth'**
- Solution: Run `npm install pdf2json mammoth`

**Error: File too large**
- Solution: File exceeds size limit, compress or split it

**Error: No text found**
- Solution: PDF may be scanned images (needs OCR)

**Error: Worker/test file issues**
- Solution: We use `pdf2json` which avoids both test file issues (pdf-parse) and worker issues (pdfjs-dist)

---

✅ **Ready to test! Just install dependencies and upload a file!**

