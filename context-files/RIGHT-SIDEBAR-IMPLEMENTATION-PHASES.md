# 🗺️ Right Sidebar — Complete Implementation Phases

**Current Status:** ✅ Phase 0 (Visual Prototype) Complete  
**Next:** Phase 1 - Foundation & Setup

---

## 📊 **PHASE OVERVIEW**

| Phase | Name | Duration | Status |
|-------|------|----------|--------|
| **Phase 0** | Visual Prototype | ✅ Complete | Current |
| **Phase 1** | Foundation & Setup | 1 week | Next |
| **Phase 2** | Three-Tiered Messages | 2 weeks | Pending |
| **Phase 3** | Global Integration | 1.5 weeks | Pending |
| **Phase 4** | Error Handling | 1 week | Pending |
| **Phase 5** | Token Streaming | 1 week | Pending |
| **Phase 6** | Voice Mode (TTS) | 1.5 weeks | Deferred |
| **Phase 7** | Voice Mode (STT) | 2 weeks | Deferred |
| **Phase 8** | Persistence | 1 week | Deferred |

---

## ✅ **PHASE 0: VISUAL PROTOTYPE** (COMPLETE)

### What Was Built
- ✅ Theme-consistent sidebar component
- ✅ Keyboard shortcut (W key) toggle
- ✅ Floating button in bottom right
- ✅ Expand/collapse animation
- ✅ Mock message display
- ✅ User input field
- ✅ Visual differentiation for message types
- ✅ Integrated into dashboard layout

### Files Created
- `src/components/ai-sidebar/AISidebar.tsx`

### What Works Now
- Press **W** to toggle sidebar
- Click **floating button** (bottom right) to open
- Type messages and see them appear
- Mock AI responses (ephemeral)
- Theme-consistent dark cyberpunk design

---

## 🔧 **PHASE 1: FOUNDATION & SETUP** (1 week, 20-28 hours)

### Overview
Set up the core infrastructure for the three-tiered message system.

### Steps

#### **Step 1.1: Install Dependencies** (30 mins)
```bash
npm install lru-cache vosk @types/lru-cache
```

**What:** Core packages for caching and voice (future use)  
**Why:** LRU cache for context management, Vosk for speech-to-text

---

#### **Step 1.2: Download Vosk Model** (10 mins)
```bash
cd /home/runner/workspace
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
rm vosk-model-small-en-us-0.15.zip
```

**What:** Lightweight English speech recognition model (26MB)  
**Why:** Future voice mode (deferred to Phase 7)

---

#### **Step 1.3: Create Type Definitions** (1-2 hours)

**File:** `src/lib/ai-sidebar/types.ts`

**What:** Define TypeScript interfaces for:
- `MessageType` - user, hidden, pre-response, response, error
- `SidebarMessage` - message structure with metadata
- `SidebarState` - component state
- `MessageContext` - context for AI generation
- `ActivityLog` - user activity tracking
- `GeneratorOptions` - AI generation options

**Why:** Type safety and clear contracts

---

#### **Step 1.4: Create Activity Formatter** (2-3 hours)

**File:** `src/lib/ai-sidebar/activity-formatter.ts`

**What:** Functions to format usage events for AI:
- `formatActivityForAI()` - Convert events to text for LLM
- `formatActivityForUI()` - Convert events for display
- `formatEventType()` - Map event types to human-readable
- `formatTime()` - Relative time formatting
- `fetchRecentActivity()` - API call to get events

**Why:** AI needs context from user's recent actions

---

#### **Step 1.5: Create Activity API Endpoint** (1-2 hours)

**File:** `src/app/api/organizations/[orgId]/usage/recent/route.ts`

**What:** GET endpoint to fetch recent usage events
- Auth verification
- Organization scoping
- Limit parameter (max 50)
- Returns last N usage events

**Why:** Backend for activity tracking

---

#### **Step 1.6: Create LRU Context Manager** (2-3 hours)

**File:** `src/lib/ai-sidebar/context-manager.ts`

**What:** Cache manager with:
- Message cache (100 threads, 30min TTL)
- Activity cache (100 orgs, 10min TTL)
- `getContextForAPI()` - Limited context retrieval
- `addMessage()` - Add to cache
- `clearThread()` - Clear conversation

**Why:** Limit context sent to AI (cost + performance)

---

### Deliverables
- ✅ All dependencies installed
- ✅ Type definitions complete
- ✅ Activity formatter working
- ✅ Activity API responding
- ✅ LRU cache operational
- ✅ All TypeScript compiles

---

## 🧠 **PHASE 2: THREE-TIERED MESSAGE SYSTEM** (2 weeks, 50-70 hours)

### Overview
Implement the core conversational AI flow with three message types.

### Steps

#### **Step 2.1: Create LangSmith Prompts** (8-12 hours)

**What:** Create 3 prompts in LangSmith:

1. **`nexa-sidebar-hidden-message`**
   - Input: Previous messages (NOT latest), activity, workflow
   - Output: 1-2 sentence "thinking" message
   - Examples: "Hmm, let me consider your workflows..."

2. **`nexa-sidebar-pre-response`**
   - Input: User input, context, activity, workflow
   - Output: 2-4 sentence acknowledgment
   - Examples: "Got it — you're asking about schema sync..."

3. **`nexa-sidebar-response`**
   - Input: User input, context, activity, workflow, org preferences
   - Output: 3 paragraph comprehensive answer
   - Examples: Full detailed response to user request

**Why:** Prompt versioning, A/B testing, easy updates

---

#### **Step 2.2: Create Message Generators** (12-16 hours)

**File:** `src/lib/ai-sidebar/message-generator.ts`

**What:** LangChain functions for each message type:
- `generateHiddenMessage()` - Pre-generates thinking message
- `generatePreResponse()` - Quick acknowledgment
- `generateResponse()` - Full response with org preferences

**Config:**
- Model: GPT-5-Nano (or gpt-4o-mini fallback)
- Temperature: 0.7 (hidden), 0.6 (pre), 0.5 (response)
- Max tokens: 100 (hidden), 200 (pre), 1000 (response)

**Why:** Separate concerns, reusable logic

---

#### **Step 2.3: Implement Input Complexity Check** (2-3 hours)

**File:** `src/lib/ai-sidebar/complexity-checker.ts`

**What:** 
- Check if input > 60 characters
- If short → skip hidden message
- If long → show hidden message

**Why:** Avoid awkward "thinking" for simple commands

---

#### **Step 2.4: Create Orchestration Hook** (16-22 hours)

**File:** `src/hooks/useGlobalSidebar.ts`

**What:** Main hook that manages:
1. Check input complexity
2. Post user message
3. If complex, post hidden message (already generated)
4. Fire async: Pre-Response + Response
5. Handle race condition (Response might beat Pre-Response)
6. Post Pre-Response if completes first
7. Post Response when ready
8. Generate next hidden message immediately
9. Update cache with limited context

**Key Features:**
- Async orchestration with `Promise.allSettled`
- Race condition handling
- Context management via LRU cache
- Activity fetching and formatting

**Why:** Core brain of the sidebar

---

### Deliverables
- ✅ Three LangSmith prompts created
- ✅ Message generators working
- ✅ Input complexity check functional
- ✅ Orchestration handling all flows
- ✅ Next hidden message pre-generated

---

## 🎨 **PHASE 3: GLOBAL INTEGRATION & POLISH** (1.5 weeks, 30-40 hours)

### Overview
Enhance the sidebar with better UX and integrate across workflows.

### Steps

#### **Step 3.1: Update Sidebar Component** (12-16 hours)

**File:** `src/components/ai-sidebar/AISidebar.tsx`

**What:** Replace mock logic with real `useGlobalSidebar` hook:
- Connect to message generators
- Display three message types correctly
- Show typing indicator during generation
- Add workflow type detection
- Integrate with activity panel

**Why:** Make it functional, not just visual

---

#### **Step 3.2: Create Activity Panel** (8-10 hours)

**File:** `src/components/ai-sidebar/ActivityPanel.tsx`

**What:** Collapsible panel showing:
- Last 10 user activities
- Formatted action names
- Time stamps
- Credits consumed (optional display)

**Why:** User transparency + debugging

---

#### **Step 3.3: Add Workflow Context** (10-14 hours)

**What:** Detect current workflow type:
- Structuring → Different prompt context
- Solutioning → Different prompt context
- Visuals → Different prompt context
- etc.

**How:** Pass workflow prop through layout

**Why:** Contextual AI responses

---

### Deliverables
- ✅ Real message generation working
- ✅ Activity panel functional
- ✅ Workflow-aware responses
- ✅ Typing indicators smooth

---

## 🛡️ **PHASE 4: ERROR HANDLING & RETRY** (1 week, 20-28 hours)

### Overview
Make the sidebar resilient to failures.

### Steps

#### **Step 4.1: Create Error Message Pool** (4-6 hours)

**File:** `src/lib/ai-sidebar/error-messages.ts`

**What:** 150+ human-like error messages:
- First failure: "Hmm, let me try again..."
- Second failure: "Wait, that didn't work either..."
- Final failure: "I'm stuck. Could you rephrase?"

**Why:** Natural, empathetic failure handling

---

#### **Step 4.2: Implement Retry Logic** (8-12 hours)

**File:** `src/lib/ai-sidebar/error-handler.ts`

**What:** `withRetry()` wrapper:
- Max 2 retries after initial attempt
- Show error message between retries
- Wait 1s, then 2s before retries
- If Response succeeds but Pre-Response fails → skip Pre-Response

**Why:** Graceful degradation, user trust

---

#### **Step 4.3: Integrate Error Handling** (8-10 hours)

**What:** Update orchestration to:
- Wrap all AI calls with `withRetry()`
- Display error messages in chat
- Continue flow even if one part fails

**Why:** Never leave user hanging

---

### Deliverables
- ✅ Error messages natural
- ✅ Retry logic working
- ✅ Failures don't break flow

---

## ⚡ **PHASE 5: TOKEN STREAMING** (1 week, 18-26 hours)

### Overview
Add letter-by-letter streaming like ChatGPT.

### Steps

#### **Step 5.1: Create Streaming API** (8-12 hours)

**File:** `src/app/api/ai-sidebar/stream/route.ts`

**What:** Server-Sent Events endpoint:
- Accept messageType, context, user input
- Call appropriate generator with streaming enabled
- Return `StreamingTextResponse`

**Why:** Perceived speed, user engagement

---

#### **Step 5.2: Client-Side Streaming** (10-14 hours)

**File:** Update `src/hooks/useGlobalSidebar.ts`

**What:** Add `streamMessage()` function:
- Create placeholder message
- Fetch from streaming endpoint
- Read stream chunk-by-chunk
- Update message content progressively
- Mark as delivered when done

**Why:** Smooth UX, feels instant

---

### Deliverables
- ✅ Token-by-token rendering
- ✅ Typing cursor animation
- ✅ Smooth streaming experience

---

## 🎙️ **PHASE 6: VOICE MODE - WHISPER TTS** (1.5 weeks, 24-32 hours) [DEFERRED]

### Overview
Add text-to-speech for AI responses.

### Steps

#### **Step 6.1: Whisper TTS Integration** (10-14 hours)
- Use OpenAI Whisper API
- Convert text → audio
- Queue audio playback

#### **Step 6.2: Voice Controls UI** (6-8 hours)
- Toggle button for voice mode
- Play/pause/stop controls
- Waveform visualization

#### **Step 6.3: Audio Synchronization** (8-10 hours)
- Sync audio with text display
- Audio starts when text appears
- Handle audio queue

### Deliverables
- ✅ Text-to-speech working
- ✅ Voice mode toggle
- ✅ Audio synchronized

---

## 🎤 **PHASE 7: VOICE MODE - VOSK STT** (2 weeks, 36-48 hours) [DEFERRED]

### Overview
Add speech-to-text for user input.

### Steps

#### **Step 7.1: Vosk Server Setup** (16-20 hours)
- Initialize Vosk on main server
- WebSocket connection
- Real-time transcription

#### **Step 7.2: Client-Side STT** (12-16 hours)
- Microphone access
- Audio chunk streaming
- Partial transcription display

#### **Step 7.3: Voice Input UI** (8-12 hours)
- Microphone button
- Recording indicator
- Live transcription display

### Deliverables
- ✅ Speech-to-text working
- ✅ Real-time transcription
- ✅ Voice input mode

---

## 💾 **PHASE 8: CONVERSATION PERSISTENCE** (1 week, 12-18 hours) [DEFERRED]

### Overview
Save/load conversations on demand.

### Steps

#### **Step 8.1: Save Endpoint** (4-6 hours)
- POST `/api/ai-sidebar/save`
- Save thread to database
- Return confirmation

#### **Step 8.2: Load Endpoint** (4-6 hours)
- GET `/api/ai-sidebar/load/[threadId]`
- Retrieve thread from database
- Return messages

#### **Step 8.3: Save/Load UI** (4-6 hours)
- Save button in sidebar
- Load conversation dropdown
- Saved indicator

### Deliverables
- ✅ Save button working
- ✅ Load conversations
- ✅ User control (NOT auto-save)

---

## 📊 **COMPLETE TIMELINE**

### Core Features (Recommended Start)
| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 0 | ✅ Done | ✅ Complete |
| Phase 1 | 1 week | 20-28h |
| Phase 2 | 2 weeks | 50-70h |
| Phase 3 | 1.5 weeks | 30-40h |
| Phase 4 | 1 week | 20-28h |
| Phase 5 | 1 week | 18-26h |
| **TOTAL** | **6.5 weeks** | **138-192h** |

**Result:** Fully functional text-based AI sidebar

### Voice Features (Phase 2 Addition)
| Phase | Duration | Effort |
|-------|----------|--------|
| Phase 6 | 1.5 weeks | 24-32h |
| Phase 7 | 2 weeks | 36-48h |
| Phase 8 | 1 week | 12-18h |
| **TOTAL** | **4.5 weeks** | **72-98h** |

**Result:** Complete voice mode + persistence

---

## 🎯 **RECOMMENDED PATH**

### Option A: Core Features First ⭐ **RECOMMENDED**
- Phases 0-5 (6.5 weeks)
- Get to working sidebar FAST
- Add voice later when text is proven

### Option B: Full Implementation
- All phases (11 weeks)
- Complete vision from blueprint
- Longer timeline

---

## ✅ **SUCCESS CRITERIA**

### After Phase 1
- ✅ Infrastructure ready
- ✅ Activity tracking working
- ✅ Cache operational

### After Phase 2
- ✅ Three-tiered flow working
- ✅ Hidden message instant
- ✅ Pre-Response + Response async
- ✅ Next hidden pre-generated

### After Phase 3
- ✅ Sidebar on all pages
- ✅ Activity panel functional
- ✅ Workflow-aware

### After Phase 4
- ✅ Error handling graceful
- ✅ Retries working
- ✅ Human-like messages

### After Phase 5
- ✅ Streaming smooth
- ✅ ChatGPT-like experience
- ✅ Production ready

---

## 🚀 **NEXT STEPS**

### Immediate (This Week)
1. ✅ Visual prototype complete
2. Start Phase 1: Foundation
3. Install dependencies
4. Create type definitions
5. Build activity formatter

### Week 2-3
- Complete Phase 1
- Start Phase 2 (Three-tiered messages)
- Create LangSmith prompts
- Build message generators

### Week 4-6
- Complete Phase 2
- Complete Phase 3 (Integration)
- Complete Phase 4 (Error handling)
- Start Phase 5 (Streaming)

---

**Current Status:** Phase 0 ✅ Complete!  
**Next:** Phase 1 - Foundation & Setup  
**Timeline to MVP:** 6-7 weeks for fully functional text-based sidebar


