# 🎨 Canvas + Liaison Integration — REFINED IMPLEMENTATION PLAN

**Date:** October 17, 2025  
**Status:** 📋 Planning - Awaiting Approval  
**Estimated Total Complexity:** ⭐⭐⭐⭐⚠️ (Very High - 4.5/5)  
**Estimated Timeline:** 16-20 hours (3-4 work days)

---

## 🎯 **GOAL**

Replace Hyper-Canvas modal's embedded chat with global Liaison integration, enabling:
- Liaison as the single conversational interface for all AI interactions
- Canvas PDF preview in dedicated modal (no embedded chat)
- Maestro document modifications triggered via Liaison actions
- Continuous engagement loops while Maestro processes
- Seamless PDF updates with success/failure announcements
- Full activity logging and context preservation

---

## 📐 **ARCHITECTURAL OVERVIEW**

### **Current State:**
```
┌─────────────────────────────────────────┐
│  Hyper-Canvas Modal                     │
│  ┌─────────────┐  ┌─────────────────┐  │
│  │ ChatInterface│  │  PDF Preview    │  │
│  │ (Quickshot)  │  │                 │  │
│  │              │  │                 │  │
│  └─────────────┘  └─────────────────┘  │
└─────────────────────────────────────────┘
```

### **New State:**
```
┌──────────────────┐  ┌────────────────────────────┐
│ Liaison Sidebar  │  │  Canvas PDF Modal          │
│ (Global)         │  │  (Fullscreen - sidebar)    │
│                  │  │                            │
│ • Hidden         │  │  ┌──────────────────────┐ │
│ • Pre-Response   │  │  │                      │ │
│ • Response       │  │  │   PDF Preview        │ │
│ • Activity Logs  │  │  │   (Auto-updates)     │ │
│ • Voice Mode     │  │  │                      │ │
│                  │  │  └──────────────────────┘ │
└──────────────────┘  └────────────────────────────┘
```

### **Thread Architecture:**
```
┌────────────────────────────────────────────────────┐
│  Single LangSmith Thread (PostgreSQL-backed)       │
│                                                    │
│  ┌──────────────────┐  ┌───────────────────────┐ │
│  │ Liaison Context  │  │ Maestro Context       │ │
│  │ - Full chat      │  │ - Requests only       │ │
│  │ - Activities     │  │ - Params explanation  │ │
│  │ - User messages  │  │ - No general chat     │ │
│  └──────────────────┘  └───────────────────────┘ │
└────────────────────────────────────────────────────┘
```

---

## 🔄 **CRITICAL WORKFLOW: MAESTRO ENGAGEMENT LOOP**

### **The Full Cycle:**

When Liaison action triggers Maestro:

```
1. User: "Make the timeline more aggressive"
   ↓
2. Liaison processes normally:
   - Hidden message (if complex)
   - Pre-response ("Got it, adjusting timeline...")
   - Response ("I'm compressing your timeline phases...")
   ↓
3. Action detected: { type: "canvas_modify", params: {...} }
   ↓
4. START MAESTRO CALL (async, non-blocking)
   ↓
5. ENTER ENGAGEMENT LOOP:
   
   WHILE (Maestro not done AND iterations < max):
     a) Post hidden message from pool
     b) Generate pre-response via LangSmith
     c) Generate full response via LangSmith
     d) Stream/play pre-response
     e) Stream/play response
     f) CHECK: Is Maestro done?
        - YES → Render PDF immediately, continue cycle
        - NO → Continue loop
   
   END WHILE
   ↓
6. MAESTRO COMPLETES (during or after cycle):
   - If during cycle: PDF already rendered, cycle completes naturally
   - If after cycle: Render PDF, then announce
   ↓
7. POST-MAESTRO ANNOUNCEMENT:
   - Success: "✅ Done! Your timeline is now more aggressive."
   - Failure: "❌ Failed to update document. Please try again."
   - Generate audio if voice mode
   - Add cyan activity log
   - Add to contexts
   ↓
8. RETURN TO NORMAL STATE
```

### **Key Considerations:**
- ✅ Maestro call is **fire-and-forget** (async)
- ✅ Engagement loop runs **full cycles** (not just hidden messages)
- ✅ PDF renders **as soon as** Maestro completes (even mid-cycle)
- ✅ Current cycle **continues** after PDF render (no interruption)
- ✅ User stays **engaged** with real AI responses (not just filler)
- ✅ Max iterations: **5 cycles** (each cycle ~6-10 seconds = 30-50 seconds max)
- ✅ If Maestro exceeds max time → timeout error

---

## 📦 **IMPLEMENTATION PHASES**

---

## **PHASE 1: REMOVE QUICKSHOT SYSTEM**
**Complexity:** ⭐ (Low - 1/5)  
**Time:** 30 minutes  
**Risk:** Low (clean removal, no dependencies)

### **Objective:**
Completely remove Quickshot agent and ChatInterface from Hyper-Canvas.

### **Files to DELETE:**
1. ✅ `src/components/hyper-canvas/ChatInterface.tsx` (216 lines)
2. ✅ `src/app/api/hyper-canvas/quickshot/route.ts` (if exists)

### **Files to MODIFY:**
1. `src/hooks/useHyperCanvasChat.ts`
   - Remove all Quickshot-related logic
   - Remove `sendMessage` function
   - Remove `messages` state
   - Remove `isTyping` state
   - Keep only: `initializeChat`, `getCurrentHTML`, `refreshDocumentPreview`
   - Rename to: `useCanvasMaestro.ts` (more accurate)

2. `src/lib/langchain/hyper-canvas-chat.ts`
   - Remove `createQuickshotChain()` function
   - Remove `chatTurn()` function
   - Keep only: `createMaestroChain()`, `maestroTurn()`

3. `src/app/solutioning/page.tsx`
   - Remove `ChatInterface` import
   - Remove chat-related props from `useHyperCanvasChat`
   - Remove `sendMessage` usage
   - Remove `messages` display

### **Testing:**
- ✅ App compiles without errors
- ✅ No Quickshot references in codebase
- ✅ Canvas modal opens without chat

---

## **PHASE 2: CANVAS CONTEXT & STATE MANAGEMENT**
**Complexity:** ⭐⭐⭐ (Medium-High - 3/5)  
**Time:** 2-3 hours  
**Risk:** Medium (state synchronization, context management)

### **Objective:**
Create global Canvas Context to manage state across Liaison and Canvas components.

### **Files to CREATE:**

#### 1. `src/contexts/canvas-context.tsx` (200 lines)
```typescript
interface CanvasState {
  // Mode
  isActive: boolean
  mode: 'idle' | 'processing' | 'error'
  
  // Document
  sessionId: string | null
  sessionData: any
  currentHTML: string | null
  pdfBlobUrl: string | null
  
  // Maestro
  threadId: string | null
  maestroProcessing: boolean
  maestroResponse: any | null
  maestroError: string | null
  
  // Actions
  openCanvas: (sessionData: any, sessionId: string) => Promise<void>
  closeCanvas: () => void
  updatePDF: (htmlTemplate: string) => Promise<void>
  getCurrentHTML: () => Promise<string>
  callMaestro: (instruction: string) => Promise<void>
  checkMaestroStatus: () => 'pending' | 'completed' | 'error'
}

export function CanvasProvider({ children }) {
  const [state, setState] = useState<CanvasState>({...})
  
  const openCanvas = async (sessionData, sessionId) => {
    // 1. Set mode to active
    // 2. Store sessionData and sessionId
    // 3. Initialize thread (or reuse existing)
    // 4. Fetch initial HTML
    // 5. Generate initial PDF
    // 6. Trigger Liaison sidebar open
  }
  
  const callMaestro = async (instruction: string) => {
    // 1. Set processing mode
    // 2. Get current HTML
    // 3. Call Maestro API (fire-and-forget)
    // 4. Store promise for status checking
    // 5. Return immediately (non-blocking)
  }
  
  const checkMaestroStatus = () => {
    // Check if maestroResponse or maestroError is set
    // Return status
  }
  
  const updatePDF = async (htmlTemplate: string) => {
    // 1. Call PDF microservice
    // 2. Get blob
    // 3. Create object URL
    // 4. Update state
    // 5. If canvas modal closed, reopen it
  }
  
  return (
    <CanvasContext.Provider value={state}>
      {children}
    </CanvasContext.Provider>
  )
}
```

### **Files to MODIFY:**

#### 2. `src/app/layout.tsx`
- Wrap with `<CanvasProvider>`

#### 3. `src/app/solutioning/page.tsx`
- Import `useCanvas` hook
- Replace `useHyperCanvasChat` with `useCanvas`
- Update "Hyper-Canvas" button handler to call `openCanvas()`

### **Testing:**
- ✅ Context provides all expected values
- ✅ Opening canvas sets state correctly
- ✅ State persists across component re-renders
- ✅ Closing canvas resets state

---

## **PHASE 3: CANVAS PDF MODAL**
**Complexity:** ⭐⭐ (Low-Medium - 2/5)  
**Time:** 1-2 hours  
**Risk:** Low (UI component, straightforward)

### **Objective:**
Create standalone PDF viewer modal that consumes Canvas Context.

### **Files to CREATE:**

#### 1. `src/components/canvas/CanvasPDFModal.tsx` (150 lines)
```typescript
export function CanvasPDFModal() {
  const { 
    isActive, 
    pdfBlobUrl, 
    maestroProcessing, 
    closeCanvas 
  } = useCanvas()
  
  if (!isActive) return null
  
  return (
    <div className="fixed inset-0 z-50 flex">
      {/* Backdrop */}
      <div 
        className="absolute inset-0 bg-black/80" 
        onClick={closeCanvas}
      />
      
      {/* Modal - takes space minus sidebar */}
      <div className="relative ml-[400px] flex-1 flex flex-col bg-nexa-dark-2">
        {/* Header */}
        <div className="p-4 border-b border-white/10 flex justify-between items-center">
          <h2>Canvas Preview</h2>
          <Button onClick={closeCanvas}>
            <X className="w-4 h-4" />
          </Button>
        </div>
        
        {/* PDF Preview */}
        <div className="flex-1 overflow-auto p-4">
          {maestroProcessing && (
            <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
              <div className="text-white">
                <LoadingSpinner />
                <p>Processing document changes...</p>
              </div>
            </div>
          )}
          
          {pdfBlobUrl ? (
            <iframe
              src={pdfBlobUrl}
              className="w-full h-full border-0"
              title="Canvas PDF Preview"
            />
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-white/60">Loading preview...</p>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

### **Files to MODIFY:**

#### 2. `src/app/solutioning/page.tsx`
- Remove old Hyper-Canvas modal code
- Add `<CanvasPDFModal />` (rendered globally, controlled by context)

### **Testing:**
- ✅ Modal opens when canvas activates
- ✅ PDF displays correctly
- ✅ Modal closes via X button or backdrop click
- ✅ Processing overlay shows during Maestro calls
- ✅ Modal takes correct screen space (minus sidebar)

---

## **PHASE 4: LIAISON ACTION DETECTION**
**Complexity:** ⭐⭐⭐ (Medium-High - 3/5)  
**Time:** 1-2 hours  
**Risk:** Medium (depends on LangSmith prompt quality)

### **Objective:**
Update Liaison's LangSmith prompt to detect and return canvas modification actions.

### **LangSmith Prompt to UPDATE:**

#### `nexa-liaison-response` 
Add to prompt instructions:

```markdown
## CANVAS MODIFICATION ACTIONS

When the user requests to modify the current document/canvas:
- Examples: "make it blue", "change timeline", "add a section", "make bolder"
- Contextual: "would look better in blue" → ask → user confirms → trigger
- Direct: "make it blue now!" → trigger immediately

**Action Format:**
{
  "response": "Clear explanation of what you're doing...",
  "action": {
    "type": "canvas_modify",
    "params": {
      "maestroInstruction": "Detailed instruction for Maestro to execute"
    }
  }
}

**Maestro Instruction Guidelines:**
- Be specific and actionable
- Reference exact elements/sections to modify
- Explain the desired outcome clearly
- Example: "Change the timeline section background color to blue (#0066CC). Make the text white for contrast."

**When Canvas is NOT Active:**
- Do NOT return canvas_modify actions
- Explain to user they need to open Canvas first

**Context Variable:**
- {canvas_active} = true/false (tells you if canvas is open)
```

### **Files to MODIFY:**

#### 1. `src/app/api/ai-sidebar/stream/route.ts`
- Pass `canvasActive` flag in context
- Extract from request body or detect from Canvas Context

#### 2. `src/app/api/ai-sidebar/message/route.ts`
- Same as above

### **Testing:**
- ✅ Prompt returns canvas_modify for "make it blue"
- ✅ Prompt asks for confirmation for ambiguous requests
- ✅ Prompt returns null action when canvas not active
- ✅ maestroInstruction is clear and actionable

---

## **PHASE 5: LIAISON MAESTRO HANDLER**
**Complexity:** ⭐⭐⭐⭐⭐ (Very High - 5/5)  
**Time:** 6-8 hours  
**Risk:** High (complex async logic, engagement loops, state management)

### **Objective:**
Implement the core Maestro engagement loop in Liaison with full cycle support.

### **Files to MODIFY:**

#### 1. `src/components/ai-sidebar/AISidebar.tsx`

**New State:**
```typescript
const [maestroLoopActive, setMaestroLoopActive] = useState(false)
const [maestroIterations, setMaestroIterations] = useState(0)
const maestroLoopRef = useRef<boolean>(false)
```

**Action Handler:**
```typescript
const handleAction = async (action: any) => {
  if (!action || action.type === null) return
  
  if (action.type === 'canvas_modify') {
    const { isActive, callMaestro, checkMaestroStatus, updatePDF } = useCanvas()
    
    if (!isActive) {
      console.error('Canvas not active, cannot trigger Maestro')
      return
    }
    
    // Log activity
    activityLogger.log({
      type: 'canvas_modification_started',
      workflow: 'canvas',
      data: { instruction: action.params.maestroInstruction }
    })
    
    // Set processing state
    setIsProcessing(true)
    setMaestroLoopActive(true)
    maestroLoopRef.current = true
    
    try {
      // 1. START MAESTRO (fire-and-forget)
      await callMaestro(action.params.maestroInstruction)
      
      // 2. ENGAGEMENT LOOP
      await maestroEngagementLoop()
      
      // 3. POST-MAESTRO ANNOUNCEMENT
      const status = checkMaestroStatus()
      if (status === 'completed') {
        await announceSuccess()
      } else if (status === 'error') {
        await announceFailure()
      }
      
    } catch (error) {
      console.error('Maestro workflow error:', error)
      await announceFailure()
    } finally {
      setIsProcessing(false)
      setMaestroLoopActive(false)
      maestroLoopRef.current = false
      setMaestroIterations(0)
    }
  }
}
```

**Engagement Loop:**
```typescript
const maestroEngagementLoop = async () => {
  const MAX_ITERATIONS = 5 // 5 full cycles max
  const { checkMaestroStatus, updatePDF, maestroResponse } = useCanvas()
  
  let iteration = 0
  
  while (maestroLoopRef.current && iteration < MAX_ITERATIONS) {
    iteration++
    setMaestroIterations(iteration)
    
    console.log(`[Maestro Loop] Starting cycle ${iteration}/${MAX_ITERATIONS}`)
    
    // Check if Maestro already done (before starting cycle)
    if (checkMaestroStatus() !== 'pending') {
      console.log('[Maestro Loop] Maestro completed before cycle, exiting')
      break
    }
    
    // Run FULL CYCLE: hidden → pre-response → response
    
    // 1. Hidden message from ambient pool
    const hidden = getRandomPoolAudio()
    if (hidden) {
      console.log('[Maestro Loop] Posting hidden from pool')
      await displayHiddenMessage(hidden.text, hidden.audio)
    }
    
    // 2. Generate and display pre-response
    console.log('[Maestro Loop] Generating pre-response')
    const previousMessagesText = formatMessagesForContext(messages)
    const preResult = await streamMessage(
      'pre-response', 
      'Processing document changes...', // Generic input for engagement
      previousMessagesText
    )
    
    // Check Maestro after pre-response
    if (checkMaestroStatus() === 'completed') {
      console.log('[Maestro Loop] Maestro completed during pre-response')
      await updatePDFFromMaestro()
      // Continue cycle to finish naturally
    }
    
    // Small delay
    await new Promise(resolve => setTimeout(resolve, 100))
    
    // 3. Generate and display response
    console.log('[Maestro Loop] Generating response')
    const responseResult = await streamMessage(
      'response',
      'Working on your document...',
      previousMessagesText
    )
    
    // Check Maestro after response
    if (checkMaestroStatus() === 'completed') {
      console.log('[Maestro Loop] Maestro completed during response')
      await updatePDFFromMaestro()
      // Exit loop after this cycle completes
      break
    }
    
    // Small delay before next iteration
    await new Promise(resolve => setTimeout(resolve, 500))
  }
  
  // Final check after loop
  if (checkMaestroStatus() === 'pending') {
    console.error('[Maestro Loop] Timeout - Maestro did not complete')
    throw new Error('Maestro timeout')
  }
  
  console.log('[Maestro Loop] Exiting after', iteration, 'iterations')
}
```

**Helper Functions:**
```typescript
const displayHiddenMessage = async (text: string, audio: AudioBuffer | null) => {
  const hiddenMsg: Message = {
    id: `hidden-${Date.now()}`,
    role: 'assistant',
    type: 'hidden',
    content: text,
    timestamp: new Date()
  }
  
  setMessages(prev => [...prev, hiddenMsg])
  
  if (voiceMode && audio) {
    await waitForAudioAndStreamText(text, audio, 'hidden', hiddenMsg.id)
  } else {
    // Just stream text
    await streamTextOnly(text, hiddenMsg.id)
  }
}

const updatePDFFromMaestro = async () => {
  const { maestroResponse, updatePDF } = useCanvas()
  
  if (maestroResponse?.modified_template) {
    console.log('[PDF Update] Updating PDF from Maestro response')
    await updatePDF(maestroResponse.modified_template)
    console.log('[PDF Update] PDF updated successfully')
  }
}

const announceSuccess = async () => {
  const successMessage = "✅ Done! Your document has been updated successfully."
  
  // Generate audio if voice mode
  let audio = null
  if (voiceMode) {
    audio = await textToSpeech(successMessage).catch(() => null)
  }
  
  // Post message
  const msg: Message = {
    id: `success-${Date.now()}`,
    role: 'assistant',
    type: 'response',
    content: successMessage,
    timestamp: new Date()
  }
  
  setMessages(prev => [...prev, msg])
  
  // Stream/play
  if (voiceMode && audio) {
    await waitForAudioAndStreamText(successMessage, audio, 'completion', msg.id)
  } else {
    await streamTextOnly(successMessage, msg.id)
  }
  
  // Log activity
  activityLogger.log({
    type: 'canvas_modification_completed',
    workflow: 'canvas',
    data: { success: true }
  })
}

const announceFailure = async () => {
  const { maestroError } = useCanvas()
  const failureMessage = "❌ Failed to update document. Please try again or rephrase your request."
  
  // Generate audio if voice mode
  let audio = null
  if (voiceMode) {
    audio = await textToSpeech(failureMessage).catch(() => null)
  }
  
  // Post message
  const msg: Message = {
    id: `error-${Date.now()}`,
    role: 'assistant',
    type: 'response',
    content: failureMessage,
    timestamp: new Date()
  }
  
  setMessages(prev => [...prev, msg])
  
  // Stream/play
  if (voiceMode && audio) {
    await waitForAudioAndStreamText(failureMessage, audio, 'error', msg.id)
  } else {
    await streamTextOnly(failureMessage, msg.id)
  }
  
  // Log activity
  activityLogger.log({
    type: 'canvas_modification_failed',
    workflow: 'canvas',
    data: { error: maestroError || 'Unknown error' }
  })
}
```

**Integrate with Existing Send Handler:**
```typescript
const handleSendMessage = async () => {
  // ... existing logic ...
  
  // After getting response:
  const responseResult = await streamMessage('response', trimmedInput, previousMessagesText)
  
  // NEW: Check for action
  if (responseResult.action && responseResult.action.type) {
    console.log('[Action Detected]', responseResult.action)
    await handleAction(responseResult.action)
  }
  
  // ... rest of logic ...
}
```

### **Testing:**
- ✅ Action triggers Maestro call
- ✅ Engagement loop runs full cycles
- ✅ PDF updates immediately when Maestro completes (even mid-cycle)
- ✅ Current cycle continues after PDF update
- ✅ Success announcement displays after loop
- ✅ Failure handled gracefully with error message
- ✅ Voice mode generates audio for all messages
- ✅ Processing state prevents new messages
- ✅ Activity logs appear in chat

---

## **PHASE 6: AMBIENT POOL UPDATE (10 per generation)**
**Complexity:** ⭐ (Low - 1/5)  
**Time:** 15 minutes  
**Risk:** Low (simple config change)

### **Objective:**
Update ambient pool to generate 10 messages at a time instead of 4.

### **Files to MODIFY:**

#### 1. `src/lib/ai-sidebar/ambient-pool-utils.ts`
```typescript
export const AMBIENT_POOL_CONFIG = {
  minSize: 3,
  targetSize: 10,  // Changed from 4
  refillThreshold: 3,
  maxConcurrent: 3
}
```

#### 2. LangSmith Prompt: `nexa-liaison-ambient-pool`
- Update to return array of 10 messages instead of 4
- Ensure they're diverse and engaging

### **Testing:**
- ✅ Pool generates 10 messages per request
- ✅ Pool refills correctly
- ✅ Messages are diverse and high quality

---

## **PHASE 7: ACTIVITY LOGGING ENHANCEMENTS**
**Complexity:** ⭐⭐ (Low-Medium - 2/5)  
**Time:** 1 hour  
**Risk:** Low (straightforward logging additions)

### **Objective:**
Add comprehensive activity logging for Canvas workflow.

### **Files to MODIFY:**

#### 1. `src/lib/activity-logger/types.ts`
Add new event types:
```typescript
export type ActivityEventType =
  | 'canvas_opened'
  | 'canvas_closed'
  | 'canvas_modification_started'
  | 'canvas_modification_completed'
  | 'canvas_modification_failed'
  | 'canvas_pdf_updated'
  // ... existing types
```

#### 2. `src/lib/activity-logger/activity-logger.ts`
Add formatters:
```typescript
formatForChat(log: ActivityLog): string {
  switch (log.type) {
    case 'canvas_opened':
      return '🎨 Canvas opened'
    case 'canvas_closed':
      return '🎨 Canvas closed'
    case 'canvas_modification_started':
      return `🔧 Modifying: ${log.data.instruction?.substring(0, 50)}...`
    case 'canvas_modification_completed':
      return '✅ Document updated successfully'
    case 'canvas_modification_failed':
      return `❌ Modification failed: ${log.data.error}`
    case 'canvas_pdf_updated':
      return '📄 PDF preview refreshed'
    // ... existing cases
  }
}
```

#### 3. Canvas Context (`src/contexts/canvas-context.tsx`)
Add logging calls:
```typescript
const openCanvas = async () => {
  activityLogger.log({
    type: 'canvas_opened',
    workflow: 'canvas',
    data: { sessionId }
  })
  // ... rest of logic
}

const closeCanvas = () => {
  activityLogger.log({
    type: 'canvas_closed',
    workflow: 'canvas',
    data: { sessionId }
  })
  // ... rest of logic
}

const updatePDF = async () => {
  activityLogger.log({
    type: 'canvas_pdf_updated',
    workflow: 'canvas',
    data: { timestamp: new Date() }
  })
  // ... rest of logic
}
```

### **Testing:**
- ✅ Activity logs appear in chat as cyan messages
- ✅ All Canvas events are logged
- ✅ Log messages are clear and informative
- ✅ Logs appear in real-time

---

## **PHASE 8: ERROR HANDLING & EDGE CASES**
**Complexity:** ⭐⭐⭐ (Medium-High - 3/5)  
**Time:** 2-3 hours  
**Risk:** Medium (many edge cases to handle)

### **Objective:**
Handle all failure scenarios gracefully.

### **Error Scenarios:**

#### 1. **Maestro Timeout** (>50 seconds)
```typescript
// In maestroEngagementLoop:
if (iteration >= MAX_ITERATIONS) {
  throw new Error('Maestro timeout: Document modification took too long')
}
```
**Handling:** 
- Show error message
- Log activity
- Return to normal state
- User can retry

#### 2. **Maestro API Error** (500, 400, etc.)
```typescript
// In Canvas Context callMaestro:
try {
  const response = await fetch('/api/hyper-canvas/maestro', {...})
  if (!response.ok) {
    const error = await response.json()
    setMaestroError(error.message)
    setMaestroResponse(null)
  }
} catch (error) {
  setMaestroError('Network error')
}
```
**Handling:**
- Catch in engagement loop
- Show user-friendly message
- Log error details
- Stop processing

#### 3. **PDF Generation Fails**
```typescript
// In updatePDF:
try {
  const response = await fetch('/api/hyper-canvas/template-to-pdf', {...})
  if (!response.ok) {
    throw new Error('PDF generation failed')
  }
} catch (error) {
  console.error('PDF generation error:', error)
  // Keep previous PDF visible
  // Show error toast
}
```
**Handling:**
- Don't update PDF blob
- Show error message
- Keep previous version visible

#### 4. **Canvas Closed During Processing**
```typescript
// In Canvas Context:
const closeCanvas = () => {
  if (maestroProcessing) {
    // Don't allow closing
    console.warn('Cannot close canvas during processing')
    return
  }
  
  setState(prev => ({ ...prev, isActive: false }))
}
```
**Handling:**
- Prevent closing during processing
- OR: allow close but auto-reopen when Maestro completes

#### 5. **Network Disconnection**
```typescript
// Global error handler:
window.addEventListener('offline', () => {
  // Show offline indicator
  // Pause Maestro loop
  // Show reconnecting message
})

window.addEventListener('online', () => {
  // Resume operations
  // Retry failed requests
})
```

#### 6. **Invalid Action from Liaison**
```typescript
// In handleAction:
if (!action.params?.maestroInstruction) {
  console.error('Invalid action: missing maestroInstruction')
  await announceFailure()
  return
}
```

### **Files to MODIFY:**
1. `src/contexts/canvas-context.tsx` - Add error states and handlers
2. `src/components/ai-sidebar/AISidebar.tsx` - Add try-catch blocks
3. `src/components/canvas/CanvasPDFModal.tsx` - Add error displays

### **Testing:**
- ✅ All error scenarios handled gracefully
- ✅ User is informed of errors clearly
- ✅ App doesn't crash or freeze
- ✅ Recovery path is clear
- ✅ Errors are logged properly

---

## **PHASE 9: MAESTRO CONTEXT FILTERING**
**Complexity:** ⭐⭐ (Low-Medium - 2/5)  
**Time:** 1 hour  
**Risk:** Low (simple message filtering)

### **Objective:**
Ensure Maestro only receives relevant context (requests + params), not full chat history.

### **Files to MODIFY:**

#### 1. `src/lib/langchain/hyper-canvas-chat.ts`

Update `maestroTurn` function:
```typescript
export async function maestroTurn(
  threadId: string,
  userId: string,
  sessionId: string,
  organizationId: string,
  instruction: string,
  currentTemplate: string,
  requestContext?: string // NEW: Optional request context
): Promise<any> {
  
  // Get ONLY request-related messages from history
  const messageHistory = getMessageHistory(threadId)
  const messages = await messageHistory.getMessages()
  
  // Filter to only user requests that triggered actions
  const requestMessages = messages.filter(msg => 
    msg._getType() === 'human' && 
    msg.content.includes('CANVAS_REQUEST:') // Tagged messages
  )
  
  // Build minimal context for Maestro
  const maestroContext = requestMessages
    .map(msg => {
      const content = msg.content.replace('CANVAS_REQUEST:', '')
      return `User request: ${content}`
    })
    .slice(-3) // Last 3 requests only
    .join('\n')
  
  // Add current request
  const fullContext = `${maestroContext}\n\nCurrent request: ${instruction}`
  if (requestContext) {
    fullContext += `\nAdditional context: ${requestContext}`
  }
  
  console.log('[Maestro Context]', fullContext)
  
  // ... rest of maestroTurn logic
}
```

#### 2. Canvas Context `callMaestro`
```typescript
const callMaestro = async (instruction: string) => {
  // Tag the instruction for Maestro context
  const taggedInstruction = `CANVAS_REQUEST: ${instruction}`
  
  // Add to thread history with tag
  await addToThreadHistory(taggedInstruction)
  
  // Call Maestro with minimal context
  const response = await fetch('/api/hyper-canvas/maestro', {
    method: 'POST',
    body: JSON.stringify({
      currentTemplate: currentHTML,
      maestroInstruction: instruction, // Clean version
      threadId,
      userId,
      sessionId,
      organizationId,
      requestContext: action.params.requestContext || ''
    })
  })
  
  // Store response
  const data = await response.json()
  setMaestroResponse(data)
}
```

### **Testing:**
- ✅ Maestro receives only request messages
- ✅ No full chat history sent to Maestro
- ✅ Context is clear and concise
- ✅ Maestro can still understand multi-turn requests

---

## **PHASE 10: INTEGRATION TESTING & POLISH**
**Complexity:** ⭐⭐⭐ (Medium-High - 3/5)  
**Time:** 2-3 hours  
**Risk:** Medium (finding and fixing integration bugs)

### **Objective:**
End-to-end testing and bug fixes.

### **Test Scenarios:**

#### 1. **Happy Path - Simple Request**
```
1. Open Canvas
2. "Make the title blue"
3. Verify: Liaison responds → Maestro called → PDF updates → Success message
```

#### 2. **Happy Path - Complex Request**
```
1. Open Canvas
2. "Make the timeline more aggressive and change the background to dark blue"
3. Verify: Multiple changes applied correctly
```

#### 3. **Engagement Loop - Slow Maestro**
```
1. Open Canvas
2. Send complex modification request
3. Verify: Multiple engagement cycles run
4. Verify: PDF updates when Maestro completes
5. Verify: Success announced after
```

#### 4. **Voice Mode - Full Flow**
```
1. Enable voice mode
2. Open Canvas
3. Send request
4. Verify: All messages have audio
5. Verify: Hidden, pre, response, success all play audio
```

#### 5. **Error - Maestro Timeout**
```
1. Simulate slow Maestro (delay API)
2. Send request
3. Verify: Max iterations reached → error message → normal state
```

#### 6. **Error - Maestro Fails**
```
1. Simulate Maestro error (return 500)
2. Send request
3. Verify: Error caught → user informed → activity logged
```

#### 7. **Multiple Requests - Sequential**
```
1. Send first request → completes
2. Send second request → completes
3. Verify: Both applied correctly, no state pollution
```

#### 8. **Canvas Close/Open**
```
1. Open Canvas
2. Close Canvas
3. Open Canvas again
4. Verify: State resets correctly
5. Verify: New PDF generated
```

#### 9. **Page Navigation**
```
1. Open Canvas on Solutioning
2. Navigate to Visuals (without closing Canvas)
3. Verify: Canvas closes (or stays open with warning?)
4. Navigate back
5. Verify: State is clean
```

#### 10. **Activity Logging**
```
1. Open Canvas → check cyan log
2. Trigger modification → check cyan log
3. PDF updates → check cyan log
4. Modification completes → check cyan log
5. Close Canvas → check cyan log
```

### **Polish Items:**
- [ ] Loading indicators smooth and consistent
- [ ] Animations feel natural
- [ ] Error messages are user-friendly
- [ ] Success messages are satisfying
- [ ] Voice mode audio quality is good
- [ ] PDF updates feel instant
- [ ] No console errors
- [ ] No memory leaks
- [ ] Performance is good (no lag)

---

## 📊 **COMPLEXITY BREAKDOWN**

| Phase | Component | Complexity | Time | Risk Level |
|-------|-----------|------------|------|------------|
| 1 | Remove Quickshot | ⭐ | 30 min | Low |
| 2 | Canvas Context | ⭐⭐⭐ | 2-3 hrs | Medium |
| 3 | PDF Modal | ⭐⭐ | 1-2 hrs | Low |
| 4 | Action Detection | ⭐⭐⭐ | 1-2 hrs | Medium |
| 5 | Maestro Handler | ⭐⭐⭐⭐⭐ | 6-8 hrs | High |
| 6 | Pool Update | ⭐ | 15 min | Low |
| 7 | Activity Logging | ⭐⭐ | 1 hr | Low |
| 8 | Error Handling | ⭐⭐⭐ | 2-3 hrs | Medium |
| 9 | Context Filtering | ⭐⭐ | 1 hr | Low |
| 10 | Testing & Polish | ⭐⭐⭐ | 2-3 hrs | Medium |
| **TOTAL** | **Full Integration** | **⭐⭐⭐⭐⚠️** | **16-20 hrs** | **High** |

---

## ⚠️ **CRITICAL RISKS**

### **Risk 1: Engagement Loop Complexity**
**Issue:** The full-cycle engagement loop is very complex with multiple async operations  
**Mitigation:**
- Thorough testing of all edge cases
- Clear console logging at each step
- Timeout mechanisms to prevent infinite loops
- State management with refs to avoid closure issues

### **Risk 2: State Synchronization**
**Issue:** Canvas Context, Liaison, and Maestro all managing state  
**Mitigation:**
- Single source of truth (Canvas Context)
- Clear data flow direction
- Use context callbacks, not direct state mutations
- Add state debugging tools

### **Risk 3: Race Conditions**
**Issue:** Maestro completes during engagement cycle - PDF update timing  
**Mitigation:**
- Check Maestro status at multiple points
- Use flags (refs) for immediate checks
- Clear promise handling
- Test with artificial delays

### **Risk 4: Memory Leaks**
**Issue:** Many async operations, event listeners, intervals  
**Mitigation:**
- Clean up all timeouts/intervals on unmount
- Remove event listeners properly
- Cancel pending requests on unmount
- Test with React DevTools profiler

### **Risk 5: Voice Mode Performance**
**Issue:** Generating audio for many messages in engagement loop  
**Mitigation:**
- Use ambient pool for hidden messages (pre-generated)
- Generate audio in parallel with API calls
- Have fallback to text-only if audio fails
- Monitor audio generation times

---

## 🎯 **SUCCESS CRITERIA**

### **Must Have (P0):**
- ✅ Quickshot completely removed
- ✅ Canvas opens Liaison + PDF modal (no embedded chat)
- ✅ Liaison detects canvas modification requests
- ✅ Maestro called automatically via Liaison actions
- ✅ Engagement loop runs during Maestro processing
- ✅ PDF updates when Maestro completes
- ✅ Success/failure announced in chat
- ✅ Activity logs visible in chat
- ✅ Voice mode works throughout
- ✅ Error handling prevents crashes

### **Should Have (P1):**
- ✅ Engagement loop feels natural (not spammy)
- ✅ PDF updates feel instant (<500ms after Maestro)
- ✅ Error messages are clear and actionable
- ✅ Canvas state persists correctly
- ✅ Performance is good (no lag)

### **Nice to Have (P2):**
- ✅ Animations are smooth
- ✅ Loading indicators are beautiful
- ✅ Success messages are delightful
- ✅ Audio quality is excellent
- ✅ Code is well-documented

---

## 🚀 **DEPLOYMENT STRATEGY**

### **Phase 1: Local Development**
1. Implement Phases 1-9
2. Test each phase individually
3. Run integration tests
4. Fix all P0 bugs

### **Phase 2: Staging Deployment**
1. Deploy to staging environment
2. Test with real users
3. Gather feedback
4. Fix P1 bugs

### **Phase 3: Production Deployment**
1. Deploy to production
2. Monitor for errors
3. Quick fixes if needed
4. Celebrate! 🎉

---

## 📝 **APPROVAL CHECKLIST**

Before implementation begins, confirm:

- [ ] Architecture approved
- [ ] Engagement loop logic approved
- [ ] Error handling strategy approved
- [ ] Complexity understood and accepted
- [ ] Timeline is reasonable
- [ ] Success criteria clear
- [ ] All questions answered
- [ ] Ready to proceed

---

**Status:** 📋 **AWAITING APPROVAL**  
**Next Step:** User reviews plan → Approves/Declines → Implementation begins

---

## 💭 **NOTES FOR IMPLEMENTER**

1. **Start with Phase 1** - Clean removal of Quickshot is the foundation
2. **Phase 5 is the hardest** - The Maestro engagement loop requires careful attention
3. **Test frequently** - Don't wait until the end to test integration
4. **Use console logs liberally** - You'll need them for debugging
5. **Keep Canvas Context simple** - Don't overcomplicate state management
6. **Voice mode last** - Get text mode working first, then add audio
7. **Error handling is critical** - Don't skip Phase 8
8. **User experience matters** - Make it feel smooth and natural

**Good luck! This is a complex but exciting feature.** 🚀

