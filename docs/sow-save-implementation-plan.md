# SOW Save Implementation Plan

## Research Summary

After analyzing the save functionality in `/structuring`, `/visuals`, and `/solutioning` pages, I have identified the consistent patterns and implementation details needed for the SOW page.

## Current Save Implementation Pattern

### 1. State Management

All pages use the same save state pattern:

```typescript
const [saving, setSaving] = useState(false)
const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
const [lastSaved, setLastSaved] = useState<Date | null>(null)
const [sessionId, setSessionId] = useState<string | null>(null)
```

### 2. Data Collection

Each page has a `collectCurrentData()` function that structures the current form data:

```typescript
const collectCurrentData = useCallback((): SOWSessionData => {
  return {
    ...sessionData,
    lastSaved: new Date().toISOString(),
    version: (sessionData.version || 0) + 1
  }
}
```

### 3. Save Function Pattern

All pages use the same save function structure:

```typescript
const handleSave = async () => {
  setSaving(true)
  
  try {
    const currentData = collectCurrentData()
    
    if (sessionId) {
      // Update existing session
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: currentData,
          sessionType: 'sow'
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSessionData(currentData)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      } else {
        alert(`Failed to save session: ${result.error}`)
      }
    } else {
      // Create new session
      const response = await fetch('/api/sessions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionType: 'sow',
          data: currentData
        })
      })
      
      const result = await response.json()
      
      if (result.success) {
        setSessionId(result.sessionId)
        setSessionData(currentData)
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      }
    }
  } catch (error) {
    console.error('💥 Save error:', error)
    alert('Error saving session. Please try again.')
  } finally {
    setSaving(false)
  }
}
```

### 4. Auto-Save Implementation

Auto-save is triggered by form changes with debouncing:

```typescript
// Auto-save effect
useEffect(() => {
  if (!sessionId || saving || !hasUnsavedChanges) return
  
  const autoSaveTimer = setTimeout(async () => {
    try {
      const currentData = collectCurrentData()
      const response = await fetch(`/api/sessions/${sessionId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          data: currentData,
          sessionType: 'sow'
        })
      })
      
      const result = await response.json()
      if (result.success) {
        setHasUnsavedChanges(false)
        setLastSaved(new Date())
      }
    } catch (error) {
      console.error('❌ Auto-save failed:', error)
    }
  }, 3000) // 3-second debounce
  
  return () => clearTimeout(autoSaveTimer)
}, [sessionId, saving, hasUnsavedChanges, collectCurrentData])
```

## Save Button Animation

### CSS Classes and Animation

The save button uses sophisticated animations defined in `globals.css`:

```css
.save-button-saving {
  position: relative;
  overflow: hidden;
  animation: savePulse 1.5s ease-in-out infinite !important;
  box-shadow: inset 0 0 10px rgba(255, 255, 255, 0.3), 0 0 9px 3px rgba(255, 255, 255, 0.1) !important;
}

.save-button-saving .shimmer-text {
  color: #e5e7eb !important;
  animation: textShimmer 2s ease-in-out infinite !important;
}

.save-button-saving:before {
  content: "";
  position: absolute;
  left: -4em;
  width: 4em;
  height: 100%;
  top: 0;
  transition: none;
  animation: shimmerSlide 2s ease-in-out infinite;
  background: linear-gradient(to right, transparent 1%, rgba(255, 255, 255, 0.2) 40%, rgba(255, 255, 255, 0.2) 60%, transparent 100%);
}

@keyframes savePulse {
  0% { 
    background-color: rgba(255, 255, 255, 0.1);
    filter: blur(0px);
  }
  50% { 
    background-color: rgba(255, 255, 255, 0.25);
    filter: blur(1px);
  }
  100% { 
    background-color: rgba(255, 255, 255, 0.1);
    filter: blur(0px);
  }
}
```

### Button Structure

The save button follows this exact structure across all pages:

```tsx
<button
  onClick={handleSave}
  disabled={saving}
  className={`inline-flex items-center justify-center whitespace-nowrap px-6 py-3 text-sm font-medium transition-all border-t border-l border-r rounded-t-lg relative focus-visible:outline-none focus-visible:ring-2 mr-1 ${
    saving
      ? 'save-button-saving bg-white/10 text-white border-white'
      : hasUnsavedChanges 
        ? 'bg-yellow-500/20 text-yellow-400 border-yellow-500 hover:bg-yellow-500/30 focus-visible:ring-yellow-400/20' 
        : 'bg-white/10 text-white border-white hover:bg-white/20 focus-visible:ring-white/20'
  }`}
>
  {saving ? (
    <RotateCw className="h-4 w-4 mr-2 animate-spin" />
  ) : (
    <Save className="h-4 w-4 mr-2" />
  )}
  <span className={saving ? "shimmer-text" : ""}>
    {hasUnsavedChanges ? 'Save*' : 'Save'}
  </span>
</button>
```

## SOW Implementation Plan

### Phase 1: Basic Save Infrastructure

1. **Update SOW page state management**:
   - Add missing state variables (`saving`, `hasUnsavedChanges`, `lastSaved`)
   - Ensure `sessionId` and `sessionData` are properly managed

2. **Update `collectCurrentData()` function**:
   - Currently exists but needs to include version increment
   - Add proper timestamp for `lastSaved`

3. **Enhance `handleSave()` function**:
   - Currently exists but needs proper session management
   - Add error handling and user feedback
   - Follow the exact pattern from other pages

### Phase 2: Auto-Save Implementation

1. **Add auto-save effect**:
   - 3-second debounce timer
   - Only trigger when `hasUnsavedChanges` is true
   - Don't auto-save during manual save operations

2. **Track form changes**:
   - Update `hasUnsavedChanges` when any form field changes
   - Reset to false after successful save

### Phase 3: Save Button Integration

1. **Update button positioning**:
   - Place in tab navigation area (similar to other pages)
   - Position next to Delete button

2. **Add save button animations**:
   - Use existing CSS classes (`save-button-saving`, `shimmer-text`)
   - Implement spinning icon and shimmer text effects
   - Show asterisk (*) when unsaved changes exist

3. **Visual states**:
   - Normal: White border, subtle background
   - Unsaved changes: Yellow border and background
   - Saving: Animated with pulse and shimmer effects

### Phase 4: Delete Button Integration

1. **Add delete functionality**:
   - Similar to other pages
   - Confirmation dialog before deletion
   - Redirect to dashboard after successful deletion

2. **Position with save button**:
   - Red styling with trash icon
   - Side-by-side with save button

## Current SOW Page Status

✅ **Already Implemented**:
- Basic session management (`sessionId`, `sessionData`)
- `collectCurrentData()` function
- Basic `handleSave()` function
- Save button structure (already in place)

🔧 **Needs Implementation**:
- Auto-save functionality
- Save button animations (`save-button-saving` class)
- `hasUnsavedChanges` tracking
- Enhanced error handling
- Delete button functionality

## API Integration

The SOW page will use the existing session API endpoints:
- `POST /api/sessions` (create new session)
- `PUT /api/sessions/[uuid]` (update existing session)
- `DELETE /api/sessions/[uuid]` (delete session)

The `sessionType: 'sow'` parameter ensures data is saved to the `sowObjects` column in the database.

## Expected Behavior

After implementation, the SOW page will have:

1. **Seamless saving** like other pages
2. **Visual feedback** with animated save button
3. **Auto-save** with 3-second debounce
4. **Unsaved changes indicator** (asterisk)
5. **Delete functionality** with confirmation
6. **Consistent UI/UX** matching other pages

This implementation will make the SOW page fully consistent with the save patterns used across `/structuring`, `/visuals`, and `/solutioning` pages.
