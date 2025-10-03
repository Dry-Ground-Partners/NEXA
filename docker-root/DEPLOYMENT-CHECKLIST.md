# ✅ DRAW.IO DEPLOYMENT CHECKLIST

Quick reference for deploying the Draw.io service.

---

## 🚀 DEPLOYMENT STEPS

### **1. Go to Render Dashboard**
- [ ] Open https://dashboard.render.com
- [ ] Sign in to your account

### **2. Create New Web Service**
- [ ] Click "New +" → "Web Service"
- [ ] Choose "Build and deploy from a Git repository"
- [ ] Connect your repository
- [ ] Click "Connect"

### **3. Configure Service**
Fill in these settings:

```
Name:              nexa-drawio
Region:            [Same as NEXA - check your NEXA service]
Branch:            main

Environment:       Docker
Root Directory:    docker-root          ← CRITICAL!
Dockerfile Path:   ./Dockerfile         ← Relative to root directory

Instance Type:     Free (or Starter for production)
```

### **4. Add Environment Variables**
Click "Advanced" → Add environment variables:

```
DRAWIO_BASE_URL=https://nexa-drawio.onrender.com
DRAWIO_GOOGLE_ANALYTICS=false
```

**Note:** After first deploy, you'll get the actual URL. Update if different!

### **5. Create Web Service**
- [ ] Click "Create Web Service"
- [ ] Wait 5-10 minutes for first build
- [ ] Watch logs for errors

### **6. Verify Deployment**
- [ ] Service status shows "Live" (green)
- [ ] Open service URL (e.g., https://nexa-drawio.onrender.com)
- [ ] Draw.io editor appears ✅
- [ ] No 502/503 errors
- [ ] Try drawing a shape (should work)

### **7. Update NEXA Service**
Go to your NEXA service on Render:

- [ ] Click "Environment" tab
- [ ] Add new variable:
  ```
  NEXT_PUBLIC_DRAWIO_URL=https://nexa-drawio.onrender.com
  ```
  (Use your actual Draw.io service URL)
- [ ] Click "Save Changes"
- [ ] NEXA will auto-redeploy

### **8. Test Integration**
- [ ] Wait for NEXA redeploy to complete
- [ ] Open your NEXA app
- [ ] Go to `/visuals` page
- [ ] Click image upload area
- [ ] Click "Open in Draw.io Advanced Editing"
- [ ] Modal opens ✅
- [ ] Draw.io loads (may take 30s first time if free tier)
- [ ] No CSP errors in browser console ✅
- [ ] Can draw shapes ✅
- [ ] "Save & Close" works ✅
- [ ] PNG appears in NEXA ✅
- [ ] Save session ✅
- [ ] Reload page ✅
- [ ] Diagram persists ✅
- [ ] Can re-edit diagram ✅

---

## 🎯 SUCCESS CRITERIA

**All must be ✅ before considering deployment complete:**

**Draw.io Service:**
- [x] Deployed successfully
- [x] Status "Live"
- [x] Accessible via URL
- [x] Editor interface loads
- [x] Can draw shapes

**NEXA Integration:**
- [x] Environment variable set
- [x] NEXA redeployed
- [x] Modal opens without errors
- [x] Draw.io loads in modal
- [x] Can create diagrams
- [x] Can save & export PNG
- [x] Diagrams persist
- [x] Can re-edit diagrams

---

## 💰 FREE TIER NOTES

### **What to Expect:**

**Cold Starts:**
- Service spins down after 15 min inactivity
- First request takes 30-60 seconds to wake up
- Subsequent requests are instant

**When It Happens:**
- First user of the day
- After 15 min of no one using Draw.io
- Not during active editing session

**What Counts as "Use":**
- Opening the Draw.io modal (HTTP request)
- **NOT:** Drawing, dragging, typing (all client-side)

**User Experience:**
```
User 1 (9:00 AM):  Opens Draw.io → Waits 30s → Works ✅
User 1 (9:05 AM):  Opens again → Instant ✅
User 2 (9:10 AM):  Opens Draw.io → Instant ✅
[15 min pass, no one using]
User 3 (9:30 AM):  Opens Draw.io → Waits 30s → Works ✅
```

### **Avoiding Cold Starts (Optional):**

**Option A: Upgrade to Starter**
- Cost: $7/month
- Benefit: Always on, no cold starts
- Recommended for: Production apps

**Option B: Keep-Alive Ping**
- Use UptimeRobot (free): https://uptimerobot.com
- Ping every 10 minutes: `https://nexa-drawio.onrender.com`
- Keeps service warm
- Recommended for: Development if you hate waiting

**Option C: Accept It**
- 30s wait is acceptable for most users
- Only happens occasionally
- Saves $7/month
- Recommended for: Low-traffic, budget-conscious projects

---

## 🐛 COMMON ISSUES

### **Issue: "Root Directory not found"**
**Fix:** Make sure `docker-root` exists in your repo root
```bash
# Check:
ls -la docker-root/
# Should show: Dockerfile, README.md, etc.
```

### **Issue: "Dockerfile not found"**
**Fix:** 
- Check Dockerfile Path is `./Dockerfile` (relative to root directory)
- Check Root Directory is `docker-root`
- NOT: `docker-root/Dockerfile` (that's wrong)

### **Issue: Build takes forever**
**Normal:** First build takes 5-10 minutes (downloading base image)
**Future builds:** 2-3 minutes (cached)

### **Issue: Service keeps restarting**
**Check logs for:**
- OutOfMemory errors → Upgrade instance
- Port binding errors → Check Dockerfile exposes 8080
- Health check fails → Wait longer, check endpoint

### **Issue: CSP errors still appear**
**Verify:**
1. `NEXT_PUBLIC_DRAWIO_URL` is correct
2. NEXA service redeployed after env var change
3. Hard refresh browser (Ctrl+Shift+R)
4. Try incognito mode

### **Issue: 502 Bad Gateway**
**Means:** Service is starting but not ready
**Fix:** Wait 30-60 seconds, refresh

### **Issue: Draw.io loads but can't save**
**Check:**
- Browser console for errors
- Network tab for failed requests
- DrawioEditor.tsx origin validation

---

## 📊 MONITORING

### **Regular Checks:**
- [ ] Service status (should be "Live")
- [ ] Response time (should be <500ms)
- [ ] Error rate (should be 0%)
- [ ] Logs (no errors)

### **Set Up Alerts:**
1. Go to service → Settings → Notifications
2. Enable:
   - Deploy failed
   - Service down
   - High error rate

---

## 🔄 UPDATES

### **Updating Draw.io:**
1. Go to service on Render
2. Click "Manual Deploy" → "Deploy latest commit"
3. Render pulls latest `jgraph/drawio:latest` image
4. Wait 2-3 minutes
5. Test that it still works

**Recommended:** Update monthly for security patches

---

## 💡 NEXT STEPS AFTER DEPLOYMENT

### **If Everything Works:**
- [x] Mark Phase 2 COMPLETE ✅
- [ ] Document your Draw.io URL for team
- [ ] Add to monitoring dashboard
- [ ] Consider upgrading to Starter if needed
- [ ] Move to Phase 3 (advanced features) or call it done!

### **If You Want More:**
- [ ] Custom domain (drawio.yourdomain.com)
- [ ] Diagram templates
- [ ] SVG/PDF export
- [ ] Performance optimizations

---

## 🎉 CONGRATULATIONS!

If all checklist items are ✅, you have successfully deployed:

✅ Self-hosted Draw.io service  
✅ Integrated with NEXA  
✅ Production-ready architecture  
✅ No external dependencies  
✅ Full diagram editing workflow  

**You did it!** 🚀

---

**Last Updated:** October 2025  
**Maintained by:** NEXA Team

