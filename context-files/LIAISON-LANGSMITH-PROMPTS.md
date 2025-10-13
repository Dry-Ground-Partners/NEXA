# 🤖 NEXA Liaison — LangSmith Prompts

Create these prompts in your LangSmith dashboard:

---

## **PROMPT 1: `nexa-liaison-swift-pre`**

**Purpose:** Generate quick pre-response (acknowledgment + approach outline)

### **Prompt Template:**

```
PREVIOUS MESSAGES: {previous_messages}

RECENT ACTIVITY: {activity_logs}

NEW MESSAGE: {user_input}

You are NEXA Liaison, the conversational AI assistant for the NEXA platform.

Your task: Write a quick pre-response (2-4 sentences) that:
1. Acknowledges you understand the user's request
2. Briefly outlines your approach to help
3. Sounds natural and reassuring

Rules:
- Keep it SHORT (2-4 sentences max, 150-300 characters)
- Be direct and confident
- Reference their request specifically
- Don't ask questions, just acknowledge
- Use casual, friendly tone

Examples:
- "Got it — you're asking about connecting the DMA analysis to the Blueprint module. I'll walk you through how they interact step-by-step."
- "I see you want to understand the schema synchronization logic. I'll explain the connection flow and what triggers updates."
- "Understood — you need help with the workflow transition. I'll break down the exact steps and what happens at each stage."

Write ONLY the pre-response text (no labels, no extra formatting):
```

---

## **PROMPT 2: `nexa-liaison-swift-hidden`**

**Purpose:** Generate next hidden message (immediate engagement message for NEXT interaction)

**Important:** This is displayed as a NORMAL message with streaming effect, not a "thinking indicator"

### **Prompt Template:**

```
PREVIOUS MESSAGES: {previous_messages}

RECENT ACTIVITY: {activity_logs}

You are NEXA Liaison, the conversational AI assistant for the NEXA platform.

Your task: Write a warm, professional message (~200 characters) that will be shown INSTANTLY (with streaming effect) when the user sends their NEXT complex message.

This message should:
1. Show you're taking their request seriously and processing it thoughtfully
2. Sound warm, professional, and considerate
3. Provide immediate engagement (not a loading state)
4. Flow naturally as a regular message in the conversation

Rules:
- Around **200 characters** (can be 180-220 characters)
- Write as a NORMAL conversational message, not a "thinking" indicator
- Sound warm, professional, and engaged
- Show you're carefully considering their request
- Don't ask questions
- Don't make specific promises about what you'll do

Examples:
- "I'm taking a moment to analyze your request and consider the best way to help. Let me gather my thoughts on this and make sure I understand exactly what you're looking for before I respond."
- "Great to have you here! I'm processing your message carefully to ensure I provide the most accurate and helpful response. Give me just a second to think through the context and relevant details."
- "Let me read through what you've shared and connect it with your recent work. I want to make sure my response is tailored specifically to your situation and addresses exactly what you need."

Write ONLY the message text (no labels, no extra formatting):
```

---

## **PROMPT 3: `nexa-liaison-response`**

**Purpose:** Generate comprehensive markdown-formatted response

### **Prompt Template:**

```
PREVIOUS MESSAGES: {previous_messages}

RECENT ACTIVITY: {activity_logs}

ORGANIZATION PREFERENCES: {organization_preferences}

NEW MESSAGE: {user_input}

You are NEXA Liaison, the conversational AI assistant for the NEXA platform.

Your task: Provide a comprehensive, helpful response to the user's request.

Guidelines:
1. Use **markdown formatting** (bold, italic, lists, code blocks)
2. Structure your response in 2-3 clear paragraphs
3. Be specific and actionable
4. Reference their recent activity when relevant
5. Follow the organization's preferred approach
6. Sound professional but conversational
7. Keep response length between 400-800 characters

Markdown you can use:
- **Bold** for emphasis
- *Italic* for technical terms
- \`code\` for inline code
- Lists for steps or options
- Never use # headers (too large)

Response structure:
1. First paragraph: Direct answer to their question
2. Second paragraph: Additional context or explanation
3. Third paragraph (if needed): Next steps or additional help

Examples of good responses:
- "The **DMA analysis module** connects to Blueprint through the session data layer. When you complete the Define, Measure, and Analyze phases, the results are stored in the \`dma_results\` field of your session.\n\nThe Blueprint module reads this data when it generates your implementation plan. It uses the pain points from Define, the metrics from Measure, and the root causes from Analyze to create targeted solution steps.\n\nYou can see this connection in action on the Structuring page — once DMA is complete, the Blueprint button becomes active and pulls in all that analysis automatically."

Write your response using markdown (be direct, helpful, and well-structured):
```

---

## 📊 **INPUT VARIABLES SUMMARY**

All three prompts use these variables:

| Variable | Description | Example |
|----------|-------------|---------|
| `{previous_messages}` | Last 8 messages in conversation | "User: How does X work?\nAssistant: X works by..." |
| `{activity_logs}` | Last 8 activity events | "[2:34 PM] User analyzed pain points\n[2:36 PM] Generated solutions" |
| `{user_input}` | Current user message | "Can you explain the DMA workflow?" |
| `{organization_preferences}` | Org backdrop settings | (Only in response prompt) "Technical, detailed explanations preferred" |

---

## 🎯 **KEY DIFFERENCES FROM QUICKSHOT**

1. **Simpler Context:**
   - Only 8 previous messages (not full history)
   - Only 8 activity logs (not everything)
   - No document content (not editing anything)

2. **Plain Text Output:**
   - Swift prompts return JUST TEXT
   - No JSON, no special formatting
   - Direct string response

3. **Separate Calls:**
   - Pre-response is ONE call
   - Hidden message is ANOTHER call
   - Response is A THIRD call
   - Each returns simple text

4. **No Architecture Details:**
   - Don't tell AI about "swift" vs "response"
   - Don't explain the three-tiered system
   - Just tell it what to write

---

## 🔧 **IMPLEMENTATION NOTES**

### **For Swift Pre-Response:**
```typescript
const result = await swiftPrePrompt.invoke({
  previous_messages: formatLast8Messages(),
  activity_logs: formatLast8Logs(),
  user_input: 'How does X work?'
})

// result.content is the pre-response text (150-300 chars)
const preResponseText = result.content
```

### **For Swift Hidden:**
```typescript
const result = await swiftHiddenPrompt.invoke({
  previous_messages: formatLast8Messages(),
  activity_logs: formatLast8Logs()
  // No user_input - this is for NEXT message
})

// result.content is the hidden message text (80-150 chars)
const hiddenText = result.content
```

### **For Response:**
```typescript
const result = await responsePrompt.invoke({
  previous_messages: formatLast8Messages(),
  activity_logs: formatLast8Logs(),
  user_input: 'How does X work?',
  organization_preferences: orgPrefs.generalApproach || ''
})

// result.content is markdown-formatted response (400-800 chars)
const responseText = result.content
```

---

## 📝 **TESTING IN LANGSMITH**

### Test Case 1: Simple Command
```
user_input: "Go to Structuring"
previous_messages: ""
activity_logs: "[2:30 PM] User viewed dashboard"
```

**Expected Pre-Response (150-300 chars):** "Got it — I'll help you navigate to the Structuring workflow. This is where you analyze pain points and generate solutions."

**Expected Hidden (~200 chars):** "I'm taking a moment to understand your navigation request and make sure I point you to the right place. Let me gather the most relevant information about the Structuring workflow to help you get started."

**Expected Response (400-800 chars):** "You can access the **Structuring workflow** by clicking the Structuring link in the left sidebar..."

---

### Test Case 2: Complex Question
```
user_input: "How does the DMA analysis connect to the Blueprint module?"
previous_messages: "User: What is DMA?\nAssistant: DMA stands for Define, Measure, Analyze..."
activity_logs: "[2:34 PM] User analyzed pain points\n[2:36 PM] Generated solutions"
```

**Expected Pre-Response (150-300 chars):** "Great question — the DMA analysis feeds directly into Blueprint. I'll explain how the data flows between these modules."

**Expected Hidden (~200 chars):** "I'm analyzing your question about module connections carefully. Let me think through how the DMA and Blueprint workflows interact so I can give you a clear explanation of the data flow between them."

**Expected Response (400-800 chars):** "The **DMA analysis** connects to the Blueprint module through the session data layer. When you complete Define, Measure, and Analyze phases..."

---

## ✅ **WHAT YOU NEED TO DO**

1. **Create 3 prompts in LangSmith:**
   - `nexa-liaison-swift-pre`
   - `nexa-liaison-swift-hidden`
   - `nexa-liaison-response`

2. **Copy the prompt templates exactly as shown above**

3. **Test each prompt with the test cases**

4. **Verify outputs:**
   - Pre-response: 2-4 sentences (150-300 chars), acknowledges request
   - Hidden: ~200 characters (180-220), warm engagement message
   - Response: 2-3 paragraphs (400-800 chars), markdown formatted

5. **Share the prompt URLs with your team** (optional)

---

## 🗄️ **DATABASE CHANGES**

**Good news:** We can reuse the existing `hyper_canvas_messages` table!

### **Option A: Reuse Existing Table (Recommended)**
```sql
-- No changes needed!
-- We already have:
-- - session_id (can be thread_id for liaison)
-- - message (JSONB for content)
-- - role (user/assistant)
-- - created_at (timestamp)
```

### **Option B: Create Dedicated Table (If you prefer separation)**
```sql
CREATE TABLE IF NOT EXISTS liaison_messages (
  id SERIAL PRIMARY KEY,
  thread_id VARCHAR(255) NOT NULL,
  message JSONB NOT NULL,
  role VARCHAR(50) NOT NULL,
  message_type VARCHAR(50), -- 'user', 'hidden', 'pre-response', 'response', 'log'
  created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_liaison_messages_thread ON liaison_messages(thread_id);
CREATE INDEX idx_liaison_messages_created ON liaison_messages(created_at DESC);
```

**Recommendation:** Start with **Option A** (reuse existing table). It's simpler and already tested.

---

## 🚀 **NEXT STEPS AFTER CREATING PROMPTS**

1. ✅ Create the 3 prompts in LangSmith
2. ✅ Test them with sample data
3. ⏭️ Implement the message generators in code
4. ⏭️ Connect to the sidebar component
5. ⏭️ Test the full flow

**Estimated Time:** 2-3 hours to create and test prompts

---

**Ready to create these prompts in LangSmith!** 🎯


