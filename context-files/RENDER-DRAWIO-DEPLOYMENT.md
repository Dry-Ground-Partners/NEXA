# 🚀 DRAW.IO ON RENDER - MICROSERVICES DEPLOYMENT

**Architecture:** Two separate Render services  
**Recommended for:** Production, scalability, maintainability  
**Cost:** ~$7-32/month (depending on tier)

---

## 📊 ARCHITECTURE OVERVIEW

```
Internet
    ↓
Render Platform
    ↓
    ├─→ NEXA Service (Next.js)
    │   URL: https://nexa.onrender.com
    │   iframe src: NEXT_PUBLIC_DRAWIO_URL
    │
    └─→ Draw.io Service (Docker)
        URL: https://drawio-nexa.onrender.com
        Image: jgraph/drawio:latest
```

---

## 🎯 DEPLOYMENT STEPS

### **STEP 1: Create Dockerfile for Draw.io**

Create: `Dockerfile.drawio` in your repo root

```dockerfile
# Use official Draw.io Docker image
FROM jgraph/drawio:latest

# Expose ports
EXPOSE 8080 8443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start draw.io (default command from base image)
CMD ["/docker-entrypoint.sh"]
```

### **STEP 2: Deploy Draw.io Service on Render**

1. **Go to Render Dashboard:** https://dashboard.render.com

2. **Click "New +" → "Web Service"**

3. **Connect Repository:**
   - Select your NEXA repo
   - Click "Connect"

4. **Configure Service:**
   ```yaml
   Name: nexa-drawio
   Region: Same as NEXA (for lower latency)
   Branch: main (or your production branch)
   
   Runtime: Docker
   Dockerfile Path: Dockerfile.drawio
   Docker Command: (leave empty - uses CMD from Dockerfile)
   
   Instance Type:
     - Development: Free (512MB RAM, limited hours)
     - Production: Starter ($7/mo, 512MB RAM)
     - High traffic: Standard ($25/mo, 2GB RAM)
   ```

5. **Set Environment Variables:**
   ```
   DRAWIO_BASE_URL=https://drawio-nexa.onrender.com
   ```

6. **Click "Create Web Service"**

7. **Wait for deployment** (~5-10 minutes first time)

8. **Verify it works:**
   - Open: `https://drawio-nexa.onrender.com`
   - You should see Draw.io editor interface

### **STEP 3: Update NEXA Service**

1. **Go to your NEXA service on Render**

2. **Environment → Add Variable:**
   ```
   NEXT_PUBLIC_DRAWIO_URL=https://drawio-nexa.onrender.com
   ```

3. **Click "Save Changes"**

4. **Render will auto-redeploy NEXA**

### **STEP 4: Test Integration**

1. Wait for NEXA redeploy to complete

2. Open your NEXA app: `https://nexa.onrender.com/visuals`

3. Click "Open in Draw.io Advanced Editing"

4. **It should work!** No CSP errors! ✅

---

## 📁 FILES TO CREATE

### **1. `Dockerfile.drawio`** (in repo root)
```dockerfile
FROM jgraph/drawio:latest
EXPOSE 8080 8443
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1
CMD ["/docker-entrypoint.sh"]
```

### **2. Update `render.yaml`** (optional - for Blueprint)
```yaml
services:
  # NEXA Service
  - type: web
    name: nexa
    env: node
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NEXT_PUBLIC_DRAWIO_URL
        value: https://drawio-nexa.onrender.com
      # ... other vars ...

  # Draw.io Service
  - type: web
    name: nexa-drawio
    env: docker
    dockerfilePath: ./Dockerfile.drawio
    envVars:
      - key: DRAWIO_BASE_URL
        value: https://drawio-nexa.onrender.com
```

---

## 🔍 VERIFICATION CHECKLIST

### **Draw.io Service:**
- [ ] Service deployed successfully
- [ ] Status shows "Live" (green)
- [ ] URL accessible: `https://drawio-nexa.onrender.com`
- [ ] Draw.io editor interface loads
- [ ] No errors in logs

### **NEXA Service:**
- [ ] Environment variable set: `NEXT_PUBLIC_DRAWIO_URL`
- [ ] Service redeployed after env var change
- [ ] `/visuals` page loads
- [ ] "Open in Draw.io" button appears
- [ ] Modal opens when clicked
- [ ] Draw.io editor loads in modal (no CSP errors)
- [ ] Can draw shapes
- [ ] "Save & Close" works
- [ ] PNG exports correctly
- [ ] Diagram persists after reload

---

## 💰 COST BREAKDOWN

### **Free Tier (Development):**
```
NEXA:       Free tier (750 hours/month)
Draw.io:    Free tier (750 hours/month)
Total:      $0/month (great for testing!)
```

**Limitations:**
- Services spin down after 15 min inactivity
- Cold start: 30s-1min on first request
- Not for production use

### **Starter Tier (Small Production):**
```
NEXA:       $7/month (always on)
Draw.io:    $7/month (always on)
Total:      $14/month
```

**Good for:**
- Small teams (<50 users)
- Low traffic
- Side projects

### **Standard Tier (Production):**
```
NEXA:       $25/month (2GB RAM)
Draw.io:    $7/month (512MB is enough)
Total:      $32/month
```

**Good for:**
- Medium teams (50-500 users)
- Production apps
- Better performance

---

## 🐛 TROUBLESHOOTING

### **Issue: Draw.io service won't start**
```bash
# Check logs in Render Dashboard
# Common issues:
# 1. Dockerfile.drawio not found
#    → Make sure it's in repo root
#    → Check Dockerfile Path setting

# 2. Port binding error
#    → Render auto-detects port 8080, should work

# 3. Health check fails
#    → Wait 2-3 minutes for full startup
#    → Check logs for errors
```

### **Issue: CSP errors still appearing**
```bash
# 1. Verify environment variable
#    → Go to NEXA service → Environment
#    → Confirm NEXT_PUBLIC_DRAWIO_URL is set correctly

# 2. Redeploy NEXA
#    → Manual Deploy → Deploy Latest Commit

# 3. Clear browser cache
#    → Hard reload: Ctrl+Shift+R (Windows) / Cmd+Shift+R (Mac)
#    → Or use incognito mode

# 4. Check DrawioEditor.tsx
#    → Verify default URL is correct
#    → Check console.log for actual URL being used
```

### **Issue: Cross-origin errors**
```bash
# This usually means CORS is blocking
# Draw.io should allow all origins by default

# If issues persist:
# 1. Check Draw.io logs for CORS errors
# 2. May need to configure Draw.io CORS headers
# 3. Contact Render support if persistent
```

### **Issue: Slow performance**
```bash
# 1. Both services in same region?
#    → Check service settings
#    → Latency between regions adds 50-200ms

# 2. Free tier spinning down?
#    → Upgrade to Starter ($7/mo) for always-on

# 3. Resource limits?
#    → Check metrics in Render Dashboard
#    → Upgrade instance size if needed
```

---

## 📊 MONITORING

### **Render Dashboard Metrics:**
- **CPU Usage:** Should be <50% normally
- **Memory:** Draw.io uses 200-400MB typically
- **Request Count:** Monitor traffic patterns
- **Response Time:** Should be <500ms for Draw.io

### **Set Up Alerts:**
1. Go to Service → Settings → Notifications
2. Enable:
   - Service down alerts
   - High CPU alerts (>80%)
   - High memory alerts (>80%)

---

## 🔒 SECURITY CONSIDERATIONS

### **1. HTTPS Only**
- ✅ Render provides free SSL
- ✅ All traffic encrypted
- ✅ HSTS enabled by default

### **2. Environment Variables**
- ✅ Stored securely by Render
- ✅ Not in version control
- ✅ Encrypted at rest

### **3. Network Isolation**
- ✅ Services communicate via HTTPS
- ✅ No direct container access
- ✅ Render manages firewall

### **4. Updates**
- ✅ Draw.io updates via image pull
- ✅ Redeploy to get latest version
- ✅ Can pin specific version if needed

---

## 🚀 SCALING STRATEGY

### **If Traffic Grows:**

**Option 1: Vertical Scaling**
- Upgrade Draw.io to Standard ($25/mo, 2GB RAM)
- Handles 10x more concurrent users

**Option 2: Caching**
- Add Cloudflare in front
- Cache static Draw.io assets
- Reduce load on service

**Option 3: CDN**
- Serve Draw.io static files from CDN
- Keep only backend on Render
- Faster global access

---

## ✅ SUCCESS CRITERIA

**Phase 2 complete when:**
- [ ] Dockerfile.drawio created
- [ ] Draw.io service deployed on Render
- [ ] Draw.io URL accessible
- [ ] NEXA environment variable updated
- [ ] NEXA redeployed
- [ ] Integration works (no CSP errors)
- [ ] Can create & save diagrams
- [ ] Diagrams persist and are re-editable

---

## 📚 ADDITIONAL RESOURCES

- **Render Docker Docs:** https://render.com/docs/docker
- **Draw.io Docker Hub:** https://hub.docker.com/r/jgraph/drawio
- **Render Blueprint Spec:** https://render.com/docs/blueprint-spec
- **Draw.io GitHub:** https://github.com/jgraph/drawio

---

**Next Steps:**
1. Create `Dockerfile.drawio`
2. Deploy to Render
3. Test integration
4. Celebrate! 🎉

