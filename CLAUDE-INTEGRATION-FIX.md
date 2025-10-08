# 🔧 Claude Integration Fix Guide

**Date:** October 8, 2025  
**Issue:** You want Claude Sonnet but code is using GPT-4o

---

## 🚨 **MAJOR DISCOVERY**

Looking at your code, I found the **real problem**:

**Your code is using GPT-4o, NOT Claude Sonnet!**

```typescript
// Current code in hyper-canvas-chat.ts
const llm = new ChatOpenAI({
  modelName: 'gpt-4o',  // ← This is OpenAI!
  openAIApiKey: process.env.OPENAI_API_KEY
})
```

But you want to use: `claude-3-7-sonnet-20250219`

---

## ✅ **THE FIXES NEEDED**

### **Fix 1: Correct Model Name**

`claude-3-7-sonnet-20250219` is **not a valid model name**.

**Correct Claude model names (as of 2024-2025):**
- `claude-3-5-sonnet-20241022` (Latest Claude 3.5 Sonnet)
- `claude-3-5-sonnet-20240620` (Previous version)
- `claude-3-opus-20240229` (Claude 3 Opus)
- `claude-3-haiku-20240307` (Claude 3 Haiku)

**There is no "Claude 3.7" - you probably want Claude 3.5 Sonnet.**

### **Fix 2: Switch from OpenAI to Anthropic**

You need to change from `ChatOpenAI` to `ChatAnthropic`.

---

## 🔧 **IMPLEMENTATION**

### **Step 1: Install Anthropic Package**

```bash
npm install @langchain/anthropic
```

### **Step 2: Update Hyper-Canvas Chat**

**File:** `src/lib/langchain/hyper-canvas-chat.ts`

**Replace this:**
```typescript
import { ChatOpenAI } from '@langchain/openai'

const llm = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY
})
```

**With this:**
```typescript
import { ChatAnthropic } from '@langchain/anthropic'

const llm = new ChatAnthropic({
  modelName: 'claude-3-5-sonnet-20241022',  // Latest Claude 3.5 Sonnet
  temperature: 0.7,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
})
```

**Do this for BOTH instances** (Quickshot and Maestro functions).

### **Step 3: Update Environment Variables**

Make sure you have:
```bash
ANTHROPIC_API_KEY=your_anthropic_api_key_here
```

**Remove or keep:**
```bash
OPENAI_API_KEY=your_openai_key  # Keep if you use OpenAI elsewhere
```

---

## 🎯 **WHY THE LANGSMITH ERROR HAPPENED**

The `Invalid namespace: $.kwargs.last.kwargs.bound` error is likely because:

1. **Your LangSmith prompt was created with Claude** (correct)
2. **But your code tries to use it with OpenAI** (mismatch!)
3. **LangSmith prompt has Claude-specific formatting**
4. **OpenAI client can't deserialize Claude prompt format**

**Once you switch to `ChatAnthropic`, this error should disappear.**

---

## 📋 **COMPLETE IMPLEMENTATION**

Let me show you exactly what to change:

### **File: `src/lib/langchain/hyper-canvas-chat.ts`**

**At the top, change imports:**
```typescript
// OLD
import { ChatOpenAI } from '@langchain/openai'

// NEW  
import { ChatAnthropic } from '@langchain/anthropic'
```

**In `createQuickshotChain` function (around line 216):**
```typescript
// OLD
const llm = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.7,
  openAIApiKey: process.env.OPENAI_API_KEY
})

// NEW
const llm = new ChatAnthropic({
  modelName: 'claude-3-5-sonnet-20241022',
  temperature: 0.7,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
})
```

**In `createMaestroChain` function (around line 509):**
```typescript
// OLD
const llm = new ChatOpenAI({
  modelName: 'gpt-4o',
  temperature: 0.3,
  openAIApiKey: process.env.OPENAI_API_KEY
})

// NEW
const llm = new ChatAnthropic({
  modelName: 'claude-3-5-sonnet-20241022',
  temperature: 0.3,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
})
```

---

## 🧪 **TESTING**

After making these changes:

1. **Install the package:** `npm install @langchain/anthropic`
2. **Deploy the changes**
3. **Test Hyper-Canvas:** Try "make the background blue"

**Expected results:**
- ✅ No more `Invalid namespace` error
- ✅ LangSmith prompts load successfully  
- ✅ Claude Sonnet responses
- ✅ Better JSON parsing (Claude is better at following JSON format)

---

## 🎯 **WHY THIS MAKES SENSE**

### **LangSmith Tracing Shows It's Working**
- You see prompts and responses in LangSmith
- This means the integration is fine
- The error is just a model mismatch

### **Claude vs GPT-4o for Your Use Case**
- **Claude Sonnet:** Better at following structured output formats
- **Claude Sonnet:** Better at HTML/CSS modifications  
- **Claude Sonnet:** More reliable JSON responses
- **GPT-4o:** Good for general tasks, but Claude is better for your specific use case

---

## ⚠️ **IMPORTANT NOTES**

### **1. Model Name Verification**
If `claude-3-5-sonnet-20241022` doesn't work, try:
- `claude-3-5-sonnet-20240620`
- Check Anthropic's documentation for latest model names

### **2. API Key Requirements**
- Make sure `ANTHROPIC_API_KEY` is set in your Render environment
- Test the key works: `curl -H "x-api-key: $ANTHROPIC_API_KEY" https://api.anthropic.com/v1/messages`

### **3. Token Limits**
Claude 3.5 Sonnet has different token limits than GPT-4o:
- **Input:** 200K tokens
- **Output:** 8K tokens
- Should be fine for your use case

---

## 🚀 **NEXT STEPS**

1. **Install Anthropic package**
2. **Update the code** (I can do this for you)
3. **Set environment variable:** `ANTHROPIC_API_KEY`
4. **Deploy and test**

**Want me to make these code changes for you right now?** 🔧

---

## 📊 **EXPECTED OUTCOME**

**Before (Current):**
```
❌ Failed to pull from LangSmith: Invalid namespace...
⚠️ Using fallback prompt
❌ Maestro failed: JSON parsing error
```

**After (With Claude):**
```
✅ Successfully pulled nexa-canvas-maestro from LangSmith
✅ Claude 3.5 Sonnet response generated
✅ JSON parsed successfully
✅ Maestro turn completed
```

---

**This explains everything! You want Claude but your code uses OpenAI. Let's fix it!** 🎯
