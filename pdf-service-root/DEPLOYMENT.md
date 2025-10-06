# PDF Microservice Deployment Guide

## Quick Start

### 1. Deploy to Render

**Via Dashboard:**
1. Log in to Render Dashboard
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Configure:
   - **Name:** `nexa-pdf-service`
   - **Region:** Oregon (or same as main app)
   - **Branch:** `main` (or your branch)
   - **Root Directory:** `pdf-service-root` ⚠️ **CRITICAL**
   - **Environment:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Plan:** Starter ($7/month) or Free

5. Add Environment Variable:
   - Key: `ALLOWED_ORIGIN`
   - Value: `https://nexa-tlje.onrender.com` (your main app URL)

6. Click "Create Web Service"

### 2. Get Service URL

After deployment, note the service URL:
```
https://nexa-pdf-service-XXXX.onrender.com
```

### 3. Update Main NEXA App

Add environment variable to main NEXA service:
- Key: `PDF_SERVICE_URL`
- Value: `https://nexa-pdf-service-XXXX.onrender.com`

### 4. Update API Routes

The system is already configured to use `PDF_SERVICE_URL` if available.

Verify these routes use the environment variable:
- `/api/solutioning/preview-pdf`
- `/api/solutioning/generate-pdf`
- `/api/hyper-canvas/template-to-pdf`
- `/api/sow/generate-pdf`
- `/api/loe/generate-pdf`

### 5. Test

Test the health endpoint:
```bash
curl https://nexa-pdf-service-XXXX.onrender.com/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "nexa-pdf-generator",
  "weasyprint_version": "60.1",
  "timestamp": "2025-10-06T..."
}
```

## Troubleshooting

### Service won't start
- Check build logs for missing dependencies
- Verify `requirements.txt` is present
- Ensure Root Directory is set to `pdf-service-root`

### PDF generation fails
- Check service logs in Render Dashboard
- Verify WeasyPrint dependencies installed
- Test HTML template validity

### CORS errors
- Verify `ALLOWED_ORIGIN` matches main app URL exactly
- Check if request includes proper headers
- Review Flask CORS configuration in `app.py`

### Main app can't connect
- Verify `PDF_SERVICE_URL` environment variable is set
- Check service is running (visit health endpoint)
- Ensure no typos in URL

## Cost Considerations

**Free Tier:**
- Service spins down after 15 min inactivity
- First request after spin-down takes 30-60 seconds
- Acceptable for development/low-traffic

**Starter Plan ($7/mo):**
- Always running
- Fast response times
- Recommended for production

## Monitoring

- Health endpoint: `GET /health`
- Render Dashboard: View logs, metrics, deployment history
- Set up alerts for service downtime
