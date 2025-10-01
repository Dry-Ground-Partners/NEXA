# 🧠 NEXA Platform - Repository Expertise Summary

**Last Updated:** October 1, 2025  
**Status:** ✅ **Comprehensive Understanding Achieved**

---

## **🏗️ ARCHITECTURE OVERVIEW**

### **Technology Stack**
- **Frontend:** Next.js 14 (App Router), React 18, TypeScript
- **Backend:** Next.js API Routes (Serverless)
- **Database:** PostgreSQL 16+ with Prisma ORM
- **Authentication:** JWT-based with httpOnly cookies
- **AI:** LangChain + LangSmith (OpenAI GPT-4o)
- **PDF:** Python Flask microservice with WeasyPrint + Jinja2
- **Styling:** Tailwind CSS + Radix UI
- **State:** React hooks, Context API, localStorage

### **Multi-Tenant Architecture**
- **Organization-based:** Every user belongs to 1+ organizations
- **RBAC Roles:** Owner, Admin, Member, Viewer, Billing
- **Data Isolation:** All data scoped to `organizationId`
- **Billing Attribution:** Usage tracked per organization
- **Organization Switching:** Users can switch between orgs

---

## **📊 CORE WORKFLOW PIPELINE**

The platform follows a **5-stage document generation workflow**:

### **1. Structuring (`/structuring`)**
- **Purpose:** Problem analysis and solution generation
- **AI Functions:**
  - `analyzePainPoints` - Diagnose problems
  - `generateSolution` - Create solutions
- **Data Storage:** `session_objects` (JSONB)
- **Push To:** Visuals

### **2. Visuals (`/visuals`)**
- **Purpose:** Visual diagram creation
- **AI Functions:**
  - `generatePlanningFromIdeation` - Plan diagrams
  - `generateSketchFromPlanning` - Create sketches
- **Data Storage:** `visual_assets_json` (JSONB)
- **Push To:** Solutioning

### **3. Solutioning (`/solutioning`)**
- **Purpose:** Technical solution documentation
- **AI Functions:**
  - `analyzeImageWithVision` - Image analysis
  - `structureSolutionWithLangSmith` - Structure solutions
  - `analyzePerNodeStackWithLangSmith` - Tech stack analysis
  - `enhanceTextWithLangSmith` - Text enhancement
  - `generateSOWWithLangSmith` - Generate SOW
- **Data Storage:** `session_objects` (JSONB)
- **Push To:** SOW

### **4. SOW - Statement of Work (`/sow`)**
- **Purpose:** Project proposal and scope documentation
- **AI Functions:**
  - `generateLOEWithLangSmith` - Generate LOE
- **Data Storage:** `sow_objects` (JSONB)
- **Push To:** LOE
- **PDF:** Generates SOW PDF documents

### **5. LOE - Level of Effort (`/loe`)**
- **Purpose:** Resource estimation and cost analysis
- **Data Storage:** `loe_objects` (JSONB)
- **PDF:** Generates LOE PDF documents

---

## **🗄️ DATABASE SCHEMA**

### **Core Tables**

#### **Users & Auth**
- `users` - User accounts with profile data
- `user_sessions` - JWT sessions with refresh tokens
- `organization_memberships` - User-org relationships (many-to-many)

#### **Organizations**
- `organizations` - Company/team entities
- `organization_domains` - Domain-based auto-join
- `organization_preferences` - Backdrop settings (logos, AI preferences)

#### **Sessions (Main Data Storage)**
- `ai_architecture_sessions` - The core session table
  - `uuid` - External identifier
  - `session_objects` - Structuring/Solutioning data
  - `sow_objects` - SOW data
  - `loe_objects` - LOE data
  - `diagram_texts_json` - Visuals text data
  - `visual_assets_json` - Visuals asset data
  - `access_permissions` - Granular access control (JSONB)

#### **Usage & Billing**
- `usage_events` - All usage tracking
- `event_definitions` - Event type configs (hot-reloadable)
- `plan_definitions` - Plan configs (hot-reloadable)
- `audit_logs` - Compliance and security logs

---

## **🔐 AUTHENTICATION & RBAC**

### **Authentication Flow**
1. User logs in → JWT created with user ID
2. JWT stored in httpOnly cookie
3. `verifyAuth()` validates JWT and loads user + orgs
4. Organization context from URL params or header

### **RBAC System (`src/lib/api-rbac.ts`)**

#### **Core Function:**
```typescript
getUserRoleFromRequest(request, organizationId?)
// Returns: { role, organizationId, userId, user }
```

#### **Permission Helpers:**
- `canAccessOrganizations()` - owner, admin, billing
- `canSeeBilling()` - owner, billing
- `canSeeAccess()` - owner, admin
- `canSeeRoleManagement()` - owner only
- `canSeeMemberManagement()` - owner only

#### **Middleware:**
- `requireOrganizationAccess` - Any org member
- `requireBillingAccess` - Owner or billing
- `requireRoles(['owner', 'admin'])` - Specific roles

---

## **💰 USAGE TRACKING SYSTEM**

### **Event-Driven Architecture**
- **Event Definitions:** Database-driven config (hot-reloadable)
- **Plan Definitions:** Database-driven limits per plan
- **Credit System:** Each event consumes credits
- **Complexity Multipliers:** Dynamic credit calculation

### **Key Events:**
- **Structuring:** `structuring_diagnose`, `structuring_solution`
- **Visuals:** `visuals_ideation`, `visuals_planning`, `visuals_sketching`
- **Solutioning:** `solutioning_analysis`, `solutioning_structure`, `solutioning_stack`, `solutioning_enhance`, `solutioning_formatting`
- **Pushing:** `push_structuring_to_visuals`, `push_visuals_to_solutioning`, `push_solutioning_to_sow`, `sow_push_to_loe`
- **PDF:** `pdf_solutioning`, `pdf_sow`, `pdf_loe`

### **Usage Middleware (`src/lib/middleware/usage-middleware.ts`)**
```typescript
await withUsageTracking(request, orgId, {
  eventType: 'structuring_diagnose',
  eventData: { complexity: 'high' },
  sessionId: sessionId
})
// Returns: { creditsConsumed, remainingCredits, limitWarning, usageEventId }
```

---

## **🤖 AI INTEGRATION (LangChain + LangSmith)**

### **Architecture**
- **LangSmith Hub:** All prompts stored in LangSmith
- **Prompt Variables:** Dynamic injection of preferences
- **Organization Preferences:** Cached for 5 minutes

### **Preferences Integration**
All AI functions accept optional `organizationId`:
```typescript
await analyzePainPoints(request, organizationId?)
// Fetches org preferences from cache
// Injects: general_approach, diagnose_preferences, etc.
```

### **Caching System (`src/lib/langchain/preferences-cache.ts`)**
- **TTL:** 5 minutes
- **Auto-invalidation:** On preference updates
- **Fallbacks:** Empty strings if no preferences

### **LangSmith Prompts (13 total):**
1. `nexa-structuring-diagnose`
2. `nexa-structuring-echo`
3. `nexa-structuring-solution`
4. `nexa-structuring-traceback`
5. `nexa-visuals-ideation`
6. `nexa-visuals-planning`
7. `nexa-visuals-sketching`
8. `nexa-solutioning-analysis`
9. `nexa-solutioning-structure`
10. `nexa-solutioning-stack`
11. `nexa-solutioning-enhance`
12. `nexa-solutioning-formatting`
13. `nexa-push-tosow`
14. `nexa-push-toloe`

---

## **📄 PDF GENERATION SYSTEM**

### **Architecture**
- **Python Microservice:** Flask + WeasyPrint + Jinja2
- **Location:** `/pdf-service/`
- **Communication:** Next.js API → Python subprocess
- **Templates:** Jinja2 HTML templates

### **PDF Types:**
1. **Solutioning PDF:**
   - Main logo on cover
   - Secondary logo in headers
   - Script: `generate_solutioning_standalone.py`

2. **SOW PDF:**
   - Secondary logo in headers
   - Script: `generate_sow_standalone.py`

3. **LOE PDF:**
   - Secondary logo in headers
   - Script: `generate_loe_standalone.py`

### **Logo Integration (Phase 4)**
- Logos fetched from `organization_preferences`
- Passed as Base64 to Python scripts
- Multi-layer fallbacks to default logos
- Graceful error handling at each layer

### **API Routes:**
- `/api/solutioning/generate-pdf` - Download
- `/api/solutioning/preview-pdf` - Preview
- `/api/sow/generate-pdf` - Download
- `/api/sow/preview-pdf` - Preview
- `/api/loe/generate-pdf` - Download
- `/api/loe/preview-pdf` - Preview

---

## **🎨 BACKDROP SYSTEM (Organization Preferences)**

### **Purpose**
Central configuration hub for organizations to:
- Upload custom logos (main + secondary)
- Define AI generation preferences
- Set stage-specific and pushing preferences

### **Database Table:** `organization_preferences`
```sql
- main_logo (TEXT Base64, 5MB max)
- second_logo (TEXT Base64, 5MB max)
- general_approach (TEXT, 5000 chars max)
- structuring_preferences (JSONB)
- visuals_preferences (JSONB)
- solutioning_preferences (JSONB)
- pushing_preferences (JSONB)
- change_history (JSONB array - audit trail)
```

### **RBAC:**
- **View:** All org members
- **Edit:** Owner and Admin only (enforced in UI and API)

### **Frontend:** `/grid` page, Backdrop tab
### **API:** `/api/organizations/[orgId]/preferences`
### **Hook:** `usePreferences()` custom hook

---

## **🔄 SESSION MANAGEMENT**

### **Session Model (`ai_architecture_sessions`)**
- **Identifier:** `uuid` (external), `id` (internal)
- **Ownership:** `user_id` + `organization_id`
- **Data Fields:**
  - `session_objects` - Structuring + Solutioning
  - `sow_objects` - SOW data
  - `loe_objects` - LOE data
  - `diagram_texts_json` - Visuals text
  - `visual_assets_json` - Visuals assets
  - `access_permissions` - Granular RBAC (JSONB)

### **Access Control (`src/lib/session-access-control.ts`)**
```typescript
canUserAccessSession(session, userId, role)
// Checks: creator, organization membership, explicit permissions
```

### **API Endpoints:**
- `GET /api/sessions` - List sessions with access control
- `GET /api/sessions/[uuid]` - Get session with access check
- `POST /api/sessions` - Create session
- `PUT /api/sessions/[uuid]` - Update session
- `DELETE /api/sessions/[uuid]` - Delete session (creator only)

---

## **🌐 API ROUTING PATTERNS**

### **Organization-Scoped Endpoints**
Pattern: `/api/organizations/[orgId]/...`

Examples:
- `/api/organizations/[orgId]/preferences` - Backdrop
- `/api/organizations/[orgId]/structuring/analyze-pain-points`
- `/api/organizations/[orgId]/visuals/generate-planning`
- `/api/organizations/[orgId]/solutioning/generate-sow`
- `/api/organizations/[orgId]/sow/generate-loe`

**All include:**
1. RBAC check with `requireOrganizationAccess()`
2. Usage tracking with `withUsageTracking()`
3. Organization ID passed to AI functions
4. Error handling and logging

### **Session-Scoped Endpoints**
Pattern: `/api/organizations/[orgId]/sessions/[uuid]/...`

Examples:
- `/api/organizations/[orgId]/sessions/[uuid]/add-visuals` - Push to visuals
- `/api/organizations/[orgId]/sessions/[uuid]/add-solutioning` - Push to solutioning

---

## **📁 KEY FILE LOCATIONS**

### **Frontend Pages**
- `/src/app/structuring/page.tsx` - Problem analysis
- `/src/app/visuals/page.tsx` - Visual diagrams
- `/src/app/solutioning/page.tsx` - Solution docs
- `/src/app/sow/page.tsx` - Statement of Work
- `/src/app/loe/page.tsx` - Level of Effort
- `/src/app/grid/page.tsx` - Dashboard + Backdrop

### **Core Libraries**
- `/src/lib/auth.ts` - Authentication
- `/src/lib/api-rbac.ts` - RBAC system
- `/src/lib/prisma.ts` - Database client
- `/src/lib/session-access-control.ts` - Session permissions

### **LangChain**
- `/src/lib/langchain/structuring.ts` - Structuring AI
- `/src/lib/langchain/visuals.ts` - Visuals AI
- `/src/lib/langchain/solutioning.ts` - Solutioning AI
- `/src/lib/langchain/preferences-cache.ts` - Preferences caching

### **Usage Tracking**
- `/src/lib/middleware/usage-middleware.ts` - Tracking middleware
- `/src/lib/usage/usage-tracker.ts` - Core tracker
- `/src/lib/config/event-registry.ts` - Event definitions
- `/src/lib/config/plan-registry.ts` - Plan definitions

### **Preferences (Backdrop)**
- `/src/lib/preferences/preferences-service.ts` - Business logic
- `/src/lib/preferences/image-utils.ts` - Image handling
- `/src/hooks/use-preferences.ts` - React hook
- `/src/app/api/organizations/[orgId]/preferences/route.ts` - API

---

## **🚨 CRITICAL PATTERNS TO FOLLOW**

### **1. Organization-Scoped API Routes**
```typescript
export async function POST(
  request: NextRequest,
  { params }: { params: { orgId: string } }
) {
  const { orgId } = params
  
  // 1. RBAC check
  const roleInfo = await requireOrganizationAccess(request, orgId)
  if (!roleInfo) {
    return NextResponse.json({ error: 'Access denied' }, { status: 403 })
  }
  
  // 2. Usage tracking
  const trackingResult = await withUsageTracking(request, orgId, {
    eventType: 'event_type',
    eventData: { /* ... */ }
  })
  
  // 3. Call AI with org preferences
  const result = await aiFunction(data, orgId)
  
  // 4. Return with usage data
  return NextResponse.json({
    success: true,
    data: result.data,
    usage: {
      creditsConsumed: trackingResult.creditsConsumed,
      remainingCredits: trackingResult.remainingCredits,
      usageEventId: trackingResult.usageEventId,
      warning: trackingResult.limitWarning
    }
  })
}
```

### **2. Frontend Organization Context**
```typescript
const { selectedOrganization } = useUser()
const orgId = selectedOrganization?.organization.id

// Always use organization.id, NOT selectedOrganization.id
// selectedOrganization.id is the MEMBERSHIP ID
// selectedOrganization.organization.id is the ORG ID
```

### **3. AI Function with Preferences**
```typescript
export async function aiFunction(
  request: Request,
  organizationId?: string
): Promise<Response> {
  // Fetch cached preferences
  const prefs = organizationId 
    ? await getCachedPreferences(organizationId)
    : { generalApproach: '', specific: { field: '' } }
  
  // Invoke LangSmith prompt with preferences
  const result = await promptTemplate.invoke({
    input: request.input,
    general_approach: prefs.generalApproach || '',
    specific_preference: prefs.specific?.field || ''
  })
  
  return result
}
```

---

## **🐛 COMMON BUGS & FIXES**

### **1. Organization ID Mismatch**
**Bug:** Using `selectedOrganization.id` instead of `selectedOrganization.organization.id`  
**Fix:** Always use `selectedOrganization.organization.id` for org ID

### **2. Missing RBAC Check**
**Bug:** Forgetting to add RBAC to new endpoints  
**Fix:** Always use `requireOrganizationAccess()` or similar

### **3. Missing Usage Tracking**
**Bug:** AI endpoints without usage tracking  
**Fix:** Add `withUsageTracking()` before AI calls

### **4. Missing Organization Preferences**
**Bug:** AI functions not passing `organizationId`  
**Fix:** Add `organizationId?` parameter and fetch preferences

---

## **📝 RECENT IMPLEMENTATIONS**

### **Latest (Oct 1, 2025):**
1. ✅ Fixed organization ID mismatch in `use-preferences.ts`
2. ✅ Recreated missing `/api/organizations/[orgId]/sow/generate-loe/route.ts`
3. ✅ Added RBAC, usage tracking, and org preferences to LOE generation

### **Recent Major Features:**
1. ✅ **Backdrop System (4 Phases)** - Complete organization preferences
2. ✅ **Usage Tracking** - Full billing and limits system
3. ✅ **PDF Integration** - Custom logos in all PDFs
4. ✅ **Session Access Control** - Granular permissions
5. ✅ **Multi-Organization Support** - Complete multi-tenancy

---

## **🎯 NEXT STEPS / TODO**

### **Immediate:**
- [ ] Test Backdrop end-to-end (all 4 phases)
- [ ] Test SOW → LOE push with new endpoint
- [ ] Verify usage tracking on all endpoints

### **Future Enhancements:**
- [ ] Real-time collaboration (WebSockets)
- [ ] Session sharing (public links)
- [ ] Advanced analytics dashboard
- [ ] API access for enterprise plans
- [ ] Custom branding themes (beyond logos)

---

## **📚 DOCUMENTATION FILES**

### **Implementation Plans:**
- `BACKDROP-TAB-IMPLEMENTATION-PLAN.md`
- `nexa-usage-tracking-implementation-plan.md`
- `NEXA-Organization-Management-Plan.md`

### **Phase Completions:**
- `BACKDROP-PHASE-1-COMPLETE.md` - Database & Backend
- `BACKDROP-PHASE-2-COMPLETE.md` - Frontend Integration
- `BACKDROP-PHASE-3-COMPLETE.md` - Prompt Integration
- `BACKDROP-PHASE-4-COMPLETE.md` - PDF Integration
- `BACKDROP-COMPLETE-SUMMARY.md` - Overall summary

### **Testing:**
- `BACKDROP-END-TO-END-TESTING-GUIDE.md`

### **Bug Fixes:**
- `BACKDROP-ORGID-BUG-FIX-ANALYSIS.md` - Org ID mismatch fix

---

**🎉 Repository Expertise: COMPLETE**

I now have comprehensive knowledge of:
- ✅ Architecture and technology stack
- ✅ Database schema and relationships
- ✅ Authentication and RBAC system
- ✅ Complete workflow pipeline
- ✅ AI integration and preferences
- ✅ Usage tracking and billing
- ✅ PDF generation system
- ✅ API routing patterns
- ✅ Common bugs and solutions
- ✅ Recent implementations

**Ready for any task! 💪**

