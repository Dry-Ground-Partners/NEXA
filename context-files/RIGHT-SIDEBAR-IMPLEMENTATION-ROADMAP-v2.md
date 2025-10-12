# 🗣️ Right Sidebar — Global AI Copilot Implementation Roadmap (v2)
**Standalone Conversational AI System Across All Workflows**

**Date:** October 10, 2025  
**Status:** Updated with Project Clarifications  
**Estimated Total Effort:** 160-210 hours (4-5.2 weeks at full capacity)

---

## 📊 EXECUTIVE SUMMARY

### Blueprint Vision — CLARIFIED

The Right Sidebar is a **standalone, global AI copilot** (NOT an extension of HyperCanvas) that provides:
- **Three-tiered message flow** (Hidden → Pre-Response → Response)
- **Always-on presence** across all workflows (expands/collapses on right side)
- **Theme consistent** with dark, pitch black, laser-like, cyberpunk, glassy aesthetic
- **Voice mode** with Vosk STT (same server, instant) + Whisper TTS
- **Activity awareness** from existing credit tracking system
- **Zero perceived latency** (instant engagement)
- **Streaming text** with token-by-token rendering
- **Error handling** with human-like retry logic

### Key Clarifications from User

1. **🆕 SEPARATE from HyperCanvas** - New standalone copilot, not modal-based
2. **✅ Reuse Context Management** - Copy HyperCanvas's proven context approach
3. **✅ Activity Logging Exists** - Already tracking credit consumption with rich metadata
4. **✅ GPT-5-Nano Confirmed** - Model exists and is verified (use for text generation)
5. **✅ Vosk on Same Server** - NOT microservice, run on main server for instant transcription
6. **✅ Streaming Strategy** - WebSocket for Vosk (instant), SSE for everything else
7. **✅ Cache Strategy** - LRU or node-cache (investigate current implementation), limited context sent to API
8. **✅ DB Save on Demand** - Only save conversations if user requests, not auto-save all

### Current State Assessment: 35% Foundation

**What Exists & Can Be Reused:**
- ✅ HyperCanvas context management approach (COPY THIS!)
- ✅ PostgreSQL `hyper_canvas_messages` table structure
- ✅ LangChain + LangSmith integration patterns
- ✅ **Usage tracking system** with rich activity metadata
- ✅ **In-memory caching pattern** (5-min TTL in EventRegistry/PlanRegistry)
- ✅ Message state management hooks
- ✅ Token streaming concept
- ✅ Dark theme styling patterns

**What's Missing:**
- ❌ Three-tiered message system (Hidden/Pre-Response/Response)
- ❌ Global sidebar component (persistent across all pages)
- ❌ Activity log formatting for AI context
- ❌ Voice mode (Vosk STT on same server, Whisper TTS)
- ❌ Input complexity checking
- ❌ Error retry logic with human messages
- ❌ Conversation save/load on demand
- ❌ LRU cache for message context

---

## 🔍 INVESTIGATION FINDINGS

### 1. Existing Cache Implementation ✅

**Pattern Found:** In-memory Map with TTL (5 minutes)

```typescript
// Current implementation in event-registry.ts & plan-registry.ts
export class Registry {
  private cache: Map<string, Definition> = new Map()
  private lastCacheUpdate: Date = new Date(0)
  private cacheTTL = 5 * 60 * 1000 // 5 minutes
  private isRefreshing = false
  
  async refreshCacheIfNeeded(): Promise<void> {
    const now = new Date()
    const cacheAge = now.getTime() - this.lastCacheUpdate.getTime()
    
    if (cacheAge < this.cacheTTL || this.isRefreshing) {
      return
    }
    await this.refreshCache()
  }
}
```

**For Sidebar:** Use same pattern + LRU for message history

---

### 2. Existing Activity Tracking ✅

**System:** `usage-tracker.ts` + `usage-middleware.ts`

**Already Captures:**
- Event type (e.g., `structuring_diagnose`, `solutioning_structure`)
- User ID, Organization ID
- Credits consumed
- Event data with:
  - `userAgent`
  - `ipAddress`
  - `complexity` (calculated from input length)
  - `endpoint` (API route called)
  - Feature flags (`echo`, `traceback`, etc.)
  - Timestamp

**Usage Example:**
```typescript
await withUsageTracking(request, orgId, {
  eventType: 'structuring_diagnose',
  sessionId: sessionId,
  eventData: {
    contentItems: validContent.length,
    totalLength: totalContent.length,
    complexity: calculateComplexityFromInput(content),
    echo: !!body.echo,
    traceback: !!body.traceback,
    endpoint: '/api/organizations/[orgId]/structuring/analyze-pain-points'
  }
})
```

**For Sidebar:** Just need to format this data for AI context!

---

### 3. Model Configuration ✅

**Confirmed:** GPT-5-Nano exists (user verified)

**Configuration:**
```typescript
// For sidebar messages
const MODEL_CONFIG = {
  hidden: 'gpt-5-nano',        // Fast, instant engagement
  preResponse: 'gpt-5-nano',   // Fast, quick acknowledgment
  response: 'gpt-5-nano'       // Fast, full response
}
```

**Note:** If GPT-5-Nano not available in LangChain yet, use `gpt-4o-mini` as fallback temporarily

---

## 📋 UPDATED IMPLEMENTATION PLAN

### Phase 0: Foundation & Setup (1 week)
**Effort:** 20-28 hours

#### Task 1: Project Structure (4-6h)
```bash
src/
├── lib/
│   └── ai-sidebar/
│       ├── types.ts                 # Message types, state interfaces
│       ├── message-generator.ts     # Hidden, Pre-Response, Response
│       ├── orchestrator.ts          # Three-tiered flow logic
│       ├── activity-formatter.ts    # Format usage events for AI
│       ├── context-manager.ts       # LRU cache + context building
│       └── error-handler.ts         # Retry logic, error messages
├── components/
│   └── ai-sidebar/
│       ├── AISidebar.tsx           # Main sidebar component
│       ├── SidebarMessages.tsx     # Message display
│       ├── SidebarInput.tsx        # Text/voice input
│       ├── ActivityPanel.tsx       # Show recent activity
│       └── VoiceControls.tsx       # Voice mode UI
└── hooks/
    └── useGlobalSidebar.ts         # Main orchestration hook
```

#### Task 2: Copy HyperCanvas Context Pattern (6-8h)
- Extract context management from `useHyperCanvasChat`
- Adapt for global sidebar (not document-specific)
- Keep PostgreSQL message persistence structure
- Add thread management for multiple conversations

#### Task 3: LRU Cache Setup (4-6h)
```typescript
// New: src/lib/ai-sidebar/context-manager.ts

import LRU from 'lru-cache'

export class SidebarContextManager {
  private messageCache: LRU<string, Message[]>
  private activityCache: LRU<string, ActivityLog[]>
  
  constructor() {
    this.messageCache = new LRU({
      max: 100,              // Max 100 thread contexts
      maxAge: 30 * 60 * 1000 // 30 minutes
    })
    
    this.activityCache = new LRU({
      max: 100,
      maxAge: 10 * 60 * 1000 // 10 minutes
    })
  }
  
  // Get limited context for API (last N messages + recent activity)
  getContextForAPI(threadId: string, limit: number = 10) {
    const messages = this.messageCache.get(threadId) || []
    const activity = this.activityCache.get(threadId) || []
    
    return {
      messages: messages.slice(-limit),          // Last N messages
      recentActivity: activity.slice(-5),        // Last 5 activities
      totalMessages: messages.length
    }
  }
}
```

#### Task 4: Activity Formatter (6-8h)
```typescript
// New: src/lib/ai-sidebar/activity-formatter.ts

export function formatActivityForAI(
  usageEvents: UsageEvent[]
): string {
  // Convert usage events to human-readable activity log
  return usageEvents.map(event => {
    const time = formatTime(event.createdAt)
    const action = formatEventType(event.eventType)
    const details = formatEventData(event.eventData)
    
    return `[${time}] ${action}${details ? ` - ${details}` : ''}`
  }).join('\n')
}

function formatEventType(eventType: string): string {
  const mapping = {
    'structuring_diagnose': 'User analyzed pain points in Structuring',
    'structuring_generate_solution': 'User generated solutions',
    'visuals_planning': 'User planned diagram layout',
    'solutioning_structure': 'User structured solution document',
    // ... more mappings
  }
  return mapping[eventType] || eventType
}
```

**Deliverables:**
- ✅ Project structure created
- ✅ HyperCanvas context pattern copied
- ✅ LRU cache operational
- ✅ Activity formatter working

---

### Phase 1: Three-Tiered Message System (2 weeks)
**Effort:** 50-70 hours

#### Task 1: Message Type System (6-8h)
```typescript
// src/lib/ai-sidebar/types.ts

export type MessageType = 'user' | 'hidden' | 'pre-response' | 'response' | 'error'

export interface SidebarMessage {
  id: string
  threadId: string
  role: 'user' | 'assistant'
  type: MessageType
  content: string
  timestamp: Date
  status: 'sending' | 'delivered' | 'error'
  metadata?: {
    inputLength?: number
    retryCount?: number
    streamComplete?: boolean
    modelUsed?: string
  }
}
```

#### Task 2: LangSmith Prompts Creation (8-12h)

**Prompt 1: `nexa-sidebar-hidden-message`**
```
Role: You are Nexa's AI Copilot, always present to assist users.

Context: You haven't seen the user's latest message yet. Based on:
- Previous conversation: {previous_messages}
- Recent activity: {recent_activity}
- Current workflow: {workflow_type}

Task: Generate a brief "thinking" message that:
- Shows you're processing/considering
- References something from the context
- Keeps the user engaged
- Is 1-2 sentences max

Examples:
- "Hmm, interesting... let me consider what we discussed about your workflows..."
- "I'm analyzing the recent changes you made to the schema..."
- "Let me think about how this connects to your structuring work..."

Generate hidden message:
```

**Prompt 2: `nexa-sidebar-pre-response`**
```
Role: You are Nexa's AI Copilot providing instant acknowledgment.

User said: {user_input}
Previous conversation: {previous_messages}
Recent activity: {recent_activity}
Current workflow: {workflow_type}

Task: Generate a short "aha moment" that:
- Acknowledges you understand the request
- Briefly outlines your approach
- 2-4 sentences max

Examples:
- "Got it — you're asking about schema synchronization. I'll walk through the connection logic..."
- "I see you want to optimize the DMA workflow. Here's how I'll approach this..."

Generate pre-response:
```

**Prompt 3: `nexa-sidebar-response`**
```
Role: You are Nexa's AI Copilot providing comprehensive assistance.

User said: {user_input}
Previous conversation: {previous_messages}
Recent activity: {recent_activity}
Current workflow: {workflow_type}
Organization preferences: {general_approach}

Task: Generate a complete, helpful response that:
- Directly addresses the user's request
- References their recent activity when relevant
- Provides actionable guidance
- Is 3 paragraphs max
- Uses their organization's preferred approach

Generate response:
```

#### Task 3: Message Generators (12-16h)
```typescript
// src/lib/ai-sidebar/message-generator.ts

import { ChatOpenAI } from '@langchain/openai'
import * as hub from 'langchain/hub/node'

export async function generateHiddenMessage(
  context: {
    previousMessages: SidebarMessage[]
    recentActivity: string
    workflowType: WorkflowType
  }
): Promise<string> {
  const prompt = await hub.pull('nexa-sidebar-hidden-message')
  
  const llm = new ChatOpenAI({
    modelName: 'gpt-5-nano', // or 'gpt-4o-mini' if unavailable
    temperature: 0.7,
    maxTokens: 100
  })
  
  const result = await prompt.pipe(llm).invoke({
    previous_messages: formatMessagesForPrompt(context.previousMessages),
    recent_activity: context.recentActivity,
    workflow_type: context.workflowType
  })
  
  return result.content
}

export async function generatePreResponse(
  userInput: string,
  context: {
    previousMessages: SidebarMessage[]
    recentActivity: string
    workflowType: WorkflowType
  }
): Promise<string> {
  const prompt = await hub.pull('nexa-sidebar-pre-response')
  
  const llm = new ChatOpenAI({
    modelName: 'gpt-5-nano',
    temperature: 0.6,
    maxTokens: 200
  })
  
  const result = await prompt.pipe(llm).invoke({
    user_input: userInput,
    previous_messages: formatMessagesForPrompt(context.previousMessages),
    recent_activity: context.recentActivity,
    workflow_type: context.workflowType
  })
  
  return result.content
}

export async function generateResponse(
  userInput: string,
  context: {
    previousMessages: SidebarMessage[]
    recentActivity: string
    workflowType: WorkflowType
    organizationId: string
  }
): Promise<string> {
  const prompt = await hub.pull('nexa-sidebar-response')
  
  // Get org preferences (using existing cache pattern)
  const prefs = await getOrgPreferences(context.organizationId)
  
  const llm = new ChatOpenAI({
    modelName: 'gpt-5-nano',
    temperature: 0.5,
    maxTokens: 1000
  })
  
  const result = await prompt.pipe(llm).invoke({
    user_input: userInput,
    previous_messages: formatMessagesForPrompt(context.previousMessages),
    recent_activity: context.recentActivity,
    workflow_type: context.workflowType,
    general_approach: prefs?.generalApproach || ''
  })
  
  return result.content
}
```

#### Task 4: Orchestration Logic (16-22h)
```typescript
// src/hooks/useGlobalSidebar.ts

const MIN_HIDDEN_MESSAGE_THRESHOLD = 60 // characters

export function useGlobalSidebar(workflowType: WorkflowType) {
  const [state, setState] = useState<SidebarState>({
    messages: [],
    currentHiddenMessage: null,
    isTyping: false,
    threadId: null
  })
  
  const contextManager = useRef(new SidebarContextManager())
  
  const handleUserMessage = async (userInput: string) => {
    const trimmed = userInput.trim()
    
    // 1. Input complexity check
    const isComplex = trimmed.length >= MIN_HIDDEN_MESSAGE_THRESHOLD
    
    // 2. Post user message
    const userMsg = createMessage('user', 'user', trimmed)
    addMessage(userMsg)
    
    // 3. If complex, post hidden message (already generated)
    if (isComplex && state.currentHiddenMessage) {
      addMessage(createMessage('assistant', 'hidden', state.currentHiddenMessage))
    }
    
    // 4. Get context (limited)
    const context = contextManager.current.getContextForAPI(state.threadId!, 10)
    const activityText = await fetchRecentActivity(organizationId)
    
    // 5. Fire async requests (Pre-Response + Response)
    setState(prev => ({ ...prev, isTyping: true }))
    
    const [preResult, respResult] = await Promise.allSettled([
      withRetry(() => generatePreResponse(trimmed, {
        previousMessages: context.messages,
        recentActivity: activityText,
        workflowType
      })),
      withRetry(() => generateResponse(trimmed, {
        previousMessages: context.messages,
        recentActivity: activityText,
        workflowType,
        organizationId
      }))
    ])
    
    // 6. Post Pre-Response if it completes first
    if (preResult.status === 'fulfilled') {
      addMessage(createMessage('assistant', 'pre-response', preResult.value))
    }
    
    // 7. Post Response
    if (respResult.status === 'fulfilled') {
      addMessage(createMessage('assistant', 'response', respResult.value))
      
      // 8. Generate next hidden message immediately
      const nextHidden = await generateHiddenMessage({
        previousMessages: [...context.messages, createMessage('assistant', 'response', respResult.value)],
        recentActivity: activityText,
        workflowType
      })
      
      setState(prev => ({ ...prev, currentHiddenMessage: nextHidden }))
    }
    
    setState(prev => ({ ...prev, isTyping: false }))
  }
  
  return {
    messages: state.messages,
    isTyping: state.isTyping,
    sendMessage: handleUserMessage,
    ...
  }
}
```

**Deliverables:**
- ✅ Three message types defined
- ✅ LangSmith prompts created and tested
- ✅ Generators working with GPT-5-Nano
- ✅ Orchestration handling race conditions
- ✅ Next hidden message generated after response

---

### Phase 2: Global Sidebar Component (1.5 weeks)
**Effort:** 30-40 hours

#### Task 1: Main Sidebar Component (12-16h)
```typescript
// src/components/ai-sidebar/AISidebar.tsx

export function AISidebar({
  workflowType,
  isExpanded,
  onToggle
}: AISidebarProps) {
  const { messages, sendMessage, isTyping } = useGlobalSidebar(workflowType)
  
  return (
    <div 
      className={cn(
        "fixed right-0 top-16 bottom-0 z-50",
        "transition-all duration-300 ease-in-out",
        // Dark, pitch black, cyberpunk theme
        "bg-black/95 backdrop-blur-xl",
        "border-l border-white/10",
        // Laser-like glow effect
        "shadow-[0_0_15px_rgba(255,255,255,0.1)]",
        isExpanded ? "w-96" : "w-12"
      )}
    >
      {isExpanded ? (
        <div className="h-full flex flex-col">
          {/* Header with glassy effect */}
          <div className="p-4 border-b border-white/10 bg-white/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-cyan-400 rounded-full animate-pulse" />
                <h3 className="text-white font-medium">AI Copilot</h3>
              </div>
              <button
                onClick={onToggle}
                className="text-white/60 hover:text-white transition-colors"
              >
                <ChevronRight />
              </button>
            </div>
            <p className="text-xs text-white/40 mt-1">{workflowType}</p>
          </div>
          
          {/* Messages */}
          <SidebarMessages 
            messages={messages}
            isTyping={isTyping}
          />
          
          {/* Activity Panel (collapsible) */}
          <ActivityPanel />
          
          {/* Input */}
          <SidebarInput 
            onSend={sendMessage}
            disabled={isTyping}
          />
        </div>
      ) : (
        // Collapsed state: vertical icon bar
        <div className="h-full flex flex-col items-center py-4 gap-4">
          <button
            onClick={onToggle}
            className="p-2 rounded-lg bg-white/5 hover:bg-white/10 transition-all"
          >
            <MessageSquare className="text-cyan-400" size={20} />
          </button>
        </div>
      )}
    </div>
  )
}
```

#### Task 2: Message Display (8-12h)
```typescript
// src/components/ai-sidebar/SidebarMessages.tsx

export function SidebarMessages({ messages, isTyping }: Props) {
  const messagesEndRef = useRef<HTMLDivElement>(null)
  
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])
  
  return (
    <div className="flex-1 overflow-y-auto p-4 space-y-3">
      {messages.map((message) => (
        <div
          key={message.id}
          className={cn(
            "flex",
            message.role === 'user' ? 'justify-end' : 'justify-start'
          )}
        >
          <div
            className={cn(
              "max-w-[85%] p-3 rounded-lg",
              // Cyberpunk glassy styling
              "backdrop-blur-sm",
              message.role === 'user'
                ? "bg-cyan-500/20 text-cyan-100 border border-cyan-400/30"
                : message.type === 'hidden'
                  ? "bg-white/5 text-white/60 border border-white/10 italic"
                  : message.type === 'pre-response'
                    ? "bg-purple-500/10 text-purple-100 border border-purple-400/20"
                    : "bg-white/10 text-white border border-white/20",
              // Laser-like glow
              message.role === 'user' && "shadow-[0_0_10px_rgba(34,211,238,0.3)]"
            )}
          >
            <div className="text-sm leading-relaxed whitespace-pre-wrap">
              {message.content}
            </div>
            
            <div className="flex items-center justify-between mt-2 text-xs text-white/40">
              <span>{formatTime(message.timestamp)}</span>
              {message.type !== 'user' && (
                <span className="uppercase text-[10px]">{message.type}</span>
              )}
            </div>
          </div>
        </div>
      ))}
      
      {/* Typing indicator with laser effect */}
      {isTyping && (
        <div className="flex justify-start">
          <div className="bg-white/10 p-3 rounded-lg border border-white/20">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce" />
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-75" />
              <div className="w-2 h-2 bg-cyan-400 rounded-full animate-bounce delay-150" />
            </div>
          </div>
        </div>
      )}
      
      <div ref={messagesEndRef} />
    </div>
  )
}
```

#### Task 3: Layout Integration (10-12h)
```typescript
// Update: src/components/layout/dashboard-layout.tsx

export function DashboardLayout({ 
  children, 
  currentPage,
  workflowType // NEW: pass current workflow
}) {
  const [sidebarExpanded, setSidebarExpanded] = useState(
    localStorage.getItem('ai-sidebar-expanded') === 'true'
  )
  
  return (
    <div className="min-h-screen flex nexa-background">
      {/* Left Sidebar (existing) */}
      <Sidebar ... />
      
      {/* Main Content */}
      <div 
        className={cn(
          "flex-1 flex flex-col transition-all duration-300",
          sidebarExpanded ? "mr-96" : "mr-12"
        )}
      >
        <Header ... />
        <main className="flex-1 flex flex-col">
          {children}
        </main>
        <Footer />
      </div>
      
      {/* Right Sidebar - AI Copilot (NEW) */}
      <AISidebar 
        workflowType={workflowType}
        isExpanded={sidebarExpanded}
        onToggle={() => {
          setSidebarExpanded(!sidebarExpanded)
          localStorage.setItem('ai-sidebar-expanded', (!sidebarExpanded).toString())
        }}
      />
    </div>
  )
}
```

**Deliverables:**
- ✅ Sidebar component with dark cyberpunk theme
- ✅ Message display with type-specific styling
- ✅ Layout integrated across all workflows
- ✅ Collapse/expand persistence

---

### Phase 3: Error Handling & Polish (1 week)
**Effort:** 20-28 hours

#### Task 1: Error Messages Pool (4-6h)
```typescript
// src/lib/ai-sidebar/error-messages.ts

export const ERROR_MESSAGES = {
  firstFailure: [
    "Hmm, I didn't quite get that. Let me try again real quick…",
    "Oops, that didn't go through. Give me a moment to retry…",
    // ... 48 more variations
  ],
  secondFailure: [
    "Wait, that didn't go through either — give me a second, I'll retry once more.",
    "Hmm, still having trouble. Let me try one last time…",
    // ... 48 more variations
  ],
  finalFailure: [
    "I tried a few times but it looks like I'm stuck. Could you rephrase or ask again?",
    "I'm having trouble with this one. Mind trying a different way?",
    // ... 48 more variations
  ]
}

export function getRandomErrorMessage(stage: 'first' | 'second' | 'final'): string {
  const messages = ERROR_MESSAGES[`${stage}Failure`]
  return messages[Math.floor(Math.random() * messages.length)]
}
```

#### Task 2: Retry Logic (8-12h)
```typescript
// src/lib/ai-sidebar/error-handler.ts

export async function withRetry<T>(
  fn: () => Promise<T>,
  onRetry?: (message: string, count: number) => void
): Promise<T> {
  let retryCount = 0
  const maxRetries = 2
  
  while (retryCount <= maxRetries) {
    try {
      return await fn()
    } catch (error) {
      retryCount++
      
      if (retryCount > maxRetries) {
        const errorMsg = getRandomErrorMessage('final')
        onRetry?.(errorMsg, retryCount)
        throw error
      }
      
      const stage = retryCount === 1 ? 'first' : 'second'
      const errorMsg = getRandomErrorMessage(stage)
      onRetry?.(errorMsg, retryCount)
      
      // Wait before retry
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
    }
  }
  
  throw new Error('Max retries exceeded')
}
```

#### Task 3: Activity Panel (8-10h)
```typescript
// src/components/ai-sidebar/ActivityPanel.tsx

export function ActivityPanel() {
  const [expanded, setExpanded] = useState(false)
  const [activities, setActivities] = useState<ActivityLog[]>([])
  
  useEffect(() => {
    // Fetch recent usage events
    fetchRecentActivity().then(setActivities)
  }, [])
  
  return (
    <div className="border-t border-white/10 bg-white/5">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="w-full p-3 flex items-center justify-between text-sm text-white/60 hover:text-white/80 transition-colors"
      >
        <span>Recent Activity</span>
        <ChevronDown className={cn(
          "transition-transform",
          expanded && "rotate-180"
        )} />
      </button>
      
      {expanded && (
        <div className="max-h-40 overflow-y-auto p-3 space-y-2">
          {activities.map(activity => (
            <div 
              key={activity.id}
              className="text-xs p-2 bg-black/40 rounded border border-white/5"
            >
              <div className="text-white/80">{activity.action}</div>
              <div className="text-white/40 mt-1">{activity.details}</div>
              <div className="text-white/30 mt-1">{formatTime(activity.timestamp)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Deliverables:**
- ✅ 150+ error message variations
- ✅ Retry logic with 2-attempt max
- ✅ Activity panel showing recent actions
- ✅ Human-like error handling

---

### Phase 4: Token Streaming (1 week)
**Effort:** 18-26 hours

#### Task 1: Streaming API (8-12h)
```typescript
// src/app/api/ai-sidebar/stream/route.ts

import { StreamingTextResponse } from 'ai'

export async function POST(request: Request) {
  const { 
    messageType, 
    userInput, 
    context, 
    workflowType, 
    organizationId 
  } = await request.json()
  
  // Select appropriate generator
  const generator = messageType === 'hidden' 
    ? generateHiddenMessage
    : messageType === 'pre-response'
      ? generatePreResponse
      : generateResponse
  
  // Call with streaming
  const stream = await generator(userInput, context, { streaming: true })
  
  return new StreamingTextResponse(stream)
}
```

#### Task 2: Client Streaming (10-14h)
```typescript
// Update: src/hooks/useGlobalSidebar.ts

const streamMessage = async (
  messageType: MessageType,
  ...params
) => {
  const messageId = generateId()
  
  // Create placeholder
  addMessage({
    id: messageId,
    type: messageType,
    content: '',
    status: 'sending'
  })
  
  // Stream tokens
  const response = await fetch('/api/ai-sidebar/stream', {
    method: 'POST',
    body: JSON.stringify({ messageType, ...params })
  })
  
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  let accumulated = ''
  
  while (true) {
    const { done, value } = await reader!.read()
    if (done) break
    
    accumulated += decoder.decode(value)
    updateMessage(messageId, { content: accumulated })
  }
  
  updateMessage(messageId, { status: 'delivered' })
  return accumulated
}
```

**Deliverables:**
- ✅ SSE streaming endpoint
- ✅ Token-by-token rendering
- ✅ Typing cursor effect
- ✅ Smooth user experience

---

### Phase 5: Voice Mode - Whisper TTS (1.5 weeks)
**Effort:** 24-32 hours

**[Implementation details similar to previous roadmap, using Whisper API for TTS]**

**Deliverables:**
- ✅ Text-to-speech working
- ✅ Audio synchronized with text
- ✅ Voice mode toggle

---

### Phase 6: Voice Mode - Vosk STT (2 weeks)
**Effort:** 36-48 hours

#### Key Change: Vosk on Same Server

```typescript
// src/lib/voice/vosk-server.ts (runs on main Next.js server)

import vosk from 'vosk'
import { WebSocketServer } from 'ws'

let voskModel: any = null

export async function initializeVosk() {
  if (!voskModel) {
    voskModel = new vosk.Model('./vosk-model-small-en-us-0.15')
    console.log('✅ Vosk model loaded')
  }
  
  const wss = new WebSocketServer({ noServer: true })
  
  wss.on('connection', (ws) => {
    const recognizer = new vosk.Recognizer({
      model: voskModel,
      sampleRate: 16000
    })
    
    ws.on('message', (data) => {
      if (recognizer.acceptWaveform(data)) {
        const result = recognizer.result()
        ws.send(JSON.stringify({ type: 'final', text: result.text }))
      } else {
        const partial = recognizer.partialResult()
        ws.send(JSON.stringify({ type: 'partial', text: partial.partial }))
      }
    })
    
    ws.on('close', () => recognizer.free())
  })
  
  return wss
}

// Initialize on server startup
```

**Deliverables:**
- ✅ Vosk running on same server
- ✅ WebSocket speech-to-text
- ✅ Real-time transcription
- ✅ Voice input mode

---

### Phase 7: Conversation Persistence (1 week)
**Effort:** 12-18 hours

#### Save on Demand (NOT Auto-save)

```typescript
// src/hooks/useGlobalSidebar.ts

export function useGlobalSidebar(workflowType: WorkflowType) {
  const [isSaved, setIsSaved] = useState(false)
  
  const saveConversation = async () => {
    if (!state.threadId) return
    
    // Save to database
    await fetch('/api/ai-sidebar/save', {
      method: 'POST',
      body: JSON.stringify({
        threadId: state.threadId,
        messages: state.messages,
        workflowType
      })
    })
    
    setIsSaved(true)
    showToast('Conversation saved!')
  }
  
  const loadConversation = async (threadId: string) => {
    const response = await fetch(`/api/ai-sidebar/load/${threadId}`)
    const data = await response.json()
    
    setState({
      ...state,
      messages: data.messages,
      threadId: data.threadId
    })
  }
  
  return {
    ...
    saveConversation,
    loadConversation,
    isSaved
  }
}
```

**Deliverables:**
- ✅ Save button in UI
- ✅ Load past conversations
- ✅ NOT auto-saving (user control)

---

## ⏱️ UPDATED EFFORT SUMMARY

| Phase | Effort (hours) | Duration (weeks) | Priority |
|-------|---------------|------------------|----------|
| Phase 0: Foundation | 20-28 | 1 | 🔴 Immediate |
| Phase 1: Three-Tiered | 50-70 | 2 | 🔴 Critical |
| Phase 2: Global Sidebar | 30-40 | 1.5 | 🔴 Critical |
| Phase 3: Error & Polish | 20-28 | 1 | 🟡 High |
| Phase 4: Streaming | 18-26 | 1 | 🟡 High |
| Phase 5: Whisper TTS | 24-32 | 1.5 | 🟢 Medium |
| Phase 6: Vosk STT | 36-48 | 2 | 🟢 Medium |
| Phase 7: Persistence | 12-18 | 1 | 🟢 Medium |
| **TOTAL** | **210-290** | **11-14.5** | - |

**Reduction from v1:** 50-66 hours saved by:
- ✅ Reusing existing cache patterns (no new implementation)
- ✅ Reusing existing activity tracking (just formatting)
- ✅ Clearer requirements (less exploratory work)

**At 40 hours/week:** 5.2-7.2 weeks (1.3-1.8 months)  
**At 30 hours/week:** 7-9.7 weeks (1.7-2.4 months)

---

## 🎯 RECOMMENDED APPROACH

### Option A: Core Features First (Phases 0-4)
**Timeline:** 4-5 weeks at full capacity  
**Effort:** 138-192 hours  
**Result:** Functional three-tiered sidebar with streaming  
**Defer:** Voice modes (add in Phase 2)

**Why?** Delivers 80% of value in 65% of time

---

## 📦 DEPENDENCIES

### NPM Packages
```bash
npm install vosk              # Speech-to-text (SAME server)
npm install lru-cache         # Message context caching
npm install @types/lru-cache  # TypeScript types
```

### Vosk Model
```bash
# Download to project root
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
```

---

## 🎨 THEME GUIDELINES

**Consistent with existing dark theme:**
- Background: `bg-black/95` with `backdrop-blur-xl`
- Borders: `border-white/10`
- Text: `text-white` with varying opacity
- Accent: Cyan (`#22d3ee`) for laser-like effects
- Shadows: Subtle glows `shadow-[0_0_15px_rgba(255,255,255,0.1)]`
- Glass morphism: `bg-white/5` for panels

---

## ✅ SUCCESS CRITERIA

### Phase 0-2 Success (Weeks 1-4.5)
- ✅ Three-tiered message flow working
- ✅ Hidden message displays instantly
- ✅ Pre-Response and Response async
- ✅ Activity formatted for AI context
- ✅ LRU cache limiting context sent
- ✅ Sidebar on all workflow pages
- ✅ Collapse/expand working
- ✅ Theme matches existing design

### Phase 3-4 Success (Weeks 5-6)
- ✅ Error messages human-like
- ✅ Retry logic (2 attempts)
- ✅ Token streaming smooth
- ✅ Activity panel functional

### Phase 5-7 Success (Weeks 7-11, if voice)
- ✅ Whisper TTS synchronized
- ✅ Vosk STT on same server
- ✅ Voice mode fully functional
- ✅ Save/load on demand

---

## 🚀 NEXT STEPS

### Week 1: Foundation
1. Install dependencies (vosk, lru-cache)
2. Download Vosk model
3. Create project structure
4. Copy HyperCanvas context pattern
5. Set up LRU cache
6. Create activity formatter

### Week 2: LangSmith Prompts
1. Create 3 prompts in LangSmith
2. Test with GPT-5-Nano (or gpt-4o-mini fallback)
3. Refine prompt quality
4. Begin message generators

---

**Ready to begin Phase 0! 🚀**



