# 🧪 Canvas + Maestro Proof of Concept — Testing Guide

**Date:** October 17, 2025  
**Status:** ✅ **IMPLEMENTED - Ready to Test**

---

## ✅ **WHAT WAS IMPLEMENTED**

### **Core Flow:**
```
User message in Liaison
    ↓
Liaison detects canvas_modify action
    ↓
Get current HTML from sessionData
    ↓
Call Maestro with HTML + instruction
    ↓
Maestro returns modified HTML
    ↓
Convert HTML to PDF blob
    ↓
Dispatch event to Canvas
    ↓
Canvas iframe updates with new PDF
```

### **Files Modified:**

1. **`src/app/solutioning/page.tsx`**
   - Added `data-canvas-modal`, `data-session-id`, `data-session-data` attributes to Canvas modal
   - Added event listener for `canvas-pdf-update` events
   - Automatically updates PDF blob when event is received

2. **`src/components/ai-sidebar/AISidebar.tsx`**
   - Added `getCanvasState()` helper to detect if Canvas is open
   - Added `handleAction()` to process canvas_modify actions
   - Implements full Maestro workflow: HTML → Maestro → PDF → Event
   - Passes `canvasActive` flag to API

3. **`src/app/api/ai-sidebar/stream/route.ts`**
   - Accepts `canvasActive` parameter from frontend
   - Passes `canvas_active` to LangSmith prompt
   - Logs canvas state for debugging

---

## 🧪 **HOW TO TEST**

### **Prerequisites:**
- ✅ You've updated the `nexa-liaison-response` prompt in LangSmith with Canvas action detection
- ✅ Server is running (`npm run dev`)

### **Test Steps:**

#### **1. Open Solutioning Page**
```
http://localhost:5000/solutioning
```

#### **2. Create or Load a Session**
- Fill in basic information (client, title, etc.)
- Add some current solution content
- Make sure you have a valid session with data

#### **3. Open Canvas Modal**
- Click the "Hyper-Canvas" button
- Wait for PDF preview to load
- Verify you can see the PDF in the left panel
- Verify Liaison sidebar is accessible on the right

#### **4. Test Canvas Action Detection**

**In Liaison chat, try these messages:**

✅ **Direct Action (Should Trigger):**
```
"Make the title blue"
```

✅ **Specific Action (Should Trigger):**
```
"Change the timeline section background to dark gray"
```

✅ **Action with Details (Should Trigger):**
```
"Make all headings bigger and bold"
```

❌ **Vague Request (Should NOT Trigger - or ask for clarification):**
```
"Make it prettier"
```

❌ **Non-Canvas Request (Should NOT Trigger):**
```
"What is the current solution?"
```

---

## 📊 **WHAT TO WATCH FOR**

### **In Browser Console:**

#### **When Canvas Opens:**
```
[Canvas State] Canvas is open: { sessionId: "...", hasSessionData: true }
```

#### **When You Send a Message:**
```
[Liaison API] Canvas active: true
```

#### **When Action is Detected:**
```
[Action] Detected: { type: "canvas_modify", params: { ... } }
[Canvas Action] 🎨 Canvas modification requested
[Canvas Action] Instruction: "Make the title blue..."
```

#### **HTML Retrieval:**
```
[Canvas Action] 📄 Getting current HTML template...
[Canvas Action] ✅ Got HTML template: 12345 characters
```

#### **Maestro Call:**
```
[Canvas Action] 🎭 Calling Maestro...
[Canvas Action] ✅ Maestro completed: "Changed title color to blue..."
```

#### **PDF Generation:**
```
[Canvas Action] 📄 Converting to PDF...
[Canvas Action] ✅ PDF generated, dispatching update event
```

#### **Canvas Update:**
```
[Canvas] 🎨 Received PDF update from Liaison: blob:...
[Canvas Action] 🎉 Canvas modification complete!
```

### **In UI:**

1. ✅ **Liaison Response:**
   - Should say something like: "I'll change the title to blue..."
   
2. ✅ **Canvas PDF:**
   - Should update with new version showing the changes
   - May take 5-15 seconds depending on Maestro speed

3. ✅ **No Crashes:**
   - App should not freeze or crash
   - Liaison should remain responsive

---

## 🐛 **COMMON ISSUES & DEBUGGING**

### **Issue: "Action not detected"**
**Check:**
- Console shows `[Liaison API] Canvas active: true`
- If false, Canvas modal might not be properly detected
- Check that `data-canvas-modal="true"` attribute exists on modal

**Solution:**
- Inspect Canvas modal in DevTools
- Verify attributes are present
- Refresh page and try again

---

### **Issue: "Cannot modify canvas: missing session data"**
**Check:**
- Console shows `sessionId` and `hasSessionData: true`
- If not, sessionData might not be properly passed

**Solution:**
- Make sure you filled in some content in the solutioning form
- Check that `data-session-data` attribute has valid JSON
- Try saving the session first, then opening Canvas

---

### **Issue: "Failed to get current HTML"**
**Check:**
- Network tab shows request to `/api/solutioning/preview-html`
- Response should be HTML (not error)

**Solution:**
- Check that sessionData is valid
- Check API logs for errors
- Make sure the preview-html API endpoint exists and works

---

### **Issue: "Maestro API failed"**
**Check:**
- Network tab shows request to `/api/hyper-canvas/maestro`
- Check response status and error message

**Solution:**
- Check Maestro API logs
- Verify userId and organizationId are passed correctly
- Check LangSmith for prompt errors

---

### **Issue: "PDF conversion failed"**
**Check:**
- Network tab shows request to `/api/hyper-canvas/template-to-pdf`
- Check if PDF microservice is running

**Solution:**
- Verify PDF microservice URL is correct
- Check if modified HTML from Maestro is valid
- Look for PDF service logs

---

### **Issue: "Canvas doesn't update"**
**Check:**
- Console shows `[Canvas] 🎨 Received PDF update` message
- If not, event might not be dispatched

**Solution:**
- Check that `canvas-pdf-update` event is dispatched
- Verify event listener is attached
- Check for JavaScript errors in console

---

## 🎯 **SUCCESS CRITERIA**

### **✅ Proof of Concept Works If:**

1. ✅ Liaison detects "make it blue" as a canvas_modify action
2. ✅ HTML is retrieved from sessionData (12K-50K characters typically)
3. ✅ Maestro API is called successfully
4. ✅ Modified HTML is returned from Maestro
5. ✅ PDF is generated from modified HTML
6. ✅ Canvas iframe updates to show new PDF
7. ✅ Changes are visible in the PDF (e.g., title is actually blue)

### **⚠️ Known Limitations (Expected):**
- No loading spinner during processing (coming in next phase)
- No success/failure messages (coming in next phase)
- No error handling (just console logs for now)
- No engagement loops (coming in next phase)
- Quickshot still exists (will be removed in next phase)

---

## 📸 **SCREENSHOT CHECKLIST**

If successful, you should be able to:

1. 📸 Show Canvas modal with PDF on left, Liaison on right
2. 📸 Show Liaison message: "make the title blue"
3. 📸 Show Liaison response acknowledging the request
4. 📸 Show console logs with full workflow
5. 📸 Show PDF before modification
6. 📸 Show PDF after modification (with blue title)

---

## 🚀 **NEXT STEPS (After Successful Test)**

If proof of concept works:

### **Phase 2: Enhanced Implementation** (8-12 hours)
- ✅ Canvas Context for global state management
- ✅ Remove Quickshot agent
- ✅ Add comprehensive error handling
- ✅ Add activity logging (cyan messages)
- ✅ Add success/failure announcements

### **Phase 3: Engagement & Polish** (4-6 hours)
- ✅ Add engagement loops (hidden messages during processing)
- ✅ Voice mode integration
- ✅ Loading states and animations
- ✅ Polish user experience

---

## 🔍 **DEBUGGING TIPS**

### **Enable Verbose Logging:**
All console logs are prefixed with tags:
- `[Canvas State]` - Canvas detection
- `[Liaison API]` - API calls
- `[Action]` - Action detection
- `[Canvas Action]` - Maestro workflow
- `[Canvas]` - Canvas updates

### **Check Network Tab:**
Look for these requests:
1. `/api/ai-sidebar/stream` (should include `canvasActive: true`)
2. `/api/solutioning/preview-html` (should return HTML)
3. `/api/hyper-canvas/maestro` (should return modified HTML)
4. `/api/hyper-canvas/template-to-pdf` (should return PDF blob)

### **Check LangSmith:**
- Go to LangSmith dashboard
- Look for recent `nexa-liaison-response` runs
- Check if `canvas_active` variable is passed
- Check if action is returned in response

---

## 📝 **TEST RESULTS TEMPLATE**

```
## Test Results - [Date/Time]

### Environment:
- Browser: [Chrome/Firefox/etc]
- Server: [localhost:5000]
- Canvas Session: [Has data? Y/N]

### Test Case: "Make the title blue"
- ✅/❌ Action detected
- ✅/❌ HTML retrieved (size: ___ characters)
- ✅/❌ Maestro called successfully
- ✅/❌ Modified HTML returned
- ✅/❌ PDF generated
- ✅/❌ Canvas updated
- ✅/❌ Changes visible in PDF

### Console Logs:
[Paste relevant console logs]

### Screenshots:
[Attach before/after screenshots]

### Issues Found:
[List any issues or errors]

### Notes:
[Any additional observations]
```

---

**Status:** 📋 **Ready to Test!**  
**Next:** Run test, collect results, decide on next phase

Good luck! 🎉

