# 🎯 NEXA Liaison — Immediate Next Steps

**Current Phase:** Testing & Refinement  
**Status:** Text Mode Phase 1 Complete ✅  
**Ready For:** Real-world testing with LangSmith prompts

---

## ✅ WHAT'S DONE

1. ✅ Three LangSmith prompts created:
   - `nexa-liaison-swift-pre` (pre-response)
   - `nexa-liaison-swift-hidden` (hidden message, not used yet)
   - `nexa-liaison-response` (full response with action)

2. ✅ Message generators implemented:
   - Pull from LangSmith with `includeModel: true`
   - NO model selection in code (you choose in LangSmith)
   - Parse JSON response from `nexa-liaison-response`

3. ✅ Three-tiered flow working:
   - Hidden message from pool (complex inputs only)
   - Pre-response + response in parallel
   - Markdown rendering in response

4. ✅ UI complete:
   - Right sidebar pushes content correctly
   - Theme-consistent styling
   - Auto-scroll on new messages
   - Speech icon

---

## 🧪 IMMEDIATE TESTING (Today)

### **Step 1: Test Simple Message**
```
1. Start dev server: npm run dev
2. Press W to open sidebar
3. Send: "Help me"
4. Expected:
   - NO hidden message
   - Pre-response appears
   - Full response appears (markdown rendered)
```

### **Step 2: Test Complex Message**
```
1. Send: "Can you explain how the DMA analysis connects to the Blueprint module in detail?"
2. Expected:
   - Hidden message appears first (from pool)
   - Pre-response appears
   - Full response appears (markdown rendered)
```

### **Step 3: Test Markdown Rendering**
```
Make sure response contains:
- **Bold text** → renders in cyan
- *Italic text* → renders italicized
- `code` → renders in cyan code block
- Lists → render properly
```

### **Step 4: Check Console**
```
Look for:
- Any errors during prompt pulling
- "Action received:" log (should be {type: null, params: {}})
- Any parsing errors
```

---

## 🔧 IMMEDIATE FIXES NEEDED (If Issues Found)

### **If Prompts Don't Load:**
```typescript
// Check in src/lib/ai-sidebar/message-generators.ts
// Verify hub.pull is working
// Check LangSmith credentials
```

### **If JSON Parsing Fails:**
```typescript
// Response prompt should output:
{
  "response": "Markdown text here...",
  "action": {
    "type": null,
    "params": {}
  }
}
```

### **If Model Not Working:**
```
1. Go to LangSmith dashboard
2. Check each prompt configuration
3. Verify gpt-5-nano (or chosen model) is selected
4. Code does NOT select model - only pulls prompt
```

---

## 📋 NEXT DEVELOPMENT PHASE (This Week)

### **Priority 1: Activity Tracking Integration** (4-6 hours)

**Goal:** Replace `activityLogs: " "` with real activity data

**Steps:**
1. Read `/home/runner/workspace/src/lib/usage/usage-tracker.ts`
2. Create formatter to get last 8 events
3. Format as:
   ```
   [2:34 PM] User analyzed pain points
   [2:36 PM] Generated solutions (Echo enabled)
   [2:40 PM] Structured solution document
   ```
4. Pass to API route
5. Test contextual responses

**Files to Modify:**
- `src/lib/ai-sidebar/activity-formatter.ts` (new)
- `src/components/ai-sidebar/AISidebar.tsx` (replace placeholder)

---

### **Priority 2: Error Handling & Retry** (6-8 hours)

**Goal:** Add 2-retry policy with human-like messages

**Steps:**
1. Create error messages pool (50 messages):
   ```typescript
   // First failure
   "Hmm, I didn't quite get that. Let me try again..."
   
   // Second failure
   "Wait, that didn't go through either. One more try..."
   
   // Final failure
   "I tried a few times but I'm stuck. Could you rephrase?"
   ```

2. Wrap generators with retry logic:
   ```typescript
   withRetry(fn, maxRetries=2, onRetry)
   ```

3. Test failure scenarios

**Files to Create:**
- `src/lib/ai-sidebar/error-messages-pool.ts`
- `src/lib/ai-sidebar/retry-handler.ts`

**Files to Modify:**
- `src/components/ai-sidebar/AISidebar.tsx`

---

### **Priority 3: Next Hidden Message Generation** (4-6 hours)

**Goal:** Use `nexa-liaison-swift-hidden` after response

**Steps:**
1. After full response completes:
   ```typescript
   // Generate next hidden message
   const nextHidden = await generateHiddenMessage({
     previousMessages: updatedContext,
     activityLogs: activityText
   })
   
   // Cache for next use
   setCurrentHiddenMessage(nextHidden)
   ```

2. Fallback to pool if fails

3. Test hidden message quality

**Files to Modify:**
- `src/lib/ai-sidebar/message-generators.ts` (add `generateHiddenMessage`)
- `src/components/ai-sidebar/AISidebar.tsx` (call after response)

---

## 📊 WEEK 1 GOALS

| Task | Priority | Hours | Status |
|------|----------|-------|--------|
| Test with real prompts | 🔴 Critical | 2-3h | ⏸️ TODO |
| Activity tracking integration | 🔴 Critical | 4-6h | ⏸️ TODO |
| Error handling + retry | 🟡 High | 6-8h | ⏸️ TODO |
| Next hidden generation | 🟡 High | 4-6h | ⏸️ TODO |
| Add loading indicators | 🟢 Medium | 2-3h | ⏸️ TODO |
| **TOTAL** | | **18-26h** | |

**ETA:** 3-5 days at 4-6 hours/day

---

## 🎯 WEEK 2 GOALS

### **Focus: Streaming & Polish**

1. **Token Streaming** (10-14h)
   - SSE for response text
   - Token-by-token rendering
   - Typing cursor animation

2. **Message Persistence** (8-12h)
   - Save conversations to database
   - Load past conversations
   - Thread management

3. **UI Polish** (6-8h)
   - Loading indicators
   - Message timestamps (optional)
   - Copy message button
   - Regenerate response

---

## 🚨 CRITICAL REMINDERS

### **DO NOT:**
- ❌ Select model in code (`modelName: ...`)
- ❌ Hardcode any AI responses
- ❌ Change prompt structure without testing
- ❌ Remove error logging (need for debugging)

### **DO:**
- ✅ Pull prompts with `includeModel: true`
- ✅ Let LangSmith handle model selection
- ✅ Test with multiple input types
- ✅ Log all actions to console
- ✅ Keep markdown rendering clean

---

## 📞 TESTING CHECKLIST

Before moving to next phase, verify:

- [ ] Simple messages work (< 60 chars)
- [ ] Complex messages work (≥ 60 chars)
- [ ] Hidden messages appear for complex inputs
- [ ] Pre-response displays
- [ ] Full response displays
- [ ] Markdown renders properly (bold, italic, code)
- [ ] No console errors
- [ ] Action object logged (even if null)
- [ ] Messages auto-scroll to bottom
- [ ] Sidebar collapse/expand works
- [ ] 'W' key toggles sidebar
- [ ] Right sidebar pushes content correctly

---

## 🐛 IF SOMETHING BREAKS

### **Prompt Loading Errors:**
```
Check: hub.pull('nexa-liaison-swift-pre', { includeModel: true })
Fix: Verify LangSmith API key and prompt names
```

### **JSON Parsing Errors:**
```
Check: Response format from nexa-liaison-response
Fix: Update prompt to output valid JSON
```

### **Model Errors:**
```
Check: LangSmith dashboard → prompt configuration
Fix: Verify gpt-5-nano (or chosen model) is available
DO NOT FIX IN CODE
```

### **Markdown Not Rendering:**
```
Check: react-markdown installed
Fix: npm install react-markdown remark-gfm
```

---

## 🎉 SUCCESS CRITERIA

**Phase 1 is successful when:**
1. ✅ All test cases pass
2. ✅ No console errors
3. ✅ Markdown renders beautifully
4. ✅ Hidden messages show for complex inputs
5. ✅ Pre-response + response work in parallel
6. ✅ Action object parses correctly

**Ready for Phase 2 when:**
1. ✅ Activity tracking integrated
2. ✅ Error handling with retries
3. ✅ Next hidden message generation
4. ✅ All edge cases handled
5. ✅ Performance is good (< 2s response time)

---

**Current Status:** 🟢 Phase 1 Complete - Ready for Real Testing!

**Next Action:** Test with actual LangSmith prompts (gpt-5-nano) 🚀

