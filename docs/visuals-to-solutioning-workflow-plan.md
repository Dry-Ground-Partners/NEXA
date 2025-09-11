# Visuals → Solutioning Workflow Implementation Plan

## 🎯 Vision Overview

Create a seamless workflow transition from `/visuals` to `/solutioning` where:
1. User completes visual diagramming with images and ideation text in `/visuals`
2. In visuals page, show "To solutioning →" button (glass-styled like grid Push button)
3. Clicking transfers each image+ideation pair to solutioning as individual solution tabs
4. Each image is automatically uploaded, analyzed by AI, and structured as a solution
5. User is redirected to `/solutioning` with all solutions pre-structured

## 📊 Data Structure Analysis

### Current Visuals Data (`visual_assets_json`)
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
    ideation: string      // ← Becomes solutionExplanation
    planning: string      
    sketch: string        
    image: string | null  // ← Base64 data for AI analysis
    expandedContent: string
    isExpanded: boolean
  }[]
}
```

### Target Solutioning Data (`session_objects`)
```typescript
interface SolutioningSessionData {
  basic: {
    date: string
    engineer: string
    title: string
    recipient: string
  }
  currentSolution: number
  solutionCount: number
  solutions: {
    [key: number]: {
      id: number
      additional: {
        imageData: string | null    // ← From visuals.image
        imageUrl: string | null     // ← ImgBB upload result
      }
      variables: {
        aiAnalysis: string          // ← AI analysis result
        solutionExplanation: string // ← From visuals.ideation
      }
      structure: {
        title: string               // ← Auto-structured
        steps: string               // ← Auto-structured  
        approach: string            // ← Auto-structured
        difficulty: number
        layout: number
        stack: string
      }
    }
  }
}
```

## 🔍 Existing Functionality Analysis

### **📤 Image Upload Process** (from solutioning/page.tsx):
```typescript
// 1. File validation (type, size)
// 2. Upload to ImgBB via /api/solutioning/upload-image
// 3. Create base64 for vision analysis
// 4. Auto-trigger triggerVisionAnalysis()
```

### **🤖 AI Vision Analysis** (from solutioning/page.tsx):
```typescript
const triggerVisionAnalysis = async (base64Data: string) => {
  // Calls /api/solutioning/analyze-vision with base64 image
  // Returns AI analysis of the image
  // Updates variables.aiAnalysis
}
```

### **🏗️ Structure Solution** (from solutioning/page.tsx):
```typescript
const structureSolution = async () => {
  // Uses explanation + analysis as input
  // Calls /api/solutioning/structure-solution  
  // Auto-populates structure.title, steps, approach
}
```

### **🔧 Glass Button Styling** (from grid/page.tsx):
```css
className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-slate-600/60 to-blue-600/60 hover:from-slate-500/70 hover:to-blue-500/70 border border-slate-500/50 hover:border-slate-400/60 text-white text-sm font-medium rounded-lg backdrop-blur-sm transition-all duration-200 hover:shadow-lg"
```

## 🔄 Workflow Implementation Strategy

### **Phase 1: UI Enhancement**
**File**: `src/app/visuals/page.tsx`

1. **Add Glass-Style Button**:
   ```typescript
   // Add after existing navigation buttons
   {activeMainTab === 'diagrams' && hasDiagramsWithImages() && (
     <Button 
       onClick={handleTransitionToSolutioning}
       disabled={saving}
       className="bg-gradient-to-r from-slate-600/60 to-blue-600/60 hover:from-slate-500/70 hover:to-blue-500/70 border border-slate-500/50 hover:border-slate-400/60 text-white backdrop-blur-sm transition-all duration-200 hover:shadow-lg"
     >
       {saving ? (
         <>
           <RotateCw className="h-4 w-4 mr-2 animate-spin" />
           Processing...
         </>
       ) : (
         <>
           To solutioning
           <ArrowRight className="h-4 w-4 ml-2" />
         </>
       )}
     </Button>
   )}
   ```

2. **Helper Function**:
   ```typescript
   const hasDiagramsWithImages = () => {
     return diagramSets.some(set => 
       set.image && set.image.trim() !== '' && 
       set.ideation && set.ideation.trim() !== ''
     )
   }
   ```

### **Phase 2: Data Transformation & Processing**
**Function**: `handleTransitionToSolutioning()`

```typescript
const handleTransitionToSolutioning = async () => {
  if (!sessionId) {
    alert('Please save your session first before transitioning to solutioning.')
    return
  }

  setSaving(true)
  
  try {
    // 1. Filter diagrams with both image and ideation
    const validDiagrams = diagramSets.filter(set => 
      set.image && set.image.trim() !== '' && 
      set.ideation && set.ideation.trim() !== ''
    )
    
    if (validDiagrams.length === 0) {
      alert('Please add at least one image with ideation text before transitioning.')
      return
    }

    // 2. Create solutioning data structure
    const solutioningData = createSolutioningDataFromVisuals(validDiagrams)
    
    // 3. Create new solutioning session
    const response = await fetch('/api/sessions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sessionType: 'solutioning',
        data: solutioningData
      })
    })
    
    const result = await response.json()
    
    if (result.success) {
      // 4. Start automation process
      await automateImageProcessing(result.session.uuid, validDiagrams)
      
      // 5. Navigate to solutioning
      window.location.href = `/solutioning?session=${result.session.uuid}`
    }
  } catch (error) {
    console.error('Error transitioning to solutioning:', error)
    alert('Error transitioning to solutioning. Please try again.')
  } finally {
    setSaving(false)
  }
}
```

### **Phase 3: Data Transformation Function**

```typescript
const createSolutioningDataFromVisuals = (validDiagrams: DiagramSet[]): SolutioningSessionData => {
  const solutions: { [key: number]: Solution } = {}
  
  validDiagrams.forEach((diagram, index) => {
    const solutionId = index + 1
    solutions[solutionId] = {
      id: solutionId,
      additional: {
        imageData: diagram.image,  // Base64 image data
        imageUrl: null            // Will be populated after ImgBB upload
      },
      variables: {
        aiAnalysis: '',           // Will be populated after AI analysis
        solutionExplanation: diagram.ideation // Use ideation as explanation
      },
      structure: {
        title: '',               // Will be auto-structured
        steps: '',               // Will be auto-structured
        approach: '',            // Will be auto-structured
        difficulty: 3,           // Default
        layout: 1,               // Default
        stack: ''                // Will be generated later
      }
    }
  })

  return {
    basic: {
      date: date,
      engineer: engineer,
      title: title,
      recipient: client  // Map client to recipient
    },
    currentSolution: 1,
    solutionCount: validDiagrams.length,
    solutions,
    uiState: {
      activeMainTab: 'solution-1',
      activeSubTab: 'additional'
    },
    lastSaved: new Date().toISOString(),
    version: 1
  }
}
```

### **Phase 4: Automation Process**
**Function**: `automateImageProcessing()`

```typescript
const automateImageProcessing = async (sessionId: string, diagrams: DiagramSet[]) => {
  // Process each diagram sequentially to avoid API overload
  for (let i = 0; i < diagrams.length; i++) {
    const diagram = diagrams[i]
    const solutionId = i + 1
    
    console.log(`🔄 Processing solution ${solutionId}/${diagrams.length}...`)
    
    try {
      // 1. Upload image to ImgBB
      const uploadResult = await uploadImageToImgBB(diagram.image)
      
      // 2. Trigger AI vision analysis
      const analysisResult = await performVisionAnalysis(diagram.image)
      
      // 3. Structure the solution
      const structureResult = await structureSolutionAuto(
        diagram.ideation,  // solutionExplanation
        analysisResult     // aiAnalysis
      )
      
      // 4. Update session with processed data
      await updateSolutionInSession(sessionId, solutionId, {
        imageUrl: uploadResult.imageUrl,
        aiAnalysis: analysisResult,
        ...structureResult
      })
      
    } catch (error) {
      console.error(`❌ Error processing solution ${solutionId}:`, error)
      // Continue with next solution
    }
  }
  
  console.log('✅ All solutions processed!')
}
```

### **Phase 5: Helper API Functions**

```typescript
const uploadImageToImgBB = async (base64Image: string) => {
  // Convert base64 to blob
  const response = await fetch(base64Image)
  const blob = await response.blob()
  
  // Create FormData
  const formData = new FormData()
  formData.append('image', blob)
  
  // Upload to ImgBB
  const uploadResponse = await fetch('/api/solutioning/upload-image', {
    method: 'POST',
    body: formData
  })
  
  return await uploadResponse.json()
}

const performVisionAnalysis = async (base64Image: string) => {
  const response = await fetch('/api/solutioning/analyze-vision', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ base64Image })
  })
  
  const result = await response.json()
  return result.analysis
}

const structureSolutionAuto = async (explanation: string, analysis: string) => {
  const response = await fetch('/api/solutioning/structure-solution', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ explanation, analysis })
  })
  
  const result = await response.json()
  return {
    title: result.title,
    steps: result.steps,
    approach: result.approach
  }
}
```

### **Phase 6: Session Update API**
**File**: `src/app/api/solutioning/update-solution/route.ts` (NEW)

```typescript
import { NextRequest, NextResponse } from 'next/server'
import { updateSolutioningSession, getSession } from '@/lib/sessions-server'

export async function PUT(request: NextRequest) {
  try {
    const { sessionId, solutionId, updates } = await request.json()
    
    // Get current session data
    const session = await getSession(sessionId)
    if (!session) {
      return NextResponse.json({ success: false, error: 'Session not found' })
    }
    
    const sessionData = session.data
    
    // Update specific solution
    sessionData.solutions[solutionId] = {
      ...sessionData.solutions[solutionId],
      additional: {
        ...sessionData.solutions[solutionId].additional,
        imageUrl: updates.imageUrl
      },
      variables: {
        ...sessionData.solutions[solutionId].variables,
        aiAnalysis: updates.aiAnalysis
      },
      structure: {
        ...sessionData.solutions[solutionId].structure,
        title: updates.title,
        steps: updates.steps,
        approach: updates.approach
      }
    }
    
    // Save updated session
    const success = await updateSolutioningSession(sessionId, sessionData)
    
    return NextResponse.json({ success })
  } catch (error) {
    return NextResponse.json({ success: false, error: error.message })
  }
}
```

## 🧪 Testing Strategy

### **Test Cases**

1. **Basic Transition**:
   - Create visuals session with 2 diagrams (both have image + ideation)
   - Click "To solutioning →" button
   - Verify redirect to `/solutioning?session=uuid`
   - Verify 2 solution tabs created

2. **Automation Process**:
   - Verify images upload to ImgBB
   - Verify AI analysis runs for each image
   - Verify solutions get structured automatically
   - Verify all data saves correctly

3. **Edge Cases**:
   - Diagrams with only images (no ideation) - should be skipped
   - Diagrams with only ideation (no images) - should be skipped
   - Empty diagrams - should be skipped
   - Network errors during automation

4. **UI/UX**:
   - Glass button styling matches grid Push button
   - Loading states during processing
   - Error handling and user feedback

## 🎯 Expected Outcomes

After implementation:

1. ✅ **Complete Workflow Chain**: Structuring → Visuals → Solutioning
2. ✅ **Automated Processing**: Images auto-uploaded, analyzed, and structured
3. ✅ **Seamless UX**: One-click transition with visual feedback
4. ✅ **Data Integrity**: All visual ideations become solution explanations
5. ✅ **Efficiency**: No manual copying of images or text

## 🚀 Implementation Priority

1. **High**: Glass button styling and basic transition handler
2. **High**: Data transformation and solutioning session creation
3. **High**: Image upload and AI analysis automation
4. **Medium**: Solution structuring automation
5. **Medium**: Progress feedback and error handling
6. **Low**: Advanced features like selective diagram transfer

This implementation will complete the workflow trilogy and provide a truly integrated experience for users moving from problem identification → visual design → solution development.


