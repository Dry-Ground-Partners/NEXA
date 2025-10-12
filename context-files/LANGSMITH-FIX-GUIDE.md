# 🔧 LangSmith Integration Fix Guide

**Date:** October 8, 2025  
**Issue:** LangSmith prompts won't load due to bound model incompatibility

---

## ❌ **THE PROBLEM**

```
❌ Failed to pull from LangSmith: Error: Invalid namespace: $.kwargs.last.kwargs.bound
```

**This is NOT an environment variable issue!**

The environment variables are set correctly (confirmed by logs showing `🔑 LangChain API Key present: true`).

---

## 🎯 **ROOT CAUSE**

Your `nexa-canvas-maestro` prompt in LangSmith Hub has a **bound model** (Claude Sonnet) attached to it.

**The Problem:**
- LangChain Python can serialize/deserialize bound models ✅
- LangChain JavaScript **CANNOT** deserialize bound models ❌
- This is a known limitation of LangChain.js

When you save a prompt with a model binding in LangSmith Hub, the format includes:
```json
{
  "kwargs": {
    "last": {
      "kwargs": {
        "bound": {
          "lc": 1,
          "type": "constructor",
          "id": ["langchain", "chat_models", "anthropic", "ChatAnthropic"],
          ...
        }
      }
    }
  }
}
```

LangChain.js sees this `bound` field and throws: `Invalid namespace: $.kwargs.last.kwargs.bound`

---

## ✅ **THE SOLUTION**

### **Option 1: Remove Model Binding (Recommended)**

1. **Go to LangSmith Hub:**
   - Visit: https://smith.langchain.com/hub
   - Or: https://smith.langchain.com/prompts

2. **Find Your Prompt:**
   - Search for: `nexa-canvas-maestro`
   - Or navigate to your organization's prompts

3. **Edit the Prompt:**
   - Click "Edit" or the pencil icon
   - **Look for the model selection dropdown**
   - **Remove or unset the model binding**
   - The prompt should ONLY contain the template text
   - NO model should be selected/bound

4. **Save as New Version:**
   - Click "Commit" or "Save"
   - Add a note: "Removed model binding for JS compatibility"

5. **Test:**
   - Restart your server
   - Try Maestro again
   - Should now pull successfully ✅

---

### **Option 2: Use Fallback Prompt (Temporary)**

If you can't access LangSmith Hub right now, the system is already using the fallback prompt.

**Current Status:**
- ⚠️ System detects LangSmith failure
- ✅ Automatically falls back to local prompt
- ✅ Maestro still works (but not ideal)

**Why use LangSmith?**
- Centralized prompt management
- Version control for prompts
- A/B testing capabilities
- Easier prompt updates without code changes

---

## 🔍 **HOW TO VERIFY THE FIX**

After removing the model binding:

1. **Check the logs** for:
   ```
   ✅ Successfully pulled nexa-canvas-maestro from LangSmith
   ```

   Instead of:
   ```
   ❌ Failed to pull from LangSmith: Invalid namespace...
   ⚠️ Using fallback maestro prompt (THIS SHOULD NOT HAPPEN)
   ```

2. **Maestro should work** without the fallback warning

---

## 📚 **BACKGROUND: Why This Happens**

### **LangSmith Hub Model Binding**

When you create a prompt in LangSmith:
- You can **optionally** bind a model to it
- This is convenient in Python (one object, ready to invoke)
- But it creates a serialization format that JS can't read

### **LangChain.js Limitation**

```typescript
// LangChain Python (works)
prompt = hub.pull("nexa-canvas-maestro")  # Includes model
result = prompt.invoke(input)  # Works!

// LangChain.js (breaks with bound model)
const prompt = await pull("nexa-canvas-maestro")  // Error!
// Cannot deserialize the bound model object
```

### **The Fix**

```typescript
// Store ONLY the prompt template in LangSmith
const promptTemplate = await pull("nexa-canvas-maestro")  // Works!

// Bind the model in your code
const chain = promptTemplate.pipe(model)
```

This way:
- LangSmith stores the template
- Your code handles the model
- Works in both Python and JS ✅

---

## 🎯 **RECOMMENDED WORKFLOW**

### **For Prompt Management:**

1. **Store templates in LangSmith** (no model binding)
2. **Manage models in code** (flexible, testable)
3. **Use environment variables** for model names

```typescript
// Good: Prompt template from LangSmith, model from code
const promptTemplate = await pull("nexa-canvas-maestro")
const model = new ChatAnthropic({
  modelName: process.env.MAESTRO_MODEL || "claude-3-7-sonnet-20250219",
  temperature: 0.7
})
const chain = promptTemplate.pipe(model)
```

---

## 🚨 **IMPORTANT NOTES**

### **1. This is NOT a bug in your code**
- Your implementation is correct
- The issue is LangSmith Hub format incompatibility
- Affects any JS app using LangSmith with bound models

### **2. Environment Variables are Set Correctly**
```
✅ LANGCHAIN_API_KEY: Present
✅ LANGCHAIN_TRACING_V2: Enabled
✅ LANGCHAIN_PROJECT: Set
✅ ANTHROPIC_API_KEY: Present
```

All keys are working! The issue is purely the prompt format.

### **3. Fallback Prompt Works**
- Your system gracefully handles the failure
- Uses a local fallback prompt
- Maestro still functions
- Just not centrally managed

---

## 📋 **CHECKLIST**

- [ ] Go to LangSmith Hub (https://smith.langchain.com/hub)
- [ ] Find `nexa-canvas-maestro` prompt
- [ ] Click "Edit"
- [ ] Remove/unset the model binding
- [ ] Save as new version
- [ ] Restart your server
- [ ] Test Maestro functionality
- [ ] Check logs for successful pull: `✅ Successfully pulled...`
- [ ] Verify no fallback warning

---

## 🆘 **IF YOU CAN'T EDIT THE PROMPT**

If you don't have access to edit the LangSmith prompt:

**Option A:** Ask the prompt owner to remove the model binding

**Option B:** Create a new prompt:
1. Copy the template text
2. Create new prompt: `nexa-canvas-maestro-js`
3. Save WITHOUT model binding
4. Update code to use new prompt name

**Option C:** Use fallback (current status):
- System already works with fallback
- Just won't have LangSmith management features

---

## ✅ **AFTER THE FIX**

Once the model binding is removed, you'll get:
- ✅ Prompts loaded from LangSmith
- ✅ Centralized prompt management
- ✅ Version control for prompts
- ✅ No fallback warnings
- ✅ Proper LangSmith tracing

---

**Bottom line:** Remove the model binding from your LangSmith prompt, and everything will work! 🎉
