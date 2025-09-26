# 🚀 **NEXA Platform - Complete Usage Tracking & Billing Implementation Plan**

## 📋 **EXECUTIVE SUMMARY**

This document provides a comprehensive implementation blueprint for adding usage tracking and billing functionality to the NEXA Platform. The plan leverages the existing excellent database schema and architecture without breaking changes, implementing a flexible, configurable, and hot-reloadable system.

**Implementation Timeline**: 4 phases over 6-8 weeks  
**Database Changes Required**: Minimal (2 new tables)  
**Breaking Changes**: None  
**Hot-Reloadable**: Yes (configuration-driven)

---

## 🎯 **ANSWERS TO YOUR FINAL QUESTIONS**

### **1. Organization-Specific Billing Attribution**

**✅ YES, fully prepared!** Your current architecture handles this perfectly:

**Current Setup Analysis:**
- **Frontend**: `UserContext` tracks `selectedOrganization` with persistence in localStorage
- **API Routes**: Use `[orgId]` parameters and RBAC system for organization context
- **Database**: `UsageEvent` table has `organizationId` field for proper attribution
- **Sessions**: User sessions can optionally track `organizationId` for context

**How Attribution Works:**
```typescript
// Frontend: selectedOrganization determines billing context
const { selectedOrganization } = useUser()

// API: Organization ID comes from URL params + RBAC validation
export async function POST(request: NextRequest, { params }: { params: { orgId: string } }) {
  const { orgId } = params
  
  // Track usage to the correct organization
  await trackUsage({
    organizationId: orgId,     // ✅ Correct org charged
    userId: user.id,           // ✅ User attribution maintained
    eventType: 'ai_call',
    creditsConsumed: 10
  })
}
```

**Cross-Organization Safety:**
- RBAC system prevents users from accessing unauthorized organizations
- URL-based organization context ensures no cross-charging
- localStorage persistence maintains selection across sessions

### **2. Database-Driven Configuration**

**Recommended Approach: YES!** Database-driven provides the best flexibility:

```sql
-- Event Definitions Table
CREATE TABLE event_definitions (
    event_type VARCHAR(50) PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Plan Definitions Table  
CREATE TABLE plan_definitions (
    plan_name VARCHAR(50) PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);
```

**Example Configuration JSONs:**

**Event Definitions:**
```json
{
  "structuring_diagnose": {
    "baseCredits": 10,
    "description": "Problem analysis in Structuring",
    "category": "ai_analysis",
    "endpoint": "/api/structuring/diagnose",
    "multipliers": {
      "complexity": { "min": 1.0, "max": 2.5 },
      "features": {
        "echo": 5,
        "traceback": 3
      }
    }
  },
  "visuals_planning": {
    "baseCredits": 8,
    "description": "Visual planning generation",
    "category": "ai_visual",
    "endpoint": "/api/visuals/planning"
  }
}
```

**Plan Definitions:**
```json
{
  "starter": {
    "displayName": "Starter Plan",
    "monthlyCredits": 1000,
    "pricing": {
      "monthly": 19,
      "annual": 190
    },
    "limits": {
      "aiCallsPerMonth": 500,
      "pdfExportsPerMonth": 50,
      "sessionLimit": 50,
      "teamMembersLimit": 5,
      "storageLimit": 1000
    },
    "features": [
      "All AI tools",
      "Unlimited PDFs", 
      "Email support"
    ],
    "overageRate": 0.015
  }
}
```

### **3. Domain Secret Configuration**

**Not required, but recommended for security:**

```typescript
// .env.local
NEXT_PUBLIC_APP_DOMAIN=yourdomain.com
WEBHOOK_SECRET=your-webhook-secret
BILLING_PROVIDER_SECRET=stripe-secret-key

// Usage in API routes
const allowedDomain = process.env.NEXT_PUBLIC_APP_DOMAIN
const webhookSecret = process.env.WEBHOOK_SECRET
```

---

## 🏗️ **IMPLEMENTATION PLAN**

## **PHASE 1: Foundation & Event Tracking (Week 1-2)**

### **Step 1.1: Create Configuration Tables**

```sql
-- Add to database migration
CREATE TABLE event_definitions (
    event_type VARCHAR(50) PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE plan_definitions (
    plan_name VARCHAR(50) PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_event_definitions_updated_at ON event_definitions(updated_at);
CREATE INDEX idx_plan_definitions_updated_at ON plan_definitions(updated_at);
```

### **Step 1.2: Create Configuration Management System**

**File: `src/lib/config/event-registry.ts`**
```typescript
import { prisma } from '@/lib/prisma'

interface EventDefinition {
  eventType: string
  baseCredits: number
  description: string
  category: string
  endpoint?: string
  multipliers?: {
    complexity?: { min: number; max: number }
    features?: Record<string, number>
  }
}

class EventRegistry {
  private cache: Map<string, EventDefinition> = new Map()
  private lastCacheUpdate: Date = new Date(0)
  private cacheTTL = 5 * 60 * 1000 // 5 minutes

  async getEventDefinition(eventType: string): Promise<EventDefinition | null> {
    await this.refreshCacheIfNeeded()
    return this.cache.get(eventType) || null
  }

  async getAllEvents(): Promise<Record<string, EventDefinition>> {
    await this.refreshCacheIfNeeded()
    return Object.fromEntries(this.cache)
  }

  private async refreshCacheIfNeeded(): Promise<void> {
    const now = new Date()
    if (now.getTime() - this.lastCacheUpdate.getTime() < this.cacheeTL) {
      return
    }

    const definitions = await prisma.eventDefinition.findMany()
    this.cache.clear()
    
    for (const def of definitions) {
      this.cache.set(def.eventType, {
        eventType: def.eventType,
        ...def.config as any
      })
    }
    
    this.lastCacheUpdate = now
  }

  async updateEventDefinition(eventType: string, config: Partial<EventDefinition>): Promise<void> {
    await prisma.eventDefinition.upsert({
      where: { eventType },
      update: { config: config as any },
      create: { eventType, config: config as any }
    })
    
    // Clear cache to force refresh
    this.lastCacheUpdate = new Date(0)
  }
}

export const eventRegistry = new EventRegistry()
```

**File: `src/lib/config/plan-registry.ts`**
```typescript
import { prisma } from '@/lib/prisma'

interface PlanDefinition {
  planName: string
  displayName: string
  monthlyCredits: number
  pricing: {
    monthly: number
    annual: number
  }
  limits: {
    aiCallsPerMonth: number
    pdfExportsPerMonth: number
    sessionLimit: number
    teamMembersLimit: number
    storageLimit: number
  }
  features: string[]
  overageRate: number
}

class PlanRegistry {
  private cache: Map<string, PlanDefinition> = new Map()
  private lastCacheUpdate: Date = new Date(0)
  private cacheeTL = 5 * 60 * 1000 // 5 minutes

  async getPlanDefinition(planName: string): Promise<PlanDefinition | null> {
    await this.refreshCacheIfNeeded()
    return this.cache.get(planName) || null
  }

  async getAllPlans(): Promise<Record<string, PlanDefinition>> {
    await this.refreshCacheIfNeeded()
    return Object.fromEntries(this.cache)
  }

  private async refreshCacheIfNeeded(): Promise<void> {
    const now = new Date()
    if (now.getTime() - this.lastCacheUpdate.getTime() < this.cacheeTL) {
      return
    }

    const definitions = await prisma.planDefinition.findMany()
    this.cache.clear()
    
    for (const def of definitions) {
      this.cache.set(def.planName, {
        planName: def.planName,
        ...def.config as any
      })
    }
    
    this.lastCacheUpdate = now
  }

  async updatePlanDefinition(planName: string, config: Partial<PlanDefinition>): Promise<void> {
    await prisma.planDefinition.upsert({
      where: { planName },
      update: { config: config as any },
      create: { planName, config: config as any }
    })
    
    // Clear cache to force refresh
    this.lastCacheUpdate = new Date(0)
  }
}

export const planRegistry = new PlanRegistry()
```

### **Step 1.3: Create Usage Tracking Service**

**File: `src/lib/usage/usage-tracker.ts`**
```typescript
import { prisma } from '@/lib/prisma'
import { eventRegistry } from '@/lib/config/event-registry'
import { planRegistry } from '@/lib/config/plan-registry'

interface TrackUsageParams {
  organizationId: string
  userId: string
  eventType: string
  sessionId?: number
  eventData?: Record<string, any>
  // Optional overrides
  creditsOverride?: number
  skipLimitCheck?: boolean
}

interface UsageResult {
  success: boolean
  creditsConsumed: number
  remainingCredits: number
  error?: string
  usageEventId?: string
}

export class UsageTracker {
  async trackUsage(params: TrackUsageParams): Promise<UsageResult> {
    const { 
      organizationId, 
      userId, 
      eventType, 
      sessionId, 
      eventData = {},
      creditsOverride,
      skipLimitCheck = false 
    } = params

    try {
      // Get event definition
      const eventDef = await eventRegistry.getEventDefinition(eventType)
      if (!eventDef) {
        return {
          success: false,
          creditsConsumed: 0,
          remainingCredits: 0,
          error: `Unknown event type: ${eventType}`
        }
      }

      // Calculate credits
      const creditsConsumed = creditsOverride || this.calculateCredits(eventDef, eventData)

      // Check limits (unless skipped)
      if (!skipLimitCheck) {
        const limitCheck = await this.checkUsageLimits(organizationId, creditsConsumed)
        if (!limitCheck.allowed) {
          return {
            success: false,
            creditsConsumed: 0,
            remainingCredits: limitCheck.remainingCredits,
            error: limitCheck.reason
          }
        }
      }

      // Record usage event
      const usageEvent = await prisma.usageEvent.create({
        data: {
          organizationId,
          userId,
          eventType,
          eventData,
          creditsConsumed,
          sessionId
        }
      })

      // Calculate remaining credits after this usage
      const remainingCredits = await this.getRemainingCredits(organizationId)

      return {
        success: true,
        creditsConsumed,
        remainingCredits: remainingCredits - creditsConsumed,
        usageEventId: usageEvent.id
      }

    } catch (error) {
      console.error('Usage tracking error:', error)
      return {
        success: false,
        creditsConsumed: 0,
        remainingCredits: 0,
        error: 'Internal tracking error'
      }
    }
  }

  private calculateCredits(eventDef: any, eventData: Record<string, any>): number {
    let credits = eventDef.baseCredits

    // Apply complexity multiplier
    if (eventDef.multipliers?.complexity && eventData.complexity) {
      const complexity = Math.max(
        eventDef.multipliers.complexity.min,
        Math.min(eventDef.multipliers.complexity.max, eventData.complexity)
      )
      credits *= complexity
    }

    // Apply feature multipliers
    if (eventDef.multipliers?.features) {
      for (const [feature, multiplier] of Object.entries(eventDef.multipliers.features)) {
        if (eventData[feature]) {
          credits += multiplier as number
        }
      }
    }

    return Math.round(credits)
  }

  private async checkUsageLimits(organizationId: string, creditsNeeded: number): Promise<{
    allowed: boolean
    reason?: string
    remainingCredits: number
  }> {
    // Get organization plan
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planType: true, usageLimits: true }
    })

    if (!org) {
      return { allowed: false, reason: 'Organization not found', remainingCredits: 0 }
    }

    // Get current month usage
    const currentMonth = new Date()
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const monthlyUsage = await prisma.usageEvent.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { creditsConsumed: true }
    })

    const usedCredits = monthlyUsage._sum.creditsConsumed || 0
    const creditLimit = (org.usageLimits as any).ai_calls_per_month || 0
    const remainingCredits = creditLimit - usedCredits

    if (usedCredits + creditsNeeded > creditLimit) {
      return {
        allowed: false,
        reason: `Credit limit exceeded. Used: ${usedCredits}, Needed: ${creditsNeeded}, Limit: ${creditLimit}`,
        remainingCredits
      }
    }

    return { allowed: true, remainingCredits }
  }

  private async getRemainingCredits(organizationId: string): Promise<number> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { usageLimits: true }
    })

    if (!org) return 0

    const currentMonth = new Date()
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const monthlyUsage = await prisma.usageEvent.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { creditsConsumed: true }
    })

    const usedCredits = monthlyUsage._sum.creditsConsumed || 0
    const creditLimit = (org.usageLimits as any).ai_calls_per_month || 0

    return Math.max(0, creditLimit - usedCredits)
  }

  // Get detailed usage breakdown
  async getUsageBreakdown(organizationId: string, month?: Date): Promise<{
    totalCredits: number
    usedCredits: number
    remainingCredits: number
    eventBreakdown: Record<string, { count: number; credits: number }>
    userBreakdown: Record<string, { count: number; credits: number }>
  }> {
    const targetMonth = month || new Date()
    const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)

    // Get organization plan
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { usageLimits: true }
    })

    const totalCredits = (org?.usageLimits as any)?.ai_calls_per_month || 0

    // Get usage events for the month
    const events = await prisma.usageEvent.findMany({
      where: {
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      include: {
        user: {
          select: { id: true, fullName: true, email: true }
        }
      }
    })

    const usedCredits = events.reduce((sum, event) => sum + event.creditsConsumed, 0)
    const remainingCredits = Math.max(0, totalCredits - usedCredits)

    // Event breakdown
    const eventBreakdown: Record<string, { count: number; credits: number }> = {}
    for (const event of events) {
      if (!eventBreakdown[event.eventType]) {
        eventBreakdown[event.eventType] = { count: 0, credits: 0 }
      }
      eventBreakdown[event.eventType].count++
      eventBreakdown[event.eventType].credits += event.creditsConsumed
    }

    // User breakdown
    const userBreakdown: Record<string, { count: number; credits: number }> = {}
    for (const event of events) {
      const userKey = event.user.fullName || event.user.email
      if (!userBreakdown[userKey]) {
        userBreakdown[userKey] = { count: 0, credits: 0 }
      }
      userBreakdown[userKey].count++
      userBreakdown[userKey].credits += event.creditsConsumed
    }

    return {
      totalCredits,
      usedCredits,
      remainingCredits,
      eventBreakdown,
      userBreakdown
    }
  }
}

export const usageTracker = new UsageTracker()
```

### **Step 1.4: Create Tracking Middleware**

**File: `src/lib/middleware/usage-middleware.ts`**
```typescript
import { NextRequest } from 'next/server'
import { usageTracker } from '@/lib/usage/usage-tracker'
import { getUserRoleFromRequest } from '@/lib/api-rbac'

export interface TrackingOptions {
  eventType: string
  eventData?: Record<string, any>
  creditsOverride?: number
  skipLimitCheck?: boolean
  sessionId?: number
}

export async function withUsageTracking(
  request: NextRequest,
  organizationId: string,
  options: TrackingOptions
) {
  const { role, userId, user } = await getUserRoleFromRequest(request, organizationId)
  
  if (!user || !userId) {
    throw new Error('Authentication required for usage tracking')
  }

  const result = await usageTracker.trackUsage({
    organizationId,
    userId,
    eventType: options.eventType,
    sessionId: options.sessionId,
    eventData: options.eventData,
    creditsOverride: options.creditsOverride,
    skipLimitCheck: options.skipLimitCheck
  })

  if (!result.success) {
    throw new Error(result.error || 'Usage tracking failed')
  }

  return result
}

// Decorator for easy API route integration
export function trackUsage(eventType: string, options?: Partial<TrackingOptions>) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value

    descriptor.value = async function (...args: any[]) {
      const [request, { params }] = args
      const organizationId = params?.orgId

      if (!organizationId) {
        throw new Error('Organization ID required for usage tracking')
      }

      // Track usage before executing the method
      await withUsageTracking(request, organizationId, {
        eventType,
        ...options
      })

      // Execute original method
      return method.apply(this, args)
    }

    return descriptor
  }
}
```

### **Step 1.5: Seed Initial Configuration**

**File: `database/seed-event-definitions.sql`**
```sql
INSERT INTO event_definitions (event_type, config) VALUES 
('structuring_diagnose', '{
  "baseCredits": 10,
  "description": "Problem analysis in Structuring",
  "category": "ai_analysis",
  "endpoint": "/api/structuring/diagnose",
  "multipliers": {
    "complexity": {"min": 1.0, "max": 2.5},
    "features": {"echo": 5, "traceback": 3}
  }
}'),
('structuring_generate_solution', '{
  "baseCredits": 15,
  "description": "Solution generation with optional enhancements",
  "category": "ai_analysis",
  "endpoint": "/api/structuring/generate-solution",
  "multipliers": {
    "features": {"echo": 5, "traceback": 3}
  }
}'),
('visuals_planning', '{
  "baseCredits": 8,
  "description": "Visual planning generation",
  "category": "ai_visual",
  "endpoint": "/api/visuals/planning"
}'),
('visuals_sketch', '{
  "baseCredits": 12,
  "description": "Visual sketch creation",
  "category": "ai_visual",
  "endpoint": "/api/visuals/sketch"
}'),
('solutioning_image_analysis', '{
  "baseCredits": 8,
  "description": "Image analysis in Solutioning",
  "category": "ai_analysis",
  "endpoint": "/api/solutioning/image-analysis"
}'),
('solutioning_ai_enhance', '{
  "baseCredits": 12,
  "description": "AI enhancement in Solutioning",
  "category": "ai_enhancement",
  "endpoint": "/api/solutioning/ai-enhance"
}'),
('solutioning_structure_solution', '{
  "baseCredits": 15,
  "description": "Structure solution generation",
  "category": "ai_analysis",
  "endpoint": "/api/solutioning/structure-solution"
}'),
('solutioning_node_stack', '{
  "baseCredits": 6,
  "description": "Per node stack generation",
  "category": "ai_analysis",
  "endpoint": "/api/solutioning/node-stack"
}'),
('solutioning_formatting', '{
  "baseCredits": 5,
  "description": "Solution formatting",
  "category": "formatting",
  "endpoint": "/api/solutioning/formatting"
}'),
('solutioning_hyper_canvas', '{
  "baseCredits": 10,
  "description": "Hyper-canvas usage",
  "category": "ai_canvas",
  "endpoint": "/api/solutioning/hyper-canvas"
}'),
('push_structuring_to_visuals', '{
  "baseCredits": 3,
  "description": "Push data from Structuring to Visuals",
  "category": "data_transfer",
  "endpoint": "/api/push/structuring-to-visuals"
}'),
('push_visuals_to_solutioning', '{
  "baseCredits": 3,
  "description": "Push data from Visuals to Solutioning",
  "category": "data_transfer",
  "endpoint": "/api/push/visuals-to-solutioning"
}'),
('push_solutioning_to_sow', '{
  "baseCredits": 5,
  "description": "Push data from Solutioning to SoW",
  "category": "data_transfer",
  "endpoint": "/api/push/solutioning-to-sow"
}'),
('push_sow_to_loe', '{
  "baseCredits": 5,
  "description": "Push data from SoW to LoE",
  "category": "data_transfer",
  "endpoint": "/api/push/sow-to-loe"
}');
```

**File: `database/seed-plan-definitions.sql`**
```sql
INSERT INTO plan_definitions (plan_name, config) VALUES 
('free', '{
  "displayName": "Free Plan",
  "monthlyCredits": 100,
  "pricing": {"monthly": 0, "annual": 0},
  "limits": {
    "aiCallsPerMonth": 50,
    "pdfExportsPerMonth": 5,
    "sessionLimit": 10,
    "teamMembersLimit": 1,
    "storageLimit": 100
  },
  "features": ["Basic AI tools", "PDF exports", "Community support"],
  "overageRate": 0
}'),
('starter', '{
  "displayName": "Starter Plan",
  "monthlyCredits": 1000,
  "pricing": {"monthly": 19, "annual": 190},
  "limits": {
    "aiCallsPerMonth": 500,
    "pdfExportsPerMonth": 50,
    "sessionLimit": 50,
    "teamMembersLimit": 5,
    "storageLimit": 1000
  },
  "features": ["All AI tools", "Unlimited PDFs", "Email support"],
  "overageRate": 0.015
}'),
('professional', '{
  "displayName": "Professional Plan",
  "monthlyCredits": 5000,
  "pricing": {"monthly": 49, "annual": 490},
  "limits": {
    "aiCallsPerMonth": 2000,
    "pdfExportsPerMonth": 200,
    "sessionLimit": 200,
    "teamMembersLimit": 20,
    "storageLimit": 5000
  },
  "features": ["Advanced AI", "Priority support", "Custom branding"],
  "overageRate": 0.01
}'),
('enterprise', '{
  "displayName": "Enterprise Plan",
  "monthlyCredits": 15000,
  "pricing": {"monthly": 99, "annual": 990},
  "limits": {
    "aiCallsPerMonth": -1,
    "pdfExportsPerMonth": -1,
    "sessionLimit": -1,
    "teamMembersLimit": -1,
    "storageLimit": 20000
  },
  "features": ["Unlimited AI", "Dedicated support", "SSO", "API access"],
  "overageRate": 0.005
}');
```

---

## **PHASE 2: API Integration & Tracking (Week 3-4)**

### **Step 2.1: Integrate with Existing API Routes**

**Update Structuring API Routes:**

**File: `src/app/api/structuring/diagnose/route.ts`** (example)
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { withUsageTracking } from '@/lib/middleware/usage-middleware'
import { getUserRoleFromRequest } from '@/lib/api-rbac'

export async function POST(
  request: NextRequest,
  { params }: { params: { orgId?: string } }
) {
  try {
    const body = await request.json()
    const { text, echo, traceback, organizationId } = body

    // Get organization context (from body or params)
    const orgId = organizationId || params?.orgId
    if (!orgId) {
      return NextResponse.json(
        { error: 'Organization ID required' },
        { status: 400 }
      )
    }

    // Verify access
    const { user } = await getUserRoleFromRequest(request, orgId)
    if (!user) {
      return NextResponse.json(
        { error: 'Authentication required' },
        { status: 401 }
      )
    }

    // Track usage before processing
    const trackingResult = await withUsageTracking(request, orgId, {
      eventType: 'structuring_diagnose',
      eventData: {
        inputLength: text?.length || 0,
        echo: !!echo,
        traceback: !!traceback,
        complexity: Math.min(2.5, Math.max(1.0, (text?.length || 0) / 500))
      }
    })

    // Your existing AI processing logic here
    const result = await processStructuringDiagnose(text, { echo, traceback })

    return NextResponse.json({
      success: true,
      result,
      usage: {
        creditsConsumed: trackingResult.creditsConsumed,
        remainingCredits: trackingResult.remainingCredits
      }
    })

  } catch (error) {
    console.error('Structuring diagnose error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal server error' },
      { status: 500 }
    )
  }
}

// Your existing processing function
async function processStructuringDiagnose(text: string, options: any) {
  // Existing implementation
  return { analysis: "Your analysis result" }
}
```

**Pattern for All AI Routes:**
```typescript
// Before any AI processing, add this pattern:
const trackingResult = await withUsageTracking(request, organizationId, {
  eventType: 'your_event_type',
  eventData: {
    // Relevant context data
    inputLength: input?.length || 0,
    complexity: calculateComplexity(input),
    features: extractFeatureFlags(request)
  }
})

// Include usage info in response:
return NextResponse.json({
  success: true,
  result: yourAIResult,
  usage: {
    creditsConsumed: trackingResult.creditsConsumed,
    remainingCredits: trackingResult.remainingCredits
  }
})
```

### **Step 2.2: Create Usage Dashboard API**

**File: `src/app/api/organizations/[orgId]/usage/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationAccess } from '@/lib/api-rbac'
import { usageTracker } from '@/lib/usage/usage-tracker'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    const url = new URL(request.url)
    const month = url.searchParams.get('month')

    // RBAC check
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Get usage breakdown
    const targetMonth = month ? new Date(month) : undefined
    const breakdown = await usageTracker.getUsageBreakdown(orgId, targetMonth)

    return NextResponse.json({
      success: true,
      usage: breakdown
    })

  } catch (error) {
    console.error('Usage dashboard error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### **Step 2.3: Create Usage History API**

**File: `src/app/api/organizations/[orgId]/usage/history/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { requireOrganizationAccess } from '@/lib/api-rbac'
import { prisma } from '@/lib/prisma'
import { eventRegistry } from '@/lib/config/event-registry'

export async function GET(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  try {
    const { orgId } = params
    const url = new URL(request.url)
    const page = parseInt(url.searchParams.get('page') || '1')
    const limit = parseInt(url.searchParams.get('limit') || '50')
    const eventType = url.searchParams.get('eventType')
    const userId = url.searchParams.get('userId')
    const startDate = url.searchParams.get('startDate')
    const endDate = url.searchParams.get('endDate')

    // RBAC check
    const roleInfo = await requireOrganizationAccess(request, orgId)
    if (!roleInfo) {
      return NextResponse.json(
        { error: 'Access denied' },
        { status: 403 }
      )
    }

    // Build filters
    const where: any = { organizationId: orgId }
    
    if (eventType) where.eventType = eventType
    if (userId) where.userId = userId
    if (startDate || endDate) {
      where.createdAt = {}
      if (startDate) where.createdAt.gte = new Date(startDate)
      if (endDate) where.createdAt.lte = new Date(endDate)
    }

    // Get usage events with pagination
    const [events, total] = await Promise.all([
      prisma.usageEvent.findMany({
        where,
        include: {
          user: {
            select: { id: true, fullName: true, email: true }
          },
          session: {
            select: { id: true, uuid: true, title: true }
          }
        },
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit
      }),
      prisma.usageEvent.count({ where })
    ])

    // Enrich with event definitions
    const eventDefinitions = await eventRegistry.getAllEvents()
    
    const enrichedEvents = events.map(event => ({
      id: event.id,
      eventType: event.eventType,
      eventName: eventDefinitions[event.eventType]?.description || event.eventType,
      category: eventDefinitions[event.eventType]?.category || 'unknown',
      creditsConsumed: event.creditsConsumed,
      user: {
        id: event.user.id,
        name: event.user.fullName || event.user.email
      },
      session: event.session ? {
        id: event.session.id,
        uuid: event.session.uuid,
        title: event.session.title || 'Untitled Session'
      } : null,
      eventData: event.eventData,
      createdAt: event.createdAt
    }))

    return NextResponse.json({
      success: true,
      events: enrichedEvents,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit)
      }
    })

  } catch (error) {
    console.error('Usage history error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

---

## **PHASE 3: Frontend Integration (Week 5-6)**

### **Step 3.1: Create Usage Context**

**File: `src/contexts/usage-context.tsx`**
```typescript
'use client'

import React, { createContext, useContext, useEffect, useState } from 'react'
import { useUser } from '@/contexts/user-context'

interface UsageData {
  totalCredits: number
  usedCredits: number
  remainingCredits: number
  percentageUsed: number
  eventBreakdown: Record<string, { count: number; credits: number }>
  userBreakdown: Record<string, { count: number; credits: number }>
}

interface UsageContextType {
  usage: UsageData | null
  loading: boolean
  error: string | null
  refreshUsage: () => Promise<void>
}

const UsageContext = createContext<UsageContextType>({
  usage: null,
  loading: true,
  error: null,
  refreshUsage: async () => {}
})

export function UsageProvider({ children }: { children: React.ReactNode }) {
  const { selectedOrganization } = useUser()
  const [usage, setUsage] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchUsage = async () => {
    if (!selectedOrganization) {
      setUsage(null)
      setLoading(false)
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/organizations/${selectedOrganization.organization.id}/usage`)
      const data = await response.json()

      if (!response.ok) {
        throw new Error(data.error || 'Failed to fetch usage')
      }

      if (data.success) {
        const usageData = data.usage
        setUsage({
          ...usageData,
          percentageUsed: usageData.totalCredits > 0 
            ? (usageData.usedCredits / usageData.totalCredits) * 100 
            : 0
        })
      }
    } catch (err) {
      console.error('Error fetching usage:', err)
      setError(err instanceof Error ? err.message : 'Unknown error')
    } finally {
      setLoading(false)
    }
  }

  const refreshUsage = async () => {
    await fetchUsage()
  }

  useEffect(() => {
    fetchUsage()
  }, [selectedOrganization])

  return (
    <UsageContext.Provider value={{ usage, loading, error, refreshUsage }}>
      {children}
    </UsageContext.Provider>
  )
}

export function useUsage() {
  const context = useContext(UsageContext)
  if (!context) {
    throw new Error('useUsage must be used within a UsageProvider')
  }
  return context
}
```

### **Step 3.2: Create Usage Components**

**File: `src/components/usage/usage-indicator.tsx`**
```typescript
'use client'

import { useUsage } from '@/contexts/usage-context'
import { Progress } from '@/components/ui/progress'
import { AlertTriangle, Zap } from 'lucide-react'

export function UsageIndicator({ compact = false }: { compact?: boolean }) {
  const { usage, loading } = useUsage()

  if (loading || !usage) {
    return compact ? (
      <div className="flex items-center gap-2 text-nexa-muted text-sm">
        <Zap className="h-4 w-4" />
        <span>Loading...</span>
      </div>
    ) : null
  }

  const isNearLimit = usage.percentageUsed >= 80
  const isOverLimit = usage.percentageUsed >= 100

  if (compact) {
    return (
      <div className="flex items-center gap-2 text-sm">
        <Zap className={`h-4 w-4 ${isOverLimit ? 'text-red-400' : isNearLimit ? 'text-yellow-400' : 'text-green-400'}`} />
        <span className="text-white">
          {usage.remainingCredits.toLocaleString()}
        </span>
        <span className="text-nexa-muted">/ {usage.totalCredits.toLocaleString()}</span>
      </div>
    )
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Zap className="h-4 w-4 text-white" />
          <span className="text-white text-sm font-medium">Credits</span>
          {isNearLimit && (
            <AlertTriangle className={`h-4 w-4 ${isOverLimit ? 'text-red-400' : 'text-yellow-400'}`} />
          )}
        </div>
        <span className="text-white text-sm">
          {usage.usedCredits.toLocaleString()} / {usage.totalCredits.toLocaleString()}
        </span>
      </div>
      
      <Progress 
        value={Math.min(100, usage.percentageUsed)} 
        className="h-2"
      />
      
      {isOverLimit ? (
        <p className="text-red-400 text-xs">Over limit by {(usage.usedCredits - usage.totalCredits).toLocaleString()} credits</p>
      ) : isNearLimit ? (
        <p className="text-yellow-400 text-xs">Approaching credit limit</p>
      ) : (
        <p className="text-nexa-muted text-xs">{usage.remainingCredits.toLocaleString()} credits remaining</p>
      )}
    </div>
  )
}
```

**File: `src/components/usage/usage-dashboard.tsx`**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/contexts/user-context'
import { Card } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Zap, TrendingUp, Users, Calendar } from 'lucide-react'

interface UsageHistoryEvent {
  id: string
  eventType: string
  eventName: string
  category: string
  creditsConsumed: number
  user: { id: string; name: string }
  session: { id: number; uuid: string; title: string } | null
  createdAt: string
}

export function UsageDashboard() {
  const { selectedOrganization } = useUser()
  const [usage, setUsage] = useState<any>(null)
  const [history, setHistory] = useState<UsageHistoryEvent[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedOrganization) return

    const fetchData = async () => {
      try {
        setLoading(true)
        
        const [usageRes, historyRes] = await Promise.all([
          fetch(`/api/organizations/${selectedOrganization.organization.id}/usage`),
          fetch(`/api/organizations/${selectedOrganization.organization.id}/usage/history?limit=20`)
        ])
        
        const [usageData, historyData] = await Promise.all([
          usageRes.json(),
          historyRes.json()
        ])
        
        if (usageData.success) setUsage(usageData.usage)
        if (historyData.success) setHistory(historyData.events)
        
      } catch (error) {
        console.error('Error fetching usage data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [selectedOrganization])

  if (loading) {
    return <div className="text-center py-8 text-nexa-muted">Loading usage data...</div>
  }

  if (!usage) {
    return <div className="text-center py-8 text-nexa-muted">No usage data available</div>
  }

  const percentageUsed = usage.totalCredits > 0 ? (usage.usedCredits / usage.totalCredits) * 100 : 0

  return (
    <div className="space-y-6">
      {/* Overview Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card variant="nexa" className="p-4">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-nexa-muted text-sm">Total Credits</p>
              <p className="text-white text-2xl font-bold">{usage.totalCredits.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        
        <Card variant="nexa" className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-nexa-muted text-sm">Used</p>
              <p className="text-white text-2xl font-bold">{usage.usedCredits.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        
        <Card variant="nexa" className="p-4">
          <div className="flex items-center gap-3">
            <Users className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-nexa-muted text-sm">Remaining</p>
              <p className="text-white text-2xl font-bold">{usage.remainingCredits.toLocaleString()}</p>
            </div>
          </div>
        </Card>
        
        <Card variant="nexa" className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-yellow-400" />
            <div>
              <p className="text-nexa-muted text-sm">Usage</p>
              <p className="text-white text-2xl font-bold">{percentageUsed.toFixed(1)}%</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Usage Progress */}
      <Card variant="nexa" className="p-6">
        <h3 className="text-white text-lg font-semibold mb-4">Monthly Usage</h3>
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span className="text-nexa-muted">Credits Used</span>
            <span className="text-white">{usage.usedCredits.toLocaleString()} / {usage.totalCredits.toLocaleString()}</span>
          </div>
          <Progress value={Math.min(100, percentageUsed)} className="h-3" />
          {percentageUsed >= 80 && (
            <p className={`text-sm ${percentageUsed >= 100 ? 'text-red-400' : 'text-yellow-400'}`}>
              {percentageUsed >= 100 
                ? `Over limit by ${(usage.usedCredits - usage.totalCredits).toLocaleString()} credits`
                : 'Approaching credit limit'
              }
            </p>
          )}
        </div>
      </Card>

      {/* Detailed Breakdown */}
      <Tabs defaultValue="events" className="space-y-4">
        <TabsList>
          <TabsTrigger value="events">By Event Type</TabsTrigger>
          <TabsTrigger value="users">By User</TabsTrigger>
          <TabsTrigger value="history">Recent Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="events">
          <Card variant="nexa" className="p-6">
            <h3 className="text-white text-lg font-semibold mb-4">Usage by Event Type</h3>
            <div className="space-y-3">
              {Object.entries(usage.eventBreakdown).map(([eventType, data]: [string, any]) => (
                <div key={eventType} className="flex items-center justify-between">
                  <span className="text-nexa-muted capitalize">{eventType.replace(/_/g, ' ')}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-white text-sm">{data.count} calls</span>
                    <span className="text-white font-medium">{data.credits.toLocaleString()} credits</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="users">
          <Card variant="nexa" className="p-6">
            <h3 className="text-white text-lg font-semibold mb-4">Usage by User</h3>
            <div className="space-y-3">
              {Object.entries(usage.userBreakdown).map(([userName, data]: [string, any]) => (
                <div key={userName} className="flex items-center justify-between">
                  <span className="text-nexa-muted">{userName}</span>
                  <div className="flex items-center gap-4">
                    <span className="text-white text-sm">{data.count} calls</span>
                    <span className="text-white font-medium">{data.credits.toLocaleString()} credits</span>
                  </div>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <Card variant="nexa" className="p-6">
            <h3 className="text-white text-lg font-semibold mb-4">Recent Activity</h3>
            <div className="space-y-3">
              {history.map((event) => (
                <div key={event.id} className="flex items-center justify-between py-2 border-b border-nexa-border last:border-b-0">
                  <div>
                    <p className="text-white text-sm font-medium">{event.eventName}</p>
                    <p className="text-nexa-muted text-xs">
                      {event.user.name} • {new Date(event.createdAt).toLocaleString()}
                    </p>
                  </div>
                  <span className="text-white font-medium">{event.creditsConsumed} credits</span>
                </div>
              ))}
            </div>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
```

### **Step 3.3: Update Sidebar with Usage Indicator**

**Update: `src/components/layout/sidebar.tsx`**
```typescript
// Add after existing imports
import { UsageIndicator } from '@/components/usage/usage-indicator'

// Add before logout button section (around line 264)
          {/* Usage Indicator */}
          <div className="px-6 py-4 border-t border-nexa-border">
            <UsageIndicator />
          </div>
```

### **Step 3.4: Update Organizations Page with Usage Dashboard**

**Update: `src/app/organizations/page.tsx`**
```typescript
// Add import
import { UsageDashboard } from '@/components/usage/usage-dashboard'

// Add new tab in the TabsList (around line with other tabs)
            <TabsTrigger value="usage">Usage</TabsTrigger>

// Add new TabsContent section (with other TabsContent sections)
          <TabsContent value="usage">
            <UsageDashboard />
          </TabsContent>
```

---

## **PHASE 4: Billing & Plan Management (Week 7-8)**

### **Step 4.1: Create Plan Management API**

**File: `src/app/api/admin/plans/route.ts`**
```typescript
import { NextRequest, NextResponse } from 'next/server'
import { planRegistry } from '@/lib/config/plan-registry'
import { requireRole } from '@/lib/api-rbac'

export async function GET() {
  try {
    const plans = await planRegistry.getAllPlans()
    return NextResponse.json({ success: true, plans })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to fetch plans' },
      { status: 500 }
    )
  }
}

export async function PUT(request: NextRequest) {
  try {
    // Require admin/owner permissions
    const { user } = await requireRole(request, '', ['owner', 'admin'])
    if (!user) {
      return NextResponse.json(
        { error: 'Admin access required' },
        { status: 403 }
      )
    }

    const { planName, config } = await request.json()
    
    await planRegistry.updatePlanDefinition(planName, config)
    
    return NextResponse.json({ success: true })
  } catch (error) {
    return NextResponse.json(
      { error: 'Failed to update plan' },
      { status: 500 }
    )
  }
}
```

### **Step 4.2: Create Billing Integration Service**

**File: `src/lib/billing/billing-service.ts`**
```typescript
import { prisma } from '@/lib/prisma'
import { planRegistry } from '@/lib/config/plan-registry'

export interface OverageCalculation {
  overageCredits: number
  overageAmount: number
  totalAmount: number
  billingPeriod: { start: Date; end: Date }
}

export class BillingService {
  async calculateOverageCharges(organizationId: string, month?: Date): Promise<OverageCalculation> {
    const targetMonth = month || new Date()
    const startOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth(), 1)
    const endOfMonth = new Date(targetMonth.getFullYear(), targetMonth.getMonth() + 1, 0)

    // Get organization and plan details
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planType: true, usageLimits: true }
    })

    if (!org) {
      throw new Error('Organization not found')
    }

    const planDef = await planRegistry.getPlanDefinition(org.planType)
    if (!planDef) {
      throw new Error(`Plan definition not found: ${org.planType}`)
    }

    // Calculate monthly usage
    const monthlyUsage = await prisma.usageEvent.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { creditsConsumed: true }
    })

    const usedCredits = monthlyUsage._sum.creditsConsumed || 0
    const creditLimit = planDef.monthlyCredits
    const overageCredits = Math.max(0, usedCredits - creditLimit)
    const overageAmount = overageCredits * planDef.overageRate

    return {
      overageCredits,
      overageAmount,
      totalAmount: planDef.pricing.monthly + overageAmount,
      billingPeriod: { start: startOfMonth, end: endOfMonth }
    }
  }

  async generateInvoice(organizationId: string, month: Date): Promise<any> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      include: { memberships: { include: { user: true } } }
    })

    if (!org) {
      throw new Error('Organization not found')
    }

    const overage = await this.calculateOverageCharges(organizationId, month)
    const planDef = await planRegistry.getPlanDefinition(org.planType)

    return {
      organizationId,
      organizationName: org.name,
      billingEmail: org.billingEmail,
      billingPeriod: overage.billingPeriod,
      plan: {
        name: planDef?.displayName || org.planType,
        monthlyAmount: planDef?.pricing.monthly || 0
      },
      usage: {
        includedCredits: planDef?.monthlyCredits || 0,
        usedCredits: overage.overageCredits + (planDef?.monthlyCredits || 0),
        overageCredits: overage.overageCredits,
        overageRate: planDef?.overageRate || 0,
        overageAmount: overage.overageAmount
      },
      total: overage.totalAmount,
      generatedAt: new Date()
    }
  }

  async checkUsageLimits(organizationId: string): Promise<{
    status: 'ok' | 'warning' | 'limit_exceeded'
    percentageUsed: number
    recommendedAction?: string
  }> {
    const org = await prisma.organization.findUnique({
      where: { id: organizationId },
      select: { planType: true, usageLimits: true }
    })

    if (!org) {
      throw new Error('Organization not found')
    }

    const currentMonth = new Date()
    const startOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), 1)
    const endOfMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 0)

    const monthlyUsage = await prisma.usageEvent.aggregate({
      where: {
        organizationId,
        createdAt: {
          gte: startOfMonth,
          lte: endOfMonth
        }
      },
      _sum: { creditsConsumed: true }
    })

    const usedCredits = monthlyUsage._sum.creditsConsumed || 0
    const creditLimit = (org.usageLimits as any).ai_calls_per_month || 0
    const percentageUsed = creditLimit > 0 ? (usedCredits / creditLimit) * 100 : 0

    if (percentageUsed >= 100) {
      return {
        status: 'limit_exceeded',
        percentageUsed,
        recommendedAction: 'Consider upgrading your plan or purchasing additional credits'
      }
    } else if (percentageUsed >= 80) {
      return {
        status: 'warning',
        percentageUsed,
        recommendedAction: 'You are approaching your monthly limit'
      }
    } else {
      return { status: 'ok', percentageUsed }
    }
  }
}

export const billingService = new BillingService()
```

### **Step 4.3: Create Billing Dashboard**

**File: `src/components/billing/billing-dashboard.tsx`**
```typescript
'use client'

import { useState, useEffect } from 'react'
import { useUser } from '@/contexts/user-context'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { AlertTriangle, CreditCard, TrendingUp, Calendar } from 'lucide-react'

export function BillingDashboard() {
  const { selectedOrganization } = useUser()
  const [billingData, setBillingData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!selectedOrganization) return

    const fetchBillingData = async () => {
      try {
        setLoading(true)
        const response = await fetch(`/api/organizations/${selectedOrganization.organization.id}/billing`)
        const data = await response.json()
        
        if (data.success) {
          setBillingData(data.billing)
        }
      } catch (error) {
        console.error('Error fetching billing data:', error)
      } finally {
        setLoading(false)
      }
    }

    fetchBillingData()
  }, [selectedOrganization])

  if (loading) {
    return <div className="text-center py-8 text-nexa-muted">Loading billing data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Current Plan */}
      <Card variant="nexa" className="p-6">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-white text-lg font-semibold">Current Plan</h3>
            <p className="text-nexa-muted">Professional Plan - $49/month</p>
          </div>
          <Button variant="nexa">Upgrade Plan</Button>
        </div>
      </Card>

      {/* Billing Overview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card variant="nexa" className="p-4">
          <div className="flex items-center gap-3">
            <CreditCard className="h-8 w-8 text-green-400" />
            <div>
              <p className="text-nexa-muted text-sm">This Month</p>
              <p className="text-white text-2xl font-bold">$49.00</p>
            </div>
          </div>
        </Card>
        
        <Card variant="nexa" className="p-4">
          <div className="flex items-center gap-3">
            <TrendingUp className="h-8 w-8 text-blue-400" />
            <div>
              <p className="text-nexa-muted text-sm">Overage</p>
              <p className="text-white text-2xl font-bold">$12.50</p>
            </div>
          </div>
        </Card>
        
        <Card variant="nexa" className="p-4">
          <div className="flex items-center gap-3">
            <Calendar className="h-8 w-8 text-purple-400" />
            <div>
              <p className="text-nexa-muted text-sm">Next Billing</p>
              <p className="text-white text-lg font-bold">Dec 15</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Overage Warning */}
      <Card variant="nexa" className="p-6 border-yellow-600">
        <div className="flex items-center gap-3">
          <AlertTriangle className="h-6 w-6 text-yellow-400" />
          <div>
            <h4 className="text-white font-semibold">Usage Alert</h4>
            <p className="text-nexa-muted text-sm">
              You've used 850 credits over your monthly limit. Overage charges: $12.50
            </p>
          </div>
        </div>
      </Card>

      {/* Invoices */}
      <Card variant="nexa" className="p-6">
        <h3 className="text-white text-lg font-semibold mb-4">Recent Invoices</h3>
        <div className="space-y-3">
          {/* Mock invoice data */}
          <div className="flex items-center justify-between py-2 border-b border-nexa-border">
            <div>
              <p className="text-white text-sm">November 2024</p>
              <p className="text-nexa-muted text-xs">Paid on Nov 15, 2024</p>
            </div>
            <div className="flex items-center gap-4">
              <span className="text-white font-medium">$61.50</span>
              <Button variant="outline" size="sm">Download</Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}
```

---

## 🛡️ **RISK ASSESSMENT & MITIGATION**

### **HIGH RISK ITEMS**

#### **1. Organization Context Loss**
**Risk**: Users charged to wrong organization if context is lost
**Mitigation**:
- Always get `organizationId` from URL params in API routes
- Validate organization access with RBAC before any usage tracking
- Add organization validation middleware to all AI endpoints
- Store organization context in localStorage with automatic restoration

#### **2. Double Charging**
**Risk**: Multiple tracking calls for single AI operation
**Mitigation**:
- Implement idempotency keys for usage tracking
- Add request deduplication in usage tracker
- Use database transactions for atomic credit operations
- Add usage event uniqueness constraints

#### **3. Configuration Cache Staleness**
**Risk**: Old pricing/event definitions used after updates
**Mitigation**:
- Implement cache TTL with automatic refresh (5 minutes)
- Add cache invalidation endpoints for immediate updates
- Use database triggers to notify application of config changes
- Add configuration version tracking

#### **4. Performance Impact**
**Risk**: Usage tracking slows down AI operations
**Mitigation**:
- Track usage asynchronously after AI response
- Use connection pooling for database operations
- Implement bulk usage event insertion for high volume
- Add circuit breaker for tracking failures

### **MEDIUM RISK ITEMS**

#### **5. Credit Calculation Errors**
**Risk**: Incorrect credit consumption calculations
**Mitigation**:
- Add comprehensive unit tests for calculation logic
- Implement audit logging for all credit calculations
- Add manual credit adjustment capabilities
- Store calculation details in `eventData` for debugging

#### **6. Plan Configuration Errors**
**Risk**: Invalid plan configurations break billing
**Mitigation**:
- Add JSON schema validation for plan configurations
- Implement plan configuration testing environment
- Add rollback capabilities for bad configurations
- Use staged deployment for plan changes

### **LOW RISK ITEMS**

#### **7. UI State Inconsistency**
**Risk**: Usage displays out of sync with actual usage
**Mitigation**:
- Implement real-time usage updates via WebSocket (future)
- Add manual refresh capabilities
- Use optimistic updates with rollback
- Cache usage data with short TTL

#### **8. Historical Data Loss**
**Risk**: Usage history lost or corrupted
**Mitigation**:
- Use soft deletes for all usage events
- Implement automated database backups
- Add usage event export capabilities
- Store critical calculations in multiple places

### **BREAKING CHANGE PREVENTION**

#### **Database Schema**
- **✅ No changes to existing tables**
- **✅ Only adding new tables (`event_definitions`, `plan_definitions`)**
- **✅ Using existing `UsageEvent` table as-is**
- **✅ Backward compatible with current `organizations.usageLimits`**

#### **API Compatibility**
- **✅ All new endpoints, no modifications to existing**
- **✅ Usage tracking added as middleware, doesn't change responses**
- **✅ Optional usage info in responses, non-breaking**
- **✅ Existing RBAC system used as-is**

#### **Frontend Integration**
- **✅ New components, no modifications to existing**
- **✅ Optional contexts, doesn't affect existing functionality**
- **✅ New sidebar sections, doesn't change existing navigation**
- **✅ New organization tabs, existing tabs unchanged**

---

## 📋 **IMPLEMENTATION CHECKLIST**

### **Phase 1: Foundation (Week 1-2)**
- [ ] Create `event_definitions` and `plan_definitions` tables
- [ ] Implement `EventRegistry` and `PlanRegistry` classes
- [ ] Create `UsageTracker` service
- [ ] Build usage tracking middleware
- [ ] Seed initial event and plan configurations
- [ ] Test configuration hot-reloading

### **Phase 2: API Integration (Week 3-4)**
- [ ] Add usage tracking to all AI endpoints
- [ ] Create usage dashboard API
- [ ] Create usage history API
- [ ] Add organization usage management endpoints
- [ ] Test cross-organization billing attribution
- [ ] Implement usage limit enforcement

### **Phase 3: Frontend Integration (Week 5-6)**
- [ ] Create usage context and hooks
- [ ] Build usage indicator components
- [ ] Build usage dashboard components
- [ ] Update sidebar with usage display
- [ ] Update organizations page with usage tab
- [ ] Test real-time usage updates

### **Phase 4: Billing & Plans (Week 7-8)**
- [ ] Create billing service
- [ ] Build plan management APIs
- [ ] Create billing dashboard
- [ ] Implement overage calculations
- [ ] Add plan upgrade flows
- [ ] Test end-to-end billing scenarios

### **Testing & Deployment**
- [ ] Unit tests for all services
- [ ] Integration tests for API endpoints
- [ ] E2E tests for billing flows
- [ ] Performance testing for high usage scenarios
- [ ] Security audit for billing data
- [ ] Production deployment with monitoring

---

## 🎯 **SUCCESS METRICS**

### **Technical Metrics**
- **Response Time**: < 50ms additional latency for usage tracking
- **Accuracy**: 99.9% credit calculation accuracy
- **Availability**: 99.99% uptime for billing services
- **Performance**: Handle 1000+ concurrent usage events

### **Business Metrics**
- **Usage Visibility**: 100% of AI operations tracked
- **Billing Accuracy**: Zero billing disputes from technical errors
- **Plan Upgrades**: Track conversion from usage limit warnings
- **Revenue Attribution**: Complete organization-level billing

### **User Experience Metrics**
- **Configuration Updates**: < 5 minutes from change to live
- **Dashboard Load Time**: < 2 seconds for usage data
- **Error Rate**: < 0.1% for usage tracking operations
- **User Satisfaction**: Positive feedback on usage transparency

---

## 🚀 **POST-IMPLEMENTATION ENHANCEMENTS**

### **Immediate (Month 2)**
- Real-time usage WebSocket updates
- Advanced usage analytics and forecasting
- Custom usage alerts and notifications
- Usage export and reporting features

### **Short-term (Month 3-4)**
- Stripe/payment provider integration
- Automated billing and invoicing
- Team usage budgets and controls
- API access for enterprise customers

### **Long-term (Month 6+)**
- Machine learning usage optimization
- Predictive billing recommendations
- Advanced plan customization
- Multi-currency and international billing

---

This implementation plan provides a complete blueprint for adding robust, scalable usage tracking and billing to the NEXA Platform while maintaining the excellent existing architecture and ensuring zero breaking changes. The phased approach allows for iterative development and testing, with clear success metrics and risk mitigation strategies.

**Ready to transform NEXA into a profitable, transparent, and scalable SaaS platform! 🎉**
