# 🔥 HOTFIX: WeasyPrint Version Compatibility

## Issue

After deploying the PDF microservice, you may encounter:
```
TypeError: PDF.__init__() takes 1 positional argument but 3 were given
```

## Root Cause

Version incompatibility between WeasyPrint and its dependency `pydyf`. 

WeasyPrint 60.1 uses an older pydyf API, but Render may install a newer incompatible pydyf version automatically.

## Fix Applied

Updated `requirements.txt` with compatible versions:

```txt
Flask==3.0.0
weasyprint==62.3        # ← Updated from 60.1
pydyf==0.10.0           # ← Pinned compatible version
Jinja2==3.1.2
gunicorn==21.2.0
python-dotenv==1.0.0
Pillow==10.1.0          # ← Added for image handling
```

## How to Apply

1. **Commit the updated `requirements.txt`**
2. **Redeploy the PDF service** (Render Dashboard → Manual Deploy)
3. **Wait for build to complete** (~2-3 minutes)
4. **Test** - Try the Hyper-Canvas refresh again

## Verification

After redeployment, check the PDF service logs. You should see:
```
2025-10-06 XX:XX:XX - app - INFO - Generating Solutioning PDF from structured data
2025-10-06 XX:XX:XX - app - INFO - Solutioning PDF generated successfully, size: XXXXX bytes
127.0.0.1 - - [06/Oct/2025:XX:XX:XX +0000] "POST /api/generate-solutioning-pdf HTTP/1.1" 200 XXXXX "-" "node"
```

No more `TypeError` errors!

## Alternative: Use Existing Python Setup

If you prefer, you could also just fix the empty `pdf-service/requirements.txt` file that already exists in your project and keep using the Python subprocess approach temporarily. But the microservice approach is cleaner and more reliable for Render.
