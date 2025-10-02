# 🚀 RENDER DEPLOYMENT - QUICK GUIDE

## ✅ STATUS: READY TO DEPLOY

All fixes applied! Build tested locally and passed.

---

## 📋 DEPLOY IN 3 STEPS

### **STEP 1: Push to GitHub** (2 min)

```bash
git add .
git commit -m "fix: Render deployment compatibility"
git push origin nexa-for-render
```

---

### **STEP 2: Configure Render** (5 min)

**Go to Render Dashboard → New Web Service**

**Environment Variables (REQUIRED):**
```
DATABASE_URL=postgresql://user:pass@host:5432/db
JWT_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_SECRET=<generate with: openssl rand -base64 32>
NEXTAUTH_URL=https://your-app.onrender.com
OPENAI_API_KEY=sk-...
LANGCHAIN_API_KEY=lsv2_...
LANGCHAIN_PROJECT=NEXA
LANGCHAIN_TRACING_V2=true
NEXT_PUBLIC_DRAWIO_URL=https://app.diagrams.net
NODE_ENV=production
```

**Build Settings:**
- Build Command: `npm install && npm run build`
- Start Command: `npm run start`
- Health Check: `/api/health`

---

### **STEP 3: Deploy** (5-10 min)

Click **"Create Web Service"**

Watch the logs. You should see:
```
✅ npm install
✅ prisma generate
✅ next build
✅ Compiled successfully
✅ Server started
```

---

## 🧪 TEST DEPLOYMENT

```bash
# Health check
curl https://your-app.onrender.com/api/health

# Should return:
{"status":"ok","timestamp":"...","environment":"production","service":"NEXA Platform"}
```

---

## ⚠️ IF ERRORS OCCUR

**Common issues & fixes:**

| Error | Fix |
|-------|-----|
| Missing env vars | Add to Render dashboard |
| Database connection | Check DATABASE_URL format |
| Build timeout | Increase build timeout in Render |
| Port errors | Render auto-sets PORT (no action needed) |

**See full troubleshooting:** `RENDER-DEPLOYMENT-FIXES-APPLIED.md`

---

## 🎉 SUCCESS!

If health check returns "ok", you're live! 🚀

Test the full app at: `https://your-app.onrender.com`

---

**Questions?** See `RENDER-DEPLOYMENT-FIXES-APPLIED.md` for detailed guide.

