# 🚀 Right Sidebar — Getting Started Guide

**Phase 0: Foundation Setup (Week 1)**

---

## 📋 PRE-FLIGHT CHECKLIST

Before starting implementation, ensure:
- ✅ Read `blueprint-for-right-sidebar.md` (blueprint specification)
- ✅ Read `RIGHT-SIDEBAR-IMPLEMENTATION-ROADMAP-v2.md` (full technical plan)
- ✅ Read `RIGHT-SIDEBAR-INVESTIGATION-SUMMARY.md` (architecture findings)
- ✅ Current codebase understanding (HyperCanvas context pattern)

**Estimated Time:** 4-6 hours to review all documents

---

## 🛠️ STEP 1: Install Dependencies (30 mins)

### Core Dependencies
```bash
npm install lru-cache vosk @types/lru-cache
```

### Verify Installations
```bash
npm list lru-cache vosk
```

**Expected Output:**
```
└── lru-cache@10.x.x
└── vosk@0.3.x
```

---

## 🎙️ STEP 2: Download Vosk Model (10 mins)

### Download Lightweight English Model
```bash
cd /home/runner/workspace

# Download (26MB)
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip

# Extract
unzip vosk-model-small-en-us-0.15.zip

# Clean up
rm vosk-model-small-en-us-0.15.zip

# Verify
ls -lh vosk-model-small-en-us-0.15/
```

**Expected Structure:**
```
vosk-model-small-en-us-0.15/
├── am/
├── conf/
├── graph/
└── ivector/
```

---

## 📁 STEP 3: Create Directory Structure (15 mins)

### Run Setup Script
```bash
# From project root
mkdir -p src/lib/ai-sidebar
mkdir -p src/components/ai-sidebar
mkdir -p src/hooks
mkdir -p src/app/api/ai-sidebar
```

### Create Placeholder Files
```bash
# lib/ai-sidebar/
touch src/lib/ai-sidebar/types.ts
touch src/lib/ai-sidebar/message-generator.ts
touch src/lib/ai-sidebar/orchestrator.ts
touch src/lib/ai-sidebar/activity-formatter.ts
touch src/lib/ai-sidebar/context-manager.ts
touch src/lib/ai-sidebar/error-handler.ts

# components/ai-sidebar/
touch src/components/ai-sidebar/AISidebar.tsx
touch src/components/ai-sidebar/SidebarMessages.tsx
touch src/components/ai-sidebar/SidebarInput.tsx
touch src/components/ai-sidebar/ActivityPanel.tsx

# hooks/
touch src/hooks/useGlobalSidebar.ts

# API routes/
mkdir -p src/app/api/ai-sidebar/stream
touch src/app/api/ai-sidebar/stream/route.ts
```

### Verify Structure
```bash
tree src/lib/ai-sidebar src/components/ai-sidebar src/hooks/useGlobalSidebar.ts -L 2
```

---

## 📝 STEP 4: Create Type Definitions (1-2 hours)

### File: `src/lib/ai-sidebar/types.ts`

```typescript
// Core message types
export type MessageType = 'user' | 'hidden' | 'pre-response' | 'response' | 'error'

export type WorkflowType = 
  | 'dashboard' 
  | 'structuring' 
  | 'solutioning' 
  | 'visuals' 
  | 'grid'
  | 'profile'

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

export interface SidebarState {
  messages: SidebarMessage[]
  threadId: string | null
  currentHiddenMessage: string | null
  isTyping: boolean
  workflowType: WorkflowType
  isSaved: boolean
}

export interface MessageContext {
  previousMessages: SidebarMessage[]
  recentActivity: string
  workflowType: WorkflowType
  organizationId: string
}

export interface ActivityLog {
  id: string
  action: string
  details?: string
  timestamp: Date
  creditsConsumed: number
}

export interface GeneratorOptions {
  streaming?: boolean
  temperature?: number
  maxTokens?: number
}
```

### Verify Types
```bash
npx tsc --noEmit src/lib/ai-sidebar/types.ts
```

---

## 🔍 STEP 5: Create Activity Formatter (2-3 hours)

### File: `src/lib/ai-sidebar/activity-formatter.ts`

```typescript
import { UsageEvent } from '@prisma/client'
import { ActivityLog } from './types'

/**
 * Format usage events into human-readable activity logs for AI context
 */
export function formatActivityForAI(usageEvents: UsageEvent[]): string {
  if (!usageEvents || usageEvents.length === 0) {
    return 'No recent activity.'
  }

  return usageEvents
    .map(event => {
      const time = formatTime(event.createdAt)
      const action = formatEventType(event.eventType)
      const details = formatEventDetails(event.eventData as any)

      return `[${time}] ${action}${details ? ` - ${details}` : ''}`
    })
    .join('\n')
}

/**
 * Convert activity logs to display format for UI
 */
export function formatActivityForUI(usageEvents: UsageEvent[]): ActivityLog[] {
  return usageEvents.map(event => ({
    id: event.id,
    action: formatEventType(event.eventType),
    details: formatEventDetails(event.eventData as any),
    timestamp: event.createdAt,
    creditsConsumed: event.creditsConsumed
  }))
}

/**
 * Map event types to human-readable actions
 */
function formatEventType(eventType: string): string {
  const mapping: Record<string, string> = {
    // Structuring
    'structuring_diagnose': 'Analyzed pain points',
    'structuring_generate_solution': 'Generated solutions',
    
    // Visuals
    'visuals_planning': 'Planned diagram layout',
    'visuals_sketch': 'Created diagram sketch',
    'visuals_render': 'Rendered visual diagram',
    
    // Solutioning
    'solutioning_vision': 'Analyzed image',
    'solutioning_structure': 'Structured solution',
    'solutioning_pernode': 'Analyzed node details',
    'push_to_sow': 'Generated SOW',
    'push_to_loe': 'Generated LOE',
    
    // Documents
    'pdf_generation': 'Generated PDF',
    'export_document': 'Exported document',
    
    // General
    'api_call': 'Made API request',
  }

  return mapping[eventType] || formatFallback(eventType)
}

/**
 * Format fallback for unmapped event types
 */
function formatFallback(eventType: string): string {
  return eventType
    .replace(/_/g, ' ')
    .replace(/\b\w/g, char => char.toUpperCase())
}

/**
 * Extract relevant details from event data
 */
function formatEventDetails(eventData: any): string | undefined {
  if (!eventData) return undefined

  const parts: string[] = []

  // Feature flags
  if (eventData.echo) parts.push('with Echo')
  if (eventData.traceback) parts.push('with Traceback')
  
  // Complexity
  if (eventData.complexity && eventData.complexity > 1.5) {
    parts.push(`complex request (${eventData.complexity.toFixed(1)}x)`)
  }
  
  // Content size
  if (eventData.contentItems) {
    parts.push(`${eventData.contentItems} items`)
  }
  
  return parts.length > 0 ? parts.join(', ') : undefined
}

/**
 * Format timestamp for display
 */
function formatTime(date: Date): string {
  const now = new Date()
  const diffMs = now.getTime() - date.getTime()
  const diffMins = Math.floor(diffMs / 60000)
  
  if (diffMins < 1) return 'just now'
  if (diffMins < 60) return `${diffMins}m ago`
  
  const diffHours = Math.floor(diffMins / 60)
  if (diffHours < 24) return `${diffHours}h ago`
  
  const diffDays = Math.floor(diffHours / 24)
  return `${diffDays}d ago`
}

/**
 * Fetch recent usage events for an organization
 */
export async function fetchRecentActivity(
  organizationId: string,
  limit: number = 10
): Promise<UsageEvent[]> {
  // This will be called from the client
  const response = await fetch(
    `/api/organizations/${organizationId}/usage/recent?limit=${limit}`
  )
  
  if (!response.ok) {
    throw new Error('Failed to fetch recent activity')
  }
  
  return response.json()
}
```

### Create API Endpoint

**File:** `src/app/api/organizations/[orgId]/usage/recent/route.ts`

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAuth } from '@/lib/api-rbac'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    // Verify auth
    await requireAuth(request, params.orgId, 'member')
    
    // Get limit from query
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '10')
    
    // Fetch recent usage events
    const events = await prisma.usageEvent.findMany({
      where: {
        organizationId: params.orgId
      },
      orderBy: {
        createdAt: 'desc'
      },
      take: Math.min(limit, 50), // Max 50
      select: {
        id: true,
        eventType: true,
        eventData: true,
        creditsConsumed: true,
        createdAt: true
      }
    })
    
    return NextResponse.json(events)
    
  } catch (error: any) {
    console.error('Error fetching recent activity:', error)
    return NextResponse.json(
      { error: error.message || 'Failed to fetch activity' },
      { status: 500 }
    )
  }
}
```

### Test Activity Formatter
```bash
npx tsc --noEmit src/lib/ai-sidebar/activity-formatter.ts
```

---

## 💾 STEP 6: Create LRU Context Manager (2-3 hours)

### File: `src/lib/ai-sidebar/context-manager.ts`

```typescript
import { LRUCache } from 'lru-cache'
import { SidebarMessage, ActivityLog, MessageContext } from './types'
import { formatActivityForAI } from './activity-formatter'

export class SidebarContextManager {
  private messageCache: LRUCache<string, SidebarMessage[]>
  private activityCache: LRUCache<string, ActivityLog[]>
  
  constructor() {
    // Message cache: 100 threads, 30 min TTL
    this.messageCache = new LRUCache({
      max: 100,
      ttl: 30 * 60 * 1000, // 30 minutes
      updateAgeOnGet: true
    })
    
    // Activity cache: 100 orgs, 10 min TTL
    this.activityCache = new LRUCache({
      max: 100,
      ttl: 10 * 60 * 1000, // 10 minutes
      updateAgeOnGet: true
    })
  }
  
  /**
   * Add message to cache
   */
  addMessage(threadId: string, message: SidebarMessage): void {
    const messages = this.messageCache.get(threadId) || []
    messages.push(message)
    this.messageCache.set(threadId, messages)
  }
  
  /**
   * Get all messages for a thread
   */
  getMessages(threadId: string): SidebarMessage[] {
    return this.messageCache.get(threadId) || []
  }
  
  /**
   * Get limited context for API (last N messages + recent activity)
   * This is what gets sent to the LLM
   */
  getContextForAPI(
    threadId: string, 
    organizationId: string,
    limit: number = 10
  ): {
    messages: SidebarMessage[]
    activityText: string
    totalMessages: number
  } {
    const allMessages = this.getMessages(threadId)
    const recentMessages = allMessages.slice(-limit)
    const activity = this.activityCache.get(organizationId) || []
    
    return {
      messages: recentMessages,
      activityText: formatActivityForAI(activity),
      totalMessages: allMessages.length
    }
  }
  
  /**
   * Update activity cache
   */
  updateActivity(organizationId: string, activities: ActivityLog[]): void {
    this.activityCache.set(organizationId, activities)
  }
  
  /**
   * Clear thread cache (for new conversation)
   */
  clearThread(threadId: string): void {
    this.messageCache.delete(threadId)
  }
  
  /**
   * Get cache statistics
   */
  getStats() {
    return {
      messageThreads: this.messageCache.size,
      activityOrgs: this.activityCache.size,
      messageCacheSize: this.messageCache.calculatedSize,
      activityCacheSize: this.activityCache.calculatedSize
    }
  }
}

// Singleton instance
export const sidebarContextManager = new SidebarContextManager()
```

### Test Context Manager
```bash
npx tsc --noEmit src/lib/ai-sidebar/context-manager.ts
```

---

## ✅ STEP 7: Verify Setup (30 mins)

### Run Type Check
```bash
npx tsc --noEmit
```

### Check File Structure
```bash
tree src/lib/ai-sidebar src/components/ai-sidebar -I node_modules
```

**Expected Output:**
```
src/lib/ai-sidebar/
├── types.ts ✅
├── activity-formatter.ts ✅
├── context-manager.ts ✅
├── message-generator.ts (placeholder)
├── orchestrator.ts (placeholder)
└── error-handler.ts (placeholder)

src/components/ai-sidebar/
├── AISidebar.tsx (placeholder)
├── SidebarMessages.tsx (placeholder)
├── SidebarInput.tsx (placeholder)
└── ActivityPanel.tsx (placeholder)
```

### Test API Endpoint
```bash
# Start dev server
npm run dev

# In another terminal, test endpoint (replace with real orgId)
curl http://localhost:3000/api/organizations/[orgId]/usage/recent?limit=5
```

---

## 📊 PHASE 0 PROGRESS TRACKER

### Completed Tasks
- [ ] Dependencies installed (lru-cache, vosk)
- [ ] Vosk model downloaded
- [ ] Directory structure created
- [ ] Type definitions complete
- [ ] Activity formatter complete
- [ ] Activity API endpoint working
- [ ] LRU context manager complete
- [ ] All type checks passing

### Time Estimate
**Total:** 6-10 hours  
**Status:** Foundation phase complete ✅

---

## 🎯 NEXT: Phase 1 (Week 2)

Once Phase 0 is complete, move to:
1. **LangSmith Prompt Creation** (3 prompts)
2. **Message Generators** (Hidden, Pre-Response, Response)
3. **Orchestration Logic** (async flow handling)

**See:** `RIGHT-SIDEBAR-IMPLEMENTATION-ROADMAP-v2.md` → Phase 1

---

## 🆘 TROUBLESHOOTING

### Issue: Vosk Model Not Found
```bash
# Verify model location
ls -lh vosk-model-small-en-us-0.15/

# If missing, re-download
wget https://alphacephei.com/vosk/models/vosk-model-small-en-us-0.15.zip
unzip vosk-model-small-en-us-0.15.zip
```

### Issue: LRU Cache Type Errors
```bash
# Install types
npm install --save-dev @types/lru-cache

# Verify version compatibility
npm list lru-cache
```

### Issue: Activity API 401 Error
- Verify auth is working in other endpoints
- Check organizationId is valid
- Ensure user has 'member' role

---

## 📚 REFERENCE DOCUMENTS

1. **Blueprint:** `blueprint-for-right-sidebar.md`
2. **Roadmap:** `RIGHT-SIDEBAR-IMPLEMENTATION-ROADMAP-v2.md`
3. **Investigation:** `RIGHT-SIDEBAR-INVESTIGATION-SUMMARY.md`
4. **This Guide:** `RIGHT-SIDEBAR-GETTING-STARTED.md`

---

**Phase 0 Setup Complete! Ready for Phase 1! 🚀**



