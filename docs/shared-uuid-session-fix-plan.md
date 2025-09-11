# Shared UUID Session Data Access Fix Plan

## 🎯 Problem Analysis

### **Current Broken Behavior:**
```
UUID: 4b058ec9-6547-4e52-a507-552c0519a0b8
├── sessionType: "structuring" (original type)
├── diagram_texts_json: {structuring data} ✅
└── visual_assets_json: {visuals data} ✅

/structuring?session=UUID → API returns structuring data (works)
/visuals?session=UUID → API returns structuring data (BROKEN!)
```

### **Root Cause:**
The API's `getSession()` function returns data based on the session's **original type** (`session.sessionType`), not based on what the **requesting page** actually needs.

```typescript
// CURRENT FLAWED LOGIC:
if (sessionType === 'structuring' && isValidContent(session.diagramTextsJson)) {
  data = session.diagramTextsJson  // Always returns this for 'structuring' sessions
}
```

### **User's Vision (Correct):**
- **Same UUID** should work for multiple page types
- **Each page** gets the data type it expects  
- `/structuring?session=UUID` → structuring data
- `/visuals?session=UUID` → visuals data

## 🔧 Solution Strategy

### **Approach: Request-Context-Based Data Selection**

Instead of returning data based on session's original type, return data based on **what the requesting page needs**.

### **Implementation Options:**

#### **Option A: URL Query Parameter** ⭐ **RECOMMENDED**
```
GET /api/sessions/UUID?type=structuring → structuring data
GET /api/sessions/UUID?type=visuals → visuals data
```

#### **Option B: HTTP Header**
```
GET /api/sessions/UUID
Header: X-Requested-Data-Type: structuring
```

#### **Option C: Separate Endpoints**
```
GET /api/sessions/UUID/structuring → structuring data  
GET /api/sessions/UUID/visuals → visuals data
```

**We'll go with Option A (query parameter) for simplicity and clarity.**

## 📋 Implementation Plan

### **Phase 1: API Route Enhancement**

**File**: `src/app/api/sessions/[uuid]/route.ts`

**Current**:
```typescript
export async function GET(request: NextRequest, { params }) {
  const session = await getSession(params.uuid)
  // Returns data based on session.sessionType
}
```

**New**:
```typescript
export async function GET(request: NextRequest, { params }) {
  const { searchParams } = new URL(request.url)
  const requestedDataType = searchParams.get('type') // Get ?type=visuals
  
  const session = await getSession(params.uuid, requestedDataType)
  // Returns data based on requestedDataType
}
```

### **Phase 2: Smart Data Selection Logic**

**File**: `src/lib/sessions-server.ts`

**Enhanced `getSession()` function:**

```typescript
export async function getSession(
  sessionId: string,
  requestedDataType?: string  // NEW: What data type is being requested
): Promise<SessionResponse | null> {
  try {
    const user = await getCurrentUser()
    if (!user) throw new Error('User not authenticated')

    const session = await prisma.aIArchitectureSession.findFirst({
      where: { uuid: sessionId, userId: user.id, deletedAt: null }
    })

    if (!session) return null

    // NEW LOGIC: Return data based on what's being requested
    let data = null
    let sessionType = 'structuring' // fallback

    if (requestedDataType) {
      // Explicit request for specific data type
      if (requestedDataType === 'structuring' && isValidContent(session.diagramTextsJson)) {
        data = session.diagramTextsJson
        sessionType = 'structuring'
        console.log('📊 API: Returning requested structuring data')
      } else if (requestedDataType === 'visuals' && isValidContent(session.visualAssetsJson)) {
        data = session.visualAssetsJson
        sessionType = 'visuals'
        console.log('📊 API: Returning requested visuals data')
      } else if (requestedDataType === 'solutioning' && isValidContent(session.sessionObjects)) {
        data = session.sessionObjects
        sessionType = 'solutioning'
        console.log('📊 API: Returning requested solutioning data')
      } else if (requestedDataType === 'sow' && isValidContent(session.sowObjects)) {
        data = session.sowObjects
        sessionType = 'sow'
        console.log('📊 API: Returning requested SOW data')
      } else if (requestedDataType === 'loe' && isValidContent(session.loeObjects)) {
        data = session.loeObjects
        sessionType = 'loe'
        console.log('📊 API: Returning requested LOE data')
      }
    }

    // Fallback: Use original session type logic if no specific request
    if (!data) {
      const originalType = session.sessionType || 'structuring'
      if (originalType === 'structuring' && isValidContent(session.diagramTextsJson)) {
        data = session.diagramTextsJson
        sessionType = 'structuring'
        console.log('📊 API: Fallback to original structuring data')
      } else if (originalType === 'visuals' && isValidContent(session.visualAssetsJson)) {
        data = session.visualAssetsJson
        sessionType = 'visuals'
        console.log('📊 API: Fallback to original visuals data')
      }
      // ... continue with other types
    }

    return {
      id: session.id.toString(),
      uuid: session.uuid,
      title: session.title,
      client: session.client,
      sessionType: sessionType,
      isTemplate: session.isTemplate,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      data: data
    }
  } catch (error) {
    console.error('Error getting session:', error)
    return null
  }
}
```

### **Phase 3: Frontend Request Updates**

**File**: `src/app/structuring/page.tsx`

**Current**:
```typescript
const response = await fetch(`/api/sessions/${sessionParam}`)
```

**New**:
```typescript
const response = await fetch(`/api/sessions/${sessionParam}?type=structuring`)
```

**File**: `src/app/visuals/page.tsx`

**Current**:
```typescript
const sessionResponse = await fetch(`/api/sessions/${sessionParam}`)
```

**New**:
```typescript
const sessionResponse = await fetch(`/api/sessions/${sessionParam}?type=visuals`)
```

### **Phase 4: Update All Page Types**

Apply the same pattern to:
- `/solutioning` → `?type=solutioning`
- `/sow` → `?type=sow`  
- `/loe` → `?type=loe`

## 🧪 Testing Strategy

### **Test Cases:**

1. **Shared UUID Access:**
   ```
   Session UUID: 4b058ec9-6547-4e52-a507-552c0519a0b8
   
   /structuring?session=UUID → Gets structuring data ✅
   /visuals?session=UUID → Gets visuals data ✅
   /solutioning?session=UUID → Gets solutioning data (if exists) ✅
   ```

2. **Backward Compatibility:**
   ```
   GET /api/sessions/UUID (no ?type) → Uses original sessionType logic ✅
   ```

3. **Error Handling:**
   ```
   GET /api/sessions/UUID?type=visuals → No visuals data exists → Fallback ✅
   ```

4. **Data Validation:**
   ```
   Each page validates data structure before loading ✅
   Invalid data → Graceful fallback or redirect ✅
   ```

## 🎯 Expected Outcomes

### **After Implementation:**

1. ✅ **Same UUID works across multiple pages**
2. ✅ **Each page gets appropriate data type**  
3. ✅ **Backward compatibility maintained**
4. ✅ **Clean, explicit API contract**
5. ✅ **No more session type conflicts**

### **User Experience:**

```
Workflow: Structuring → Visuals → Solutioning

1. Create session in /structuring → UUID: abc123
2. Transition to /visuals?session=abc123 → Gets visuals data
3. Return to /structuring?session=abc123 → Gets structuring data  
4. All pages work with same UUID! 🎯
```

## 🚀 Implementation Priority

1. **High**: API route query parameter support
2. **High**: Enhanced getSession() function with data type selection
3. **High**: Frontend request updates for structuring/visuals
4. **Medium**: Apply to solutioning/sow/loe pages
5. **Medium**: Comprehensive testing and validation

## 💡 Alternative Considerations

### **Future Enhancement: Smart Detection**
```typescript
// Could also detect page type from referer header
const referer = request.headers.get('referer')
if (referer?.includes('/visuals')) {
  requestedDataType = 'visuals'
}
```

### **Future Enhancement: Multiple Data Types**
```typescript
// Return all available data types for a session
GET /api/sessions/UUID?include=all
→ { structuring: {...}, visuals: {...}, solutioning: {...} }
```

This implementation provides a clean, scalable solution that allows the same UUID to be accessed by different page types while getting the appropriate data for each context.


