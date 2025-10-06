# 🚀 PDF Microservice - Quick Start

## Deploy in 5 Minutes

### Step 1: Deploy PDF Service
1. Go to Render Dashboard: https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repo
4. Configure:
   - **Name:** `nexa-pdf-service`
   - **Root Directory:** `pdf-service-root` ⚠️
   - **Environment:** `Python 3`
   - **Build Command:** `pip install --upgrade pip && pip install -r requirements.txt`
   - **Start Command:** `gunicorn app:app`
   - **Instance Type:** Starter or Free

5. Add Environment Variable:
   - `ALLOWED_ORIGIN` = `https://nexa-tlje.onrender.com`

6. Deploy!

### Step 2: Get Service URL
After deployment completes, copy the service URL:
```
https://nexa-pdf-service-XXXX.onrender.com
```

### Step 3: Update Main App
Go to your main NEXA service → Environment → Add:
- Key: `PDF_SERVICE_URL`
- Value: `https://nexa-pdf-service-XXXX.onrender.com` (paste the URL from Step 2)

### Step 4: Redeploy Main App
The main app needs to restart to pick up the new environment variable.
Click "Manual Deploy" → "Deploy latest commit"

### Step 5: Test
Visit your NEXA app and try generating a PDF!

## Verify It Works

Test the PDF service directly:
```bash
curl https://nexa-pdf-service-XXXX.onrender.com/health
```

Should return:
```json
{
  "status": "healthy",
  "service": "nexa-pdf-generator",
  "weasyprint_version": "60.1"
}
```

## Troubleshooting

**Build fails:**
- Verify Root Directory is `pdf-service-root`
- Check build logs for specific errors

**Service is slow/unresponsive:**
- Free tier spins down after 15 min
- Upgrade to Starter plan for always-on

**Main app can't connect:**
- Verify `PDF_SERVICE_URL` is set correctly (no trailing slash)
- Check both services are running
- Review main app logs for connection errors

## Local Development

```bash
cd pdf-service-root
pip install -r requirements.txt
python app.py
```

Then set in main app:
```bash
export PDF_SERVICE_URL=http://localhost:5000
npm run dev
```

Done! 🎉
