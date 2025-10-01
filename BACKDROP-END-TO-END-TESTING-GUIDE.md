# 🧪 **BACKDROP: END-TO-END TESTING GUIDE**

**Complete Testing Plan for Phases 1-4**  
**Date:** September 30, 2025

---

## **📋 TESTING OVERVIEW**

This guide provides a comprehensive, step-by-step testing plan to verify all Backdrop functionality:
- ✅ Database & Backend (Phase 1)
- ✅ Frontend Integration (Phase 2)
- ✅ Prompt Integration (Phase 3)
- ✅ PDF Integration (Phase 4)

---

## **🎯 PRE-TESTING SETUP**

### **1. Database Preparation**
```bash
# Verify organization_preferences table exists
# Check in your database management tool or run:
# SELECT * FROM organization_preferences LIMIT 1;
```

### **2. Test Account Setup**
- **Account:** `mauricio@dryground.ai`
- **Organization:** Dry Ground AI
- **Role:** Owner (for full edit access)

### **3. Test Assets Preparation**
Prepare two test logos:
- **Main Logo:** PNG file, ~200KB, 800x200px (company logo)
- **Secondary Logo:** PNG file, ~100KB, 200x200px (icon/symbol)

---

## **🧪 PHASE 1 & 2: DATABASE + FRONTEND**

### **Test 1.1: Access Backdrop Tab**

**Steps:**
1. Navigate to `/grid`
2. Locate the "Backdrop" tab in the tab list
3. Click on "Backdrop" tab

**Expected Results:**
- ✅ Tab switches to Backdrop view
- ✅ Form shows all preference sections:
  - General Approach (textarea)
  - Main Logo upload
  - Secondary Logo upload
  - Structuring Preferences (4 textareas)
  - Visuals Preferences (3 textareas)
  - Solutioning Preferences (5 textareas)
  - Pushing Preferences (4 textareas)

### **Test 1.2: Logo Upload - Main Logo**

**Steps:**
1. Click "Choose File" in Main Logo section
2. Select a PNG/JPEG file (<5MB)
3. Observe preview

**Expected Results:**
- ✅ File dialog opens
- ✅ Preview image appears below upload button
- ✅ Remove button appears next to preview
- ✅ No error messages

**Test Invalid Cases:**
- ❌ Upload file >5MB → Error: "File size must be less than 5MB"
- ❌ Upload non-image file → Error: "Only PNG and JPEG images are allowed"

### **Test 1.3: Logo Upload - Secondary Logo**

**Steps:**
1. Click "Choose File" in Secondary Logo section
2. Select a PNG/JPEG file (<5MB)
3. Observe preview

**Expected Results:**
- ✅ File dialog opens
- ✅ Preview image appears below upload button
- ✅ Remove button appears next to preview
- ✅ No error messages

### **Test 1.4: Fill All Text Preferences**

**Steps:**
1. Fill "General Approach" with: "We focus on cloud-native, scalable solutions"
2. Fill Structuring preferences:
   - Diagnose: "Identify root causes and dependencies"
   - Echo: "Include context from previous discussions"
   - Solution: "Provide step-by-step implementation plans"
   - Traceback: "Reference specific requirements and constraints"
3. Fill Visuals preferences:
   - Ideation: "Focus on user-centric design"
   - Planning: "Create detailed wireframes"
   - Sketching: "Use modern, minimal aesthetics"
4. Fill Solutioning preferences:
   - Analysis: "Evaluate technical feasibility"
   - Structure: "Organize by architectural layers"
   - Stack: "Prefer TypeScript, React, PostgreSQL"
   - Enhance: "Add error handling and edge cases"
   - Formatting: "Use clear headers and bullet points"
5. Fill Pushing preferences:
   - Structuring to Visuals: "Highlight key pain points visually"
   - Visuals to Solutioning: "Translate designs to technical specs"
   - Solutioning to SOW: "Emphasize deliverables and timelines"
   - SOW to LOE: "Break down tasks by week"

**Expected Results:**
- ✅ All text fields accept input
- ✅ No character limit errors (unless testing limits)

### **Test 1.5: Save Preferences**

**Steps:**
1. Click "Save Preferences" button
2. Observe UI feedback

**Expected Results:**
- ✅ Button shows loading state briefly
- ✅ Success message appears: "Preferences saved successfully"
- ✅ Success message disappears after 3 seconds
- ✅ Console log: No errors

**Server Logs:**
```bash
🔄 Updating organization preferences for org: {orgId}
✅ Preferences updated successfully
🗑️ Cleared preferences cache for org {orgId}
```

### **Test 1.6: Reload Page & Verify Persistence**

**Steps:**
1. Refresh the page (F5)
2. Navigate back to Backdrop tab
3. Observe all fields

**Expected Results:**
- ✅ All text fields retain values
- ✅ Main logo preview displays saved logo
- ✅ Secondary logo preview displays saved logo
- ✅ No data loss

**Server Logs:**
```bash
🔄 Fetching preferences for org: {orgId}
✅ Found existing preferences
```

### **Test 1.7: RBAC - Non-Admin User**

**Steps:**
1. Create a test user with role "member" or "viewer"
2. Login as that user
3. Navigate to `/grid` → Backdrop tab

**Expected Results:**
- ✅ All fields are read-only (greyed out)
- ✅ "Save Preferences" button is NOT visible
- ✅ Logo upload buttons are NOT visible
- ✅ Can view but not edit preferences

### **Test 1.8: Update Preferences**

**Steps:**
1. As owner/admin, change "General Approach" text
2. Upload a different main logo
3. Click "Save Preferences"

**Expected Results:**
- ✅ Success message appears
- ✅ New values saved
- ✅ Refresh confirms changes persisted

**Server Logs:**
```bash
🗑️ Cleared preferences cache for org {orgId}  # ← Cache cleared on update
```

---

## **🧪 PHASE 3: PROMPT INTEGRATION (AI FEATURES)**

### **Test 3.1: Structuring - Diagnose Pain Points**

**Steps:**
1. Navigate to `/structuring`
2. Add content to Content tabs (e.g., "We need a better payment system")
3. Click "Diagnose" button
4. Observe results and server logs

**Expected Results:**
- ✅ AI analysis completes successfully
- ✅ Pain points are identified

**Server Logs:**
```bash
🔄 Preferences cache MISS for org {orgId} - fetching from DB...
💾 Cached preferences for org {orgId} (expires in 5 minutes)
🤖 Executing LangChain analysis...
✅ Pain point analysis completed successfully
```

**Verify Preferences Used:**
- Check if AI output reflects `general_approach` and `diagnose_preferences`

### **Test 3.2: Structuring - Generate Solution (Cache Hit)**

**Steps:**
1. Immediately after Test 3.1, click "Generate Solution"
2. Observe server logs

**Expected Results:**
- ✅ Solution generated successfully

**Server Logs:**
```bash
✅ Preferences cache HIT for org {orgId}  # ← No DB query, cache used!
🤖 Executing LangChain solution generation...
```

### **Test 3.3: Visuals - Generate Planning**

**Steps:**
1. Navigate to `/visuals`
2. Add ideation content
3. Click "Generate Planning"

**Expected Results:**
- ✅ Planning content generated
- ✅ Reflects `general_approach` and `planning_preferences`

**Server Logs:**
```bash
✅ Preferences cache HIT for org {orgId}  # ← Within 5 min of Test 3.1
```

### **Test 3.4: Visuals - Generate Sketch**

**Steps:**
1. Add planning content
2. Click "Generate Sketch"

**Expected Results:**
- ✅ Sketch content generated
- ✅ Reflects `sketching_preferences`

### **Test 3.5: Solutioning - AI Analyze Image**

**Steps:**
1. Navigate to `/solutioning`
2. Upload an image (diagram/screenshot)
3. Click "AI Analyze"

**Expected Results:**
- ✅ AI analyzes image
- ✅ Analysis reflects `analysis_preferences`

### **Test 3.6: Solutioning - AI Enhance Text**

**Steps:**
1. Add solution explanation text
2. Click "AI Enhance"

**Expected Results:**
- ✅ Text enhanced successfully
- ✅ Reflects `enhance_preferences` and `formatting_preferences`

### **Test 3.7: Solutioning - AI Structure Solution**

**Steps:**
1. Click "AI Structure"

**Expected Results:**
- ✅ Solution structured
- ✅ Reflects `structure_preferences`

### **Test 3.8: Push to SOW**

**Steps:**
1. Complete solutioning workflow
2. Click "Push to SOW"

**Expected Results:**
- ✅ SOW generated
- ✅ Reflects `solutioning_to_sow_preferences`

### **Test 3.9: Push to LOE**

**Steps:**
1. Complete SOW workflow
2. Click "Push to LOE"

**Expected Results:**
- ✅ LOE generated
- ✅ Reflects `sow_to_loe_preferences`

### **Test 3.10: Cache Expiration (Wait 5+ Minutes)**

**Steps:**
1. Wait 6 minutes after last AI call
2. Run any AI feature (e.g., Diagnose)
3. Observe server logs

**Expected Results:**
**Server Logs:**
```bash
🔄 Preferences cache MISS for org {orgId} - fetching from DB...  # ← Cache expired
💾 Cached preferences for org {orgId} (expires in 5 minutes)
```

### **Test 3.11: Cache Invalidation on Preference Update**

**Steps:**
1. Run an AI feature (cache populated)
2. Immediately update preferences in `/grid`
3. Run the same AI feature again
4. Observe server logs

**Expected Results:**
**Server Logs:**
```bash
# After preference update:
🗑️ Cleared preferences cache for org {orgId}

# On next AI call:
🔄 Preferences cache MISS for org {orgId} - fetching from DB...  # ← Cache was cleared
```

---

## **🧪 PHASE 4: PDF INTEGRATION**

### **Test 4.1: Solutioning PDF with Custom Logos**

**Steps:**
1. Navigate to `/solutioning`
2. Complete a solutioning session with:
   - Title: "Payment Gateway Integration"
   - Engineer: "Mauricio"
   - Recipient: "FinTech Corp"
   - At least 2 solutions with images
3. Click "Preview PDF"
4. Observe PDF in new tab

**Expected Results:**
- ✅ PDF opens in new tab
- ✅ **Cover page** displays **custom main logo** (not default Dry Ground AI logo)
- ✅ **Page headers** display **custom secondary logo** (not default DG icon)
- ✅ All solution content renders correctly

**Server Logs:**
```bash
🎨 Fetching logo preferences for organization: {orgId}
✅ PDF Preview: Found organization logos (main: true, secondary: true)
🎨 Using organization main logo from database
🎨 Using organization secondary logo from database
✅ PDF generated successfully
```

### **Test 4.2: Solutioning PDF Download**

**Steps:**
1. From same solutioning session, click "Download PDF"
2. Save PDF to disk
3. Open downloaded PDF

**Expected Results:**
- ✅ PDF downloads successfully
- ✅ Filename: `Payment_Gateway_Integration_Report.pdf`
- ✅ Cover page has **custom main logo**
- ✅ Headers have **custom secondary logo**

### **Test 4.3: SOW PDF with Custom Logo**

**Steps:**
1. Navigate to `/sow`
2. Complete SOW session:
   - Project: "E-Commerce Platform Modernization"
   - Client: "Retail Co"
   - Add objectives, deliverables, timeline
3. Click "Preview PDF"

**Expected Results:**
- ✅ PDF opens
- ✅ **Page headers** display **custom secondary logo**
- ✅ No main logo on cover (SOW uses text-based cover)

**Server Logs:**
```bash
🎨 SOW Preview: Fetching logo preferences for organization: {orgId}
✅ SOW Preview: Found organization secondary logo
🎨 SOW: Using organization secondary logo from database
```

### **Test 4.4: LOE PDF with Custom Logo**

**Steps:**
1. Navigate to `/loe`
2. Complete LOE session:
   - Project: "Cloud Migration Phase 1"
   - Add workstreams, resources, assumptions
3. Click "Preview PDF"

**Expected Results:**
- ✅ PDF opens
- ✅ **Page headers** display **custom secondary logo**

**Server Logs:**
```bash
🎨 LOE Preview: Fetching logo preferences for organization: {orgId}
✅ LOE Preview: Found organization secondary logo
🎨 LOE: Using organization secondary logo from database
```

### **Test 4.5: PDF without Custom Logos (Fallback Test)**

**Steps:**
1. Create a new organization (or clear preferences)
2. Complete solutioning session
3. Generate PDF

**Expected Results:**
- ✅ PDF generates successfully
- ✅ Cover shows **default Dry Ground AI logo**
- ✅ Headers show **default DG icon**

**Server Logs:**
```bash
🎨 Fetching logo preferences for organization: {orgId}
📸 PDF: No organization logos set, will use defaults
📸 Using default main logo (no organization logo set)
📸 Using default header logo (no organization secondary logo set)
```

### **Test 4.6: Mixed Logos (Main Only)**

**Steps:**
1. In Backdrop, upload only **main logo**
2. Remove secondary logo
3. Save preferences
4. Generate solutioning PDF

**Expected Results:**
- ✅ Cover shows **custom main logo**
- ✅ Headers show **default DG icon**

### **Test 4.7: Mixed Logos (Secondary Only)**

**Steps:**
1. In Backdrop, remove main logo
2. Upload **secondary logo** only
3. Save preferences
4. Generate solutioning PDF

**Expected Results:**
- ✅ Cover shows **default Dry Ground AI logo**
- ✅ Headers show **custom secondary logo**

### **Test 4.8: Logo Update Reflects in New PDFs**

**Steps:**
1. Generate solutioning PDF (Logo A on cover)
2. Go to Backdrop tab
3. Upload a different main logo (Logo B)
4. Save preferences
5. Generate solutioning PDF again

**Expected Results:**
- ✅ First PDF has Logo A
- ✅ Second PDF has Logo B (preferences cache cleared on update)

---

## **🎯 COMPREHENSIVE END-TO-END WORKFLOW TEST**

### **Full Backdrop Lifecycle Test**

**Duration:** ~30 minutes

**Steps:**

1. **Setup (Phase 1 & 2):**
   - Login as owner: `mauricio@dryground.ai`
   - Navigate to `/grid` → Backdrop
   - Upload main logo (company logo, 200KB PNG)
   - Upload secondary logo (icon, 100KB PNG)
   - Fill general approach: "Focus on scalable, cloud-native solutions with emphasis on security"
   - Fill all stage-specific preferences with meaningful text
   - Click "Save Preferences"
   - Verify success message

2. **Test AI Integration (Phase 3):**
   - Navigate to `/structuring`
   - Add content: "We need to modernize our legacy payment processing system"
   - Click "Diagnose"
   - **Check logs:** `cache MISS` → `cache HIT`
   - Verify pain points identified
   - Click "Generate Solution"
   - **Check logs:** `cache HIT` (within 5 min)
   - Verify solution generated
   - Navigate to `/visuals`
   - Click "Generate Planning"
   - **Check logs:** `cache HIT`
   - Verify planning content

3. **Complete Solutioning Workflow:**
   - Navigate to `/solutioning`
   - Fill basic info:
     - Title: "Payment System Modernization"
     - Engineer: "Mauricio"
     - Recipient: "E-Commerce Corp"
     - Date: Today
   - Add 2 solutions:
     - Solution 1: Upload diagram image, add AI analysis, add steps, structure
     - Solution 2: Upload diagram image, add AI analysis, add steps, structure
   - Click "AI Enhance" on solution explanations
   - **Check logs:** `cache HIT`

4. **Test PDF Generation (Phase 4):**
   - Click "Preview PDF"
   - **Verify:**
     - Cover page has **custom main logo** (not Dry Ground AI logo)
     - Page headers have **custom secondary logo** (not DG icon)
     - All 2 solutions render correctly
     - Images appear
   - **Check logs:**
     ```
     🎨 Fetching logo preferences for organization: {orgId}
     ✅ PDF Preview: Found organization logos (main: true, secondary: true)
     🎨 Using organization main logo from database
     🎨 Using organization secondary logo from database
     ```
   - Click "Download PDF"
   - Open downloaded file
   - Verify logos appear in downloaded PDF

5. **Push to SOW:**
   - From solutioning page, click "Push to SOW"
   - Verify SOW auto-populated
   - Add objectives and timeline
   - Click "Preview PDF"
   - **Verify:** Headers have **custom secondary logo**
   - **Check logs:** Logos fetched and used

6. **Push to LOE:**
   - From SOW page, click "Push to LOE"
   - Verify LOE auto-populated
   - Add workstreams and resources
   - Click "Preview PDF"
   - **Verify:** Headers have **custom secondary logo**
   - **Check logs:** Logos fetched and used

7. **Test Preference Update:**
   - Navigate to `/grid` → Backdrop
   - Change general approach text
   - Upload different main logo
   - Click "Save Preferences"
   - **Check logs:** `Cleared preferences cache`
   - Navigate to `/structuring`
   - Run "Diagnose" again
   - **Check logs:** `cache MISS` (cache was cleared)
   - Navigate to `/solutioning`
   - Generate PDF
   - **Verify:** New logo appears

8. **Test Fallback:**
   - Remove all logos from Backdrop
   - Save preferences
   - Generate solutioning PDF
   - **Verify:** Default Dry Ground AI logos appear
   - **Check logs:** "No organization logos set, will use defaults"

**Expected Total Time:** 25-35 minutes

---

## **✅ SIGN-OFF CHECKLIST**

### **Phase 1 & 2: Database + Frontend**
- [ ] Backdrop tab accessible
- [ ] Logo upload works (main & secondary)
- [ ] Logo preview displays
- [ ] Logo removal works
- [ ] All text fields editable
- [ ] Save preferences succeeds
- [ ] Preferences persist after reload
- [ ] RBAC enforced (viewer/member can't edit)
- [ ] Success/error messages display correctly

### **Phase 3: Prompt Integration**
- [ ] All 10 AI features use preferences
- [ ] Cache MISS on first call (DB fetch)
- [ ] Cache HIT on subsequent calls (within 5 min)
- [ ] Cache expires after 5 minutes
- [ ] Cache cleared on preference update
- [ ] AI output reflects preferences

### **Phase 4: PDF Integration**
- [ ] Solutioning PDF uses main + secondary logos
- [ ] SOW PDF uses secondary logo
- [ ] LOE PDF uses secondary logo
- [ ] Fallback to default logos works
- [ ] Mixed logos (one custom, one default) work
- [ ] Logo updates reflect in new PDFs
- [ ] No PDF generation failures

### **End-to-End**
- [ ] Full workflow (Backdrop → Structuring → Visuals → Solutioning → SOW → LOE) works
- [ ] All logos appear correctly in all documents
- [ ] Preference updates immediately affect new AI calls and PDFs

---

## **🎉 TESTING COMPLETE!**

If all checkboxes are ticked, **Backdrop is fully functional and production-ready!** 🚀

---

**Testing Guide Prepared by:** AI Assistant  
**Date:** September 30, 2025


