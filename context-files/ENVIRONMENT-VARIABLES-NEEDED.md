# 🔑 Required Environment Variables for Hyper-Canvas Maestro

**Date:** October 8, 2025  
**Issue:** LangSmith prompt won't load due to missing API keys

---

## 🚨 **REQUIRED ENVIRONMENT VARIABLES**

### **1. LangChain/LangSmith API Key**
```bash
LANGCHAIN_API_KEY=lsv2_pt_...
LANGCHAIN_TRACING_V2=true
LANGCHAIN_PROJECT=NEXA
```

**Purpose:**
- Authenticate with LangSmith Hub
- Pull prompts from LangSmith
- Enable tracing/debugging

**Where to get it:**
1. Go to https://smith.langchain.com
2. Click on your profile (top right)
3. Go to "Settings" → "API Keys"
4. Create or copy your API key (starts with `lsv2_pt_`)

---

### **2. Anthropic API Key (for Claude)**
```bash
ANTHROPIC_API_KEY=sk-ant-...
```

**Purpose:**
- Your LangSmith prompt uses Claude 3.7 Sonnet
- Model: `claude-3-7-sonnet-20250219`
- Needs Anthropic API key to invoke Claude

**Where to get it:**
1. Go to https://console.anthropic.com
2. Go to "API Keys"
3. Create or copy your API key (starts with `sk-ant-`)

---

## 🔧 **HOW TO ADD TO RENDER**

### **Step 1: Go to Render Dashboard**
1. Navigate to: https://dashboard.render.com
2. Find your main NEXA app
3. Click on the service

### **Step 2: Add Environment Variables**
1. Go to "Environment" tab (left sidebar)
2. Click "Add Environment Variable"
3. Add each variable:

**Variable 1:**
```
Key: LANGCHAIN_API_KEY
Value: lsv2_pt_... (your actual key)
```

**Variable 2:**
```
Key: LANGCHAIN_TRACING_V2
Value: true
```

**Variable 3:**
```
Key: LANGCHAIN_PROJECT
Value: NEXA
```

**Variable 4:**
```
Key: ANTHROPIC_API_KEY
Value: sk-ant-... (your actual key)
```

### **Step 3: Save and Redeploy**
1. Click "Save Changes"
2. Render will automatically redeploy your app
3. Wait 2-3 minutes for deployment to complete

---

## 🧪 **VERIFY IT WORKS**

After adding variables and redeploying:

### **Test 1: Check Logs**
Send "Make background blue" and look for:

**SUCCESS:**
```
🔑 LangChain API Key present: true    ✅
🔍 LangSmith tracing enabled: true    ✅
📥 Attempting to pull nexa-canvas-maestro from LangSmith...
✅ Successfully pulled maestro prompt from LangSmith
✅ Using LangSmith prompt (NOT fallback)
```

**STILL FAILING:**
```
🔑 LangChain API Key present: true
❌ Failed to pull from LangSmith: Invalid namespace...
```
(See "Alternative Solution" below if this happens)

---

## 🎯 **EXPECTED RESULTS**

### **After Adding Keys:**

**Scenario A: Everything Works (Best Case)**
```
✅ LangSmith loads successfully
✅ Claude 3.7 Sonnet used
✅ JSON properly formatted
✅ Preview updates
```

**Scenario B: Namespace Error Persists (Need Workaround)**
```
✅ API keys present
❌ "Invalid namespace" error
⚠️ Falls back to local prompt
✅ But parsing works
```

If Scenario B happens, we have two options:
1. **Update LangSmith prompt** to not include model binding
2. **Configure model locally** instead of in LangSmith

---

## 🔄 **ALTERNATIVE SOLUTION (If Namespace Error Persists)**

If the "Invalid namespace" error continues even with API keys set, we need to:

### **Option 1: Update LangSmith Prompt (Recommended)**
In your LangSmith Hub prompt `nexa-canvas-maestro`:
1. Remove the model configuration
2. Save as prompt template only (no model binding)
3. We'll configure Claude locally in the code

### **Option 2: Configure Model Locally**
Update the code to use Claude even with fallback:
```typescript
const llm = new ChatAnthropic({
  modelName: 'claude-3-7-sonnet-20250219',
  temperature: 1,
  maxTokens: 40618,
  anthropicApiKey: process.env.ANTHROPIC_API_KEY
})
```

---

## 📊 **CURRENT STATE vs IDEAL STATE**

### **Current (Broken):**
```
Environment Variables:
❌ LANGCHAIN_API_KEY: not set
❌ LANGCHAIN_TRACING_V2: not set
❌ ANTHROPIC_API_KEY: not set
❌ LANGCHAIN_PROJECT: not set

Result:
⚠️ Can't load from LangSmith
⚠️ Falls back to local prompt
⚠️ Uses OpenAI (from fallback) instead of Claude
```

### **Ideal (Fixed):**
```
Environment Variables:
✅ LANGCHAIN_API_KEY: lsv2_pt_...
✅ LANGCHAIN_TRACING_V2: true
✅ ANTHROPIC_API_KEY: sk-ant-...
✅ LANGCHAIN_PROJECT: NEXA

Result:
✅ Loads from LangSmith
✅ Uses Claude 3.7 Sonnet
✅ Proper JSON formatting
✅ Preview updates
```

---

## 🎯 **ACTION ITEMS (DO NOW)**

1. **Get LangChain API Key** from https://smith.langchain.com
2. **Get Anthropic API Key** from https://console.anthropic.com
3. **Add 4 environment variables** to Render
4. **Redeploy** app (automatic after saving env vars)
5. **Test** with "Make background blue"
6. **Check logs** for success messages
7. **Report back** if "Invalid namespace" error persists

---

## 📝 **SUMMARY**

**Problem:** Missing API keys prevent LangSmith prompt from loading

**Solution:** Add 4 environment variables to Render

**Keys Needed:**
- `LANGCHAIN_API_KEY` (LangSmith authentication)
- `LANGCHAIN_TRACING_V2` (Enable tracing)
- `LANGCHAIN_PROJECT` (Project name)
- `ANTHROPIC_API_KEY` (Claude API access)

**Expected Time:** 5 minutes to add, 2-3 minutes to redeploy

**Success Criteria:**
```
🔑 LangChain API Key present: true
✅ Successfully pulled maestro prompt from LangSmith
✅ Using LangSmith prompt (NOT fallback)
```

---

**Add those 4 environment variables and let me know what happens!** 🚀
