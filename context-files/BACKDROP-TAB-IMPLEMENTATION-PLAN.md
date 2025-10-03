# 🎯 BACKDROP TAB – COMPREHENSIVE IMPLEMENTATION PLAN

## 📋 EXECUTIVE SUMMARY

This plan outlines the complete implementation of the **Backdrop tab functionality** to enable organization-level preference management that dynamically influences AI prompts and document generation across the NEXA platform.

**Status**: Backdrop UI exists but is non-functional  
**Objective**: Enable full CRUD functionality with RBAC, database persistence, and integration with all 13 LangSmith prompts and PDF generation  
**Estimated Timeline**: 3-4 days of focused development  
**Risk Level**: Medium (requires careful prompt variable management)

---

## 🔍 CURRENT STATE ANALYSIS

### ✅ What Exists

**1. Frontend UI** (`/src/app/grid/page.tsx` lines 72-345)
```typescript
// Complete state structure already defined:
backdropData = {
  general: string,                          // General approach text
  structuring: {
    activeTab: string,
    diagnose: string,
    echo: string,
    traceback: string,
    solution: string
  },
  visuals: {
    activeTab: string,
    ideation: string,
    planning: string,
    sketching: string
  },
  solutioning: {
    activeTab: string,
    structure: string,
    analysis: string,
    stack: string,
    enhance: string,
    formatting: string
  },
  pushing: {
    structuringToVisuals: string,
    visualsToSolutioning: string,
    solutioningToSOW: string,
    sowToLOE: string
  }
}

// Logo state:
mainLogo: File | null
secondLogo: File | null
```

**2. Organization Infrastructure**
- ✅ RBAC system fully operational
- ✅ `useUser()` hook with `selectedOrganization`
- ✅ Organization table with `logoUrl` field (currently unused)
- ✅ Multi-tenant architecture with organization isolation

**3. LangSmith Prompts Inventory** (13 prompts total)

| Prompt Name | File | Variables Used | Affected By Backdrop |
|-------------|------|----------------|---------------------|
| `nexa-structuring-painpoints` | structuring.ts | `transcript` | ✅ YES - diagnose, echo, general |
| `nexa-generate-solution` | structuring.ts | `content`, `painpoints`, `report` | ✅ YES - solution, echo, traceback, general |
| `nexa-visuals-planning` | visuals.ts | `solution` | ✅ YES - ideation, planning, general |
| `nexa-visuals-sketch` | visuals.ts | `planning` | ✅ YES - sketching, general |
| `nexa-solutioning-vision` | solutioning.ts | image + text | ✅ YES - analysis, general |
| `nexa-solutioning-enhance` | solutioning.ts | `explanation` | ✅ YES - enhance, general |
| `nexa-solutioning-structure` | solutioning.ts | `ai_analysis`, `solution_explanation` | ✅ YES - structure, general |
| `nexa-solutioning-pernode` | solutioning.ts | `context` | ✅ YES - stack, general |
| `nexa-push-tosow` | solutioning.ts | `SOLUTIONING_DATA_WILL_BE_INSERTED_HERE` | ✅ YES - pushing.solutioningToSOW, general |
| `nexa-push-toloe` | solutioning.ts | `SOW_DATA_WILL_BE_INSERTED_HERE` | ✅ YES - pushing.sowToLOE, general |
| `nexa-lazy-quickshot` | hyper-canvas-chat.ts | dynamic | ⚠️ MAYBE - depends on context |
| `nexa-canvas-maestro` | hyper-canvas-chat.ts | dynamic | ⚠️ MAYBE - depends on context |

**4. PDF Generation System**
- ✅ Python Flask service with Playwright rendering
- ✅ Jinja2 templates for Solutioning, SOW, LOE
- ⚠️ **HARDCODED LOGOS** at lines 26 & 32 in `pdf_generator.py`

### ❌ What's Missing

1. **Database Table**: No `organization_preferences` table
2. **API Endpoints**: No CRUD endpoints for preferences
3. **Preference Loading**: Frontend doesn't fetch/save to database
4. **Prompt Integration**: Prompts don't receive preference variables
5. **PDF Integration**: PDFs use hardcoded logos, not org preferences
6. **RBAC Enforcement**: No role-based edit restrictions on UI

---

## 🗄️ DATABASE SCHEMA DESIGN

### **Table: `organization_preferences`**

```sql
-- Organization preferences table
CREATE TABLE organization_preferences (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE UNIQUE NOT NULL,
    
    -- Logo storage (Base64 blobs)
    main_logo TEXT,                           -- Base64 encoded image
    main_logo_filename VARCHAR(255),          -- Original filename for reference
    main_logo_mime_type VARCHAR(50),          -- e.g., 'image/png', 'image/jpeg'
    main_logo_size_bytes INTEGER,             -- File size for validation
    
    second_logo TEXT,                         -- Base64 encoded image (optional)
    second_logo_filename VARCHAR(255),
    second_logo_mime_type VARCHAR(50),
    second_logo_size_bytes INTEGER,
    
    -- General approach
    general_approach TEXT,
    
    -- Stage-specific preferences (JSONB for flexibility)
    structuring_preferences JSONB DEFAULT '{
        "diagnose": "",
        "echo": "",
        "traceback": "",
        "solution": ""
    }',
    
    visuals_preferences JSONB DEFAULT '{
        "ideation": "",
        "planning": "",
        "sketching": ""
    }',
    
    solutioning_preferences JSONB DEFAULT '{
        "structure": "",
        "analysis": "",
        "stack": "",
        "enhance": "",
        "formatting": ""
    }',
    
    pushing_preferences JSONB DEFAULT '{
        "structuringToVisuals": "",
        "visualsToSolutioning": "",
        "solutioningToSOW": "",
        "sowToLOE": ""
    }',
    
    -- Audit trail (JSONB array for schema flexibility)
    change_history JSONB DEFAULT '[]',
    -- Structure: [{ "timestamp": ISO8601, "user_id": UUID, "field": string, "old_value": any, "new_value": any }]
    
    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    created_by UUID REFERENCES users(id),
    updated_by UUID REFERENCES users(id),
    
    -- Constraints
    CONSTRAINT main_logo_size_check CHECK (main_logo_size_bytes IS NULL OR main_logo_size_bytes <= 5242880),  -- 5MB max
    CONSTRAINT second_logo_size_check CHECK (second_logo_size_bytes IS NULL OR second_logo_size_bytes <= 5242880),
    CONSTRAINT general_approach_length CHECK (char_length(general_approach) <= 5000),
    CONSTRAINT valid_main_logo_mime CHECK (main_logo_mime_type IS NULL OR main_logo_mime_type IN ('image/png', 'image/jpeg', 'image/jpg', 'image/webp')),
    CONSTRAINT valid_second_logo_mime CHECK (second_logo_mime_type IS NULL OR second_logo_mime_type IN ('image/png', 'image/jpeg', 'image/jpg', 'image/webp'))
);

-- Indexes
CREATE INDEX idx_org_preferences_org_id ON organization_preferences(organization_id);
CREATE INDEX idx_org_preferences_updated_at ON organization_preferences(updated_at);

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION update_organization_preferences_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_organization_preferences_timestamp
    BEFORE UPDATE ON organization_preferences
    FOR EACH ROW
    EXECUTE FUNCTION update_organization_preferences_updated_at();
```

### **Prisma Schema Addition**

```prisma
model OrganizationPreference {
  id                      String       @id @default(dbgenerated("uuid_generate_v4()")) @db.Uuid
  organizationId          String       @unique @map("organization_id") @db.Uuid
  
  // Logos
  mainLogo                String?      @map("main_logo") @db.Text
  mainLogoFilename        String?      @map("main_logo_filename") @db.VarChar(255)
  mainLogoMimeType        String?      @map("main_logo_mime_type") @db.VarChar(50)
  mainLogoSizeBytes       Int?         @map("main_logo_size_bytes")
  
  secondLogo              String?      @map("second_logo") @db.Text
  secondLogoFilename      String?      @map("second_logo_filename") @db.VarChar(255)
  secondLogoMimeType      String?      @map("second_logo_mime_type") @db.VarChar(50)
  secondLogoSizeBytes     Int?         @map("second_logo_size_bytes")
  
  // Preferences
  generalApproach         String?      @map("general_approach") @db.Text
  structuringPreferences  Json         @default("{\"diagnose\": \"\", \"echo\": \"\", \"traceback\": \"\", \"solution\": \"\"}") @map("structuring_preferences")
  visualsPreferences      Json         @default("{\"ideation\": \"\", \"planning\": \"\", \"sketching\": \"\"}") @map("visuals_preferences")
  solutioningPreferences  Json         @default("{\"structure\": \"\", \"analysis\": \"\", \"stack\": \"\", \"enhance\": \"\", \"formatting\": \"\"}") @map("solutioning_preferences")
  pushingPreferences      Json         @default("{\"structuringToVisuals\": \"\", \"visualsToSolutioning\": \"\", \"solutioningToSOW\": \"\", \"sowToLOE\": \"\"}") @map("pushing_preferences")
  
  // Audit
  changeHistory           Json         @default("[]") @map("change_history")
  
  // System
  createdAt               DateTime     @default(now()) @map("created_at")
  updatedAt               DateTime     @updatedAt @map("updated_at")
  createdBy               String?      @map("created_by") @db.Uuid
  updatedBy               String?      @map("updated_by") @db.Uuid
  
  // Relations
  organization            Organization @relation(fields: [organizationId], references: [id], onDelete: Cascade)
  creator                 User?        @relation("PreferenceCreator", fields: [createdBy], references: [id])
  updater                 User?        @relation("PreferenceUpdater", fields: [updatedBy], references: [id])
  
  @@map("organization_preferences")
}

// Add to Organization model:
model Organization {
  // ... existing fields ...
  preferences           OrganizationPreference?
  // ... rest of model ...
}

// Add to User model:
model User {
  // ... existing fields ...
  createdPreferences    OrganizationPreference[] @relation("PreferenceCreator")
  updatedPreferences    OrganizationPreference[] @relation("PreferenceUpdater")
  // ... rest of model ...
}
```

### **Database Constraints & Validation Summary**

| Field | Constraint | Reason |
|-------|-----------|--------|
| `main_logo` | Max 5MB (5,242,880 bytes) | Prevent database bloat, performance |
| `second_logo` | Max 5MB (5,242,880 bytes) | Same as above |
| `general_approach` | Max 5,000 characters | Reasonable limit for approach text |
| Logo MIME types | PNG, JPEG, JPG, WEBP only | Supported by PDF renderer |
| `organization_id` | UNIQUE | One preference set per organization |
| JSONB fields | No NULL | Always have valid structure |

---

## 🔌 API ENDPOINTS DESIGN

### **1. Get Organization Preferences**

```typescript
// File: src/app/api/organizations/[orgId]/preferences/route.ts

GET /api/organizations/[orgId]/preferences

// Response:
{
  success: boolean
  preferences: {
    mainLogo: string | null          // Base64 data URL
    secondLogo: string | null         // Base64 data URL
    generalApproach: string
    structuring: {
      diagnose: string
      echo: string
      traceback: string
      solution: string
    }
    visuals: {
      ideation: string
      planning: string
      sketching: string
    }
    solutioning: {
      structure: string
      analysis: string
      stack: string
      enhance: string
      formatting: string
    }
    pushing: {
      structuringToVisuals: string
      visualsToSolutioning: string
      solutioningToSOW: string
      sowToLOE: string
    }
    metadata: {
      createdAt: string
      updatedAt: string
      updatedBy: { id: string, name: string }
    }
  }
}

// RBAC: Any member can view
// Fallback: If no preferences exist, return empty defaults
```

### **2. Update Organization Preferences**

```typescript
// File: src/app/api/organizations/[orgId]/preferences/route.ts

PUT /api/organizations/[orgId]/preferences

// Request Body:
{
  generalApproach?: string
  structuring?: { diagnose?: string, echo?: string, ... }
  visuals?: { ideation?: string, ... }
  solutioning?: { structure?: string, ... }
  pushing?: { structuringToVisuals?: string, ... }
}

// Response:
{
  success: boolean
  preferences: { ... }  // Updated preferences
  changeHistory: {      // Latest change entry
    timestamp: string
    userId: string
    userName: string
    changedFields: string[]
  }
}

// RBAC: Owner or Admin only
// Audit: Automatically logs changes to change_history JSONB
```

### **3. Upload Logo**

```typescript
// File: src/app/api/organizations/[orgId]/preferences/upload-logo/route.ts

POST /api/organizations/[orgId]/preferences/upload-logo

// Request: FormData with:
// - file: File (image)
// - logoType: 'main' | 'second'

// Response:
{
  success: boolean
  logoData: string     // Base64 data URL
  metadata: {
    filename: string
    mimeType: string
    sizeBytes: number
  }
}

// Validation:
// - Max size: 5MB
// - Allowed types: PNG, JPEG, JPG, WEBP
// - Converts to base64 immediately
// - Updates organization_preferences table

// RBAC: Owner or Admin only
```

### **4. Delete Logo**

```typescript
// File: src/app/api/organizations/[orgId]/preferences/delete-logo/route.ts

DELETE /api/organizations/[orgId]/preferences/delete-logo

// Request Body:
{
  logoType: 'main' | 'second'
}

// Response:
{
  success: boolean
  message: string
}

// RBAC: Owner or Admin only
```

### **5. Get Preferences for Prompt Injection** (Internal)

```typescript
// File: src/lib/preferences/preferences-service.ts

async function getPreferencesForPrompt(
  organizationId: string,
  promptType: 'structuring_diagnose' | 'generate_solution' | 'visuals_planning' | ...
): Promise<{
  generalApproach: string
  stageSpecific: string
  pushingContext?: string
}>

// Used by LangChain functions before invoking prompts
// Fetches from database, caches for performance
// Returns empty strings if no preferences set
```

---

## 🧠 PROMPT VARIABLE MAPPING

### **Strategy: Append Preferences as Context Variables**

Each prompt will receive **2 additional variables**:
1. `organization_general_approach` - Always included
2. `stage_specific_preference` - Specific to the operation

### **Detailed Mapping Table**

| Prompt | Original Variables | New Variables Added | Preference Source |
|--------|-------------------|---------------------|------------------|
| **nexa-structuring-painpoints** | `transcript` | `organization_general_approach`<br>`diagnose_preference` | `general_approach`<br>`structuring.diagnose` |
| **nexa-generate-solution** | `content`, `painpoints`, `report` | `organization_general_approach`<br>`solution_preference`<br>`echo_context`<br>`traceback_context` | `general_approach`<br>`structuring.solution`<br>`structuring.echo`<br>`structuring.traceback` |
| **nexa-visuals-planning** | `solution` | `organization_general_approach`<br>`ideation_preference`<br>`planning_preference` | `general_approach`<br>`visuals.ideation`<br>`visuals.planning` |
| **nexa-visuals-sketch** | `planning` | `organization_general_approach`<br>`sketching_preference` | `general_approach`<br>`visuals.sketching` |
| **nexa-solutioning-vision** | image + text | `organization_general_approach`<br>`analysis_preference` | `general_approach`<br>`solutioning.analysis` |
| **nexa-solutioning-enhance** | `explanation` | `organization_general_approach`<br>`enhance_preference` | `general_approach`<br>`solutioning.enhance` |
| **nexa-solutioning-structure** | `ai_analysis`, `solution_explanation` | `organization_general_approach`<br>`structure_preference` | `general_approach`<br>`solutioning.structure` |
| **nexa-solutioning-pernode** | `context` | `organization_general_approach`<br>`stack_preference` | `general_approach`<br>`solutioning.stack` |
| **nexa-push-tosow** | `SOLUTIONING_DATA_WILL_BE_INSERTED_HERE` | `organization_general_approach`<br>`push_sow_preference` | `general_approach`<br>`pushing.solutioningToSOW` |
| **nexa-push-toloe** | `SOW_DATA_WILL_BE_INSERTED_HERE` | `organization_general_approach`<br>`push_loe_preference` | `general_approach`<br>`pushing.sowToLOE` |

### **Example: Before & After**

**BEFORE** (Structuring Pain Points):
```typescript
const result = await promptWithModel.invoke({
  transcript: combinedContent
})
```

**AFTER** (With Preferences):
```typescript
// 1. Fetch preferences
const prefs = await getPreferencesForPrompt(organizationId, 'structuring_diagnose')

// 2. Invoke with additional context
const result = await promptWithModel.invoke({
  transcript: combinedContent,
  organization_general_approach: prefs.generalApproach || '',
  diagnose_preference: prefs.stageSpecific || ''
})
```

### **Fallback Behavior**

- If NO preferences exist → Variables receive empty strings `""`
- LangSmith prompts should be updated to handle optional context
- Example prompt instruction: *"If organization_general_approach is provided, use it to guide your analysis style. Otherwise, use default best practices."*

---

## 📄 PDF GENERATION INTEGRATION

### **Current Problem**

PDF generator has **hardcoded logos** in `pdf_generator.py`:

```python
# Line 26 - HARDCODED
logo_path = os.path.join(curr_dir, 'Dry Ground AI_Full Logo_Black_RGB.png')

# Line 32 - HARDCODED  
dg_logo_path = os.path.join(curr_dir, 'dg.png')
```

### **Solution: Pass Logos as Base64 Parameters**

**1. Update PDF Generation Functions**

```python
def generate_pdf(output_path, data, organization_preferences=None):
    """
    Args:
        organization_preferences: {
            'main_logo_base64': str,      # Base64 data (optional)
            'second_logo_base64': str,    # Base64 data (optional)
        }
    """
    
    # Use organization logos if provided, otherwise fallback to defaults
    if organization_preferences and organization_preferences.get('main_logo_base64'):
        logo_base64 = organization_preferences['main_logo_base64']
    else:
        # Fallback to default Dry Ground AI logo
        logo_path = os.path.join(curr_dir, 'Dry Ground AI_Full Logo_Black_RGB.png')
        with open(logo_path, 'rb') as f:
            logo_data = f.read()
            logo_base64 = base64.b64encode(logo_data).decode('utf-8')
    
    # Same for second logo
    if organization_preferences and organization_preferences.get('second_logo_base64'):
        dg_logo_base64 = organization_preferences['second_logo_base64']
    else:
        # Fallback to default dg.png
        dg_logo_path = os.path.join(curr_dir, 'dg.png')
        with open(dg_logo_path, 'rb') as f:
            dg_logo_data = f.read()
            dg_logo_base64 = base64.b64encode(dg_logo_data).decode('utf-8')
```

**2. Update API Routes That Call PDF Service**

```typescript
// In all PDF generation API routes, add:

// Fetch organization preferences
const preferences = await prisma.organizationPreference.findUnique({
  where: { organizationId: orgId },
  select: { mainLogo: true, secondLogo: true }
})

// Pass to PDF service
const pdfData = {
  ...existingData,
  organization_preferences: {
    main_logo_base64: preferences?.mainLogo || null,
    second_logo_base64: preferences?.secondLogo || null
  }
}
```

**3. Base64 Format in Database**

Logos stored as **complete Data URLs**:
```
data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...
```

This allows:
- Direct use in HTML `<img src="{logo}">` tags
- No additional parsing needed
- Consistent with visuals page pattern

---

## 🎨 FRONTEND IMPLEMENTATION

### **1. Backdrop Tab Updates**

**File: `/src/app/grid/page.tsx`**

```typescript
// Add at top with other imports
import { useUser } from '@/contexts/user-context'

// Add after existing state
const { selectedOrganization, user } = useUser()
const [saving, setSaving] = useState(false)
const [loading, setLoading] = useState(false)

// Fetch preferences on mount/org change
useEffect(() => {
  if (selectedOrganization) {
    loadPreferences()
  }
}, [selectedOrganization])

async function loadPreferences() {
  if (!selectedOrganization) return
  
  setLoading(true)
  try {
    const response = await fetch(
      `/api/organizations/${selectedOrganization.organization.id}/preferences`
    )
    const data = await response.json()
    
    if (data.success && data.preferences) {
      // Populate state with fetched preferences
      setBackdropData({
        general: data.preferences.generalApproach || '',
        structuring: data.preferences.structuring,
        visuals: data.preferences.visuals,
        solutioning: data.preferences.solutioning,
        pushing: data.preferences.pushing
      })
      
      // Handle logos
      if (data.preferences.mainLogo) {
        // Convert base64 back to display format
        setMainLogoPreview(data.preferences.mainLogo)
      }
      if (data.preferences.secondLogo) {
        setSecondLogoPreview(data.preferences.secondLogo)
      }
    }
  } catch (error) {
    console.error('Failed to load preferences:', error)
  } finally {
    setLoading(false)
  }
}

async function savePreferences() {
  if (!selectedOrganization) {
    alert('Please select an organization')
    return
  }
  
  // Check RBAC
  const userRole = selectedOrganization.role
  if (userRole !== 'owner' && userRole !== 'admin') {
    alert('Only owners and admins can edit preferences')
    return
  }
  
  setSaving(true)
  try {
    const response = await fetch(
      `/api/organizations/${selectedOrganization.organization.id}/preferences`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          generalApproach: backdropData.general,
          structuring: backdropData.structuring,
          visuals: backdropData.visuals,
          solutioning: backdropData.solutioning,
          pushing: backdropData.pushing
        })
      }
    )
    
    const data = await response.json()
    
    if (data.success) {
      alert('Preferences saved successfully!')
    } else {
      alert(`Failed to save: ${data.error}`)
    }
  } catch (error) {
    console.error('Save error:', error)
    alert('Network error while saving')
  } finally {
    setSaving(false)
  }
}

async function uploadLogo(file: File, type: 'main' | 'second') {
  if (!selectedOrganization) return
  
  // Validate file
  if (!['image/png', 'image/jpeg', 'image/jpg', 'image/webp'].includes(file.type)) {
    alert('Please upload PNG, JPEG, or WEBP images only')
    return
  }
  
  if (file.size > 5 * 1024 * 1024) {
    alert('File too large. Maximum size is 5MB.')
    return
  }
  
  const formData = new FormData()
  formData.append('file', file)
  formData.append('logoType', type)
  
  try {
    const response = await fetch(
      `/api/organizations/${selectedOrganization.organization.id}/preferences/upload-logo`,
      { method: 'POST', body: formData }
    )
    
    const data = await response.json()
    
    if (data.success) {
      if (type === 'main') {
        setMainLogoPreview(data.logoData)
      } else {
        setSecondLogoPreview(data.logoData)
      }
      alert('Logo uploaded successfully!')
    }
  } catch (error) {
    console.error('Upload error:', error)
    alert('Failed to upload logo')
  }
}
```

**2. RBAC UI Enforcement**

```typescript
// Add conditional rendering based on role
const canEdit = selectedOrganization && 
  (selectedOrganization.role === 'owner' || selectedOrganization.role === 'admin')

// Disable all inputs if canEdit is false
<textarea
  value={backdropData.general}
  onChange={(e) => updateBackdropGeneral(e.target.value)}
  disabled={!canEdit}  // ← Add this
  className={!canEdit ? 'opacity-50 cursor-not-allowed' : ''}
/>

// Show save button only for owners/admins
{canEdit && (
  <Button onClick={savePreferences} disabled={saving}>
    {saving ? 'Saving...' : 'Save Preferences'}
  </Button>
)}

// Show read-only indicator for non-editors
{!canEdit && (
  <div className="text-yellow-400 text-sm flex items-center gap-2">
    <Lock className="w-4 h-4" />
    Read-only: Only owners and admins can edit
  </div>
)}
```

---

## 🔐 RBAC IMPLEMENTATION

### **Permission Matrix**

| Role | View Preferences | Edit Preferences | Upload Logos | View Audit History |
|------|-----------------|------------------|--------------|-------------------|
| **Owner** | ✅ | ✅ | ✅ | ✅ |
| **Admin** | ✅ | ✅ | ✅ | ✅ |
| **Member** | ✅ | ❌ | ❌ | ❌ |
| **Viewer** | ✅ | ❌ | ❌ | ❌ |
| **Billing** | ✅ | ❌ | ❌ | ❌ |

### **API Endpoint RBAC Implementation**

```typescript
// GET /api/organizations/[orgId]/preferences
// Allow: All roles (requireOrganizationAccess)
const roleInfo = await requireOrganizationAccess(request, orgId)

// PUT /api/organizations/[orgId]/preferences  
// Allow: Owner, Admin only
const roleInfo = await requireOrganizationAccess(request, orgId)
if (!roleInfo || !['owner', 'admin'].includes(roleInfo.role)) {
  return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
}

// POST /api/organizations/[orgId]/preferences/upload-logo
// Allow: Owner, Admin only
const roleInfo = await requireOrganizationAccess(request, orgId)
if (!roleInfo || !['owner', 'admin'].includes(roleInfo.role)) {
  return NextResponse.json({ error: 'Admin access required' }, { status: 403 })
}
```

---

## ⚠️ RISK ASSESSMENT & MITIGATION

### **🔴 HIGH-RISK ITEMS**

#### **Risk 1: Base64 Database Bloat**

**Problem**: Storing 5MB base64 images directly in PostgreSQL can cause:
- Increased database size
- Slower backup/restore operations
- Performance degradation on queries

**Mitigation**:
- ✅ **Enforce 5MB hard limit** on logo uploads
- ✅ **Compress images before encoding** (use Sharp/Jimp)
- ✅ **Monitor database size** - set up alerts
- ✅ **Consider migration to S3** if >100 organizations with logos
- ✅ **Index organization_id** for fast lookups
- ⚠️ **Future**: Add `logoUrl` field pointing to S3, deprecate base64

**Decision Point**: Start with base64 (faster implementation), monitor size, migrate to S3 if necessary

#### **Risk 2: Prompt Variable Conflicts**

**Problem**: Adding new variables to existing LangSmith prompts might:
- Break existing prompts if variable names conflict
- Cause unexpected AI behavior if prompts aren't updated
- Require prompt retraining/testing

**Mitigation**:
- ✅ **Use prefixed variable names**: `organization_*` and `*_preference`
- ✅ **Make all new variables optional** in prompts
- ✅ **Test each prompt** before/after preference injection
- ✅ **Gradual rollout**: Enable per-organization with feature flag
- ✅ **Fallback behavior**: Empty strings if preferences don't exist
- 📝 **Update LangSmith prompts** to explicitly handle preference variables

**Testing Required**:
```
For each of 13 prompts:
1. Test with NO preferences (empty strings)
2. Test with GENERIC preferences
3. Test with DETAILED preferences
4. Verify output quality doesn't degrade
```

#### **Risk 3: Race Conditions on Preference Updates**

**Problem**: Multiple admins editing preferences simultaneously could:
- Overwrite each other's changes
- Corrupt JSONB structure
- Lose audit history

**Mitigation**:
- ✅ **Optimistic locking**: Include `updated_at` in PUT request, verify on update
- ✅ **Transaction wrapper**: Use Prisma transactions for updates
- ✅ **Change history**: JSONB array captures all changes
- ✅ **UI feedback**: Show "Updated by X at Y" before editing
- ⚠️ **Future**: Add WebSocket for real-time conflict detection

**Implementation**:
```typescript
// Optimistic locking example
const currentPrefs = await prisma.organizationPreference.findUnique({
  where: { organizationId: orgId }
})

if (currentPrefs.updatedAt.getTime() !== request.body.lastKnownUpdatedAt) {
  return NextResponse.json({
    error: 'Preferences were updated by another user. Please refresh.',
    conflictData: currentPrefs
  }, { status: 409 })
}
```

### **🟡 MEDIUM-RISK ITEMS**

#### **Risk 4: PDF Generation Failures with Custom Logos**

**Problem**: User-uploaded logos might:
- Have invalid base64 encoding
- Be too large for Playwright to render
- Cause PDF generation to fail

**Mitigation**:
- ✅ **Validate base64** before saving to database
- ✅ **Fallback to default logos** if custom logos fail
- ✅ **Wrap PDF generation in try-catch** with fallback
- ✅ **Test logo rendering** on upload (generate test PDF snippet)
- ✅ **Log failures** with Sentry for debugging

```python
try:
    if organization_preferences and organization_preferences.get('main_logo_base64'):
        logo_base64 = organization_preferences['main_logo_base64']
    else:
        raise ValueError("Using default logo")
except Exception as e:
    logging.warning(f"Custom logo failed, using default: {e}")
    # Fallback to default logo
    logo_path = os.path.join(curr_dir, 'Dry Ground AI_Full Logo_Black_RGB.png')
    with open(logo_path, 'rb') as f:
        logo_base64 = base64.b64encode(f.read()).decode('utf-8')
```

#### **Risk 5: Preference Text Length Exceeds Token Limits**

**Problem**: If `general_approach` or stage preferences are too long:
- Might exceed OpenAI token limits
- Increase API costs significantly
- Cause prompt failures

**Mitigation**:
- ✅ **Frontend character limits**: Show count, warn at 4000 chars
- ✅ **Database constraint**: 5000 char limit
- ✅ **Token estimation**: Count tokens before sending to OpenAI
- ✅ **Truncate if needed**: Summarize long preferences
- ✅ **Cost monitoring**: Track token usage per organization

**UI Implementation**:
```typescript
<div>
  <textarea maxLength={5000} value={text} onChange={...} />
  <div className={charCount > 4000 ? 'text-yellow-400' : 'text-gray-400'}>
    {charCount} / 5000 characters
    {charCount > 4000 && ' (Warning: Long text increases AI costs)'}
  </div>
</div>
```

### **🟢 LOW-RISK ITEMS**

#### **Risk 6: Browser Performance with Large Base64 Images**

**Problem**: Rendering 5MB base64 images in browser might cause:
- Slow page loads
- High memory usage
- UI lag

**Mitigation**:
- ✅ **Lazy load images**: Only load when Backdrop tab is active
- ✅ **Thumbnail generation**: Show compressed preview, full res on hover
- ✅ **Limit display size**: CSS max-width: 200px for previews

#### **Risk 7: Audit History JSONB Growth**

**Problem**: `change_history` JSONB array could grow unbounded

**Mitigation**:
- ✅ **Keep last 50 changes** only (LIFO queue)
- ✅ **Archive old changes** to separate table if needed
- ✅ **Prune on update**: Automatically trim array

```sql
-- Example: Keep only last 50 entries
UPDATE organization_preferences
SET change_history = (
  SELECT jsonb_agg(entry)
  FROM (
    SELECT entry FROM jsonb_array_elements(change_history) entry
    ORDER BY entry->>'timestamp' DESC
    LIMIT 50
  ) subq
)
WHERE jsonb_array_length(change_history) > 50;
```

---

## 🛠️ IMPLEMENTATION PHASES

### **Phase 1: Database & Backend (Day 1)**

**Tasks**:
1. ✅ Create SQL migration script for `organization_preferences` table
2. ✅ Update Prisma schema
3. ✅ Run `prisma generate` and `prisma db push`
4. ✅ Create preferences service (`src/lib/preferences/preferences-service.ts`)
5. ✅ Create API endpoints:
   - GET `/api/organizations/[orgId]/preferences/route.ts`
   - PUT `/api/organizations/[orgId]/preferences/route.ts`
   - POST `/api/organizations/[orgId]/preferences/upload-logo/route.ts`
   - DELETE `/api/organizations/[orgId]/preferences/delete-logo/route.ts`
6. ✅ Test all endpoints with Postman/Thunder Client

**Validation**:
- [ ] Can create preferences for org
- [ ] Can fetch preferences
- [ ] Can update preferences
- [ ] Can upload/delete logos
- [ ] RBAC enforcement works
- [ ] Audit history populates

---

### **Phase 2: Frontend Integration (Day 2)**

**Tasks**:
1. ✅ Update Backdrop tab to fetch preferences on load
2. ✅ Implement save button with RBAC check
3. ✅ Add logo upload UI with drag-and-drop
4. ✅ Add character count indicators
5. ✅ Add read-only mode for non-admins
6. ✅ Add loading states and error handling
7. ✅ Test cross-organization switching

**Validation**:
- [ ] Preferences load correctly
- [ ] Save button only shows for owner/admin
- [ ] Logo upload works
- [ ] Character limits enforced
- [ ] Switching orgs loads different preferences

---

### **Phase 3: Prompt Integration (Day 3)**

**Tasks**:
1. ✅ Update all 13 LangSmith prompts to accept new variables
2. ✅ Update LangChain functions to fetch preferences before invoke:
   - `analyzePainPoints` in `structuring.ts`
   - `generateSolution` in `structuring.ts`
   - `generatePlanningFromIdeation` in `visuals.ts`
   - `generateSketchFromPlanning` in `visuals.ts`
   - `analyzeImageWithVision` in `solutioning.ts`
   - `enhanceTextWithLangSmith` in `solutioning.ts`
   - `structureSolutionWithLangSmith` in `solutioning.ts`
   - `analyzePerNodeStackWithLangSmith` in `solutioning.ts`
   - `generateSOWWithLangSmith` in `solutioning.ts`
   - `generateLOEWithLangSmith` in `solutioning.ts`
3. ✅ Implement preferences caching (5 min TTL)
4. ✅ Test each prompt with/without preferences

**Example Update**:
```typescript
// Before:
export async function analyzePainPoints(request: StructuringRequest): Promise<...> {
  const result = await promptWithModel.invoke({
    transcript: combinedContent
  })
}

// After:
export async function analyzePainPoints(
  request: StructuringRequest, 
  organizationId: string  // ← NEW
): Promise<...> {
  // Fetch preferences
  const prefs = await getPreferencesForPrompt(organizationId, 'structuring_diagnose')
  
  const result = await promptWithModel.invoke({
    transcript: combinedContent,
    organization_general_approach: prefs.generalApproach || '',  // ← NEW
    diagnose_preference: prefs.stageSpecific || ''              // ← NEW
  })
}
```

**Validation**:
- [ ] All prompts receive preference variables
- [ ] Empty preferences don't break prompts
- [ ] AI output quality maintained/improved
- [ ] No token limit errors

---

### **Phase 4: PDF Integration (Day 4)**

**Tasks**:
1. ✅ Update `pdf_generator.py` to accept `organization_preferences` parameter
2. ✅ Modify all 3 PDF generation functions:
   - `generate_pdf` (Solutioning)
   - `generate_sow_pdf_document` (SOW)
   - `generate_loe_pdf_document` (LOE)
3. ✅ Update Next.js API routes that call PDF service to pass logos
4. ✅ Test PDF generation with custom logos
5. ✅ Test fallback to default logos

**Files to Update**:
- `/pdf-service/pdf_generator.py` (3 functions)
- `/src/app/api/organizations/[orgId]/solutioning/generate-pdf/route.ts`
- `/src/app/api/organizations/[orgId]/sow/generate-pdf/route.ts`
- `/src/app/api/organizations/[orgId]/loe/generate-pdf/route.ts`

**Validation**:
- [ ] Custom logos appear in PDFs
- [ ] Fallback works if no custom logos
- [ ] PDF quality unchanged
- [ ] All 3 document types work

---

### **Phase 5: Testing & Polish (Ongoing)**

**Tasks**:
1. ✅ E2E testing across all 5 tools
2. ✅ Cross-organization testing
3. ✅ Performance testing (large preferences, large logos)
4. ✅ Error handling edge cases
5. ✅ Documentation updates

---

## 📋 IMPLEMENTATION CHECKLIST

### **Database Setup**
- [ ] Write SQL migration script for `organization_preferences` table
- [ ] Update Prisma schema with new model
- [ ] Run `prisma generate`
- [ ] Run database migration (or `prisma db push`)
- [ ] Verify table created with correct constraints
- [ ] Test UNIQUE constraint on organization_id

### **Backend API**
- [ ] Create `src/lib/preferences/preferences-service.ts`
  - [ ] `getPreferences(organizationId)`
  - [ ] `updatePreferences(organizationId, data, userId)`
  - [ ] `uploadLogo(organizationId, file, type)`
  - [ ] `deleteLogo(organizationId, type)`
  - [ ] `getPreferencesForPrompt(organizationId, promptType)`
- [ ] Create GET `/api/organizations/[orgId]/preferences/route.ts`
  - [ ] Implement RBAC (all roles can view)
  - [ ] Return defaults if no preferences exist
  - [ ] Include metadata (updated_at, updated_by)
- [ ] Create PUT `/api/organizations/[orgId]/preferences/route.ts`
  - [ ] Implement RBAC (owner/admin only)
  - [ ] Validate input data
  - [ ] Update change_history JSONB
  - [ ] Return updated preferences
- [ ] Create POST `/api/organizations/[orgId]/preferences/upload-logo/route.ts`
  - [ ] Validate file type (PNG, JPEG, WEBP)
  - [ ] Validate file size (max 5MB)
  - [ ] Convert to base64
  - [ ] Store in database
  - [ ] Return data URL
- [ ] Create DELETE `/api/organizations/[orgId]/preferences/delete-logo/route.ts`
  - [ ] RBAC enforcement
  - [ ] Set logo field to NULL
- [ ] Test all endpoints with Thunder Client/Postman

### **Frontend Updates**
- [ ] Update `/src/app/grid/page.tsx`
  - [ ] Import `useUser()` hook
  - [ ] Add preferences loading on mount
  - [ ] Add save button handler
  - [ ] Add logo upload handlers
  - [ ] Add RBAC UI enforcement
  - [ ] Add character count indicators
  - [ ] Add loading/error states
  - [ ] Add read-only indicator for non-admins
  - [ ] Test organization switching

### **LangChain Integration**
- [ ] Update LangSmith prompts (in LangSmith platform)
  - [ ] Add `organization_general_approach` variable to all prompts
  - [ ] Add stage-specific variables to each prompt
  - [ ] Update prompt instructions to use preferences
  - [ ] Test prompts with/without variables
- [ ] Update `src/lib/langchain/structuring.ts`
  - [ ] `analyzePainPoints`: Add organizationId param, fetch prefs
  - [ ] `generateSolution`: Add organizationId param, fetch prefs
- [ ] Update `src/lib/langchain/visuals.ts`
  - [ ] `generatePlanningFromIdeation`: Add organizationId, fetch prefs
  - [ ] `generateSketchFromPlanning`: Add organizationId, fetch prefs
- [ ] Update `src/lib/langchain/solutioning.ts`
  - [ ] `analyzeImageWithVision`: Add organizationId, fetch prefs
  - [ ] `enhanceTextWithLangSmith`: Add organizationId, fetch prefs
  - [ ] `structureSolutionWithLangSmith`: Add organizationId, fetch prefs
  - [ ] `analyzePerNodeStackWithLangSmith`: Add organizationId, fetch prefs
  - [ ] `generateSOWWithLangSmith`: Add organizationId, fetch prefs
  - [ ] `generateLOEWithLangSmith`: Add organizationId, fetch prefs
- [ ] Update all API routes that call LangChain functions
  - [ ] Pass organizationId to LangChain functions
  - [ ] Verify organization context exists

### **PDF Integration**
- [ ] Update `/pdf-service/pdf_generator.py`
  - [ ] `generate_pdf`: Add organization_preferences param
  - [ ] `generate_sow_pdf_document`: Add organization_preferences param
  - [ ] `generate_loe_pdf_document`: Add organization_preferences param

### **Testing**
- [ ] Unit tests for preferences service
- [ ] API endpoint tests (all CRUD operations)
- [ ] RBAC enforcement tests
- [ ] Logo upload/delete tests
- [ ] Prompt integration tests (all 13 prompts)
- [ ] PDF generation tests (all 3 document types)
- [ ] Cross-organization isolation tests
- [ ] Performance tests (large preferences, large logos)
- [ ] Edge case tests (empty prefs, missing org, etc.)

### **Documentation**
- [ ] Update API documentation
- [ ] Create admin guide for preferences
- [ ] Update prompt engineering guide
- [ ] Document preference variable naming conventions

---

## 🎯 SUCCESS CRITERIA

### **Functional Requirements**
- ✅ Owners and admins can create/edit preferences
- ✅ All members can view preferences
- ✅ Logos upload successfully (max 5MB)
- ✅ Preferences persist across sessions
- ✅ Preferences apply to all 13 AI prompts
- ✅ Custom logos appear in all 3 PDF types
- ✅ Fallback to defaults if no preferences exist
- ✅ Audit history tracks all changes

### **Non-Functional Requirements**
- ✅ Page load time <2 seconds with preferences
- ✅ Logo upload completes in <5 seconds
- ✅ AI prompt performance unchanged (<10% latency increase)
- ✅ Database size increase <100MB per 100 organizations
- ✅ No RBAC bypass vulnerabilities
- ✅ No XSS vulnerabilities from user input

### **User Experience**
- ✅ Clear indication of who can edit
- ✅ Helpful error messages
- ✅ Loading states for all async operations
- ✅ Character count warnings
- ✅ Confirmation on successful save

---

## 🚀 ROLLOUT STRATEGY

### **Option A: Big Bang (Recommended for MVP)**
1. Implement all phases
2. Test thoroughly in development
3. Deploy to production at once
4. Monitor for issues

**Pros**: Faster time to market, simpler  
**Cons**: Higher risk if issues occur

### **Option B: Gradual Rollout**
1. Deploy database + backend only
2. Enable for 1-2 test organizations
3. Monitor for 1 week
4. Deploy frontend + prompt integration
5. Enable for all organizations

**Pros**: Lower risk, easier to debug  
**Cons**: Longer timeline, more complex deployment

### **Recommendation**: Use Option A since this is not live yet

---

## 📊 MONITORING & METRICS

### **Key Metrics to Track**

| Metric | Target | Alert Threshold |
|--------|--------|----------------|
| Preferences API response time | <500ms | >1000ms |
| Logo upload success rate | >95% | <90% |
| PDF generation success rate | >98% | <95% |
| Database `organization_preferences` table size | <50MB | >100MB |
| AI prompt latency increase | <10% | >20% |
| RBAC bypass attempts | 0 | >0 |

### **Logging Strategy**

```typescript
// Log all preference updates
logger.info('Preference updated', {
  organizationId,
  userId,
  changedFields: ['generalApproach', 'structuring.diagnose'],
  timestamp: new Date()
})

// Log logo uploads
logger.info('Logo uploaded', {
  organizationId,
  logoType: 'main',
  fileSize: 2456789,
  mimeType: 'image/png'
})

// Log preference injection into prompts
logger.debug('Preferences injected into prompt', {
  organizationId,
  promptType: 'structuring_diagnose',
  preferenceLength: generalApproach.length
})
```

---

## 🔮 FUTURE ENHANCEMENTS

### **Phase 2 Features** (Post-MVP)

1. **Preference Templates**
   - Save common preference sets as templates
   - Share templates across organizations (with permission)
   - Template marketplace

2. **A/B Testing**
   - Test different preference sets
   - Track AI output quality metrics
   - Auto-select best-performing preferences

3. **Logo Gallery**
   - Store multiple logos per organization
   - Select different logos per document type
   - Logo version history

4. **Advanced Audit**
   - Detailed diff view of changes
   - Rollback to previous versions
   - Export audit log to CSV

5. **Preference Analytics**
   - Track which preferences improve AI output
   - Suggest optimal preferences based on usage
   - Industry-specific presets

6. **S3 Migration**
   - Move logo storage from base64 to S3
   - CDN integration for faster loads
   - Image optimization pipeline

---

## ✅ FINAL PRE-IMPLEMENTATION VERIFICATION

Before starting implementation, verify:

- [ ] User has approved this plan
- [ ] All 13 LangSmith prompts are accessible
- [ ] Database migration tools are ready
- [ ] PDF service is functional
- [ ] RBAC system is working
- [ ] Test organization exists for validation
- [ ] Backup of current database is taken

---

## 📞 SUPPORT & TROUBLESHOOTING

### **Common Issues**

**Issue**: "Logo upload fails with 413 error"  
**Solution**: Check Nginx/server max upload size, increase if needed

**Issue**: "Preferences not loading on page refresh"  
**Solution**: Check browser console for CORS errors, verify API endpoint

**Issue**: "AI responses don't reflect preferences"  
**Solution**: Verify LangSmith prompts were updated, check variable names

**Issue**: "PDF generation fails with custom logo"  
**Solution**: Validate base64 encoding, check Playwright logs, use fallback

---

## 🎓 CONCLUSION

This implementation plan provides a **complete, production-ready blueprint** for enabling the Backdrop tab functionality. The approach is:

✅ **Comprehensive** - Covers database, backend, frontend, AI, and PDF integration  
✅ **Risk-Aware** - Identifies and mitigates all major risks  
✅ **RBAC-Compliant** - Proper permission enforcement throughout  
✅ **Scalable** - Designed for growth and future enhancements  
✅ **Well-Documented** - Clear steps for implementation and testing  

**Estimated Total Implementation Time**: 3-4 days  
**Confidence Level**: High (95%+)  
**Expected Success Rate on First Deployment**: 90%+  

Ready to proceed with implementation! 🚀


