# 🗣️ Right Sidebar — Conversational AI Implementation Roadmap
**From Current HyperCanvas to Global AI Copilot**

**Date:** October 10, 2025  
**Status:** Detailed Analysis Complete  
**Estimated Total Effort:** 180-240 hours (4.5-6 weeks at full capacity)

---

## 📊 EXECUTIVE SUMMARY

### Blueprint Vision

The Right Sidebar is a **cursor-like AI copilot** that provides:
- **Three-tiered message flow** (Hidden → Pre-Response → Response)
- **Voice mode** with Whisper TTS/STT and Vosk STT
- **Activity logging** integration (AI watches user actions)
- **Zero perceived latency** (instant engagement)
- **Streaming text** with token-by-token rendering
- **Error handling** with human-like retry logic
- **Persistent across all workflows** (not just HyperCanvas modal)

### Current State Assessment: 30% Foundation

**What Exists:**
- ✅ HyperCanvas chat component (modal-only, solutioning page)
- ✅ Basic message history and state management
- ✅ LangChain + LangSmith integration
- ✅ PostgreSQL message persistence
- ✅ Token streaming concept (in hook)
- ✅ Simple typing indicators

**What's Missing:**
- ❌ Three-tiered message system (Hidden/Pre-Response/Response)
- ❌ Async orchestration (parallel Pre-Response + Response)
- ❌ Global right sidebar (currently modal-only)
- ❌ Voice mode (Whisper TTS, Vosk STT)
- ❌ Activity logging system
- ❌ Input complexity checking
- ❌ Error retry logic with human messages
- ❌ WebSocket/SSE for real-time streaming
- ❌ Vosk server for speech-to-text
- ❌ Audio playback synchronization

---

## 🔍 GAP ANALYSIS: CURRENT vs. BLUEPRINT

### ✅ EXISTING INFRASTRUCTURE (Leverage & Extend)

#### 1. Chat Component Foundation ✅
**Current:** `ChatInterface.tsx` (215 lines)
- Message display with role-based styling
- Input handling with character limit (500)
- Auto-scroll to latest message
- Status indicators (sending, delivered, error)
- Typing indicator

**Use Case:** Extend for three-tiered messaging, add voice controls

---

#### 2. Chat Hook ✅
**Current:** `useHyperCanvasChat.ts` (538 lines)
- Message state management
- API communication
- Timeout handling
- Document update callbacks

**Use Case:** Transform into global sidebar hook with three-tiered flow

---

#### 3. LangChain Integration ✅
**Current:** `hyper-canvas-chat.ts` (910 lines)
- PostgreSQL message history
- LangSmith prompt pulling
- Memory management
- Dual-agent system (Quickshot + Maestro)

**Use Case:** Adapt for Hidden/Pre-Response/Response pattern

---

#### 4. Message Persistence ✅
**Current:** PostgreSQL `hyper_canvas_messages` table
- Thread-based storage
- Role tracking (user/assistant)
- Timestamp and metadata

**Use Case:** Extend for message types (hidden/pre/response)

---

### ❌ NEW IMPLEMENTATIONS REQUIRED

#### 1. Three-Tiered Message System ❌

**Blueprint Requirement:**
```
User Input → [Hidden Message] → [Pre-Response + Response async] → [Next Hidden]
```

**Implementation Required:**

**Phase 1: Message Type System (8-12 hours)**
```typescript
// New: src/lib/ai-sidebar/message-types.ts

export type MessageType = 'user' | 'hidden' | 'pre-response' | 'response' | 'error'

export interface SidebarMessage {
  id: string
  role: 'user' | 'assistant'
  type: MessageType
  content: string
  timestamp: Date
  status: 'sending' | 'delivered' | 'error'
  metadata?: {
    inputLength?: number  // For complexity check
    retryCount?: number   // For error handling
    streamComplete?: boolean
  }
}
```

**Phase 2: Hidden Message Generator (12-16 hours)**
```typescript
// New: src/lib/ai-sidebar/hidden-message-generator.ts

export async function generateHiddenMessage(
  context: ConversationContext,
  activityLogs: ActivityLog[]
): Promise<string> {
  // LangSmith prompt: nexa-sidebar-hidden-message
  // Input: previous messages (NOT latest user input), activity logs
  // Output: Short contextual "thinking" message (1-2 sentences)
  // Examples:
  // - "Hmm, interesting... let me consider what we discussed about your workflows..."
  // - "I'm analyzing the recent changes you made to the schema..."
  // - "Let me think about how this connects to your earlier question..."
}
```

**Phase 3: Pre-Response Generator (12-16 hours)**
```typescript
// New: src/lib/ai-sidebar/pre-response-generator.ts

export async function generatePreResponse(
  userInput: string,
  context: ConversationContext,
  activityLogs: ActivityLog[]
): Promise<string> {
  // LangSmith prompt: nexa-sidebar-pre-response
  // Input: latest user input, context, logs
  // Output: Short acknowledgment (2-4 sentences)
  // Examples:
  // - "Got it — you're asking about schema synchronization. I'll walk through the connection logic..."
  // - "I see you want to optimize the DMA workflow. Here's how I'll approach this..."
}
```

**Phase 4: Response Generator (12-16 hours)**
```typescript
// New: src/lib/ai-sidebar/response-generator.ts

export async function generateResponse(
  userInput: string,
  context: ConversationContext,
  activityLogs: ActivityLog[],
  workflowType: WorkflowType
): Promise<string> {
  // LangSmith prompt: nexa-sidebar-response
  // Input: latest user input, context, logs, workflow type
  // Output: Comprehensive response (3 paragraphs)
  // Workflow-aware: different prompts for structuring, visuals, solutioning, etc.
}
```

**Phase 5: Orchestration Logic (16-20 hours)**
```typescript
// New: src/hooks/useAISidebar.ts

export function useAISidebar(workflowType: WorkflowType) {
  // Core orchestration:
  // 1. Check input complexity (skip hidden if < threshold)
  // 2. If complex: post hidden message instantly
  // 3. Fire two async requests: Pre-Response + Response
  // 4. Post Pre-Response when ready (unless Response beats it)
  // 5. Post Response when ready
  // 6. Generate next Hidden Message immediately after Response
  
  const handleUserMessage = async (userInput: string) => {
    // Input complexity check
    const isComplex = userInput.length > MIN_THRESHOLD // 60 chars
    
    if (isComplex) {
      // Post hidden message instantly (already generated)
      postMessage(currentHiddenMessage)
    }
    
    // Start async operations
    const [preResponsePromise, responsePromise] = await Promise.allSettled([
      generatePreResponse(userInput, context, logs),
      generateResponse(userInput, context, logs, workflowType)
    ])
    
    // Handle race condition (Response might beat Pre-Response)
    // Post whichever completes first, then the other
    
    // After Response is posted, generate next Hidden Message
    const nextHidden = await generateHiddenMessage(updatedContext, logs)
    setCurrentHiddenMessage(nextHidden)
  }
}
```

**Total Effort:** 60-80 hours  
**Priority:** 🔴 **CRITICAL** - Core blueprint requirement  
**Risk:** 🟡 Medium (complex orchestration, race conditions)

---

#### 2. Global Right Sidebar Component ❌

**Blueprint Requirement:** "Every module includes a right-hand sidebar"

**Current State:** Chat only exists in HyperCanvas modal (solutioning page)

**Implementation Required:**

**Phase 1: Sidebar Component (16-20 hours)**
```typescript
// New: src/components/ai-sidebar/AISidebar.tsx

export function AISidebar({
  workflowType,
  isExpanded,
  onToggle
}: AISidebarProps) {
  const { messages, sendMessage, isTyping, state } = useAISidebar(workflowType)
  
  return (
    <div className={`fixed right-0 top-16 bottom-0 transition-all duration-300 ${
      isExpanded ? 'w-96' : 'w-12'
    }`}>
      {isExpanded ? (
        <div className="h-full flex flex-col bg-black/95 border-l border-white/10">
          {/* Header */}
          <SidebarHeader workflowType={workflowType} onToggle={onToggle} />
          
          {/* Messages */}
          <SidebarMessages 
            messages={messages}
            isTyping={isTyping}
            messageTypes={['hidden', 'pre-response', 'response']}
          />
          
          {/* Activity Logs */}
          <ActivityLogPanel logs={state.activityLogs} />
          
          {/* Input */}
          <SidebarInput 
            onSend={sendMessage}
            voiceEnabled={state.voiceMode}
            onVoiceToggle={() => toggleVoiceMode()}
          />
          
          {/* Voice Controls (when in voice mode) */}
          {state.voiceMode && <VoiceControls />}
        </div>
      ) : (
        <div className="h-full flex flex-col items-center bg-black/90 border-l border-white/10 py-4">
          {/* Collapsed state: icon + notification badge */}
          <button onClick={onToggle} className="...">
            <MessageSquare size={24} />
            {state.unreadCount > 0 && (
              <span className="badge">{state.unreadCount}</span>
            )}
          </button>
        </div>
      )}
    </div>
  )
}
```

**Phase 2: Layout Integration (12-16 hours)**
```typescript
// Update: src/components/layout/dashboard-layout.tsx

export function DashboardLayout({ children, currentPage, workflowType }) {
  const [sidebarExpanded, setSidebarExpanded] = useState(
    localStorage.getItem('ai-sidebar-expanded') === 'true'
  )
  
  return (
    <div className="min-h-screen flex nexa-background">
      {/* Left Sidebar (existing) */}
      <Sidebar ... />
      
      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        <Header ... />
        <main className={`flex-1 transition-all ${
          sidebarExpanded ? 'mr-96' : 'mr-12'
        }`}>
          {children}
        </main>
        <Footer />
      </div>
      
      {/* Right Sidebar (NEW) */}
      <AISidebar 
        workflowType={workflowType}
        isExpanded={sidebarExpanded}
        onToggle={() => setSidebarExpanded(!sidebarExpanded)}
      />
    </div>
  )
}
```

**Phase 3: Workflow-Specific Context (8-12 hours)**
```typescript
// New: src/contexts/AISidebarContext.tsx

export const AISidebarProvider = ({ children, workflowType }) => {
  const [state, setState] = useState({
    messages: [],
    activityLogs: [],
    voiceMode: false,
    currentHiddenMessage: null,
    isTyping: false
  })
  
  // Workflow-specific behavior
  const contextData = useMemo(() => ({
    workflowType,
    availableActions: getWorkflowActions(workflowType),
    recentActivity: getRecentWorkflowActivity(workflowType)
  }), [workflowType])
  
  return (
    <AISidebarContext.Provider value={{ state, contextData }}>
      {children}
    </AISidebarContext.Provider>
  )
}
```

**Total Effort:** 36-48 hours  
**Priority:** 🔴 **CRITICAL** - Core UX transformation  
**Risk:** 🟢 Low (well-defined component)

---

#### 3. Activity Logging System ❌

**Blueprint Requirement:** "Logs of user activity appended to context. Model references real actions on platform."

**Implementation Required:**

**Phase 1: Activity Logger (12-16 hours)**
```typescript
// New: src/lib/activity-logger/logger.ts

export interface ActivityLog {
  id: string
  userId: string
  organizationId: string
  workflowType: WorkflowType
  action: string  // 'page_view', 'button_click', 'form_submit', etc.
  target: string  // Element or page identifier
  metadata: Record<string, any>
  timestamp: Date
}

export class ActivityLogger {
  private buffer: ActivityLog[] = []
  private maxBufferSize = 50  // Keep last 50 actions
  
  log(action: string, target: string, metadata?: any) {
    const log: ActivityLog = {
      id: generateId(),
      userId: getCurrentUserId(),
      organizationId: getCurrentOrgId(),
      workflowType: getCurrentWorkflow(),
      action,
      target,
      metadata: metadata || {},
      timestamp: new Date()
    }
    
    this.buffer.push(log)
    
    // Keep buffer size manageable
    if (this.buffer.length > this.maxBufferSize) {
      this.buffer.shift()
    }
    
    // Optionally send to server for persistence
    this.sendToServer(log)
  }
  
  getRecentLogs(count: number = 10): ActivityLog[] {
    return this.buffer.slice(-count)
  }
  
  formatForAI(): string {
    // Format logs for LLM context
    return this.buffer.map(log => 
      `[${log.timestamp.toISOString()}] ${log.action} on ${log.target}`
    ).join('\n')
  }
}

export const activityLogger = new ActivityLogger()
```

**Phase 2: Automatic Tracking (8-12 hours)**
```typescript
// New: src/lib/activity-logger/auto-tracker.ts

export function setupActivityTracking() {
  // Track page navigation
  useEffect(() => {
    const trackPageView = () => {
      activityLogger.log('page_view', window.location.pathname)
    }
    
    window.addEventListener('popstate', trackPageView)
    return () => window.removeEventListener('popstate', trackPageView)
  }, [])
  
  // Track button clicks (via data attributes)
  useEffect(() => {
    const trackClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement
      const trackable = target.closest('[data-track]')
      
      if (trackable) {
        const action = trackable.getAttribute('data-track-action') || 'click'
        const name = trackable.getAttribute('data-track-name') || 'unknown'
        
        activityLogger.log(action, name, {
          element: trackable.tagName,
          text: trackable.textContent?.substring(0, 50)
        })
      }
    }
    
    document.addEventListener('click', trackClick)
    return () => document.removeEventListener('click', trackClick)
  }, [])
}
```

**Phase 3: UI Integration (4-6 hours)**
```typescript
// Update all workflow pages to add tracking attributes

// Example: src/app/structuring/page.tsx
<Button
  data-track
  data-track-action="ai_generate"
  data-track-name="diagnose_pain_points"
  onClick={handleDiagnose}
>
  Diagnose
</Button>
```

**Phase 4: Activity Display in Sidebar (6-8 hours)**
```typescript
// New: src/components/ai-sidebar/ActivityLogPanel.tsx

export function ActivityLogPanel({ logs }: { logs: ActivityLog[] }) {
  const [expanded, setExpanded] = useState(false)
  
  return (
    <div className="border-t border-white/10 p-3">
      <button 
        onClick={() => setExpanded(!expanded)}
        className="flex items-center justify-between w-full text-sm text-white/60"
      >
        <span>Recent Activity</span>
        <ChevronDown className={expanded ? 'rotate-180' : ''} />
      </button>
      
      {expanded && (
        <div className="mt-2 space-y-1 max-h-40 overflow-y-auto">
          {logs.slice(-10).reverse().map(log => (
            <div key={log.id} className="text-xs text-white/40 p-2 bg-white/5 rounded">
              <span className="text-white/60">{formatAction(log.action)}</span>
              <span className="ml-2">{log.target}</span>
              <span className="ml-2 text-white/30">
                {formatTime(log.timestamp)}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
```

**Total Effort:** 30-42 hours  
**Priority:** 🟡 **HIGH** - Contextual intelligence  
**Risk:** 🟢 Low (straightforward event tracking)

---

#### 4. Voice Mode — Whisper TTS ❌

**Blueprint Requirement:** "Text → Whisper → Audio playback synchronized with text streaming"

**Implementation Required:**

**Phase 1: Whisper TTS Integration (10-14 hours)**
```typescript
// New: src/lib/voice/whisper-tts.ts

export async function textToSpeech(text: string): Promise<AudioBuffer> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      model: 'tts-1',  // Or 'tts-1-hd' for higher quality
      voice: 'alloy',  // Options: alloy, echo, fable, onyx, nova, shimmer
      input: text,
      speed: 1.0
    })
  })
  
  const audioBlob = await response.blob()
  const arrayBuffer = await audioBlob.arrayBuffer()
  const audioContext = new AudioContext()
  return await audioContext.decodeAudioData(arrayBuffer)
}

export class TTSQueue {
  private queue: Array<{ text: string; buffer: AudioBuffer }> = []
  private isPlaying = false
  
  async add(text: string) {
    const buffer = await textToSpeech(text)
    this.queue.push({ text, buffer })
    
    if (!this.isPlaying) {
      this.playNext()
    }
  }
  
  private async playNext() {
    if (this.queue.length === 0) {
      this.isPlaying = false
      return
    }
    
    this.isPlaying = true
    const { buffer } = this.queue.shift()!
    
    const audioContext = new AudioContext()
    const source = audioContext.createBufferSource()
    source.buffer = buffer
    source.connect(audioContext.destination)
    
    source.onended = () => {
      this.playNext()
    }
    
    source.start()
  }
  
  stop() {
    this.queue = []
    this.isPlaying = false
  }
}
```

**Phase 2: Voice Mode Integration (12-16 hours)**
```typescript
// Update: src/hooks/useAISidebar.ts

export function useAISidebar(workflowType: WorkflowType) {
  const [voiceMode, setVoiceMode] = useState(false)
  const ttsQueue = useRef(new TTSQueue())
  
  const handleUserMessage = async (userInput: string) => {
    // ... existing logic ...
    
    // In voice mode: generate audio for each message
    if (voiceMode) {
      // Hidden message
      if (isComplex) {
        ttsQueue.current.add(currentHiddenMessage)
      }
      
      // Pre-response + Response
      const [preResp, resp] = await Promise.allSettled([...])
      
      if (preResp.status === 'fulfilled') {
        const preText = preResp.value
        postMessage(preText, 'pre-response')
        ttsQueue.current.add(preText)  // Audio starts immediately
      }
      
      if (resp.status === 'fulfilled') {
        const respText = resp.value
        postMessage(respText, 'response')
        ttsQueue.current.add(respText)
        
        // Generate next hidden (text first, then audio)
        const nextHidden = await generateHiddenMessage(...)
        const nextHiddenAudio = await textToSpeech(nextHidden)
        setCurrentHiddenMessage({ text: nextHidden, audio: nextHiddenAudio })
      }
    }
  }
  
  return { voiceMode, setVoiceMode, ... }
}
```

**Phase 3: Voice Controls UI (6-8 hours)**
```typescript
// New: src/components/ai-sidebar/VoiceControls.tsx

export function VoiceControls({ 
  isPlaying, 
  onTogglePlay, 
  onStop 
}: VoiceControlsProps) {
  return (
    <div className="border-t border-white/10 p-3 flex items-center gap-2">
      <button onClick={onTogglePlay}>
        {isPlaying ? <Pause size={18} /> : <Play size={18} />}
      </button>
      <button onClick={onStop}>
        <Square size={18} />
      </button>
      <div className="flex-1">
        <WaveformVisualization />
      </div>
    </div>
  )
}
```

**Total Effort:** 28-38 hours  
**Priority:** 🟡 **HIGH** - Enhanced UX  
**Risk:** 🟢 Low (well-documented Whisper API)

---

#### 5. Voice Mode — Vosk STT ❌

**Blueprint Requirement:** "User speaks → Vosk transcribes → real-time text in chat"

**Implementation Required:**

**Phase 1: Vosk Server Setup (16-20 hours)**
```typescript
// New: vosk-server/server.js (separate Node.js server)

const vosk = require('vosk')
const WebSocket = require('ws')
const fs = require('fs')

// Download model first: https://alphacephei.com/vosk/models
const MODEL_PATH = './model'
const model = new vosk.Model(MODEL_PATH)

const wss = new WebSocket.Server({ port: 3001 })

wss.on('connection', (ws) => {
  console.log('Client connected')
  
  const recognizer = new vosk.Recognizer({
    model: model,
    sampleRate: 16000
  })
  
  ws.on('message', (data) => {
    // Receive audio chunks from client
    if (recognizer.acceptWaveform(data)) {
      // Final result (after silence detected)
      const result = recognizer.result()
      ws.send(JSON.stringify({ 
        type: 'final', 
        text: result.text 
      }))
    } else {
      // Partial result (live transcription)
      const partial = recognizer.partialResult()
      ws.send(JSON.stringify({ 
        type: 'partial', 
        text: partial.partial 
      }))
    }
  })
  
  ws.on('close', () => {
    recognizer.free()
    console.log('Client disconnected')
  })
})

console.log('Vosk server running on ws://localhost:3001')
```

**Phase 2: Client-Side STT Integration (12-16 hours)**
```typescript
// New: src/lib/voice/vosk-stt.ts

export class VoskSTT {
  private ws: WebSocket | null = null
  private mediaStream: MediaStream | null = null
  private audioContext: AudioContext | null = null
  private processor: ScriptProcessorNode | null = null
  
  async start(onPartial: (text: string) => void, onFinal: (text: string) => void) {
    // Connect to Vosk server
    this.ws = new WebSocket('ws://localhost:3001')
    
    this.ws.onmessage = (event) => {
      const data = JSON.parse(event.data)
      
      if (data.type === 'partial') {
        onPartial(data.text)
      } else if (data.type === 'final') {
        onFinal(data.text)
      }
    }
    
    // Get microphone access
    this.mediaStream = await navigator.mediaDevices.getUserMedia({ 
      audio: {
        sampleRate: 16000,
        channelCount: 1
      }
    })
    
    // Set up audio processing
    this.audioContext = new AudioContext({ sampleRate: 16000 })
    const source = this.audioContext.createMediaStreamSource(this.mediaStream)
    this.processor = this.audioContext.createScriptProcessor(4096, 1, 1)
    
    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0)
      
      // Convert Float32Array to Int16Array (Vosk expects 16-bit PCM)
      const int16Data = new Int16Array(inputData.length)
      for (let i = 0; i < inputData.length; i++) {
        int16Data[i] = Math.max(-1, Math.min(1, inputData[i])) * 0x7FFF
      }
      
      // Send to Vosk server
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(int16Data.buffer)
      }
    }
    
    source.connect(this.processor)
    this.processor.connect(this.audioContext.destination)
  }
  
  stop() {
    this.processor?.disconnect()
    this.mediaStream?.getTracks().forEach(track => track.stop())
    this.ws?.close()
    this.audioContext?.close()
  }
}
```

**Phase 3: Voice Input UI (8-12 hours)**
```typescript
// New: src/components/ai-sidebar/VoiceInput.tsx

export function VoiceInput({ 
  onTranscript 
}: VoiceInputProps) {
  const [isRecording, setIsRecording] = useState(false)
  const [partialText, setPartialText] = useState('')
  const sttRef = useRef<VoskSTT>(new VoskSTT())
  
  const startRecording = async () => {
    setIsRecording(true)
    await sttRef.current.start(
      (partial) => setPartialText(partial),  // Show live transcription
      (final) => {
        onTranscript(final)  // Send final text
        setPartialText('')
      }
    )
  }
  
  const stopRecording = () => {
    sttRef.current.stop()
    setIsRecording(false)
  }
  
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={isRecording ? stopRecording : startRecording}
        className={`p-3 rounded-full ${
          isRecording ? 'bg-red-500 animate-pulse' : 'bg-blue-500'
        }`}
      >
        <Mic size={20} />
      </button>
      
      {partialText && (
        <div className="text-sm text-white/60 italic">
          {partialText}...
        </div>
      )}
    </div>
  )
}
```

**Phase 4: Integration with Sidebar (4-6 hours)**
```typescript
// Update: src/components/ai-sidebar/SidebarInput.tsx

export function SidebarInput({ onSend, voiceEnabled }) {
  const [inputValue, setInputValue] = useState('')
  const [inputMode, setInputMode] = useState<'text' | 'voice'>('text')
  
  const handleVoiceTranscript = (text: string) => {
    // When voice transcription completes, treat as typed message
    setInputValue(text)
    // Optionally auto-send or let user confirm
  }
  
  return (
    <div className="p-3 border-t border-white/10">
      {inputMode === 'text' ? (
        <div className="flex gap-2">
          <input
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Type your message..."
            className="flex-1 bg-white/10 rounded-lg px-3 py-2"
          />
          <button onClick={() => onSend(inputValue)}>Send</button>
          {voiceEnabled && (
            <button onClick={() => setInputMode('voice')}>
              <Mic />
            </button>
          )}
        </div>
      ) : (
        <VoiceInput 
          onTranscript={handleVoiceTranscript}
          onBack={() => setInputMode('text')}
        />
      )}
    </div>
  )
}
```

**Total Effort:** 40-54 hours  
**Priority:** 🟢 **MEDIUM** - Advanced feature  
**Risk:** 🟡 Medium (Vosk setup, WebSocket handling, audio processing)

---

#### 6. Error Handling & Retry Logic ❌

**Blueprint Requirement:** "Human-like error messages with retry policy (2 retries max)"

**Implementation Required:**

**Phase 1: Error Messages Pool (4-6 hours)**
```typescript
// New: src/lib/ai-sidebar/error-messages.ts

export const ERROR_MESSAGES = {
  firstFailure: [
    "Hmm, I didn't quite get that. Let me try again real quick…",
    "Oops, that didn't go through. Give me a moment to retry…",
    "Wait, something went wrong. I'll try that again…",
    "My bad, let me take another shot at this…",
    "Hold on, I need to run that one more time…",
    // ... 45 more variations
  ],
  secondFailure: [
    "Wait, that didn't go through either — give me a second, I'll retry once more.",
    "Hmm, still having trouble. Let me try one last time…",
    "Okay, that's weird. One more attempt coming up…",
    "This is taking longer than expected. Bear with me for one more try…",
    // ... 45 more variations
  ],
  finalFailure: [
    "I tried a few times but it looks like I'm stuck. Could you rephrase or ask again?",
    "I'm having trouble with this one. Mind trying a different way?",
    "Something's not working right. Can you help me understand what you need?",
    "I hit a wall here. Could you explain it differently?",
    // ... 45 more variations
  ]
}

export function getRandomErrorMessage(stage: 'first' | 'second' | 'final'): string {
  const messages = stage === 'first' 
    ? ERROR_MESSAGES.firstFailure
    : stage === 'second'
      ? ERROR_MESSAGES.secondFailure
      : ERROR_MESSAGES.finalFailure
  
  return messages[Math.floor(Math.random() * messages.length)]
}
```

**Phase 2: Retry Wrapper (8-12 hours)**
```typescript
// New: src/lib/ai-sidebar/retry-handler.ts

export async function withRetry<T>(
  fn: () => Promise<T>,
  messageType: 'pre-response' | 'response',
  onRetry: (message: string, retryCount: number) => void
): Promise<T> {
  let retryCount = 0
  const maxRetries = 2
  
  while (retryCount <= maxRetries) {
    try {
      return await fn()
    } catch (error) {
      retryCount++
      
      if (retryCount > maxRetries) {
        // Final failure
        const errorMsg = getRandomErrorMessage('final')
        onRetry(errorMsg, retryCount)
        throw error
      }
      
      // Show retry message
      const stage = retryCount === 1 ? 'first' : 'second'
      const errorMsg = getRandomErrorMessage(stage)
      onRetry(errorMsg, retryCount)
      
      // Wait a bit before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * retryCount))
    }
  }
  
  throw new Error('Max retries exceeded')
}
```

**Phase 3: Integration (6-8 hours)**
```typescript
// Update: src/hooks/useAISidebar.ts

const handleUserMessage = async (userInput: string) => {
  // ... existing logic ...
  
  // Wrap async calls with retry logic
  const [preResp, resp] = await Promise.allSettled([
    withRetry(
      () => generatePreResponse(userInput, context, logs),
      'pre-response',
      (errorMsg, count) => {
        postMessage(errorMsg, 'error', { retryCount: count })
      }
    ),
    withRetry(
      () => generateResponse(userInput, context, logs, workflowType),
      'response',
      (errorMsg, count) => {
        postMessage(errorMsg, 'error', { retryCount: count })
      }
    )
  ])
  
  // If pre-response fails but response succeeds, skip to response
  // Blueprint: "Dynamic Skipping"
  if (preResp.status === 'rejected' && resp.status === 'fulfilled') {
    console.log('Pre-response failed, but response succeeded. Skipping pre-response.')
  }
}
```

**Total Effort:** 18-26 hours  
**Priority:** 🟡 **HIGH** - User experience, error resilience  
**Risk:** 🟢 Low (standard retry pattern)

---

#### 7. Input Complexity Check ❌

**Blueprint Requirement:** "Skip hidden message if input < 60 characters"

**Implementation Required:**

**Phase 1: Complexity Checker (2-3 hours)**
```typescript
// New: src/lib/ai-sidebar/complexity-checker.ts

const MIN_HIDDEN_MESSAGE_THRESHOLD = 60  // Characters

export function shouldShowHiddenMessage(userInput: string): boolean {
  const trimmed = userInput.trim()
  
  // Simple commands get no hidden message
  if (trimmed.length < MIN_HIDDEN_MESSAGE_THRESHOLD) {
    return false
  }
  
  // Additional heuristics (optional enhancements):
  // - Check for command patterns: "go to", "open", "next"
  // - Word count (< 10 words = likely command)
  // - Presence of question marks or explanatory phrases
  
  return true
}
```

**Phase 2: Integration (1-2 hours)**
```typescript
// Update: src/hooks/useAISidebar.ts

const handleUserMessage = async (userInput: string) => {
  const isComplex = shouldShowHiddenMessage(userInput)
  
  if (isComplex) {
    // Post hidden message
    postMessage(currentHiddenMessage, 'hidden')
  } else {
    console.log('Input too short, skipping hidden message')
  }
  
  // Continue with pre-response and response...
}
```

**Total Effort:** 3-5 hours  
**Priority:** 🟡 **HIGH** - UX polish  
**Risk:** 🟢 Low (simple check)

---

#### 8. Token Streaming ❌

**Blueprint Requirement:** "Letter-by-letter text streaming (OpenAI-style)"

**Current State:** Concept exists in hook but not fully implemented

**Implementation Required:**

**Phase 1: Streaming API Endpoint (10-14 hours)**
```typescript
// New: src/app/api/ai-sidebar/stream/route.ts

import { OpenAIStream, StreamingTextResponse } from 'ai'

export async function POST(request: Request) {
  const { messages, messageType, workflowType } = await request.json()
  
  // Select appropriate LangSmith prompt
  const promptName = `nexa-sidebar-${messageType}`  // hidden, pre-response, or response
  
  // Call LangChain with streaming
  const stream = await generateStreamingResponse(messages, promptName, workflowType)
  
  return new StreamingTextResponse(stream)
}
```

**Phase 2: Client-Side Streaming (8-12 hours)**
```typescript
// Update: src/hooks/useAISidebar.ts

const handleStreamingResponse = async (
  messageType: MessageType,
  prompt: string
) => {
  const response = await fetch('/api/ai-sidebar/stream', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages, messageType, workflowType })
  })
  
  const reader = response.body?.getReader()
  const decoder = new TextDecoder()
  
  let accumulatedText = ''
  const messageId = generateId()
  
  // Create placeholder message
  addMessage({
    id: messageId,
    type: messageType,
    content: '',
    status: 'sending'
  })
  
  // Stream tokens
  while (true) {
    const { done, value } = await reader!.read()
    if (done) break
    
    const chunk = decoder.decode(value)
    accumulatedText += chunk
    
    // Update message with accumulated text
    updateMessage(messageId, {
      content: accumulatedText
    })
  }
  
  // Mark as delivered
  updateMessage(messageId, { status: 'delivered' })
  
  return accumulatedText
}
```

**Phase 3: Streaming Animation (4-6 hours)**
```typescript
// Update: src/components/ai-sidebar/SidebarMessages.tsx

// Add typing cursor effect during streaming
<div className="message-content">
  {message.content}
  {message.status === 'sending' && (
    <span className="animate-pulse">▊</span>
  )}
</div>
```

**Total Effort:** 22-32 hours  
**Priority:** 🟡 **HIGH** - Perceived speed  
**Risk:** 🟢 Low (standard streaming pattern)

---

#### 9. Model Configuration ⚠️

**Blueprint Requirement:** "GPT-5-Nano for text"

**Issue:** GPT-5-Nano doesn't exist yet (as of October 2025)

**Recommendation:** Use `gpt-4o-mini` (fast, cheap, good for quick responses)

**Alternative Models:**
- **Hidden Message:** `gpt-4o-mini` (speed priority)
- **Pre-Response:** `gpt-4o-mini` (speed priority)
- **Response:** `gpt-4o` or `claude-3-5-sonnet` (quality priority)

**Implementation Required:**

**Phase 1: Model Selection Logic (4-6 hours)**
```typescript
// New: src/lib/ai-sidebar/model-selector.ts

export function getModelForMessageType(type: MessageType): string {
  switch (type) {
    case 'hidden':
      return 'gpt-4o-mini'  // Fast, cheap
    case 'pre-response':
      return 'gpt-4o-mini'  // Fast, cheap
    case 'response':
      return 'gpt-4o'  // Quality over speed
    default:
      return 'gpt-4o-mini'
  }
}

export function getModelConfig(type: MessageType) {
  return {
    modelName: getModelForMessageType(type),
    temperature: type === 'hidden' ? 0.7 : type === 'pre-response' ? 0.6 : 0.5,
    maxTokens: type === 'hidden' ? 100 : type === 'pre-response' ? 200 : 1000
  }
}
```

**Total Effort:** 4-6 hours  
**Priority:** 🟡 **HIGH** - Cost optimization  
**Risk:** 🟢 Low (configuration)

---

## 📋 IMPLEMENTATION PHASES

### Phase 0: Foundation & Setup (1-2 weeks)
**Priority:** 🔴 **IMMEDIATE**  
**Effort:** 30-40 hours

**Tasks:**
1. Create project structure for AI sidebar (8-10h)
   - New directories: `src/lib/ai-sidebar/`, `src/components/ai-sidebar/`
   - Type definitions and interfaces
   - Context providers

2. Set up activity logging infrastructure (12-16h)
   - Activity logger class
   - Auto-tracking setup
   - Database schema (if persisting logs)

3. Create LangSmith prompts (10-14h)
   - `nexa-sidebar-hidden-message`
   - `nexa-sidebar-pre-response`
   - `nexa-sidebar-response`
   - Test and refine each prompt

**Deliverables:**
- ✅ Project structure ready
- ✅ Activity logging operational
- ✅ LangSmith prompts created

---

### Phase 1: Three-Tiered Message System (2-3 weeks)
**Priority:** 🔴 **CRITICAL**  
**Effort:** 60-80 hours

**Tasks:**
1. Implement message type system (8-12h)
2. Create hidden message generator (12-16h)
3. Create pre-response generator (12-16h)
4. Create response generator (12-16h)
5. Build orchestration logic in `useAISidebar` hook (16-20h)

**Deliverables:**
- ✅ Three-tiered flow working
- ✅ Async orchestration handling race conditions
- ✅ Next hidden message generated after response

---

### Phase 2: Global Sidebar Component (2-3 weeks)
**Priority:** 🔴 **CRITICAL**  
**Effort:** 36-48 hours

**Tasks:**
1. Build `AISidebar` component (16-20h)
2. Integrate into `DashboardLayout` (12-16h)
3. Create workflow-specific context (8-12h)

**Deliverables:**
- ✅ Sidebar visible on all workflow pages
- ✅ Collapsible/expandable behavior
- ✅ Workflow-aware behavior

---

### Phase 3: Error Handling & Polish (1-2 weeks)
**Priority:** 🟡 **HIGH**  
**Effort:** 24-34 hours

**Tasks:**
1. Create error message pool (4-6h)
2. Implement retry wrapper (8-12h)
3. Add input complexity check (3-5h)
4. Integrate error handling (6-8h)
5. Add activity log display (4-6h)

**Deliverables:**
- ✅ Human-like error messages
- ✅ Retry logic operational
- ✅ Input complexity checking
- ✅ Activity logs visible in sidebar

---

### Phase 4: Token Streaming (1-2 weeks)
**Priority:** 🟡 **HIGH**  
**Effort:** 22-32 hours

**Tasks:**
1. Create streaming API endpoint (10-14h)
2. Implement client-side streaming (8-12h)
3. Add streaming animation (4-6h)

**Deliverables:**
- ✅ Letter-by-letter streaming working
- ✅ Typing cursor animation
- ✅ Smooth user experience

---

### Phase 5: Voice Mode — Whisper TTS (2-3 weeks)
**Priority:** 🟢 **MEDIUM**  
**Effort:** 28-38 hours

**Tasks:**
1. Integrate Whisper TTS API (10-14h)
2. Build TTS queue system (12-16h)
3. Create voice controls UI (6-8h)

**Deliverables:**
- ✅ Text-to-speech working
- ✅ Audio synchronized with text
- ✅ Voice mode toggle

---

### Phase 6: Voice Mode — Vosk STT (2-3 weeks)
**Priority:** 🟢 **MEDIUM**  
**Effort:** 40-54 hours

**Tasks:**
1. Set up Vosk server (16-20h)
2. Implement client-side STT (12-16h)
3. Build voice input UI (8-12h)
4. Integrate with sidebar (4-6h)

**Deliverables:**
- ✅ Speech-to-text working
- ✅ Real-time transcription
- ✅ Voice input mode

---

### Phase 7: Testing & Optimization (1-2 weeks)
**Priority:** 🔴 **HIGH**  
**Effort:** 20-30 hours

**Tasks:**
1. End-to-end testing (8-12h)
2. Performance optimization (6-10h)
3. Edge case handling (6-8h)

**Deliverables:**
- ✅ All features tested
- ✅ Performance optimized
- ✅ Edge cases handled

---

## ⏱️ TOTAL EFFORT SUMMARY

| Phase | Effort (hours) | Duration (weeks) | Priority |
|-------|---------------|------------------|----------|
| Phase 0: Foundation | 30-40 | 1-2 | 🔴 Immediate |
| Phase 1: Three-Tiered Messages | 60-80 | 2-3 | 🔴 Critical |
| Phase 2: Global Sidebar | 36-48 | 2-3 | 🔴 Critical |
| Phase 3: Error Handling | 24-34 | 1-2 | 🟡 High |
| Phase 4: Token Streaming | 22-32 | 1-2 | 🟡 High |
| Phase 5: Whisper TTS | 28-38 | 2-3 | 🟢 Medium |
| Phase 6: Vosk STT | 40-54 | 2-3 | 🟢 Medium |
| Phase 7: Testing | 20-30 | 1-2 | 🔴 High |
| **TOTAL** | **260-356** | **13-18** | - |

**At 40 hours/week:** 6.5-8.9 weeks (1.6-2.2 months)  
**At 30 hours/week:** 8.7-11.9 weeks (2.2-3.0 months)  
**At 20 hours/week:** 13-17.8 weeks (3.2-4.4 months)

---

## 🎯 RECOMMENDED APPROACH

### Option A: Core Features First (Phases 0-4)
**Timeline:** 6-8 weeks at full capacity  
**Result:** Functional three-tiered sidebar with streaming  
**Defer:** Voice modes (TTS/STT)

**Deliverables:**
- ✅ Three-tiered message flow
- ✅ Global right sidebar on all pages
- ✅ Activity logging
- ✅ Error handling with retries
- ✅ Token streaming
- ⏸️ Voice modes (add later)

**Why?** Delivers core value faster, voice can be added incrementally

---

### Option B: Full Implementation (All Phases)
**Timeline:** 13-18 weeks (3-4.5 months)  
**Result:** Complete blueprint vision including voice  
**Best for:** Long-term product vision

---

### Option C: MVP (Phases 0-2 Only)
**Timeline:** 4-6 weeks  
**Result:** Basic sidebar with three-tiered flow  
**Defer:** Streaming, voice, advanced error handling

**Why?** Fastest path to user feedback

---

## 🚨 CRITICAL DECISIONS NEEDED

### 1. Model Selection ⚠️

**Blueprint:** "GPT-5-Nano"  
**Reality:** Model doesn't exist yet

**Options:**
- **A) gpt-4o-mini:** Fast, cheap, good quality (✅ **RECOMMENDED**)
- **B) gpt-4o:** Higher quality, slower, more expensive
- **C) claude-3-5-sonnet:** Great quality, different pricing

**Recommendation:** Use `gpt-4o-mini` for Hidden and Pre-Response, `gpt-4o` for Response

---

### 2. Vosk Server Deployment

**Blueprint:** "Run Vosk on main server"

**Options:**
- **A) Separate microservice:** Like PDF service (✅ **RECOMMENDED**)
- **B) Same Node.js server:** Simpler but adds dependencies
- **C) Third-party service:** Easier but adds cost

**Recommendation:** Separate microservice (better isolation, scaling)

---

### 3. WebSocket vs. Server-Sent Events

**For Real-Time Streaming:**

**Options:**
- **A) WebSocket:** Bidirectional, more complex (✅ **RECOMMENDED for voice**)
- **B) Server-Sent Events:** Unidirectional, simpler (✅ **RECOMMENDED for text streaming**)

**Recommendation:** SSE for text streaming, WebSocket for voice mode

---

### 4. Activity Log Persistence

**Blueprint:** "Logs appended to context"

**Options:**
- **A) In-memory only:** Simplest, lost on refresh
- **B) Database storage:** Persistent, queryable (✅ **RECOMMENDED**)
- **C) Redis cache:** Fast, temporary

**Recommendation:** Database storage (can query user behavior patterns)

---

## 🛠️ TECHNICAL ARCHITECTURE

### System Diagram

```
┌─────────────────────────────────────────────────────────┐
│                  Frontend (Next.js)                     │
│                                                         │
│  ┌──────────────┐              ┌──────────────────┐    │
│  │   Workflow   │              │   Right Sidebar   │   │
│  │    Pages     │◄────────────►│   (AI Copilot)   │   │
│  │              │   Activity   │                  │   │
│  └──────────────┘   Logging    └──────────────────┘    │
│                                          │              │
└──────────────────────────────────────────┼──────────────┘
                                           │
                    ┌──────────────────────┴──────────────────────┐
                    │                                             │
                    ▼                                             ▼
        ┌───────────────────────┐                   ┌───────────────────────┐
        │   AI Service (API)    │                   │   Vosk STT Service    │
        │                       │                   │   (WebSocket)         │
        │ • Hidden Message Gen  │                   │                       │
        │ • Pre-Response Gen    │                   │ • Real-time STT       │
        │ • Response Gen        │                   │ • Partial results     │
        │ • Whisper TTS         │                   │                       │
        │ • LangSmith prompts   │                   │                       │
        └───────────────────────┘                   └───────────────────────┘
                    │
                    ▼
        ┌───────────────────────┐
        │   PostgreSQL DB       │
        │                       │
        │ • hyper_canvas_       │
        │   messages            │
        │ • activity_logs       │
        │ • sidebar_threads     │
        └───────────────────────┘
```

### Data Flow

**User sends message:**
```
1. Frontend captures input
2. Check complexity (>60 chars?)
3. If complex: Display hidden message (pre-generated)
4. Fire async:
   - Pre-Response generation
   - Response generation
5. Stream results to UI as they arrive
6. In voice mode: Also generate audio
7. Store in PostgreSQL
8. Generate next hidden message
```

---

## 📝 DEPENDENCIES TO INSTALL

### Backend (Node.js)
```bash
npm install vosk            # Speech-to-text (Vosk server)
npm install ws              # WebSocket server
npm install ai              # Vercel AI SDK (streaming)
```

### Frontend
```bash
# Already installed:
# - @langchain/openai
# - @langchain/anthropic
# - langchain

# May need to add:
npm install use-sound       # Audio playback utilities
```

### Vosk Model
```bash
# Download from https://alphacephei.com/vosk/models
# Recommended: vosk-model-small-en-us-0.15 (40MB, fast)
# Or: vosk-model-en-us-0.22 (1.8GB, better accuracy)
```

---

## 🚀 NEXT STEPS

### Week 1: Setup & Planning

1. **Review & Approve Roadmap**
   - Confirm phasing strategy
   - Make critical decisions (model, Vosk deployment, streaming method)
   - Approve effort estimates

2. **Environment Setup**
   - Install dependencies
   - Download Vosk model
   - Set up Vosk server structure
   - Configure OpenAI API keys

3. **Create LangSmith Prompts**
   - `nexa-sidebar-hidden-message`
   - `nexa-sidebar-pre-response`
   - `nexa-sidebar-response`

4. **Begin Phase 0**
   - Create project structure
   - Set up activity logging
   - Test LangSmith prompts

### Week 2-3: Core Implementation

1. **Start Phase 1: Three-Tiered Messages**
   - Implement message type system
   - Create generators
   - Build orchestration logic

2. **Parallel Track: Activity Logging**
   - Finish logger implementation
   - Add tracking to all pages
   - Test log capture

### Week 4-6: UI & Integration

1. **Start Phase 2: Global Sidebar**
   - Build sidebar component
   - Integrate into layout
   - Add workflow context

2. **Start Phase 3: Error Handling**
   - Implement retry logic
   - Add error messages
   - Test failure scenarios

---

## ✅ SUCCESS CRITERIA

### Phase 0-2 Success (Weeks 1-6)
- ✅ Activity logging captures user actions
- ✅ LangSmith prompts responding correctly
- ✅ Three-tiered message flow operational
- ✅ Hidden message displays instantly
- ✅ Pre-Response and Response post asynchronously
- ✅ Next hidden message generates after response
- ✅ Sidebar visible on all workflow pages
- ✅ Sidebar collapse/expand works
- ✅ Input complexity check working

### Phase 3-4 Success (Weeks 7-10)
- ✅ Error messages appear human-like
- ✅ Retry logic handles failures gracefully
- ✅ Token streaming displays letter-by-letter
- ✅ Typing cursor animation smooth
- ✅ Activity logs visible in sidebar

### Phase 5-7 Success (Weeks 11-18, if implementing voice)
- ✅ Voice mode toggle functional
- ✅ Text-to-speech synchronized with text
- ✅ Speech-to-text transcribes accurately
- ✅ Vosk server stable
- ✅ Audio playback smooth
- ✅ End-to-end voice flow works

---

## 📊 RISK ASSESSMENT

### 🔴 HIGH RISK

1. **Three-Tiered Async Orchestration** (60-80h)
   - Risk: Race conditions, timing issues
   - Mitigation: Comprehensive testing, state machine
   - Impact: Core functionality

2. **Vosk Server Setup** (16-20h)
   - Risk: Model download, server stability, audio processing
   - Mitigation: Use smaller model first, extensive testing
   - Impact: Voice mode only (can defer)

### 🟡 MEDIUM RISK

1. **Token Streaming** (22-32h)
   - Risk: Stream handling, state synchronization
   - Mitigation: Use Vercel AI SDK, standard patterns
   - Impact: Perceived speed

2. **Activity Logging Integration** (30-42h)
   - Risk: Performance impact, data volume
   - Mitigation: Buffer limits, async processing
   - Impact: Contextual awareness

### 🟢 LOW RISK

1. **Global Sidebar Component** (36-48h)
   - Risk: Minimal (standard UI component)
   - Mitigation: React patterns, responsive design
   - Impact: Core UX

2. **Error Handling** (24-34h)
   - Risk: Minimal (standard retry pattern)
   - Mitigation: Comprehensive error message pool
   - Impact: User experience

---

## 💡 OPTIMIZATION OPPORTUNITIES

### Performance
1. **Caching:** Cache hidden messages per workflow type
2. **Debouncing:** Debounce activity logging (batch events)
3. **Lazy Loading:** Load Vosk only when voice mode activated
4. **Model Selection:** Use smaller models for hidden/pre-response

### Cost
1. **Token Limits:** Set max tokens per message type
2. **Model Tiers:** gpt-4o-mini for hidden, gpt-4o for response
3. **Audio Caching:** Cache TTS audio for common phrases
4. **Rate Limiting:** Limit messages per minute per user

### UX
1. **Keyboard Shortcuts:** Quick toggle sidebar (Ctrl+/)
2. **Message History:** Save conversation threads
3. **Search:** Search past conversations
4. **Bookmarks:** Bookmark important AI responses

---

## 📄 DOCUMENTATION DELIVERABLES

1. **API Documentation**
   - Endpoint specs for streaming
   - Message type definitions
   - Error codes and handling

2. **User Guide**
   - How to use the sidebar
   - Voice mode instructions
   - Activity log interpretation

3. **Developer Guide**
   - Architecture overview
   - How to add new workflow types
   - How to customize prompts
   - Debugging tips

---

## 🎉 CONCLUSION

The Right Sidebar is a **sophisticated conversational AI system** that transforms the platform into an intelligent, always-engaged copilot. 

**Current Foundation:** 30% (HyperCanvas chat provides starting point)

**Implementation Effort:** 260-356 hours (6.5-9 weeks at full capacity)

**Recommended Path:** **Option A (Core Features First)**
- Phases 0-4: Three-tiered messaging, global sidebar, streaming
- Timeline: 6-8 weeks
- Defer: Voice modes (add in Phase 2)

**Critical Success Factors:**
1. ✅ Three-tiered flow with zero perceived latency
2. ✅ Activity logging for contextual awareness
3. ✅ Error handling with human-like retry messages
4. ✅ Token streaming for immediate feedback
5. ✅ Global sidebar across all workflows

**This implementation will create a truly unique, cursor-like experience that keeps users constantly engaged while providing intelligent assistance throughout their workflow.** 🚀

---

**Ready to begin? Let's start with Phase 0 and build the foundation!**



