# 🔧 DRAW.IO DEPLOYMENT TROUBLESHOOTING

**Common issues and fixes for Draw.io deployment on Render.**

---

## ✅ **FIXED: Entrypoint Script Error**

### **Error Message:**
```
/docker-entrypoint.sh: line 175: [: KeystoreFile="/usr/local/tomcat/.keystore": binary operator expected
==> Application exited early
```

### **Cause:**
The Draw.io Docker image tries to set up HTTPS with a self-signed certificate, but the entrypoint script has a bash syntax error when checking the keystore file path.

### **Solution:**
**We disabled HTTPS in the container** by adding these environment variables to the Dockerfile:
```dockerfile
ENV LETS_ENCRYPT_ENABLED=false
ENV SSL_ENABLED=false
```

**Why this works:**
- Render terminates SSL at the load balancer level
- We don't need HTTPS inside the container
- Traffic from Render to container is over HTTP (port 8080)
- Users still get HTTPS (Render handles it)

**Already fixed in:** `docker-root/Dockerfile` ✅

---

## 🚀 **DEPLOYMENT CHECKLIST**

After fixing the Dockerfile, redeploy:

### **Step 1: Commit & Push**
```bash
git add docker-root/Dockerfile
git commit -m "fix: Disable HTTPS in Draw.io container (Render handles SSL)"
git push origin main
```

### **Step 2: Trigger Redeploy on Render**
- Go to Render Dashboard
- Click on "nexa-drawio" service
- Click "Manual Deploy" → "Deploy latest commit"
- Wait ~5-10 minutes

### **Step 3: Verify Success**
Watch logs for:
```
✅ Good signs:
  - "Tomcat started"
  - "Server startup in X ms"
  - No "Application exited early" error
  - Status changes to "Live" (green)

❌ Bad signs:
  - "Application exited early"
  - Repeated restarts
  - Error messages
```

### **Step 4: Test Access**
- Open your service URL: `https://nexa-drawio.onrender.com`
- Should see Draw.io editor interface
- No 502 errors

---

## 🐛 **OTHER COMMON ISSUES**

### **Issue: Service keeps restarting**

**Check logs for:**
```bash
OutOfMemoryError
Port already in use
Permission denied
```

**Solutions:**
1. **OutOfMemory:** Upgrade to Starter tier (512MB → more RAM)
2. **Port issue:** Check Dockerfile exposes port 8080
3. **Permission:** Using official image, shouldn't happen

---

### **Issue: Build succeeds but service won't start**

**Symptoms:**
- Build completes
- Status shows "Starting..."
- Then goes back to "Build"
- Logs show errors

**Check:**
1. Health check endpoint is correct (`/`)
2. Port 8080 is exposed
3. Environment variables are set correctly
4. No syntax errors in Dockerfile

**Debug:**
```bash
# Local test (if you have Docker)
cd docker-root
docker build -t test-drawio .
docker run -p 8080:8080 -e SSL_ENABLED=false test-drawio
# Open http://localhost:8080
```

---

### **Issue: 502 Bad Gateway**

**Meaning:** Service is starting but not ready yet

**Solution:** Wait 30-60 seconds and refresh

**If persists:**
1. Check logs for startup errors
2. Verify health check passes
3. Increase health check start period

---

### **Issue: Can't connect from NEXA**

**Symptoms:**
- Draw.io service is "Live"
- Can access Draw.io URL directly
- But doesn't load in NEXA modal

**Check:**
1. `NEXT_PUBLIC_DRAWIO_URL` environment variable in NEXA service
2. URL is correct (check for typos, http vs https)
3. NEXA service redeployed after adding env var
4. Browser console for CORS/CSP errors

**Common mistakes:**
```bash
❌ Wrong:
NEXT_PUBLIC_DRAWIO_URL=http://nexa-drawio.onrender.com  # Should be https

✅ Correct:
NEXT_PUBLIC_DRAWIO_URL=https://nexa-drawio.onrender.com
```

---

### **Issue: CSP errors in NEXA**

**Error in browser console:**
```
Refused to frame ... violates Content Security Policy
```

**Solutions:**
1. Make sure using YOUR Draw.io URL (not diagrams.net)
2. Verify URL in NEXA env var is correct
3. Hard refresh browser (Ctrl+Shift+R)
4. Try incognito mode

---

### **Issue: Slow cold starts on free tier**

**Expected behavior:**
- First request after 15 min: 30-60 seconds
- Normal operation: 2-3 seconds

**Not a bug!** This is how free tier works.

**Solutions:**
1. **Upgrade to Starter** ($7/mo) - always on
2. **Use UptimeRobot** (free) - ping every 10 min
3. **Accept it** - 30s is reasonable for free tier

---

### **Issue: Service appears down but isn't**

**Symptoms:**
- Render shows "Live"
- Accessing URL gives 502/503
- Logs show no errors

**Possible causes:**
1. **Cold start** - Wait 30-60 seconds
2. **Deploying** - Wait for deploy to finish
3. **Region issue** - Try from different location

**Check:**
```bash
# From terminal:
curl -I https://nexa-drawio.onrender.com

# Should return:
HTTP/2 200
content-type: text/html
```

---

## 📊 **DEBUGGING CHECKLIST**

**When something goes wrong:**

- [ ] Check Render logs (most important!)
- [ ] Check service status (Live, Building, etc.)
- [ ] Check environment variables are set
- [ ] Check Dockerfile syntax is correct
- [ ] Check Root Directory is `docker-root`
- [ ] Check Dockerfile Path is `./Dockerfile`
- [ ] Try accessing service URL directly
- [ ] Check browser console for errors
- [ ] Try incognito mode (clear cache)
- [ ] Wait for deploy to complete fully

---

## 🔍 **USEFUL RENDER COMMANDS**

### **View Recent Logs:**
- Go to service → Logs tab
- or use Render CLI

### **Restart Service:**
- Manual Deploy → Deploy latest commit
- or Settings → Restart Service

### **Check Environment Variables:**
- Service → Environment tab
- Verify all required vars present

---

## 💡 **TIPS**

1. **Always check logs first** - 90% of issues show up there
2. **Wait for full deploy** - Don't test while "Building"
3. **Use incognito mode** - Avoids cache issues
4. **Test service URL directly** - Before testing in NEXA
5. **One change at a time** - Easier to debug

---

## 📞 **STILL STUCK?**

### **Gather this info:**

1. **Error message** (exact text from logs)
2. **Service status** (Live, Failed, Building)
3. **What you tried** (steps to reproduce)
4. **Environment variables** (without sensitive values)
5. **Browser console errors** (if NEXA integration issue)

### **Check these resources:**

- **Render Docs:** https://render.com/docs/docker
- **Draw.io Docker:** https://hub.docker.com/r/jgraph/drawio
- **Draw.io GitHub:** https://github.com/jgraph/drawio/issues

---

## ✅ **SUCCESS INDICATORS**

**Your deployment is working when:**

- [ ] Build completes without errors
- [ ] Service status shows "Live" (green)
- [ ] Logs show "Server startup in X ms"
- [ ] Can access service URL in browser
- [ ] Draw.io editor interface appears
- [ ] No errors in Render logs
- [ ] No 502/503 errors
- [ ] NEXA can load Draw.io in modal
- [ ] Can draw and save diagrams

---

**Last Updated:** October 2025  
**Issue Tracked:** Entrypoint script HTTPS bug (fixed)

