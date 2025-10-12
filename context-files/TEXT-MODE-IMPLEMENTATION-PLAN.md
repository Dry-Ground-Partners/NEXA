# 🎯 NEXA Liaison — Text Mode Implementation Plan

**Goal:** Implement full conversational AI functionality (text-only, no voice)  
**Approach:** Three-tiered message system with pre-loaded prompts and preferences  
**Timeline:** 4-5 weeks for complete text mode

---

## 📐 ARCHITECTURE DECISIONS

### 1. **Two LangSmith Prompts**

#### **Prompt A: `nexa-liaison-swift`**
**Purpose:** Fast, lightweight responses

**Generates:**
1. **Pre-Response** (2-4 sentences, acknowledgment)
   - "Got it — you're asking about X. Here's how I'll approach this..."
2. **Next Hidden Message** (1-2 sentences, thinking)
   - "Hmm, interesting... let me consider what we discussed..."

**Output Format:** Plain text (two separate calls or single JSON with two fields)

---

#### **Prompt B: `nexa-liaison-response`**
**Purpose:** Comprehensive, actionable responses

**Generates:**
- **Response Text** (markdown formatted, 3 paragraphs)
- **Action Object** (JSON for future tool use)

**Output Format:** JSON
```json
{
  "response": "**Markdown formatted text**\n\nFull response here...",
  "action": {
    "type": null,  // Future: "navigate", "execute", "create", etc.
    "params": {}   // Future: action-specific parameters
  }
}
```

---

### 2. **Markdown Rendering**

All text posted in chat will be markdown-formatted and rendered properly:
- **Bold**, *italic*, `code`
- Lists, links, code blocks
- Headings (but discourage h1/h2 in prompts)

**Library:** Use `react-markdown` or similar

---

### 3. **Pre-Loading System**

**Problem:** Don't want to wait for prompt pulls or preference fetches on each request

**Solution:** Global state + cache with pre-loading

#### **Implementation:**

**File:** `src/lib/ai-sidebar/preload-manager.ts`

```typescript
export class PreloadManager {
  private prompts: Map<string, any> = new Map()
  private preferences: Map<string, any> = new Map()
  private lastRefresh: Date = new Date(0)
  private refreshInterval = 12 * 60 * 60 * 1000 // 12 hours
  
  async preload(organizationId: string) {
    const now = new Date()
    const age = now.getTime() - this.lastRefresh.getTime()
    
    // Skip if recently loaded
    if (age < this.refreshInterval) return
    
    console.log('🔄 Pre-loading prompts and preferences...')
    
    // Load prompts from LangSmith (parallel)
    await Promise.all([
      this.loadPrompt('nexa-liaison-swift'),
      this.loadPrompt('nexa-liaison-response')
    ])
    
    // Load organization preferences
    await this.loadPreferences(organizationId)
    
    this.lastRefresh = now
    console.log('✅ Pre-load complete')
  }
  
  async loadPrompt(promptName: string) {
    try {
      const prompt = await hub.pull(promptName)
      this.prompts.set(promptName, prompt)
    } catch (error) {
      console.error(`Failed to load prompt: ${promptName}`, error)
    }
  }
  
  async loadPreferences(organizationId: string) {
    try {
      const response = await fetch(`/api/organizations/${organizationId}/preferences`)
      const prefs = await response.json()
      this.preferences.set(organizationId, prefs)
    } catch (error) {
      console.error('Failed to load preferences', error)
    }
  }
  
  getPrompt(name: string) {
    return this.prompts.get(name)
  }
  
  getPreferences(organizationId: string) {
    return this.preferences.get(organizationId)
  }
}

// Singleton
export const preloadManager = new PreloadManager()
```

**Trigger Pre-Load:**
- On app load (root layout useEffect)
- On organization change
- Every 12 hours automatically

---

### 4. **Generic Hidden Messages Pool**

**File:** `src/lib/ai-sidebar/generic-hidden-messages.ts`

```typescript
export const GENERIC_HIDDEN_MESSAGES = [
  "Welcome back! Let me read your request carefully to better understand it...",
  "Great to see you here. I'm considering the best way to help...",
  "Hmm, interesting question. Let me think through this properly...",
  "I'm analyzing your request to provide the most helpful response...",
  "Let me take a moment to consider all aspects of your request...",
  "I'm processing your message to ensure I give you the best guidance...",
  "Give me just a second to think this through carefully...",
  "I'm reflecting on your recent work to provide contextual help...",
  "Let me gather my thoughts on how best to approach this...",
  "I'm considering the context of your workflow to help appropriately...",
  // ... 40 more variations
]

export function getRandomHiddenMessage(): string {
  return GENERIC_HIDDEN_MESSAGES[
    Math.floor(Math.random() * GENERIC_HIDDEN_MESSAGES.length)
  ]
}
```

**Usage:** If no hidden message exists when needed, grab one randomly

---

## 🔄 THREE-TIERED FLOW IMPLEMENTATION

### **Scenario A: Simple Message (< 60 chars)**

```
User sends: "Go to Structuring"
    ↓
[Input Complexity Check] → Simple!
    ↓
[Skip Hidden Message]
    ↓
┌─────────────────────┬─────────────────────┐
│ Async Call 1        │ Async Call 2        │
│ (Pre-Response)      │ (Response)          │
│ nexa-liaison-swift  │ nexa-liaison-       │
│                     │ response            │
└──────────┬──────────┴──────────┬──────────┘
           │                     │
           ↓                     ↓
    [Post Pre-Response]   [Post Response]
                                 ↓
                    [Request Next Hidden]
                         (swift prompt)
                                 ↓
                        [Cache for next]
```

---

### **Scenario B: Complex Message (≥ 60 chars)**

```
User sends: "Can you explain how the DMA analysis connects to the Blueprint module?"
    ↓
[Input Complexity Check] → Complex!
    ↓
[Post Hidden Message] ← Already cached from previous response
    ↓
┌─────────────────────┬─────────────────────┐
│ Async Call 1        │ Async Call 2        │
│ (Pre-Response)      │ (Response)          │
│ nexa-liaison-swift  │ nexa-liaison-       │
│                     │ response            │
└──────────┬──────────┴──────────┬──────────┘
           │                     │
           ↓                     ↓
    [Post Pre-Response]   [Post Response + Parse Action]
                                 ↓
                    [Request Next Hidden]
                         (swift prompt)
                                 ↓
                        [Cache for next]
```

---

### **Edge Case: No Cached Hidden Message**

```
User sends first message OR cache expired
    ↓
[Check for cached hidden] → Not found!
    ↓
[Grab random from pool]
    ↓
[Post generic hidden message]
    ↓
[Continue with pre-response + response flow]
```

---

## 📝 DETAILED IMPLEMENTATION STEPS

### **Phase 1: Pre-Loading Infrastructure** (1 week)

#### Step 1.1: Create Preload Manager (4-6h)
**File:** `src/lib/ai-sidebar/preload-manager.ts`

**What:**
- Singleton manager class
- Methods: `preload()`, `loadPrompt()`, `loadPreferences()`, `getPrompt()`, `getPreferences()`
- 12-hour refresh interval
- Parallel loading (Promise.all)

**Test:**
```typescript
await preloadManager.preload(orgId)
const swiftPrompt = preloadManager.getPrompt('nexa-liaison-swift')
```

---

#### Step 1.2: Create Generic Hidden Messages (1-2h)
**File:** `src/lib/ai-sidebar/generic-hidden-messages.ts`

**What:**
- Array of 50 generic hidden messages
- `getRandomHiddenMessage()` function

---

#### Step 1.3: Integrate Preload into App (2-3h)
**File:** `src/app/layout.tsx` or dashboard layout

**What:**
```typescript
useEffect(() => {
  if (selectedOrganization) {
    preloadManager.preload(selectedOrganization.organization.id)
  }
}, [selectedOrganization])
```

**Triggers:**
- On app mount
- On organization change
- Every 12 hours (setInterval)

---

### **Phase 2: LangSmith Prompt Creation** (1 week)

#### Step 2.1: Create `nexa-liaison-swift` Prompt (6-8h)

**Input Variables:**
- `user_input` - Latest user message
- `previous_messages` - Last 10 messages (formatted)
- `recent_activity` - Formatted activity log
- `workflow_type` - Current workflow
- `organization_preferences` - Org backdrop

**System Prompt:**
```
You are NEXA Liaison, an AI assistant for the NEXA platform.

Your role: Provide quick, helpful acknowledgments and generate engaging "thinking" messages.

You will generate TWO things:

1. PRE-RESPONSE (2-4 sentences):
   - Acknowledge you understand the user's request
   - Briefly outline your approach
   - Be concise and reassuring

2. NEXT HIDDEN MESSAGE (1-2 sentences):
   - For the NEXT user message (not this one)
   - Show you're thinking/processing
   - Reference context naturally
   - Keep user engaged while waiting

Context:
- Workflow: {workflow_type}
- Recent activity: {recent_activity}
- Previous messages: {previous_messages}
- Organization preferences: {organization_preferences}

User said: {user_input}

Generate response in JSON format:
{
  "pre_response": "...",
  "next_hidden": "..."
}
```

---

#### Step 2.2: Create `nexa-liaison-response` Prompt (6-8h)

**Input Variables:** Same as swift + more detail

**System Prompt:**
```
You are NEXA Liaison, an AI assistant for the NEXA platform.

Your role: Provide comprehensive, actionable assistance with markdown formatting.

Context:
- Workflow: {workflow_type}
- Recent activity: {recent_activity}
- Previous messages: {previous_messages}
- Organization preferences: {organization_preferences}

User said: {user_input}

Guidelines:
- Use **markdown** formatting (bold, italic, lists, code blocks)
- Structure: 3 paragraphs max
- Be specific and actionable
- Reference user's recent activity when relevant
- Use organization's preferred approach

Generate response in JSON format:
{
  "response": "Markdown formatted comprehensive response here...",
  "action": {
    "type": null,
    "params": {}
  }
}

(For now, always set action to null/empty - we'll implement actions later)
```

---

#### Step 2.3: Test Prompts in LangSmith (4-6h)

**Test Cases:**
1. Simple command: "Go to Structuring"
2. Complex question: "How does DMA connect to Blueprint?"
3. Error scenario: "Fix this bug"
4. Contextual: "Continue with what we were doing"

**Validate:**
- Pre-response is 2-4 sentences
- Next hidden is 1-2 sentences
- Response is markdown formatted
- Action object present (even if null)

---

### **Phase 3: Message Generators** (1 week)

#### Step 3.1: Create Swift Generator (6-8h)
**File:** `src/lib/ai-sidebar/message-generator.ts`

```typescript
export async function generateSwiftMessages(
  userInput: string,
  context: MessageContext,
  organizationId: string
): Promise<{ preResponse: string; nextHidden: string }> {
  // Get pre-loaded prompt
  const prompt = preloadManager.getPrompt('nexa-liaison-swift')
  if (!prompt) {
    throw new Error('Swift prompt not loaded')
  }
  
  // Get pre-loaded preferences
  const prefs = preloadManager.getPreferences(organizationId)
  
  // Get limited context from LRU cache
  const limitedContext = contextManager.getContextForAPI(
    context.threadId,
    organizationId,
    10 // Last 10 messages
  )
  
  // Call LangChain
  const llm = new ChatOpenAI({
    modelName: 'gpt-4o-mini', // Fast and cheap
    temperature: 0.6,
    maxTokens: 300
  })
  
  const result = await prompt.pipe(llm).invoke({
    user_input: userInput,
    previous_messages: formatMessagesForPrompt(limitedContext.messages),
    recent_activity: limitedContext.activityText,
    workflow_type: context.workflowType,
    organization_preferences: prefs?.generalApproach || ''
  })
  
  // Parse JSON response
  const parsed = JSON.parse(result.content)
  
  return {
    preResponse: parsed.pre_response,
    nextHidden: parsed.next_hidden
  }
}
```

---

#### Step 3.2: Create Response Generator (6-8h)

```typescript
export async function generateResponse(
  userInput: string,
  context: MessageContext,
  organizationId: string
): Promise<{ response: string; action: any }> {
  const prompt = preloadManager.getPrompt('nexa-liaison-response')
  if (!prompt) {
    throw new Error('Response prompt not loaded')
  }
  
  const prefs = preloadManager.getPreferences(organizationId)
  const limitedContext = contextManager.getContextForAPI(
    context.threadId,
    organizationId,
    10
  )
  
  const llm = new ChatOpenAI({
    modelName: 'gpt-4o-mini',
    temperature: 0.5,
    maxTokens: 1000
  })
  
  const result = await prompt.pipe(llm).invoke({
    user_input: userInput,
    previous_messages: formatMessagesForPrompt(limitedContext.messages),
    recent_activity: limitedContext.activityText,
    workflow_type: context.workflowType,
    organization_preferences: prefs?.generalApproach || ''
  })
  
  const parsed = JSON.parse(result.content)
  
  return {
    response: parsed.response,    // Markdown text
    action: parsed.action || null // Future use
  }
}
```

---

### **Phase 4: Orchestration Hook** (1.5 weeks)

#### Step 4.1: Update useGlobalSidebar Hook (12-16h)

**File:** `src/hooks/useGlobalSidebar.ts`

```typescript
const MIN_COMPLEXITY_THRESHOLD = 60

export function useGlobalSidebar(
  workflowType: WorkflowType,
  organizationId: string
) {
  const [state, setState] = useState<SidebarState>({
    messages: [],
    currentHiddenMessage: null,
    isTyping: false,
    threadId: generateThreadId()
  })
  
  const contextManager = useRef(new SidebarContextManager())
  
  const handleUserMessage = async (userInput: string) => {
    const trimmed = userInput.trim()
    
    // 1. Post user message
    const userMsg = createMessage('user', trimmed)
    addMessage(userMsg)
    
    // 2. Input complexity check
    const isComplex = trimmed.length >= MIN_COMPLEXITY_THRESHOLD
    
    // 3. If complex, post hidden message
    if (isComplex) {
      const hiddenText = state.currentHiddenMessage || getRandomHiddenMessage()
      addMessage(createMessage('hidden', hiddenText))
    }
    
    // 4. Get context
    const context: MessageContext = {
      threadId: state.threadId!,
      previousMessages: contextManager.current.getMessages(state.threadId!),
      recentActivity: await fetchFormattedActivity(organizationId),
      workflowType,
      organizationId
    }
    
    // 5. Fire async requests (Pre-Response + Response)
    setState(prev => ({ ...prev, isTyping: true }))
    
    const [swiftResult, responseResult] = await Promise.allSettled([
      withRetry(() => generateSwiftMessages(trimmed, context, organizationId)),
      withRetry(() => generateResponse(trimmed, context, organizationId))
    ])
    
    // 6. Handle Pre-Response
    if (swiftResult.status === 'fulfilled') {
      addMessage(createMessage('pre-response', swiftResult.value.preResponse))
    }
    
    // 7. Handle Response
    if (responseResult.status === 'fulfilled') {
      addMessage(createMessage('response', responseResult.value.response))
      
      // Store action for future use
      if (responseResult.value.action) {
        console.log('Action received:', responseResult.value.action)
        // Future: executeAction(responseResult.value.action)
      }
    }
    
    // 8. Cache next hidden message
    if (swiftResult.status === 'fulfilled') {
      setState(prev => ({
        ...prev,
        currentHiddenMessage: swiftResult.value.nextHidden
      }))
    } else {
      // Fallback: random generic
      setState(prev => ({
        ...prev,
        currentHiddenMessage: getRandomHiddenMessage()
      }))
    }
    
    setState(prev => ({ ...prev, isTyping: false }))
  }
  
  return {
    messages: state.messages,
    isTyping: state.isTyping,
    sendMessage: handleUserMessage,
    currentHiddenReady: !!state.currentHiddenMessage
  }
}
```

---

### **Phase 5: Markdown Rendering** (3-4 days)

#### Step 5.1: Install react-markdown (10 mins)
```bash
npm install react-markdown remark-gfm
```

#### Step 5.2: Create Markdown Component (2-3h)

**File:** `src/components/ai-sidebar/MarkdownMessage.tsx`

```typescript
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

export function MarkdownMessage({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      className="prose prose-invert prose-sm max-w-none"
      components={{
        // Custom styling for markdown elements
        p: ({ children }) => (
          <p className="mb-2 last:mb-0">{children}</p>
        ),
        strong: ({ children }) => (
          <strong className="font-semibold text-cyan-300">{children}</strong>
        ),
        code: ({ inline, children }) =>
          inline ? (
            <code className="bg-white/10 px-1 rounded text-cyan-400">
              {children}
            </code>
          ) : (
            <code className="block bg-white/10 p-2 rounded my-2">
              {children}
            </code>
          ),
        ul: ({ children }) => (
          <ul className="list-disc list-inside mb-2">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="list-decimal list-inside mb-2">{children}</ol>
        ),
      }}
    >
      {content}
    </ReactMarkdown>
  )
}
```

#### Step 5.3: Update Sidebar Component (1-2h)

Replace `{message.content}` with:
```typescript
<MarkdownMessage content={message.content} />
```

---

### **Phase 6: Error Handling & Polish** (1 week)

[Same as previous roadmap Phase 4]

- Error message pool (150+ variations)
- Retry logic (2 attempts max)
- Human-like failure handling

---

## 📊 TIMELINE SUMMARY

| Phase | Focus | Duration | Hours |
|-------|-------|----------|-------|
| **Phase 1** | Pre-Loading Infrastructure | 1 week | 7-11h |
| **Phase 2** | LangSmith Prompts | 1 week | 16-22h |
| **Phase 3** | Message Generators | 1 week | 12-16h |
| **Phase 4** | Orchestration Hook | 1.5 weeks | 12-16h |
| **Phase 5** | Markdown Rendering | 3-4 days | 3-5h |
| **Phase 6** | Error Handling | 1 week | 18-26h |
| **TOTAL** | **Text Mode Complete** | **6-7 weeks** | **68-96h** |

---

## ✅ SUCCESS CRITERIA

### Phase 1-2 Complete When:
- ✅ Prompts pre-load on app start
- ✅ Organization preferences cached
- ✅ Generic hidden messages pool ready
- ✅ Both LangSmith prompts created and tested

### Phase 3-4 Complete When:
- ✅ Swift generator returns pre-response + next hidden
- ✅ Response generator returns markdown + action
- ✅ Three-tiered flow working
- ✅ Hidden message cached for next use
- ✅ Simple vs complex input routing works

### Phase 5-6 Complete When:
- ✅ Markdown renders properly in chat
- ✅ Bold, italic, lists, code all display correctly
- ✅ Error handling graceful
- ✅ Retry logic functional

---

## 🚀 AFTER TEXT MODE IS COMPLETE

Once text mode is stable and tested:

### **Phase 7: Voice Mode (User Input)**
- Vosk STT on same server
- WebSocket audio streaming
- Real-time transcription

### **Phase 8: Voice Mode (AI Output)**
- Whisper TTS for responses
- Audio playback synchronized
- Voice mode toggle

### **Phase 9: Action System**
- Define action types (navigate, create, execute)
- Implement action handlers
- Test action execution

---

## 📝 NOTES

1. **Model Choice:** Using `gpt-4o-mini` (fast, cheap). Can switch to `gpt-5-nano` when available.

2. **Caching Strategy:** 
   - Prompts: 12 hours
   - Preferences: 12 hours
   - Messages: 30 minutes (LRU)
   - Activity: 10 minutes (LRU)

3. **Context Limiting:**
   - Last 10 messages only
   - Last 5 activity events
   - Reduces cost + improves speed

4. **Fallbacks:**
   - If prompt not loaded → try pull on-demand
   - If no hidden cached → use generic pool
   - If both AI calls fail → show error, offer retry

5. **Future Actions:**
   - Action object currently null
   - Will implement in Phase 9
   - Examples: `{"type": "navigate", "params": {"page": "/structuring"}}`

---

**Current Status:** UI Complete ✅  
**Next:** Begin Phase 1 (Pre-Loading Infrastructure)  
**ETA to Working Text Mode:** 6-7 weeks


