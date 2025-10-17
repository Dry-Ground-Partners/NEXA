# 🚀 Quick Start: Phase 1 Implementation

**What:** Implement core Maestro flow  
**Time:** 3-4 hours  
**Goal:** User sends message → Maestro modifies → PDF updates

---

## ✅ **ALREADY DONE**

- ✅ Canvas modal doesn't block Liaison sidebar
- ✅ PDF preview at full width
- ✅ Both components accessible simultaneously
- ✅ Clean visual separation

---

## 🔄 **TO IMPLEMENT (5 Steps)**

### **Step 1: Update LangSmith Prompt** ⏱️ 15 min
**Where:** LangSmith Dashboard → `nexa-liaison-response`  
**What:** Add canvas action detection logic  
**Test:** Send "make it blue" → Should return `action.type = "canvas_modify"`

---

### **Step 2: Pass Canvas State to API** ⏱️ 30 min
**Files:**
- `src/app/api/ai-sidebar/stream/route.ts`
- `src/app/api/ai-sidebar/message/route.ts`
- `src/components/ai-sidebar/AISidebar.tsx`
- `src/app/solutioning/page.tsx` (add `data-canvas-modal` attribute)

**What:**
- Detect if Canvas is open
- Send `canvasActive` and `sessionId` to API
- Pass to LangChain context

**Test:** 
- Canvas open → `canvas_active = "true"`
- Canvas closed → `canvas_active = "false"`

---

### **Step 3: Handle Actions in Liaison** ⏱️ 1 hour
**File:** `src/components/ai-sidebar/AISidebar.tsx`

**What:**
- Add `handleAction()` function
- Get current HTML from Canvas
- Call Maestro API with instruction
- Update Canvas PDF with new HTML
- Dispatch events for status

**Test:**
- Send "make it blue"
- Check Network tab for Maestro API call
- Verify HTML retrieved and modified

---

### **Step 4: Listen for Updates in Canvas** ⏱️ 30 min
**File:** `src/app/solutioning/page.tsx`

**What:**
- Listen for `canvas-pdf-update` event
- Update `previewBlob` state
- Revoke old blob URL
- Store/clear sessionId in localStorage

**Test:**
- Maestro completes → Iframe updates with new PDF
- Old blob revoked
- No memory leaks

---

### **Step 5: Add Loading State** ⏱️ 15 min
**Files:**
- `src/app/solutioning/page.tsx` (overlay)
- `src/components/ai-sidebar/AISidebar.tsx` (events)

**What:**
- Add `maestroProcessing` state
- Listen for `canvas-maestro-start/end` events
- Show loading overlay on Canvas

**Test:**
- Trigger Maestro → See spinner
- Completion → Spinner disappears

---

## 🧪 **TESTING FLOW**

1. Open Canvas modal (click "Hyper-Canvas" button)
2. Verify Liaison sidebar is accessible
3. In Liaison, type: "make the title blue"
4. Watch for:
   - ✅ Liaison responds normally
   - ✅ Loading spinner appears on Canvas
   - ✅ Maestro API called (check Network tab)
   - ✅ PDF regenerates
   - ✅ Iframe updates
   - ✅ Loading spinner disappears

**Expected Time:** ~10-15 seconds from message to updated PDF

---

## 🎯 **SUCCESS = THIS WORKS:**

```
User types: "make it blue"
     ↓
Liaison: "I'll change the title to blue."
     ↓
[Canvas shows loading spinner]
     ↓
[API calls: getCurrentHTML → Maestro → PDF microservice]
     ↓
[Canvas updates with blue title]
     ↓
DONE! 🎉
```

---

## 📊 **WHAT'S MISSING (INTENTIONALLY)**

Phase 1 doesn't include:
- ❌ Engagement loops (coming in Phase 3)
- ❌ Success announcements (coming in Phase 2)
- ❌ Activity logging (coming in Phase 2)
- ❌ Error handling (coming in Phase 2)
- ❌ Voice mode (coming in Phase 3)
- ❌ Canvas Context (coming in Phase 2)

**Why?** Focus on proving the technical flow works!

---

## 🛠️ **IMPLEMENTATION ORDER**

**Day 1:**
1. Update LangSmith prompt (15 min)
2. Pass canvas state (30 min)
3. Test detection works

**Day 1 (continued):**
4. Implement action handler (1 hour)
5. Test Maestro calls work

**Day 1 (final):**
6. Add event listeners (30 min)
7. Add loading state (15 min)
8. End-to-end test (30 min)

**Total: 3-4 hours**

---

## 🚨 **COMMON ISSUES & SOLUTIONS**

### **Issue: Liaison doesn't detect action**
- Check LangSmith prompt is updated
- Verify `canvas_active = "true"` in API logs
- Try more explicit command: "make the title color blue"

### **Issue: Maestro API fails**
- Check sessionId is passed correctly
- Verify current HTML is retrieved
- Check Maestro API logs for errors

### **Issue: PDF doesn't update**
- Check `canvas-pdf-update` event is dispatched
- Verify blob URL is created
- Check iframe src is updated

### **Issue: Loading state stuck**
- Check `canvas-maestro-end` event is dispatched
- Verify event listener is attached
- Check for try-catch issues

---

## 📝 **CODE SNIPPETS**

### **Detect Canvas State (AISidebar.tsx):**
```typescript
const getCanvasState = () => {
  const canvasModal = document.querySelector('[data-canvas-modal]')
  const isOpen = canvasModal !== null
  const sessionId = window.localStorage.getItem('current-canvas-session')
  return { canvasActive: isOpen, sessionId }
}
```

### **Update PDF (AISidebar.tsx):**
```typescript
const updateCanvasPDF = async (htmlTemplate: string) => {
  const response = await fetch('/api/hyper-canvas/template-to-pdf', {
    method: 'POST',
    body: JSON.stringify({ htmlTemplate })
  })
  const pdfBlob = await response.blob()
  const pdfUrl = URL.createObjectURL(pdfBlob)
  window.dispatchEvent(new CustomEvent('canvas-pdf-update', { 
    detail: { pdfUrl } 
  }))
}
```

### **Listen for Update (page.tsx):**
```typescript
useEffect(() => {
  const handlePDFUpdate = (event: CustomEvent) => {
    if (previewBlob) URL.revokeObjectURL(previewBlob)
    setPreviewBlob(event.detail.pdfUrl)
  }
  window.addEventListener('canvas-pdf-update', handlePDFUpdate)
  return () => window.removeEventListener('canvas-pdf-update', handlePDFUpdate)
}, [previewBlob])
```

---

**Ready to implement?** Start with Step 1! 🚀


