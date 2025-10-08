# 🔧 PDF Service Diagnostic

**Date:** October 8, 2025  
**Issue:** PDF generation failing with "Unknown error"

---

## 🔍 **WHAT HAPPENED**

```
❌ Solutioning PDF service error: Error: PDF service error: Unknown error
```

**Why:** The error logging was too generic, hiding the actual problem.

---

## ✅ **FIX APPLIED**

Added detailed logging to `src/lib/pdf/pdf-service-client.ts`:
- Logs the exact URL being called
- Logs response status code
- Logs response headers
- Logs the actual error message (JSON or text)
- Shows full error stack

---

## 🧪 **TEST NOW**

### **Step 1: Try to generate PDF again**
Go to your app and try to preview/download a PDF

### **Step 2: Check logs for new detailed output**

**You'll now see:**
```
📄 Calling PDF service: Solutioning PDF
   Service URL: https://nexa-pdf-service.onrender.com
   Endpoint: https://nexa-pdf-service.onrender.com/api/generate-solutioning-pdf
📡 PDF service response: {
  status: 500,
  statusText: 'Internal Server Error',
  ok: false,
  headers: {...}
}
❌ PDF service returned JSON error: { error: "Actual error message here" }
```

---

## 🎯 **COMMON ISSUES & SOLUTIONS**

### **Issue 1: PDF Service is Sleeping (Free Tier)**
**Symptoms:**
```
status: 503
error: "Service Unavailable"
```

**Why:** Render free tier spins down after 15 minutes of inactivity

**Solution:**
1. First request will take 30-60 seconds (service waking up)
2. Try again after waiting
3. Or upgrade to Starter plan ($7/month) for always-on service

---

### **Issue 2: PDF Service Not Deployed**
**Symptoms:**
```
Error: fetch failed
ECONNREFUSED
```

**Why:** PDF service might not be deployed or URL is wrong

**Solution:**
1. Check `PDF_SERVICE_URL` environment variable
2. Visit the URL in browser: `https://nexa-pdf-service.onrender.com/health`
3. Should return: `{"status":"healthy"}`
4. If not, redeploy PDF service

---

### **Issue 3: Python Dependencies Missing**
**Symptoms:**
```
status: 500
error: "ModuleNotFoundError: No module named 'jinja2'"
```

**Why:** PDF service dependencies not installed

**Solution:**
1. Go to Render Dashboard → PDF Service
2. Check build logs for errors
3. Redeploy if needed
4. Verify `requirements.txt` exists in `pdf-service-root/`

---

### **Issue 4: Data Format Error**
**Symptoms:**
```
status: 500
error: "KeyError: 'solutions'"
or: "TypeError: ..."
```

**Why:** Data format doesn't match what PDF service expects

**Solution:**
- The detailed logs will show the exact Python error
- Check that sessionData has required fields
- Check the format matches what the Python script expects

---

### **Issue 5: Image Data Issues**
**Symptoms:**
```
status: 500
error: "Invalid base64 data"
```

**Why:** Logo or diagram images corrupted/invalid

**Solution:**
- Check that mainLogo and secondLogo are valid base64
- Check that solution imageData is valid base64
- Ensure no data URI prefix duplication

---

## 🔍 **DIAGNOSTIC COMMANDS**

### **Check PDF Service Health:**
```bash
curl https://nexa-pdf-service.onrender.com/health
```

**Expected:** `{"status":"healthy","service":"nexa-pdf-generator","weasyprint_version":"62.3"}`

### **Check Environment Variable:**
```bash
# In Render dashboard, check:
PDF_SERVICE_URL=https://nexa-pdf-service.onrender.com
```

### **Test PDF Service Directly:**
```bash
curl -X POST https://nexa-pdf-service.onrender.com/api/generate-solutioning-html \
  -H "Content-Type: application/json" \
  -d '{"sessionData":{"basic":{"title":"Test"},"solutions":{}},"sessionId":"test"}'
```

**Expected:** HTML output (or specific error message)

---

## 📊 **NEXT STEPS**

1. **Try PDF generation again** in your app
2. **Check the logs** - you'll now see detailed error info
3. **Share the new error details** if it still fails

The new logs will tell us exactly what's wrong:
- Is the service reachable?
- What status code did it return?
- What's the actual error message?

---

## 🎯 **LIKELY CAUSE**

Given that this just started happening, most likely:

**Scenario A: Service is Sleeping**
- PDF microservice spun down (15 min inactivity)
- First request wakes it up (slow)
- Subsequent requests work fine

**Scenario B: Recent Deployment Issue**
- Something changed in PDF service
- Check PDF service deployment logs
- Might need to redeploy

**Scenario C: Environment Variable Missing**
- Adding LangSmith env vars might have caused a redeploy
- PDF_SERVICE_URL might have been lost
- Check Render environment variables

---

## ✅ **WHAT'S FIXED**

**Before:**
```
❌ PDF service error: Unknown error
(No details, can't debug)
```

**After:**
```
📄 Calling PDF service: Solutioning PDF
   Service URL: https://...
📡 PDF service response: { status: 500, ... }
❌ PDF service returned error: "ModuleNotFoundError: ..."
   Error message: ...
   Error stack: ...
(Full details for debugging)
```

---

**Test now and share the new detailed logs!** 🔍
