# PDF Microservice Troubleshooting

## Build Errors

### Error: `KeyError: '__version__'` when installing Pillow

**Symptom:**
```
Getting requirements to build wheel: finished with status 'error'
KeyError: '__version__'
```

**Cause:**
Older Pillow versions (< 10.4.0) don't support Python 3.13+

**Fix:**
1. Updated `Pillow==10.4.0` in `requirements.txt` (supports Python 3.13)
2. Created `runtime.txt` to pin Python 3.11.9 for stability

**Files:**
- `requirements.txt` - Updated Pillow version
- `runtime.txt` - Pins Python version to 3.11.9

### Error: `TypeError: PDF.__init__() takes 1 positional argument but 3 were given`

**Cause:**
Version incompatibility between WeasyPrint and pydyf

**Fix:**
- `weasyprint==62.3` (latest)
- `pydyf==0.10.0` (compatible version)

## Deployment Issues

### Service won't start

**Check:**
1. Verify Root Directory is set to `pdf-service-root`
2. Check build logs for specific errors
3. Ensure all dependencies installed successfully

### CORS errors from main app

**Check:**
1. `ALLOWED_ORIGIN` environment variable is set correctly
2. No trailing slash in origin URL
3. Main app URL matches exactly

### PDF generation fails

**Check service logs:**
1. Render Dashboard → PDF Service → Logs
2. Look for Python tracebacks
3. Common issues:
   - Missing data in request
   - Invalid HTML template
   - Image data issues

## Testing

### Test health endpoint
```bash
curl https://your-pdf-service.onrender.com/health
```

**Expected:**
```json
{
  "status": "healthy",
  "service": "nexa-pdf-generator",
  "weasyprint_version": "62.3",
  "timestamp": "2025-10-07T..."
}
```

### Test PDF generation
```bash
curl -X POST https://your-pdf-service.onrender.com/api/generate-pdf \
  -H "Content-Type: application/json" \
  -d '{"htmlTemplate": "<html><body><h1>Test</h1></body></html>"}' \
  --output test.pdf
```

## Performance

### Cold starts (Free tier)
- Service spins down after 15 min inactivity
- First request takes 30-60 seconds to wake up
- Subsequent requests are fast

**Solution:** Upgrade to Starter plan ($7/mo) for always-on service

### Slow PDF generation
- Large images can slow down PDF generation
- Complex HTML/CSS takes longer to render
- WeasyPrint is CPU-intensive

**Solution:** 
- Optimize images before sending
- Simplify CSS where possible
- Consider upgrading instance type

## Common Questions

### Q: Can I use a different Python version?

**A:** Yes, edit `runtime.txt` to specify version. Recommended: 3.11.x or 3.12.x

### Q: How do I update dependencies?

**A:** 
1. Edit `requirements.txt`
2. Commit and push
3. Trigger manual deploy in Render Dashboard

### Q: How do I view real-time logs?

**A:** Render Dashboard → PDF Service → Logs (auto-refreshes)

### Q: Can I test locally?

**A:** Yes!
```bash
cd pdf-service-root
python3 -m venv venv
source venv/bin/activate  # or `venv\Scripts\activate` on Windows
pip install -r requirements.txt
python app.py
```

Then set `PDF_SERVICE_URL=http://localhost:5000` in main app.
