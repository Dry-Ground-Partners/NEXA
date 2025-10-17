# 🎯 Canvas + Maestro Integration — PHASE 1 (Core Flow)

**Date:** October 17, 2025  
**Status:** 📋 Planning - Ready for Implementation  
**Complexity:** ⭐⭐⭐ (Medium-High - 3/5)  
**Timeline:** 3-4 hours

---

## 🎯 **GOAL: CORE FLOW ONLY**

Implement the essential Maestro workflow:
1. ✅ User opens Canvas (already works)
2. ✅ Liaison chat accessible alongside Canvas (already works)
3. 🔄 User sends message in Liaison → Liaison detects canvas action → Triggers Maestro
4. 🔄 Maestro receives HTML + instruction → Returns modified HTML
5. 🔄 Modified HTML → PDF microservice → New blob → Re-render iframe

**What we're NOT doing in Phase 1:**
- ❌ Full state management (Canvas Context)
- ❌ Engagement loops (hidden messages during processing)
- ❌ Quickshot removal (can coexist for now)
- ❌ Comprehensive error handling
- ❌ Activity logging
- ❌ Voice mode audio
- ❌ Success/failure announcements

**Why this approach:**
- ✅ Validates core technical flow
- ✅ Minimal changes to existing code
- ✅ Quick to implement and test
- ✅ Easy to iterate on
- ✅ Proves the concept works end-to-end

---

## 📐 **SIMPLIFIED ARCHITECTURE**

```
┌──────────────────┐  ┌────────────────────────────┐
│ Liaison Sidebar  │  │  Canvas Modal              │
│                  │  │                            │
│ User: "Make it   │  │  ┌──────────────────────┐ │
│ blue"            │  │  │                      │ │
│                  │  │  │   PDF Preview        │ │
│ ↓                │  │  │   (iframe)           │ │
│ Detect action    │  │  │                      │ │
│ ↓                │  │  └──────────────────────┘ │
│ Call Maestro     │──────→ Get current HTML      │
│ ↓                │  │    ↓                      │
│ Get HTML back    │←────── Modified HTML         │
│ ↓                │  │    ↓                      │
│ Render PDF       │──────→ Update iframe blob    │
│                  │  │                            │
└──────────────────┘  └────────────────────────────┘
```

---

## 📦 **IMPLEMENTATION STEPS**

### **STEP 1: Update Liaison Response Prompt** ⏱️ 15 minutes

**File:** LangSmith → `nexa-liaison-response`

**Add to prompt:**
```markdown
## CANVAS MODIFICATION DETECTION

You can detect when a user wants to modify a document in the Canvas.

**Context Variable:**
- {canvas_active} = "true" or "false" (whether Canvas modal is currently open)

**When canvas_active = "true" AND user requests document modification:**
Examples:
- "make it blue"
- "change the timeline to be more aggressive"
- "add a section about pricing"
- "make the font bigger"

**Response Format:**
{
  "pre_response": "Your brief acknowledgment...",
  "response": "Your detailed explanation of what you're changing...",
  "action": {
    "type": "canvas_modify",
    "params": {
      "instruction": "Clear, specific instruction for Maestro. Example: 'Change the timeline section background to blue (#0066CC) and make text white for contrast.'"
    }
  }
}

**When canvas_active = "false":**
- Do NOT return canvas_modify actions
- If user requests document changes, say: "Please open Canvas first to modify the document."

**Important:**
- Only trigger for DIRECT modification requests
- Be specific in the instruction (mention colors, sections, exact changes)
- instruction should be implementable by an AI that only sees HTML
```

**Testing:**
```
Input: "make the title blue" (canvas_active=true)
Expected: action.type = "canvas_modify", instruction includes color code

Input: "make it prettier" (canvas_active=false)
Expected: No action, response tells user to open Canvas
```

---

### **STEP 2: Pass Canvas State to Liaison API** ⏱️ 30 minutes

**Files to modify:**
1. `src/app/api/ai-sidebar/stream/route.ts`
2. `src/app/api/ai-sidebar/message/route.ts`

**Changes:**

#### 1. Add Canvas State Detection
```typescript
// In both route files, before calling LangChain:

// Check if Canvas is open
const canvasActive = requestBody.canvasActive || false
const sessionId = requestBody.sessionId || null

console.log('[Liaison] Canvas active:', canvasActive, 'Session ID:', sessionId)
```

#### 2. Pass to LangChain Context
```typescript
// When pulling prompt and executing:
const context = {
  ...existingContext,
  canvas_active: canvasActive ? "true" : "false",
  session_id: sessionId || "none"
}

// Pass context to prompt
await prompt.invoke({
  ...variables,
  canvas_active: context.canvas_active
})
```

#### 3. Frontend: Send Canvas State
In `src/components/ai-sidebar/AISidebar.tsx`:

```typescript
// Add this helper to detect canvas state
const getCanvasState = () => {
  // For Phase 1, detect by checking if modal is visible
  const canvasModal = document.querySelector('[data-canvas-modal]')
  const isOpen = canvasModal !== null
  
  // Try to get sessionId from page state
  // (Later this will come from Canvas Context)
  const sessionId = window.localStorage.getItem('current-canvas-session')
  
  return { canvasActive: isOpen, sessionId }
}

// In handleSendMessage, add to request body:
const { canvasActive, sessionId } = getCanvasState()

const response = await fetch('/api/ai-sidebar/message', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    message: trimmedInput,
    organizationId,
    canvasActive,
    sessionId
  })
})
```

#### 4. Add data attribute to Canvas modal
In `src/app/solutioning/page.tsx`, add to modal div:
```typescript
<div 
  data-canvas-modal="true"
  className="fixed top-0 bottom-0 left-0 right-96 ..."
>
```

**Testing:**
- Open Canvas → Send message → Check logs: canvas_active should be "true"
- Close Canvas → Send message → Check logs: canvas_active should be "false"

---

### **STEP 3: Handle Canvas Actions in Liaison** ⏱️ 1 hour

**File:** `src/components/ai-sidebar/AISidebar.tsx`

**Add action handler:**

```typescript
// Near the top with other state
const [isProcessingMaestro, setIsProcessingMaestro] = useState(false)

// Helper to get current HTML from Canvas
const getCurrentCanvasHTML = async (sessionId: string) => {
  try {
    const response = await fetch('/api/hyper-canvas/html/get-latest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ sessionId })
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.success && data.html) {
        return data.html
      }
    }
    
    // Fallback: generate from session data
    return await generateHTMLFromSession(sessionId)
  } catch (error) {
    console.error('[Canvas] Failed to get HTML:', error)
    return null
  }
}

// Helper to call Maestro
const callMaestro = async (instruction: string, sessionId: string, currentHTML: string) => {
  try {
    console.log('[Maestro] Calling with instruction:', instruction)
    
    const response = await fetch('/api/hyper-canvas/maestro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentTemplate: currentHTML,
        maestroInstruction: instruction,
        sessionId,
        // These will need to be passed from context eventually
        userId: localStorage.getItem('userId'),
        organizationId: localStorage.getItem('organizationId'),
        threadId: sessionId // Using sessionId as threadId for now
      })
    })
    
    if (!response.ok) {
      throw new Error(`Maestro API error: ${response.status}`)
    }
    
    const data = await response.json()
    
    if (data.success) {
      console.log('[Maestro] Success:', data.explanation)
      return data.modified_template
    } else {
      throw new Error(data.error || 'Maestro failed')
    }
  } catch (error) {
    console.error('[Maestro] Error:', error)
    return null
  }
}

// Helper to update Canvas PDF
const updateCanvasPDF = async (htmlTemplate: string) => {
  try {
    console.log('[Canvas] Updating PDF with new HTML...')
    
    const response = await fetch('/api/hyper-canvas/template-to-pdf', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ htmlTemplate })
    })
    
    if (!response.ok) {
      throw new Error('PDF generation failed')
    }
    
    const pdfBlob = await response.blob()
    const pdfUrl = URL.createObjectURL(pdfBlob)
    
    // Trigger update event for Canvas to pick up
    window.dispatchEvent(new CustomEvent('canvas-pdf-update', { 
      detail: { pdfUrl } 
    }))
    
    console.log('[Canvas] PDF updated successfully')
    return true
  } catch (error) {
    console.error('[Canvas] PDF update failed:', error)
    return false
  }
}

// Main action handler
const handleAction = async (action: any) => {
  if (!action || action.type === null) return
  
  if (action.type === 'canvas_modify') {
    console.log('[Action] Canvas modification detected:', action.params.instruction)
    
    const { sessionId } = getCanvasState()
    
    if (!sessionId) {
      console.error('[Action] No session ID found')
      return
    }
    
    setIsProcessingMaestro(true)
    
    try {
      // 1. Get current HTML
      const currentHTML = await getCurrentCanvasHTML(sessionId)
      if (!currentHTML) {
        throw new Error('Could not get current HTML')
      }
      
      // 2. Call Maestro
      const modifiedHTML = await callMaestro(
        action.params.instruction,
        sessionId,
        currentHTML
      )
      
      if (!modifiedHTML) {
        throw new Error('Maestro did not return HTML')
      }
      
      // 3. Update PDF
      const success = await updateCanvasPDF(modifiedHTML)
      
      if (!success) {
        throw new Error('PDF update failed')
      }
      
      console.log('[Action] Canvas modification complete!')
      
    } catch (error) {
      console.error('[Action] Failed:', error)
      // For Phase 1, just log errors - no fancy error handling
    } finally {
      setIsProcessingMaestro(false)
    }
  }
}

// In handleSendMessage, after getting response:
// Add after streaming response message:
const responseResult = await streamMessage('response', trimmedInput, previousMessagesText)

// NEW: Check for action
if (responseResult.action && responseResult.action.type) {
  console.log('[Action Detected]', responseResult.action)
  // Run action handler (async, doesn't block chat)
  handleAction(responseResult.action).catch(err => {
    console.error('[Action Error]', err)
  })
}
```

**Testing:**
- Open Canvas → Send "make it blue" → Check logs for Maestro call
- Verify HTML is retrieved
- Verify Maestro is called with instruction
- Check for errors

---

### **STEP 4: Listen for PDF Updates in Canvas** ⏱️ 30 minutes

**File:** `src/app/solutioning/page.tsx`

**Add event listener:**

```typescript
// In the component, add useEffect to listen for updates
useEffect(() => {
  const handlePDFUpdate = (event: CustomEvent) => {
    const { pdfUrl } = event.detail
    console.log('[Canvas] Received PDF update event:', pdfUrl)
    
    // Revoke old blob URL
    if (previewBlob) {
      URL.revokeObjectURL(previewBlob)
    }
    
    // Set new blob URL
    setPreviewBlob(pdfUrl)
  }
  
  window.addEventListener('canvas-pdf-update', handlePDFUpdate as EventListener)
  
  return () => {
    window.removeEventListener('canvas-pdf-update', handlePDFUpdate as EventListener)
  }
}, [previewBlob])

// Also store sessionId in localStorage when opening Canvas
const openHyperCanvas = useCallback(() => {
  setShowHyperCanvas(true)
  generatePreviewBlob()
  
  // Store sessionId for Liaison to access
  if (sessionId) {
    localStorage.setItem('current-canvas-session', sessionId)
  }
  
  if (sessionId && user?.id) {
    initializeChat()
  }
}, [generatePreviewBlob, initializeChat, sessionId, user?.id])

// Clear sessionId when closing Canvas
const closeHyperCanvas = useCallback(() => {
  setShowHyperCanvas(false)
  localStorage.removeItem('current-canvas-session')
  
  if (previewBlob) {
    URL.revokeObjectURL(previewBlob)
    setPreviewBlob(null)
  }
  setPreviewLoading(false)
}, [previewBlob])
```

**Testing:**
- Open Canvas → Trigger Maestro via Liaison → Watch iframe update
- Verify old blob is revoked
- Verify new PDF displays

---

### **STEP 5: Add Simple Loading State** ⏱️ 15 minutes

**File:** `src/app/solutioning/page.tsx`

**Add loading indicator:**

```typescript
// Add state
const [maestroProcessing, setMaestroProcessing] = useState(false)

// Listen for processing state
useEffect(() => {
  const handleProcessingStart = () => setMaestroProcessing(true)
  const handleProcessingEnd = () => setMaestroProcessing(false)
  
  window.addEventListener('canvas-maestro-start', handleProcessingStart)
  window.addEventListener('canvas-maestro-end', handleProcessingEnd)
  
  return () => {
    window.removeEventListener('canvas-maestro-start', handleProcessingStart)
    window.removeEventListener('canvas-maestro-end', handleProcessingEnd)
  }
}, [])

// Update AISidebar.tsx to dispatch events:
// In handleAction:
setIsProcessingMaestro(true)
window.dispatchEvent(new CustomEvent('canvas-maestro-start'))

// After completion:
setIsProcessingMaestro(false)
window.dispatchEvent(new CustomEvent('canvas-maestro-end'))

// In Canvas modal JSX, add overlay:
{maestroProcessing && (
  <div className="absolute inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-10">
    <div className="text-white text-center">
      <div className="w-16 h-16 border-4 border-blue-500/30 border-t-blue-400 rounded-full animate-spin mx-auto mb-4" />
      <p className="text-lg font-medium">Processing changes...</p>
    </div>
  </div>
)}
```

**Testing:**
- Trigger Maestro → See loading overlay
- Wait for completion → Overlay disappears
- PDF updates

---

## 🧪 **TESTING CHECKLIST**

### **Basic Flow:**
- [ ] Open Canvas modal
- [ ] Liaison sidebar is accessible
- [ ] Send message: "make it blue" in Liaison
- [ ] Liaison detects action
- [ ] Maestro is called
- [ ] HTML is returned
- [ ] PDF is regenerated
- [ ] Iframe updates with new PDF
- [ ] Loading state shows during processing

### **Error Cases (basic):**
- [ ] Canvas closed while processing → No crash
- [ ] Invalid sessionId → Logs error, doesn't crash
- [ ] Maestro API error → Logs error, doesn't crash
- [ ] PDF generation error → Logs error, doesn't crash

### **State Management:**
- [ ] sessionId stored in localStorage
- [ ] sessionId cleared on close
- [ ] Old blob URLs revoked
- [ ] No memory leaks

---

## 📊 **WHAT WE'RE SKIPPING (For Later Phases)**

From the full plan, these are deferred:

### **Phase 2 Will Include:**
- ✅ Canvas Context (global state management)
- ✅ Proper thread management
- ✅ Remove Quickshot entirely
- ✅ Comprehensive error handling
- ✅ Activity logging with cyan messages
- ✅ Success/failure announcements

### **Phase 3 Will Include:**
- ✅ Engagement loops (hidden messages during processing)
- ✅ Voice mode audio for all steps
- ✅ Maestro context filtering
- ✅ Multiple iteration handling
- ✅ Recovery mechanisms

### **Phase 4 Will Include:**
- ✅ Ambient pool size update (10 messages)
- ✅ Full integration testing
- ✅ Performance optimization
- ✅ Polish and animations

---

## 🎯 **SUCCESS CRITERIA (Phase 1)**

**Must Work:**
- ✅ User can open Canvas and use Liaison simultaneously
- ✅ Liaison detects "make it blue" type requests when Canvas is open
- ✅ Maestro is called with current HTML + instruction
- ✅ Modified HTML is returned
- ✅ PDF is regenerated from new HTML
- ✅ Iframe updates to show new PDF
- ✅ Basic loading state during processing

**Can Be Rough:**
- ⚠️ Error messages can be console logs
- ⚠️ No fancy animations
- ⚠️ No engagement loops
- ⚠️ No voice mode
- ⚠️ State management is minimal

**Known Limitations:**
- ⚠️ Quickshot still exists (coexists with new flow)
- ⚠️ No Canvas Context yet
- ⚠️ localStorage for session passing (temporary)
- ⚠️ Window events for communication (temporary)
- ⚠️ No activity logs

---

## 🔄 **IMPLEMENTATION ORDER**

1. ✅ **Already Done:** Canvas modal doesn't block Liaison sidebar
2. 🔄 **Step 1:** Update Liaison prompt (15 min)
3. 🔄 **Step 2:** Pass canvas state to API (30 min)
4. 🔄 **Step 3:** Handle actions in Liaison (1 hour)
5. 🔄 **Step 4:** Listen for updates in Canvas (30 min)
6. 🔄 **Step 5:** Add loading state (15 min)

**Total Time:** ~3-4 hours

---

## 💭 **IMPLEMENTATION NOTES**

### **Why localStorage for sessionId?**
- Quick and dirty for Phase 1
- Will be replaced with Canvas Context in Phase 2
- Avoids prop drilling through components
- Easy to test

### **Why window events?**
- Decouples Liaison from Canvas temporarily
- No need to refactor entire component tree yet
- Easy to debug (can see events in console)
- Will be replaced with Context callbacks in Phase 2

### **Why not remove Quickshot?**
- Can coexist without conflicts
- Removing now adds complexity
- Phase 2 will clean it up properly
- Keeps this phase focused

### **Testing Strategy:**
- Test each step individually
- Use console logs liberally
- Watch Network tab for API calls
- Check blob URLs in DevTools
- Verify no memory leaks (check Memory tab)

---

**Status:** 📋 **READY TO IMPLEMENT**  
**Next:** Implement Steps 1-5 in order, testing each before moving to next

---

## 🚀 **AFTER PHASE 1 WORKS**

Once core flow is proven:
1. Refactor to use Canvas Context
2. Remove temporary localStorage/window events
3. Add comprehensive error handling
4. Add engagement loops
5. Remove Quickshot
6. Add activity logging
7. Add success/failure messages
8. Polish and optimize

**But for now: Keep it simple, prove the concept!** ✨

