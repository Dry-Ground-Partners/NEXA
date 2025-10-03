# ⚡ QUICK START - Deploy Draw.io in 5 Minutes

**Fast track guide for deploying Draw.io service to Render.**

---

## 🚀 5-MINUTE DEPLOYMENT

### **Step 1: Render Dashboard (2 min)**

1. Go to https://dashboard.render.com
2. Click **"New +" → "Web Service"**
3. Connect your Git repo
4. Click **"Connect"**

### **Step 2: Configure (2 min)**

Fill in exactly as shown:

```
Name:              nexa-drawio
Branch:            main
Root Directory:    docker-root        ← Copy this exactly!
Dockerfile Path:   ./Dockerfile       ← Copy this exactly!
Instance Type:     Free
```

Click **"Advanced"** → Add environment variables:
```
DRAWIO_BASE_URL = https://nexa-drawio.onrender.com
```

Click **"Create Web Service"**

### **Step 3: Wait & Verify (1 min)**

- Wait ~5 minutes for build
- Open your service URL
- See Draw.io editor? ✅ Success!

---

## 🔗 CONNECT TO NEXA

### **Step 1: Get Draw.io URL**

After deploy, Render gives you a URL like:
```
https://nexa-drawio.onrender.com
```

### **Step 2: Update NEXA**

Go to your **NEXA service** on Render:

1. Click **"Environment"** tab
2. Click **"Add Environment Variable"**
3. Enter:
   ```
   Key:   NEXT_PUBLIC_DRAWIO_URL
   Value: https://nexa-drawio.onrender.com
   ```
   (Use YOUR actual URL!)
4. Click **"Save Changes"**

NEXA will auto-redeploy (~2 min).

### **Step 3: Test**

1. Open your NEXA app
2. Go to `/visuals`
3. Click "Open in Draw.io Advanced Editing"
4. Should work! 🎉

---

## 💡 FREE TIER NOTES

**What happens:**
- Service sleeps after 15 min of no use
- First request takes 30s to wake up
- Then instant for 15 minutes

**User experience:**
```
Morning (first user):  30s wait → works
Rest of day:          instant
```

**To avoid wait:**
- Upgrade to Starter: $7/month (always on)
- Use UptimeRobot: ping every 10 min (free)
- Accept it: 30s is okay for most apps

---

## ✅ DONE!

That's it! You now have:
- ✅ Self-hosted Draw.io
- ✅ Integrated with NEXA
- ✅ No CSP errors
- ✅ Production-ready

**Need more details?** Read `README.md` or `DEPLOYMENT-CHECKLIST.md`

---

**Questions?** Check `README.md` for troubleshooting!

