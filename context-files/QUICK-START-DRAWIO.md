# 🚀 QUICK START: Draw.io Integration

## ⚡ FASTEST PATH TO TESTING

### **Step 1: Add Environment Variable** (30 seconds)

```bash
# Add this to .env.local (or just skip - it will use default)
NEXT_PUBLIC_DRAWIO_URL=https://app.diagrams.net
```

### **Step 2: Restart Dev Server** (10 seconds)

```bash
# Stop current server (Ctrl+C), then:
npm run dev
```

### **Step 3: Test It** (2 minutes)

1. Go to `/visuals` in your app
2. Click on any diagram's image upload area
3. Click **"Open in Draw.io Advanced Editing"** ✨
4. Draw something
5. Click **"Save & Close"**
6. Verify image appears

**That's it!** 🎉

---

## 🧪 TEST HARNESS (Optional)

Want to test the integration standalone first?

1. Open `/test-drawio.html` in your browser
2. Wait for "Ready ✓"
3. Click "Load Sample Diagram"
4. Edit it
5. Click "Export PNG"

---

## 🔍 WHERE TO LOOK

### **In /visuals Page:**
- Image upload modal now has **TWO buttons**:
  - "Upload from Device" (existing)
  - **"Open in Draw.io Advanced Editing"** (NEW)

### **What Happens When You Click:**
1. Modal opens with draw.io editor
2. Can create/edit diagrams visually
3. "Save & Close" exports PNG and saves XML
4. Image appears in preview
5. Data stored in session (sketch = XML, image = PNG)

---

## 📦 WHAT GOT ADDED

### **New Files:**
- `/test-drawio.html` - Test harness
- `/src/components/drawio/DrawioEditor.tsx` - Editor component

### **Modified Files:**
- `/src/app/visuals/page.tsx` - Added integration

### **How Data is Stored:**
```typescript
DiagramSet {
  sketch: "<mxGraphModel>...</mxGraphModel>", // draw.io XML
  image: "data:image/png;base64,..."          // Generated PNG
}
```

**No database changes needed!** Uses existing JSONB structure.

---

## ❓ TROUBLESHOOTING

**Editor doesn't load?**
- Check browser console (F12)
- Make sure NEXT_PUBLIC_DRAWIO_URL is set
- Try refreshing

**Save doesn't work?**
- Wait for "Ready ✓" status
- Check console for errors
- Verify autosave is enabled

**Image doesn't appear?**
- Check if PNG export succeeded
- Look for size limit errors (5MB max)
- Verify Base64 data in console

**Diagram doesn't persist?**
- Did you save the session?
- Click main "Save" button in /visuals

---

## 🎯 SUCCESS CHECKLIST

- [ ] Environment variable added
- [ ] Dev server restarted
- [ ] Button appears in /visuals
- [ ] Editor opens when clicked
- [ ] Can draw a diagram
- [ ] Save & Close works
- [ ] Image appears in preview
- [ ] Session saves correctly
- [ ] Diagram persists after reload

---

## 📚 FULL DOCS

See `/PHASE-1-DAY-1-COMPLETE.md` for:
- Detailed testing guide
- Technical architecture
- How it works
- Security notes
- Next steps

---

**tl;dr:** Add env var, restart server, go to /visuals, click "Open in Draw.io Advanced Editing", have fun! 🎨

