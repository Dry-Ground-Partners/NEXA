# 🎨 NEXA Draw.io Service

**Separate microservice for Draw.io diagram editor**

This folder contains everything needed to deploy Draw.io as a standalone Render Web Service.

---

## 📦 WHAT'S IN THIS FOLDER

```
docker-root/
├── Dockerfile           - Docker configuration (uses official jgraph/drawio image)
├── README.md           - This file (deployment instructions)
├── render.yaml         - Render Blueprint (optional one-click deploy)
└── .dockerignore       - Files to exclude from Docker build
```

---

## 🚀 DEPLOYMENT TO RENDER

### **METHOD 1: Manual Deployment (Recommended First Time)**

#### **Step 1: Create New Web Service**

1. Go to **Render Dashboard**: https://dashboard.render.com
2. Click **"New +" → "Web Service"**
3. Click **"Deploy an existing image from a registry"** OR **"Build and deploy from a Git repository"**

**If using Git repository:**
- Connect your repository
- Click "Connect"

#### **Step 2: Configure Service**

```yaml
Name: nexa-drawio
Region: [Same region as NEXA for lower latency]
Branch: main (or your production branch)

Runtime: Docker
Root Directory: docker-root          ← IMPORTANT!
Dockerfile Path: ./Dockerfile         ← Relative to docker-root

Instance Type:
  - FREE: Free tier (spins down after 15 min, cold start ~30s)
  - STARTER: $7/month (always on, no cold starts)
```

#### **Step 3: Environment Variables**

Add these in Render Dashboard → Environment:

```bash
# Base URL for Draw.io (will be your service URL)
DRAWIO_BASE_URL=https://nexa-drawio.onrender.com

# Optional: Disable analytics/tracking
DRAWIO_GOOGLE_ANALYTICS=false
```

#### **Step 4: Deploy**

1. Click **"Create Web Service"**
2. Wait ~5-10 minutes for first deploy
3. Render will build the Docker image and start the service

#### **Step 5: Verify It Works**

Once deployed, open your service URL (e.g., `https://nexa-drawio.onrender.com`)

You should see the Draw.io editor interface! ✅

---

### **METHOD 2: One-Click Blueprint Deploy**

If you have `render.yaml` in your repo root, you can deploy both services at once:

```yaml
# In main repo root (not docker-root)
services:
  - type: web
    name: nexa
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NEXT_PUBLIC_DRAWIO_URL
        value: https://nexa-drawio.onrender.com
    # ... other NEXA config ...

  - type: web
    name: nexa-drawio
    env: docker
    rootDir: docker-root           ← Points to this folder
    dockerfilePath: ./Dockerfile   ← Relative to rootDir
    envVars:
      - key: DRAWIO_BASE_URL
        value: https://nexa-drawio.onrender.com
```

Then just click "Deploy to Render" button!

---

## 🔧 CONFIGURATION

### **Service URL**

After deployment, Render gives you a URL like:
```
https://nexa-drawio.onrender.com
```

### **Update NEXA to Use This Service**

In your **NEXA service** (main app), add environment variable:

```bash
NEXT_PUBLIC_DRAWIO_URL=https://nexa-drawio.onrender.com
```

Then redeploy NEXA. It will now use your self-hosted Draw.io!

---

## 💰 FREE TIER BEHAVIOR

### **What Happens on Free Tier:**

**Spin Down:**
- Service spins down after **15 minutes of inactivity**
- No requests = dormant to save resources

**Cold Start:**
- First request after spin-down triggers a wake-up
- Takes **~30 seconds to 1 minute** to respond
- Subsequent requests are instant

**What Counts as a Request:**
- Opening the Draw.io editor (loads iframe)
- **NOT:** Dragging shapes, drawing, typing
- **NOT:** Auto-save events (internal postMessage)
- **ONLY:** HTTP requests to the Draw.io service

So once the editor loads, you can draw all day without triggering more requests!

### **User Experience on Free Tier:**

**First time opening Draw.io in a session:**
- User clicks "Open in Draw.io"
- Modal opens, shows "Loading editor..."
- Wait 30s-1min (cold start)
- Editor appears ✅

**Subsequent opens (within 15 min):**
- User clicks "Open in Draw.io"
- Modal opens, shows "Loading editor..."
- Wait 2-3 seconds (normal)
- Editor appears ✅

### **Keeping It Warm (Optional):**

If you want to avoid cold starts, you can:

**Option A: Upgrade to Starter ($7/mo)**
- Service stays on 24/7
- No cold starts ever
- Recommended for production

**Option B: Keep-Alive Ping (Free Tier Hack)**
- Set up a cron job to ping every 10 minutes
- Use services like UptimeRobot (free)
- Ping URL: `https://nexa-drawio.onrender.com/health` or just homepage

**Option C: Accept Cold Starts**
- First user of the day waits 30s
- Everyone else gets instant load
- Totally acceptable for development/low-traffic apps

---

## 🧪 TESTING LOCALLY

You can test the Docker image locally before deploying:

```bash
# Build the image
cd docker-root
docker build -t nexa-drawio .

# Run locally
docker run -p 8080:8080 nexa-drawio

# Test in browser
open http://localhost:8080
```

Then update NEXA `.env.local`:
```bash
NEXT_PUBLIC_DRAWIO_URL=http://localhost:8080
```

---

## 📊 MONITORING & LOGS

### **View Logs on Render:**

1. Go to Render Dashboard
2. Click on "nexa-drawio" service
3. Click "Logs" tab
4. See real-time logs

### **Common Log Messages:**

```
✅ Good:
  - Server startup in X ms
  - HTTP GET /
  - Health check passed

⚠️ Warning:
  - Service spinning down (inactive)
  - Service spinning up (cold start)

❌ Error:
  - Port binding failed
  - Health check failed
  - OutOfMemory errors
```

---

## 🐛 TROUBLESHOOTING

### **Issue: Service won't start**

**Check logs for:**
```
Error: Cannot find module
Port already in use
Permission denied
```

**Common fixes:**
- Verify Dockerfile is correct
- Check Root Directory is set to `docker-root`
- Verify Dockerfile Path is `./Dockerfile`
- Wait full 2-3 minutes for startup

### **Issue: Cold starts too slow**

**Solutions:**
1. Upgrade to Starter tier ($7/mo) - instant
2. Use UptimeRobot to ping every 10 min - free
3. Accept it for development - normal

### **Issue: 502 Bad Gateway**

**Means:** Service is starting but not ready yet

**Wait:** 30-60 seconds and refresh

### **Issue: Can't connect from NEXA**

**Check:**
1. `NEXT_PUBLIC_DRAWIO_URL` is correct
2. NEXA service redeployed after adding env var
3. Draw.io service is "Live" (green status)
4. No typos in URL

---

## 🔒 SECURITY

### **HTTPS:**
- ✅ Render provides free SSL certificates
- ✅ All traffic encrypted automatically
- ✅ No configuration needed

### **CORS:**
- ✅ Draw.io allows embedding from any origin by default
- ✅ No CORS configuration needed
- ✅ iframe will work from any domain

### **Updates:**
- Pull latest image: Redeploy service on Render
- Render rebuilds from `jgraph/drawio:latest`
- Automatic security patches

---

## 📈 SCALING

### **If You Outgrow Free Tier:**

**Upgrade to Starter ($7/mo):**
- Always on (no spin down)
- No cold starts
- Better for production

**If You Need More:**
- Standard tier: $25/mo (2GB RAM)
- Pro tier: $85/mo (4GB RAM)
- Handles 1000s of concurrent users

**Most apps need:** Starter tier is enough! 💪

---

## 🎯 SUCCESS CHECKLIST

**Deployment is successful when:**

- [ ] Render service created
- [ ] Build completes without errors
- [ ] Service shows "Live" status (green)
- [ ] Can access service URL in browser
- [ ] Draw.io editor interface appears
- [ ] No 502/503 errors
- [ ] Logs show "Server startup successful"

**Integration is successful when:**

- [ ] NEXA has `NEXT_PUBLIC_DRAWIO_URL` env var
- [ ] NEXA redeployed after adding env var
- [ ] Can open /visuals in NEXA
- [ ] "Open in Draw.io" button works
- [ ] Modal opens without CSP errors
- [ ] Can draw shapes
- [ ] "Save & Close" exports PNG
- [ ] Diagram persists after reload

---

## 💡 PRO TIPS

1. **Same Region:** Deploy Draw.io in same region as NEXA (lower latency)
2. **Custom Domain:** Can add custom domain like `drawio.yourdomain.com`
3. **Monitoring:** Set up Render alerts for service down
4. **Backups:** Docker image is official - no custom code to backup
5. **Updates:** Redeploy monthly to get latest Draw.io version

---

## 📚 ADDITIONAL RESOURCES

- **Render Docker Docs:** https://render.com/docs/docker
- **Draw.io Docker Hub:** https://hub.docker.com/r/jgraph/drawio
- **Draw.io GitHub:** https://github.com/jgraph/drawio
- **Render Support:** https://render.com/docs/support

---

## 🎉 THAT'S IT!

This folder contains everything needed for a production-ready Draw.io service.

**Questions?** Check the main repo's `RENDER-DRAWIO-DEPLOYMENT.md` for more details.

**Ready to deploy?** Go to https://dashboard.render.com and follow the steps above!

---

**Deployed by:** [Your Team]  
**Last Updated:** October 2025  
**License:** Apache 2.0 (from jgraph/drawio)

