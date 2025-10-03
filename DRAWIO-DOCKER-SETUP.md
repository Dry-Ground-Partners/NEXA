# 🐳 DRAW.IO DOCKER SETUP - PHASE 2

**Status:** Ready to deploy  
**Time Required:** 5-10 minutes  
**Complexity:** Easy (just a few commands)

---

## 🎯 OVERVIEW

We're self-hosting Draw.io using Docker to:
- ✅ Bypass CSP restrictions (it's YOUR domain)
- ✅ Remove external dependencies
- ✅ Full control and privacy
- ✅ Production-ready setup

---

## 📋 PREREQUISITES

**Check if you have Docker installed:**
```bash
docker --version
docker-compose --version
```

**If not installed:**
- **Render/Cloud:** Docker usually pre-installed
- **Local Dev:** Install Docker Desktop from https://www.docker.com/products/docker-desktop

---

## 🚀 DEPLOYMENT OPTIONS

### **OPTION A: LOCAL DEVELOPMENT (Easiest - Start Here)**

Perfect for testing and development on your local machine.

#### **Step 1: Start Draw.io Container**
```bash
cd /home/runner/workspace
docker-compose -f docker-compose.drawio.yml up -d
```

This will:
- Pull the `jgraph/drawio:latest` image (~500MB)
- Start the container
- Expose on http://localhost:8080

#### **Step 2: Verify It's Running**
```bash
# Check container status
docker ps | grep nexa-drawio

# Check logs
docker-compose -f docker-compose.drawio.yml logs -f drawio
```

You should see:
```
nexa-drawio   /docker-entrypoint.sh    Up   8080/tcp, 8443/tcp
```

#### **Step 3: Test in Browser**
Open: http://localhost:8080

You should see the Draw.io editor interface!

#### **Step 4: Update NEXA Environment**
```bash
# Add to .env.local (or create if doesn't exist)
echo "NEXT_PUBLIC_DRAWIO_URL=http://localhost:8080" >> .env.local
```

#### **Step 5: Restart NEXA Dev Server**
```bash
# Stop current server (Ctrl+C)
# Restart:
npm run dev
```

#### **Step 6: Test in NEXA**
1. Go to http://localhost:3000/visuals
2. Click image upload area
3. Click "Open in Draw.io Advanced Editing"
4. **IT SHOULD WORK NOW!** ✨

---

### **OPTION B: PRODUCTION DEPLOYMENT (Render/Cloud)**

For deploying alongside NEXA in production.

#### **Architecture:**
```
Internet
  ↓
Render Load Balancer
  ↓
├─→ NEXA App (Next.js)
│     ↓
│   Uses iframe pointing to drawio.yourdomain.com
│
└─→ Draw.io Service (Docker)
      Exposed as drawio.yourdomain.com
```

#### **Render Setup:**

**1. Add Draw.io as a Web Service:**
- Go to Render Dashboard
- Click "New +" → "Web Service"
- Connect your repo
- Use Docker runtime
- Set:
  - **Name:** `nexa-drawio`
  - **Docker Command:** Leave empty (uses default)
  - **Dockerfile Path:** Create a `Dockerfile.drawio`:

```dockerfile
FROM jgraph/drawio:latest

# Expose ports
EXPOSE 8080 8443

# Health check
HEALTHCHECK --interval=30s --timeout=10s --retries=3 \
  CMD curl -f http://localhost:8080/ || exit 1

# Start draw.io
CMD ["/docker-entrypoint.sh"]
```

**2. Set Environment Variables on Render:**
```
DRAWIO_BASE_URL=https://drawio-nexa.onrender.com
```

**3. Update NEXA Environment on Render:**
Go to your NEXA service → Environment → Add:
```
NEXT_PUBLIC_DRAWIO_URL=https://drawio-nexa.onrender.com
```

**4. Deploy both services!**

---

### **OPTION C: CUSTOM DOMAIN WITH REVERSE PROXY**

If you have your own domain and want `drawio.yourdomain.com`.

#### **Nginx Configuration:**
```nginx
server {
    listen 443 ssl http2;
    server_name drawio.yourdomain.com;

    # SSL certificates (Let's Encrypt recommended)
    ssl_certificate /etc/letsencrypt/live/drawio.yourdomain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/drawio.yourdomain.com/privkey.pem;

    # Proxy to Docker container
    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # WebSocket support (if needed)
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}

# Redirect HTTP to HTTPS
server {
    listen 80;
    server_name drawio.yourdomain.com;
    return 301 https://$server_name$request_uri;
}
```

**Then update NEXA:**
```bash
NEXT_PUBLIC_DRAWIO_URL=https://drawio.yourdomain.com
```

---

## 🔧 DOCKER COMMANDS REFERENCE

### **Start/Stop/Restart:**
```bash
# Start
docker-compose -f docker-compose.drawio.yml up -d

# Stop
docker-compose -f docker-compose.drawio.yml down

# Restart
docker-compose -f docker-compose.drawio.yml restart

# Stop and remove volumes
docker-compose -f docker-compose.drawio.yml down -v
```

### **Logs and Debugging:**
```bash
# View logs (follow mode)
docker-compose -f docker-compose.drawio.yml logs -f drawio

# View last 100 lines
docker-compose -f docker-compose.drawio.yml logs --tail=100 drawio

# Check container status
docker ps | grep nexa-drawio

# Inspect container
docker inspect nexa-drawio
```

### **Updates:**
```bash
# Pull latest image
docker-compose -f docker-compose.drawio.yml pull

# Restart with new image
docker-compose -f docker-compose.drawio.yml up -d
```

---

## 🧪 TESTING CHECKLIST

### **1. Container Health:**
- [ ] Container is running: `docker ps | grep nexa-drawio`
- [ ] No errors in logs: `docker-compose -f docker-compose.drawio.yml logs drawio`
- [ ] Browser access works: http://localhost:8080

### **2. NEXA Integration:**
- [ ] Environment variable set: `NEXT_PUBLIC_DRAWIO_URL`
- [ ] NEXA dev server restarted
- [ ] `/visuals` page loads
- [ ] "Open in Draw.io" button appears
- [ ] Modal opens (no CSP errors!)
- [ ] Can draw shapes
- [ ] Can save diagram
- [ ] PNG exports correctly
- [ ] Diagram persists after reload
- [ ] Can re-edit existing diagrams

---

## 🐛 TROUBLESHOOTING

### **Issue: Container won't start**
```bash
# Check logs
docker-compose -f docker-compose.drawio.yml logs drawio

# Common fixes:
# 1. Port already in use
docker-compose -f docker-compose.drawio.yml down
lsof -i :8080  # Find what's using port 8080
kill -9 <PID>  # Kill the process

# 2. Try different port
# Edit docker-compose.drawio.yml: change "8080:8080" to "8081:8080"
```

### **Issue: Can't access http://localhost:8080**
```bash
# Check if container is actually running
docker ps | grep nexa-drawio

# Check container logs for errors
docker logs nexa-drawio

# Try accessing from inside container
docker exec -it nexa-drawio curl http://localhost:8080
```

### **Issue: Still getting CSP errors in NEXA**
```bash
# 1. Verify environment variable
echo $NEXT_PUBLIC_DRAWIO_URL

# 2. Check .env.local file
cat .env.local

# 3. Restart NEXA completely
# Stop dev server (Ctrl+C)
npm run dev

# 4. Clear browser cache or use incognito mode
```

### **Issue: Draw.io loads but can't save**
- Check browser console for errors
- Verify postMessage origin validation in DrawioEditor.tsx
- Check that you're using localhost for both NEXA and Draw.io

---

## 📊 PERFORMANCE & MONITORING

### **Resource Usage:**
```bash
# Check Docker stats
docker stats nexa-drawio
```

Typical usage:
- **CPU:** 1-5% idle, 10-30% when rendering
- **Memory:** 200-500MB
- **Disk:** ~500MB (image + cache)

### **Health Check:**
```bash
# Check health status
docker inspect nexa-drawio --format='{{.State.Health.Status}}'

# Should return: "healthy"
```

---

## 🎯 NEXT STEPS AFTER SETUP

Once Docker is running and tested:

1. ✅ Mark Phase 2 as COMPLETE
2. 🚀 Move to Phase 3: Advanced Features
   - Diagram templates
   - SVG/PDF export
   - Performance optimizations
3. 📚 Update documentation with your domain
4. 🚢 Plan production deployment (if not already deployed)

---

## 📝 ENVIRONMENT VARIABLES SUMMARY

| Variable | Development | Production |
|----------|-------------|------------|
| `NEXT_PUBLIC_DRAWIO_URL` | `http://localhost:8080` | `https://drawio-nexa.onrender.com` |
| `DRAWIO_BASE_URL` | `http://localhost:8080` | `https://drawio-nexa.onrender.com` |

---

## 🎉 SUCCESS CRITERIA

**Phase 2 is complete when:**
- [x] Docker container running
- [x] Draw.io accessible in browser
- [x] NEXA integration works (no CSP errors)
- [x] Can create diagrams
- [x] Can save & export PNG
- [x] Diagrams persist and are re-editable
- [x] No external dependencies

---

**Start here:** `docker-compose -f docker-compose.drawio.yml up -d`

**Then test:** http://localhost:8080

**Good luck!** 🐳✨

