# 🎨 Hyper-Canvas HTML Storage Optimization Plan

**Planning Date:** October 8, 2025  
**Goal:** Optimize token usage by storing HTML separately from conversation history  
**Status:** 📋 **PLANNING PHASE**

---

## 📊 **CURRENT STATE ANALYSIS**

### **What We Have Now (✅ Implemented)**

1. **Persistent Conversation History**
   - `PostgresChatMessageHistory` class stores messages in `hyper_canvas_messages` table
   - `RunnableWithMessageHistory` wraps Quickshot chain
   - Messages automatically loaded/saved to database
   - Thread-based conversations survive server restarts

2. **Message Flow**
   ```
   User → Quickshot (saves to DB) → Maestro → HTML Update → PDF Regeneration
   ```

3. **Current HTML Handling**
   - HTML generated from `sessionData` via `/api/solutioning/preview-html`
   - Extracted on-demand when Maestro is triggered
   - Maestro receives `currentTemplate` (full HTML)
   - Maestro returns `modified_template` (full modified HTML)
   - Modified HTML converted to PDF via `/api/hyper-canvas/template-to-pdf`

4. **Database Schema (Enhanced)**
   ```sql
   -- hyper_canvas_messages (active conversation)
   - session_id (thread_id)
   - message JSONB
   - role (user/assistant)
   - thread_id, user_id, organization_id, session_id
   
   -- ai_architecture_sessions (session storage)
   - threads JSONB (array of thread objects with html_snapshot)
   ```

---

## 🚨 **THE PROBLEM**

### **Token Cost Issue**

**HTML templates are MASSIVE:**
- Average solutioning HTML: **50,000 - 150,000 characters**
- Token cost: **~12,000 - 35,000 tokens per HTML**
- GPT-4o pricing: **$5/$15 per 1M tokens (input/output)**
- **Cost per HTML in context: $0.06 - $0.53**

**Current Risk (if HTML went into conversation):**
```typescript
// If we stored HTML in conversation history (BAD!):
const messages = [
  { role: 'user', content: 'Make timeline aggressive' },
  { role: 'assistant', content: 'I am compressing...' },
  { role: 'system', content: '<html>...150,000 chars...</html>' }, // ❌ 35k tokens!
  { role: 'user', content: 'Make headers blue' },
  { role: 'assistant', content: 'Switching to blue...' },
  { role: 'system', content: '<html>...150,000 chars...</html>' }, // ❌ Another 35k!
]
// Total: 70k+ tokens just for HTML!
// Cost: ~$1 per conversation turn!
```

**Current Behavior (Correct but can be optimized):**
- HTML is NOT currently stored in `hyper_canvas_messages` ✅
- HTML is extracted fresh each time Maestro is triggered ✅
- But we have no persistent HTML storage for thread continuity ⚠️

---

## 🎯 **THE SOLUTION**

### **Architecture: Separate HTML Storage**

**Core Principle:**
> "Conversation history = natural language only. HTML = separate storage, referenced by thread."

### **Storage Strategy:**

```
┌─────────────────────────────────────────────────┐
│     CONVERSATION HISTORY (Tokens matter!)       │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  ✅ User messages ("Make timeline aggressive")  │
│  ✅ Quickshot responses ("I'm compressing...")   │
│  ✅ message_to_maestro ("Reduce timeline...")    │
│  ✅ Maestro explanations ("Compressed by 30%")  │
│  ❌ NO HTML CODE                                │
└─────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────┐
│   HTML STORAGE (Separate, Latest Only!)         │
│  ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━  │
│  📄 Latest HTML per thread                      │
│  📄 Versioning for undo/redo (optional)         │
│  📄 Reference by thread_id                      │
│  📄 Not sent to LLM unless Maestro is triggered │
└─────────────────────────────────────────────────┘
```

---

## 🏗️ **REFINED ARCHITECTURE**

### **Database Schema Enhancement**

```sql
-- Option 1: Store in ai_architecture_sessions.threads (RECOMMENDED)
-- Already implemented! Just need to use it properly.

ALTER TABLE ai_architecture_sessions
ADD COLUMN IF NOT EXISTS threads JSONB DEFAULT '[]'::jsonb;

-- Structure:
{
  "threads": [
    {
      "thread_id": "thread_abc123...",
      "name": "Main editing conversation",
      "created_at": "2025-10-08T...",
      "last_active": "2025-10-08T...",
      "current_html": "<html>...latest version...</html>",  // ✅ LATEST HTML HERE
      "html_version": 5,  // Track version number
      "metadata": {
        "total_modifications": 5,
        "last_instruction": "Make headers blue"
      }
    }
  ]
}

-- Option 2: Separate table for HTML versions (if detailed history needed)
CREATE TABLE hyper_canvas_html_snapshots (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id TEXT NOT NULL,
  session_id UUID REFERENCES ai_architecture_sessions(uuid),
  version_number INTEGER NOT NULL,
  html_content TEXT NOT NULL,  -- The actual HTML
  modification_summary TEXT,    -- What changed
  created_at TIMESTAMP DEFAULT NOW(),
  
  -- Only keep latest per thread (or last N versions)
  UNIQUE(thread_id, version_number)
);

CREATE INDEX idx_html_snapshots_thread ON hyper_canvas_html_snapshots(thread_id);
CREATE INDEX idx_html_snapshots_latest ON hyper_canvas_html_snapshots(thread_id, version_number DESC);
```

---

## 🔄 **REVISED WORKFLOW**

### **Conversation Flow with Separate HTML Storage**

```typescript
// ═══════════════════════════════════════════════
// STEP 1: User sends message
// ═══════════════════════════════════════════════
User: "Make the timeline more aggressive"

// Saved to conversation history ✅
hyper_canvas_messages: [
  { role: 'user', content: 'Make the timeline more aggressive' }
]

// ═══════════════════════════════════════════════
// STEP 2: Quickshot processes
// ═══════════════════════════════════════════════
Quickshot Response: {
  maestro: true,
  message_to_maestro: "Reduce timeline durations, add urgency",
  chat_responses: [
    "Perfect! Compressing your timeline now ⚡",
    "Analyzing phases and reducing timeframes...",
    "Adding action-oriented language...",
    "Done! Timeline shows accelerated delivery 🚀"
  ]
}

// Saved to conversation history ✅
hyper_canvas_messages: [
  { role: 'user', content: 'Make the timeline more aggressive' },
  { role: 'assistant', content: 'Perfect! Compressing...' },
  { role: 'assistant', content: 'Analyzing phases...' },
  // etc.
]

// ═══════════════════════════════════════════════
// STEP 3: Maestro triggered (if maestro=true)
// ═══════════════════════════════════════════════

// 3a. Fetch LATEST HTML from storage (NOT from conversation!)
const latestHTML = await getLatestHTMLForThread(threadId)

// 3b. Maestro processes with context
const maestroInput = {
  instruction: "Reduce timeline durations, add urgency",
  current_template: latestHTML,  // ✅ Only latest HTML
  conversation_context: last10Messages  // ✅ Only last 10 natural language messages
}

// 3c. Maestro returns modified HTML
const maestroOutput = {
  modified_template: "<html>...modified...</html>",
  explanation: "Compressed timeline by 30%..."
}

// 3d. Store LATEST HTML (replace old one)
await storeLatestHTMLForThread(threadId, maestroOutput.modified_template)

// 3e. Save only explanation to conversation ✅
hyper_canvas_messages: [
  // ... previous messages
  { role: 'assistant', content: '📋 Compressed timeline by 30%...' }
]

// ═══════════════════════════════════════════════
// STEP 4: PDF regeneration
// ═══════════════════════════════════════════════
// Convert latest HTML to PDF and update preview
await convertHTMLtoPDF(maestroOutput.modified_template)
```

---

## 💾 **IMPLEMENTATION STRATEGY**

### **Phase 1: HTML Storage Service (New)**

Create a dedicated service for HTML management:

```typescript
// src/lib/hyper-canvas/html-storage.ts

export class HTMLStorageService {
  
  /**
   * Store latest HTML for a thread
   * Replaces previous version (only keep latest)
   */
  async storeLatestHTML(
    threadId: string,
    sessionId: string,
    htmlContent: string,
    modificationSummary?: string
  ): Promise<void> {
    // Update ai_architecture_sessions.threads JSONB
    await prisma.$executeRaw`
      UPDATE ai_architecture_sessions
      SET threads = (
        SELECT COALESCE(
          jsonb_set(
            threads,
            '{0}',  -- Assuming first thread for now
            jsonb_build_object(
              'thread_id', ${threadId},
              'current_html', ${htmlContent},
              'html_version', COALESCE((threads->0->>'html_version')::int, 0) + 1,
              'last_active', NOW()::text,
              'metadata', jsonb_build_object(
                'last_modification', ${modificationSummary}
              )
            )
          ),
          '[]'::jsonb
        )
      )
      WHERE uuid = ${sessionId}::uuid
    `
  }
  
  /**
   * Get latest HTML for a thread
   */
  async getLatestHTML(
    threadId: string,
    sessionId: string
  ): Promise<string | null> {
    const result = await prisma.$queryRaw<Array<{ html: string }>>`
      SELECT threads->0->>'current_html' as html
      FROM ai_architecture_sessions
      WHERE uuid = ${sessionId}::uuid
    `
    
    return result[0]?.html || null
  }
  
  /**
   * Check if HTML exists for thread
   */
  async hasHTML(threadId: string, sessionId: string): Promise<boolean> {
    const html = await this.getLatestHTML(threadId, sessionId)
    return html !== null && html.length > 0
  }
  
  /**
   * Get HTML metadata (version, last modified, etc.)
   */
  async getHTMLMetadata(threadId: string, sessionId: string) {
    const result = await prisma.$queryRaw<Array<any>>`
      SELECT 
        threads->0->>'thread_id' as thread_id,
        threads->0->>'html_version' as version,
        threads->0->>'last_active' as last_modified,
        LENGTH(threads->0->>'current_html') as html_size
      FROM ai_architecture_sessions
      WHERE uuid = ${sessionId}::uuid
    `
    
    return result[0] || null
  }
}

export const htmlStorage = new HTMLStorageService()
```

---

### **Phase 2: Update Maestro Flow**

Modify `maestroTurn()` to use HTML storage:

```typescript
// src/lib/langchain/hyper-canvas-chat.ts

import { htmlStorage } from '@/lib/hyper-canvas/html-storage'

export async function maestroTurn(
  threadId: string,
  userId: string, 
  sessionId: string,
  organizationId: string,
  instruction: string,
  currentTemplate: string  // Still passed from frontend initially
): Promise<any> {
  
  try {
    // Get maestro chain
    const maestroChain = await createMaestroChain()
    
    // Get conversation history (natural language only)
    const messageHistory = getMessageHistory(threadId)
    const messages = await messageHistory.getMessages()
    
    // Filter out any HTML (defensive - should not be there anyway)
    const conversationMessages = messages
      .filter(msg => {
        const content = msg.content as string
        return !content.includes('<html') && !content.includes('<!DOCTYPE')
      })
      .slice(-10) // Last 10 messages
    
    const conversationContext = conversationMessages
      .map(msg => `${msg._getType() === 'human' ? 'User' : 'Assistant'}: ${msg.content}`)
      .join('\n')
    
    console.log(`🧠 Maestro context: ${conversationMessages.length} messages (HTML excluded)`)
    
    // Invoke maestro with conversation + HTML
    const result = await maestroChain.invoke({
      summary: conversationContext.substring(0, 500),
      older_messages: conversationContext,
      current_template: currentTemplate,  // ✅ HTML passed separately
      instruction: instruction
    }, config)
    
    // Parse response
    const maestroResponse = parseJSONResponse(result)
    
    // ✅ STORE LATEST HTML (replace old version)
    await htmlStorage.storeLatestHTML(
      threadId,
      sessionId,
      maestroResponse.modified_template,
      maestroResponse.explanation
    )
    
    console.log(`✅ Maestro completed and HTML stored`)
    console.log(`   Version: ${await htmlStorage.getHTMLMetadata(threadId, sessionId)}`)
    
    // ✅ Return without adding HTML to conversation history
    return {
      success: true,
      modified_template: maestroResponse.modified_template,
      explanation: maestroResponse.explanation,
      memoryState: {
        summary: `${conversationMessages.length} messages`,
        messageCount: conversationMessages.length,
        tokenBudget: 2000
      }
    }
    
  } catch (error) {
    console.error('❌ Maestro error:', error)
    return { success: false, error: error.message }
  }
}
```

---

### **Phase 3: Update Frontend Hook**

Modify `useHyperCanvasChat` to handle HTML storage:

```typescript
// src/hooks/useHyperCanvasChat.ts

// NEW: Track current HTML state
const [currentHTML, setCurrentHTML] = useState<string | null>(null)

// MODIFIED: Extract or load HTML
const getCurrentHTML = useCallback(async () => {
  // First, try to load from storage if thread exists
  if (chatState.threadId) {
    const response = await fetch('/api/hyper-canvas/html/get-latest', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ threadId: chatState.threadId, sessionId })
    })
    
    if (response.ok) {
      const data = await response.json()
      if (data.html) {
        console.log('✅ Loaded HTML from storage')
        return data.html
      }
    }
  }
  
  // Fallback: Generate from sessionData
  console.log('🔄 Generating fresh HTML from sessionData')
  return await extractCurrentTemplate(sessionData, sessionId)
}, [chatState.threadId, sessionId, sessionData, extractCurrentTemplate])

// MODIFIED: Maestro trigger with HTML storage
const maestroTimeout = setTimeout(async () => {
  try {
    // Get current HTML (from storage or generate)
    const htmlTemplate = await getCurrentHTML()
    
    const maestroResponse = await fetch('/api/hyper-canvas/maestro', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        currentTemplate: htmlTemplate,
        maestroInstruction: data.message_to_maestro,
        threadId: chatState.threadId,
        sessionId,
        userId,
        organizationId
      })
    })
    
    const maestroData = await maestroResponse.json()
    
    if (maestroData.success) {
      // Update local HTML state
      setCurrentHTML(maestroData.modified_template)
      
      // Update preview
      await refreshDocumentPreview(maestroData.modified_template)
      
      console.log('✅ Maestro completed, HTML stored in database')
    }
    
  } catch (error) {
    console.error('❌ Maestro failed:', error)
  }
}, cumulativeDelay + 1000)
```

---

### **Phase 4: New API Endpoints**

Create HTML storage API endpoints:

```typescript
// src/app/api/hyper-canvas/html/get-latest/route.ts
import { htmlStorage } from '@/lib/hyper-canvas/html-storage'

export async function POST(request: NextRequest) {
  const { threadId, sessionId } = await request.json()
  
  const html = await htmlStorage.getLatestHTML(threadId, sessionId)
  
  return NextResponse.json({
    success: true,
    html: html,
    hasHTML: html !== null
  })
}

// src/app/api/hyper-canvas/html/store/route.ts
export async function POST(request: NextRequest) {
  const { threadId, sessionId, htmlContent, summary } = await request.json()
  
  await htmlStorage.storeLatestHTML(threadId, sessionId, htmlContent, summary)
  
  return NextResponse.json({ success: true })
}
```

---

## 📊 **TOKEN SAVINGS ANALYSIS**

### **Before Optimization (Theoretical worst case if HTML was in history):**
```
Conversation with 5 Maestro edits:
- User messages: 5 × 50 tokens = 250 tokens
- Quickshot responses: 5 × 100 tokens = 500 tokens
- HTML snapshots: 5 × 35,000 tokens = 175,000 tokens ❌
- Total: ~175,750 tokens per context load
- Cost per turn: ~$1.75 (input) + $5.25 (output if regenerating) = $7
```

### **After Optimization:**
```
Conversation with 5 Maestro edits:
- User messages: 5 × 50 tokens = 250 tokens
- Quickshot responses: 5 × 100 tokens = 500 tokens
- Maestro explanations: 5 × 50 tokens = 250 tokens
- HTML: 1 × 35,000 tokens = 35,000 tokens ✅ (only when Maestro triggered)
- Total conversation: ~1,000 tokens (97% reduction!)
- HTML loaded only when needed: 35,000 tokens
- Cost per turn: $0.005 (conversation) + $0.175 (HTML when needed) = $0.18
- **Savings: ~97% reduction in tokens!**
```

---

## ✅ **IMPLEMENTATION CHECKLIST**

### **Phase 1: Core HTML Storage (2-3 hours)**
- [ ] Create `HTMLStorageService` class
- [ ] Implement `storeLatestHTML()` method
- [ ] Implement `getLatestHTML()` method
- [ ] Implement `getHTMLMetadata()` method
- [ ] Test storage/retrieval with sample HTML

### **Phase 2: Integration (3-4 hours)**
- [ ] Update `maestroTurn()` to use HTML storage
- [ ] Add HTML filtering in conversation context
- [ ] Test Maestro with stored HTML
- [ ] Verify HTML not in conversation history

### **Phase 3: API Endpoints (1-2 hours)**
- [ ] Create `/api/hyper-canvas/html/get-latest` endpoint
- [ ] Create `/api/hyper-canvas/html/store` endpoint
- [ ] Create `/api/hyper-canvas/html/metadata` endpoint
- [ ] Test API endpoints

### **Phase 4: Frontend Updates (2-3 hours)**
- [ ] Add `getCurrentHTML()` helper to hook
- [ ] Update Maestro trigger to use HTML storage
- [ ] Add HTML state tracking
- [ ] Test end-to-end flow

### **Phase 5: Testing & Validation (2-3 hours)**
- [ ] Test conversation without Maestro (no HTML in history)
- [ ] Test conversation with Maestro (HTML stored separately)
- [ ] Test multiple Maestro edits (HTML replaced, not appended)
- [ ] Test thread resumption (HTML loaded from storage)
- [ ] Verify token counts in logs
- [ ] Verify cost savings

---

## 🎯 **SUCCESS CRITERIA**

✅ **Implementation Success:**
1. HTML never appears in `hyper_canvas_messages` table
2. Only natural language messages in conversation history
3. Latest HTML stored in `ai_architecture_sessions.threads`
4. Maestro can access and modify HTML
5. Token count < 2,000 for typical conversation (excluding HTML)
6. HTML loaded only when Maestro is triggered

✅ **Performance Metrics:**
- Conversation history token count: < 2,000 tokens
- HTML storage/retrieval: < 100ms
- Token savings: > 95% vs. storing HTML in history
- Cost per conversation turn: < $0.25

---

## 🚀 **ROLLOUT STRATEGY**

### **Week 1: Implementation**
1. Build HTML storage service
2. Update Maestro integration
3. Create API endpoints
4. Update frontend hook

### **Week 2: Testing**
1. Unit tests for HTML storage
2. Integration tests for Maestro flow
3. E2E tests for conversation + editing
4. Performance benchmarks

### **Week 3: Deployment**
1. Deploy to staging
2. User acceptance testing
3. Monitor token usage
4. Deploy to production

---

## 📝 **KEY INSIGHTS**

### **Why This Approach Wins:**

1. **Token Efficiency**
   - 97%+ token reduction in conversation history
   - HTML only loaded when Maestro is triggered
   - Natural language conversation stays clean

2. **Simplicity**
   - Uses existing JSONB column (`ai_architecture_sessions.threads`)
   - No complex versioning system initially
   - Easy to understand and maintain

3. **Scalability**
   - Can add versioning later if needed
   - Can implement undo/redo without changing architecture
   - Database handles large HTML efficiently

4. **Cost Savings**
   - ~$0.18 per turn vs. ~$7.00 theoretical worst case
   - Scales linearly with conversations, not HTML versions
   - ROI positive immediately

---

## 🔮 **FUTURE ENHANCEMENTS**

### **Phase 2 Features (Later):**
1. **HTML Versioning**
   - Store last N versions for undo/redo
   - Visual diff between versions
   - Rollback to previous version

2. **Thread Management UI**
   - List all threads for a session
   - Switch between threads with different HTML states
   - Name threads ("Version A", "Blue headers variant")

3. **Collaborative Editing**
   - Multiple users editing same document
   - Real-time HTML sync
   - Conflict resolution

---

**Planning Complete!**  
**Status:** 📋 Ready for Implementation  
**Next Action:** Begin Phase 1 - HTML Storage Service Implementation

