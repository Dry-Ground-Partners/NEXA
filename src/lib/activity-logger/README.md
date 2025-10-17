# Activity Logger

Central service for logging user activities across all workflows. Logs are displayed in the AI sidebar and added to AI model context.

## Overview

The Activity Logger captures API calls and user actions, providing:
- **User Feedback:** Visual confirmation of actions in the AI sidebar
- **AI Context:** Recent activities added to model prompts
- **Credit Tracking:** Display of credits consumed per action
- **Debugging:** Activity history for troubleshooting

## Architecture

```
Frontend (Workflow Pages)
    ↓
fetchWithLogging() wraps fetch()
    ↓
API Response → Extract usage info
    ↓
activityLogger.log() → Add to buffer
    ↓
Custom Event 'activityLog' → Dispatched to window
    ↓
AI Sidebar → Listens and displays log
    ↓
AI Context → Recent logs added to prompts
```

## Usage

### 1. Basic Usage (API Calls)

Replace standard `fetch()` with `fetchWithLogging()`:

```typescript
import { fetchWithLogging } from '@/lib/activity-logger'

// Before:
const response = await fetch('/api/organizations/123/structuring/analyze-pain-points', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ content: ['...'] })
})

// After:
const response = await fetchWithLogging(
  '/api/organizations/123/structuring/analyze-pain-points',
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ content: ['...'] })
  },
  {
    workflow: 'structuring',
    actionLabel: 'Diagnosed pain points'
  }
)
```

### 2. Manual Logging (Client-side Activities)

For activities that don't involve API calls:

```typescript
import { activityLogger } from '@/lib/activity-logger'

// Example: Rollback in structuring
const handleRollback = () => {
  activityLogger.log({
    workflow: 'structuring',
    action: 'Rolled back changes',
    status: 'success'
  })
  
  // ... existing rollback logic ...
}

// Example: Difficulty change in solutioning
const handleDifficultyChange = (newDifficulty: string) => {
  activityLogger.log({
    workflow: 'solutioning',
    action: `Changed difficulty to ${newDifficulty}`,
    status: 'success'
  })
  
  setDifficulty(newDifficulty)
}
```

### 3. Auto-extraction (Minimal Code)

If you don't provide `actionLabel`, it's automatically extracted from the URL:

```typescript
const response = await fetchWithLogging(
  '/api/organizations/123/solutioning/enhance-text',
  { method: 'POST', ... },
  { workflow: 'solutioning' }
  // actionLabel auto-extracted → "Enhance Text"
)
```

## API Reference

### `fetchWithLogging()`

Wrapper for `fetch()` that automatically logs API responses.

```typescript
function fetchWithLogging(
  url: string,
  options?: RequestInit,
  metadata?: {
    workflow: WorkflowType
    actionLabel?: string
    skipLogging?: boolean
  }
): Promise<Response>
```

**Parameters:**
- `url`: API endpoint URL
- `options`: Standard fetch options (method, headers, body, etc.)
- `metadata.workflow`: Workflow type ('structuring', 'visuals', 'solutioning', 'sow', 'loe')
- `metadata.actionLabel`: Custom action label (optional, auto-extracted if not provided)
- `metadata.skipLogging`: Set to `true` to skip logging for this request

**Returns:** Promise<Response> (same as fetch)

### `activityLogger.log()`

Manually log an activity.

```typescript
function log(activity: {
  workflow: WorkflowType
  action: string
  status: 'success' | 'error'
  credits?: number
  usageEventId?: string
  metadata?: Record<string, any>
}): void
```

### `activityLogger.getRecentLogs()`

Get recent logs formatted for AI context.

```typescript
function getRecentLogs(count?: number): string
```

**Example output:**
```
[14:32] structuring: Diagnosed pain points ✅ (3 credits)
[14:35] structuring: Generated solution ✅ (5 credits)
[14:40] visuals: Generated planning diagram ✅ (2 credits)
```

### `activityLogger.formatForChat()`

Format a single log for chat display.

```typescript
function formatForChat(log: ActivityLog): string
```

**Example output:**
```
[14:32:15] ✓ STRUCTURING: Diagnosed pain points • 3 credits
```

## Integration with AI Sidebar

### Step 1: Listen for Activity Logs

In `AISidebar.tsx`:

```typescript
useEffect(() => {
  const handleActivityLog = (e: CustomEvent<ActivityLog>) => {
    const log = e.detail
    
    // Add log message to chat
    const logMessage: Message = {
      id: generateId(),
      role: 'log',
      content: activityLogger.formatForChat(log),
      timestamp: log.timestamp,
      type: 'log'
    }
    
    setMessages(prev => [...prev, logMessage])
  }
  
  window.addEventListener('activityLog', handleActivityLog as EventListener)
  
  return () => {
    window.removeEventListener('activityLog', handleActivityLog as EventListener)
  }
}, [])
```

### Step 2: Add to AI Context

In API routes (e.g., `/api/ai-sidebar/stream/route.ts`):

```typescript
import { activityLogger } from '@/lib/activity-logger'

const recentActivity = activityLogger.getRecentLogs(10)

const result = await prompt.invoke({
  previous_messages: previousMessages || '',
  activity_logs: recentActivity || 'No recent activity',
  user_input: userInput || ''
})
```

## Utility Functions

### `extractWorkflowFromUrl(url: string)`

Extract workflow type from URL.

```typescript
extractWorkflowFromUrl('/api/organizations/123/structuring/analyze-pain-points')
// Returns: 'structuring'
```

### `extractActionFromUrl(url: string)`

Extract human-readable action from URL.

```typescript
extractActionFromUrl('/api/organizations/123/solutioning/enhance-text')
// Returns: 'Enhance Text'
```

### `getActionLabel(url: string)`

Get best action label (uses predefined map or extracts from URL).

```typescript
getActionLabel('/api/organizations/123/structuring/analyze-pain-points')
// Returns: 'Diagnosed pain points' (from ACTION_LABEL_MAP)
```

## Log Display Format

### In Chat (Cyan, Monospace):
```
[14:32:15] ✓ STRUCTURING: Diagnosed pain points • 3 credits
[14:35:22] ✓ STRUCTURING: Generated solution • 5 credits
[14:40:10] ✓ VISUALS: Generated planning diagram • 2 credits
[14:45:33] ✗ SOLUTIONING: AI analyzed solution • Failed
```

### In AI Context (Concise):
```
[14:32] structuring: Diagnosed pain points ✅ (3 credits)
[14:35] structuring: Generated solution ✅ (5 credits)
[14:40] visuals: Generated planning diagram ✅ (2 credits)
[14:45] solutioning: AI analyzed solution ❌
```

## Debugging

### View All Logs
```typescript
import { activityLogger } from '@/lib/activity-logger'

// In browser console:
activityLogger.getAllLogs()
```

### Export Logs
```typescript
const json = activityLogger.exportLogsJSON()
console.log(json)
// Or download:
const blob = new Blob([json], { type: 'application/json' })
const url = URL.createObjectURL(blob)
// ... trigger download
```

### Get Statistics
```typescript
const stats = activityLogger.getStats()
console.log(stats)
// {
//   total: 42,
//   successful: 40,
//   errors: 2,
//   totalCredits: 150,
//   byWorkflow: { structuring: 10, visuals: 15, ... }
// }
```

## Performance

- **Non-blocking:** All logging is asynchronous
- **Lightweight:** ~50 logs in memory (auto-trimmed)
- **Graceful degradation:** If logging fails, app continues normally
- **No API overhead:** Logging happens after response is received

## Best Practices

1. **Always provide workflow:** Explicit is better than auto-detection
2. **Use descriptive action labels:** Make it clear what happened
3. **Don't log sensitive data:** Avoid PII in metadata
4. **Log user intent, not implementation:** Focus on what the user did, not how
5. **Use consistent language:** Follow existing action label patterns

## Troubleshooting

### Logs not appearing in sidebar
- Check if `activityLog` event listener is registered in `AISidebar.tsx`
- Verify `activityLogger.log()` is being called (check console)
- Check browser console for event dispatch errors

### Logs not in AI context
- Verify `activityLogger.getRecentLogs()` is called in API route
- Check that `{activity_logs}` variable is in LangSmith prompt
- Verify prompt includes activity logs parameter

### Auto-extraction not working
- Check if URL matches expected pattern (e.g., includes `/structuring/`)
- Use explicit `actionLabel` if auto-extraction fails
- Check `ACTION_LABEL_MAP` for predefined labels

## Migration Guide

To add activity logging to an existing workflow page:

1. Import the logger:
   ```typescript
   import { fetchWithLogging } from '@/lib/activity-logger'
   ```

2. Replace fetch calls:
   ```typescript
   // Find all: fetch('/api/organizations/
   // Replace with: fetchWithLogging('/api/organizations/
   ```

3. Add metadata:
   ```typescript
   {
     workflow: 'structuring',  // or 'visuals', 'solutioning', etc.
     actionLabel: 'Diagnosed pain points'  // optional
   }
   ```

4. Test:
   - Trigger the action
   - Check AI sidebar for log
   - Verify credits are displayed correctly

## Examples

See implementation examples in:
- `src/app/structuring/page.tsx` (once implemented)
- `src/app/visuals/page.tsx` (once implemented)
- `src/app/solutioning/page.tsx` (once implemented)

## Contributing

When adding new workflows or actions:

1. Add workflow type to `WorkflowType` in `types.ts`
2. Add action label to `ACTION_LABEL_MAP` in `api-interceptor.ts`
3. Update this README with examples
4. Test in all scenarios (success, error, network failure)

