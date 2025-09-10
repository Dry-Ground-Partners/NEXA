# Structuring → Visuals Workflow Implementation Plan

## 🎯 Vision Overview

Create a seamless workflow transition from `/structuring` to `/visuals` where:
1. User completes problem structuring and solution generation in `/structuring`
2. In Solution tab, instead of "Next" button, show "To visuals →" button  
3. Clicking transfers solutions to visual diagrams in `/visuals`
4. Each solution becomes a diagram with the solution text as "ideation"
5. User is redirected to `/visuals` with diagrams pre-populated for visual work

## 📊 Data Structure Analysis

### Current Structuring Data (`diagram_texts_json`)
```typescript
interface StructuringSessionData {
  basic: {
    date: string
    engineer: string  
    title: string
    client: string
  }
  solutionTabs: {
    id: number
    text: string  // ← This becomes ideation in visuals
  }[]
  // ... other fields
}
```

### Target Visuals Data (`visual_assets_json`)
```typescript
interface VisualsSessionData {
  basic: {
    date: string
    engineer: string
    title: string
    client: string
  }
  diagramSets: {
    id: number
    ideation: string     // ← Populated from solution text
    planning: string     // ← Empty initially
    sketch: string       // ← Empty initially  
    image: string | null // ← Empty initially
    expandedContent: string
    isExpanded: boolean
  }[]
  uiState: {
    activeDiagramTab: number
    activeMainTab: string
  }
}
```

## 🔍 Current State Analysis

### Location of Implementation
- **File**: `src/app/structuring/page.tsx`
- **Current Next Button**: Lines 1035-1045
- **Condition**: Only shows when `activeMainTab !== 'solution'`
- **Current Logic**: 
  ```typescript
  {activeMainTab !== 'solution' ? (
    <Button onClick={handleNextTab}>Next <ArrowRight /></Button>
  ) : (
    <div />  // ← Replace this with "To visuals →" button
  )}
  ```

### Required Changes
1. **Replace Empty Div**: When on solution tab, show "To visuals →" button
2. **Create Handler**: `handleTransitionToVisuals()` function
3. **Data Mapping**: Transform `solutionTabs` to `diagramSets`
4. **Database Update**: Add `visual_assets_json` to same row
5. **Navigation**: Redirect to `/visuals?session=uuid`

## 🔧 Implementation Plan

### Phase 1: UI Changes in Structuring Page

**File**: `src/app/structuring/page.tsx`

1. **Add Import**: 
   ```typescript
   import { createDefaultVisualsData } from '@/lib/sessions'
   ```

2. **Replace Next Button Logic**:
   ```typescript
   {activeMainTab !== 'solution' ? (
     <Button onClick={handleNextTab}>Next <ArrowRight /></Button>
   ) : (
     <Button onClick={handleTransitionToVisuals} className="bg-blue-600 text-white hover:bg-blue-700">
       To visuals <ArrowRight />
     </Button>
   )}
   ```

### Phase 2: Create Transition Handler

**Function**: `handleTransitionToVisuals()`

```typescript
const handleTransitionToVisuals = async () => {
  if (!sessionId) {
    alert('Please save your session first before transitioning to visuals.')
    return
  }

  setSaving(true) // Use existing saving state for UI feedback
  
  try {
    // 1. Get current structuring data
    const currentStructuringData = collectCurrentData()
    
    // 2. Create visuals data structure
    const visualsData = createVisualsDataFromStructuring(currentStructuringData)
    
    // 3. Update same session row with visual data
    const response = await fetch(`/api/sessions/${sessionId}/add-visuals`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ visualsData })
    })
    
    const result = await response.json()
    
    if (result.success) {
      // 4. Navigate to visuals with session loaded
      window.location.href = `/visuals?session=${sessionId}`
    } else {
      alert('Failed to transition to visuals. Please try again.')
    }
  } catch (error) {
    console.error('Error transitioning to visuals:', error)
    alert('Error transitioning to visuals. Please try again.')
  } finally {
    setSaving(false)
  }
}
```

### Phase 3: Data Transformation Function

**Function**: `createVisualsDataFromStructuring()`

```typescript
const createVisualsDataFromStructuring = (structuringData: StructuringSessionData): VisualsSessionData => {
  return {
    // Copy basic information
    basic: {
      date: structuringData.basic.date,
      engineer: structuringData.basic.engineer,
      title: structuringData.basic.title,
      client: structuringData.basic.client
    },
    
    // Transform solutions to diagram sets
    diagramSets: structuringData.solutionTabs
      .filter(tab => tab.text.trim() !== '') // Only include non-empty solutions
      .map((solution, index) => ({
        id: index + 1,
        ideation: solution.text,        // ← Solution becomes ideation
        planning: '',                   // ← Empty for user to fill
        sketch: '',                     // ← Empty for user to fill
        image: null,                    // ← Empty for user to upload
        expandedContent: '',
        isExpanded: false
      })),
    
    // Default UI state
    uiState: {
      activeDiagramTab: 1,
      activeMainTab: 'diagrams'
    },
    
    // Metadata
    lastSaved: new Date().toISOString(),
    version: 1
  }
}
```

### Phase 4: API Route Creation

**File**: `src/app/api/sessions/[uuid]/add-visuals/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateSessionWithVisuals } from '@/lib/sessions-server'

export async function PUT(
  request: NextRequest,
  { params }: { params: { uuid: string } }
) {
  try {
    const body = await request.json()
    const { visualsData } = body
    
    if (!visualsData) {
      return NextResponse.json(
        { success: false, error: 'Visual data is required' },
        { status: 400 }
      )
    }
    
    console.log(`📝 Adding visuals to session: ${params.uuid}`)
    
    const success = await updateSessionWithVisuals(params.uuid, visualsData)
    
    if (success) {
      return NextResponse.json({ success: true })
    } else {
      return NextResponse.json(
        { success: false, error: 'Failed to add visuals to session' },
        { status: 500 }
      )
    }
  } catch (error) {
    console.error('Error adding visuals to session:', error)
    return NextResponse.json(
      { success: false, error: 'Internal server error' },
      { status: 500 }
    )
  }
}
```

### Phase 5: Database Function

**File**: `src/lib/sessions-server.ts`

**Function**: `updateSessionWithVisuals()`

```typescript
export async function updateSessionWithVisuals(
  sessionId: string,
  visualsData: VisualsSessionData
): Promise<boolean> {
  try {
    const user = await getCurrentUser()
    if (!user) {
      throw new Error('User not authenticated')
    }

    await prisma.aIArchitectureSession.update({
      where: {
        uuid: sessionId,
        userId: user.id
      },
      data: {
        visualAssetsJson: visualsData as any, // Add to visual_assets_json column
        updatedAt: new Date()
      }
    })

    console.log('✅ Successfully added visuals to session')
    return true
  } catch (error) {
    console.error('Error updating session with visuals:', error)
    return false
  }
}
```

### Phase 6: Visuals Page Enhancement

**File**: `src/app/visuals/page.tsx`

Ensure the visuals page can:
1. ✅ Load session from URL parameter (should already work)
2. ✅ Display pre-populated ideation content from solutions
3. ✅ Allow user to work on planning, sketch, and images

## 🧪 Testing Strategy

### Test Cases

1. **Basic Transition**:
   - Create structuring session with 3 solutions
   - Click "To visuals →" button
   - Verify redirect to `/visuals?session=uuid`
   - Verify 3 diagram tabs with solution text as ideation

2. **Data Persistence**:
   - Verify visuals data saves to `visual_assets_json` column
   - Verify original structuring data remains in `diagram_texts_json`
   - Verify same UUID is used for both

3. **Edge Cases**:
   - Empty solutions (should create 1 empty diagram)
   - Unsaved session (should prompt to save first)
   - Network errors (should show error message)

4. **User Experience**:
   - Loading states during transition
   - Clear success/error feedback
   - Seamless navigation experience

## 🎯 Expected Outcomes

After implementation:

1. ✅ **Seamless Workflow**: Users can transition from structuring to visuals with one click
2. ✅ **Data Continuity**: Solutions become diagram ideations automatically  
3. ✅ **Efficiency**: No manual copying of solution text
4. ✅ **Organization**: Both structuring and visuals data live in same session row
5. ✅ **Scalability**: Pattern can be extended to other page transitions

## 🚀 Implementation Priority

1. **High**: UI changes and transition handler (Core functionality)
2. **High**: Data transformation logic (Critical for correct mapping)
3. **High**: API route and database function (Required for persistence)
4. **Medium**: Error handling and user feedback (Polish)
5. **Low**: Advanced features like selective solution transfer

This implementation will create a professional, integrated workflow that significantly improves user experience and productivity in the application.
