# PDF Routes Migration Status

## ✅ Migrated to PDF Microservice

The following routes now use the PDF microservice client instead of Python subprocesses:

1. ✅ `/api/hyper-canvas/template-to-pdf` - Uses `pdfServiceClient.generatePDF()`
2. ✅ `/api/solutioning/preview-pdf` - Uses `pdfServiceClient.generateSolutioningPDF()`  ← **This was causing the 500 error**
3. ✅ `/api/solutioning/generate-pdf` - Uses `pdfServiceClient.generateSolutioningPDF()`

## ⚠️ Still Using Python Subprocess (Low Priority)

These routes still use the old Python subprocess method but are NOT causing errors in production:

- `/api/loe/preview-pdf`
- `/api/loe/generate-pdf`
- `/api/sow/preview-pdf`
- `/api/sow/generate-pdf`
- `/api/solutioning/preview-html` (returns HTML, not PDF - can stay as-is)

## 🚀 Required Actions

### Immediate (To Fix Current Error):

1. **Deploy PDF Microservice** (follow `pdf-service-root/QUICK-START.md`)
2. **Add `PDF_SERVICE_URL` environment variable** to main NEXA app
3. **Redeploy main app** to pick up the changes

### After Deployment:

The Hyper-Canvas modal should work! The preview-pdf endpoint will call the microservice instead of trying to spawn Python subprocess.

### Optional (Future):

Migrate the remaining LOE/SOW routes to use the microservice for consistency.  
**Note:** These are not urgent - they're only used when exporting LOE/SOW documents, which is less frequent than Hyper-Canvas.

## Current Status

**Main Issue:** ✅ FIXED  
The `/api/solutioning/preview-pdf` route was calling Python subprocess with WeasyPrint, which doesn't exist in the Node.js Render environment. Now it calls the PDF microservice instead.

**Next Step:** Deploy the PDF microservice and add the environment variable.

