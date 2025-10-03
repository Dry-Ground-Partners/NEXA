# 📋 **Phase 2: Solutioning Endpoints Analysis**

## 🔍 **Current State**

### **AI Features Used in Solutioning Page:**

| Feature | Old Endpoint | Event Type | Status |
|---------|-------------|------------|--------|
| Structure Solution | `/api/solutioning/structure-solution` | `solutioning_structure_solution` | ✅ Org-scoped exists |
| Analyze Image | `/api/solutioning/analyze-image` | `solutioning_image_analysis` | ❌ Need org-scoped |
| AI Enhance Text | `/api/solutioning/enhance-text` | `solutioning_ai_enhance` | ❌ Need org-scoped |
| Analyze Per-Node | `/api/solutioning/analyze-pernode` | `solutioning_node_stack` | ❌ Need org-scoped |
| Auto Format | `/api/solutioning/auto-format` | `solutioning_formatting` | ❌ Need org-scoped |

### **Non-AI Features (No Usage Tracking Needed):**
- Upload Image - File upload only
- Preview PDF - No AI processing
- Generate PDF - Formatting only (could track later)
- Generate SOW - Feature push (separate tracking)

## 📝 **Implementation Strategy**

### **Priority 1: Core AI Features**
Since solutioning has many endpoints, we'll focus on the main AI-powered features first:

1. ✅ **Structure Solution** - Already done
2. 🔄 **Analyze Image** - Create org-scoped endpoint
3. 🔄 **AI Enhance** - Create org-scoped endpoint  
4. 🔄 **Per-Node Stack** - Create org-scoped endpoint
5. 🔄 **Auto Format** - Create org-scoped endpoint

### **Simplified Approach:**
Given the number of endpoints, I recommend:
- Create org-scoped versions of the 4 main AI features
- Update frontend to use org-scoped endpoints
- Keep non-AI endpoints as-is for now (can add tracking later if needed)

## 🎯 **Recommendation**

For Phase 2 completion, let's:
1. Create the 4 missing org-scoped endpoints
2. Update solutioning page to use org-scoped endpoints  
3. Test the main workflow
4. Document remaining endpoints for Phase 3 (if needed)

This keeps Phase 2 focused on core AI tracking while maintaining momentum.






