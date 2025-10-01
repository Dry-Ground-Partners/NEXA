# 🐛 BACKDROP TAB - ORGANIZATION MISMATCH ISSUE

## 📋 ISSUE SUMMARY

**Status**: Identified, Not Fixed  
**Severity**: High - Blocking Backdrop tab functionality  
**Date Identified**: 2025-09-30  
**Affects**: All users trying to access Backdrop preferences

---

## 🔍 PROBLEM DESCRIPTION

When users navigate to **Grid → Backdrop** tab, they receive a **403 Forbidden** error when trying to fetch or save organization preferences, despite being authenticated and having the correct permissions.

### **Error Message**
```
Error: Access denied - Organization membership required
```

---

## 🎯 ROOT CAUSE

**Mismatch between frontend state and actual user membership:**

The `selectedOrganization` in the user context contains an **incorrect organization ID** that the user doesn't actually belong to.

### **Evidence from Logs:**

```javascript
// What the frontend is trying to access:
Looking for org: d3c36598-9574-4bb4-8a37-5375d51e8723

// What the user actually belongs to:
User memberships: [{
  orgId: '2366be36-9505-4c93-8e70-24436de29420',
  role: 'owner',
  status: 'active'
}]

// Result:
Found membership: null  ← Membership not found!
```

---

## 🔬 TECHNICAL DETAILS

### **Authentication Flow:**

1. ✅ **User Authentication**: Token is valid, user found in database
2. ✅ **User Memberships**: User has 1 active organization membership
3. ❌ **Organization Match**: Frontend requests wrong organization
4. ❌ **RBAC Check Fails**: No matching membership found

### **Code Path:**

```typescript
// 1. Frontend (Grid Page)
const { selectedOrganization } = useUser()
// selectedOrganization.id = 'd3c36598-9574-4bb4-8a37-5375d51e8723' ❌

// 2. API Hook
const response = await fetch(`/api/organizations/${selectedOrganization.id}/preferences`)
// Sends wrong org ID to API

// 3. Backend (api-rbac.ts)
const membership = user.organizationMemberships?.find(
  m => m.organization.id === targetOrgId && m.status === 'active'
)
// targetOrgId = 'd3c36598-9574-4bb4-8a37-5375d51e8723'
// user memberships only contain '2366be36-9505-4c93-8e70-24436de29420'
// Result: membership = null

// 4. Response
if (!roleInfo.role || !roleInfo.userId) {
  return 403 Forbidden  ❌
}
```

---

## 🔎 INVESTIGATION STEPS TAKEN

### **1. Verified Authentication**
```
✅ Debug - Auth token exists: true
✅ Debug - Token payload: valid
✅ Debug - User from DB: mauricio@dryground.ai
✅ Debug - User status: active
✅ Debug - Organization memberships count: 1
```

### **2. Verified RBAC Logic**
```javascript
// Added debug logging to api-rbac.ts
🔍 RBAC Debug - Looking for org: d3c36598-9574-4bb4-8a37-5375d51e8723
🔍 RBAC Debug - User memberships: [{
  orgId: '2366be36-9505-4c93-8e70-24436de29420',
  role: 'owner',
  status: 'active'
}]
🔍 RBAC Debug - Found membership: null
```

### **3. Confirmed Frontend State**
```javascript
🔍 Preferences GET - roleInfo: {
  role: null,                                           ❌
  userId: 'ae2eac46-80fe-43b9-8b59-21fd4c823dcb',      ✅
  organizationId: 'd3c36598-9574-4bb4-8a37-5375d51e8723', ❌ Wrong!
  hasUser: true,                                        ✅
  membershipCount: 1                                    ✅
}
```

---

## 💡 HYPOTHESES

### **Why is the wrong organization selected?**

**Possible Causes:**

1. **Stale Local Storage**: Organization selection persisted from previous session
2. **Auto-Selection Bug**: `UserProvider` selects wrong org on login
3. **URL Parameter Override**: Organization ID from URL takes precedence
4. **Migration Issue**: User switched organizations but state didn't update
5. **Default Organization**: System defaults to first created org instead of user's membership

---

## ✅ SOLUTIONS

### **Immediate Fix (User-Side)**

**Manually switch to the correct organization:**
1. Look for organization switcher in UI (usually in header/sidebar)
2. Select organization: `2366be36-9505-4c93-8e70-24436de29420`
3. Refresh the page
4. Backdrop tab should now work

### **Code Fix (Developer-Side)**

**Option 1: Add Organization Validation**
```typescript
// In usePreferences hook or UserProvider
useEffect(() => {
  if (selectedOrganization && user?.organizationMemberships) {
    const isValidOrg = user.organizationMemberships.some(
      m => m.organization.id === selectedOrganization.id && m.status === 'active'
    )
    
    if (!isValidOrg) {
      // Auto-switch to first valid organization
      const validOrg = user.organizationMemberships.find(m => m.status === 'active')
      if (validOrg) {
        setSelectedOrganization(validOrg)
      }
    }
  }
}, [selectedOrganization, user])
```

**Option 2: Clear Invalid State on Login**
```typescript
// In login handler
const clearInvalidOrgState = () => {
  localStorage.removeItem('selectedOrganizationId')
  sessionStorage.removeItem('selectedOrganizationId')
}
```

**Option 3: Add Fallback in API Hook**
```typescript
// In usePreferences hook
const organizationId = selectedOrganization?.id || 
                      user?.organizationMemberships?.[0]?.organization.id

if (!organizationId) {
  return // Don't make API call without valid org
}
```

---

## 🔧 DEBUG COMMANDS

### **To identify the issue in production:**

```javascript
// Add to Grid page console
const { selectedOrganization, user } = useUser()

console.log('Selected Org:', selectedOrganization?.id)
console.log('Selected Org Name:', selectedOrganization?.organization?.name)
console.log('User Memberships:', user?.organizationMemberships?.map(m => ({
  id: m.organization.id,
  name: m.organization.name,
  role: m.role,
  status: m.status
})))
console.log('LocalStorage Org:', localStorage.getItem('selectedOrganizationId'))
console.log('SessionStorage Org:', sessionStorage.getItem('selectedOrganizationId'))
```

---

## 📊 IMPACT ANALYSIS

### **Affected Features:**
- ✅ **Sessions Tab**: Works (uses different auth flow)
- ❌ **Backdrop Tab**: Completely blocked
- ⚠️ **Other Org-Scoped Features**: Potentially affected if they rely on `selectedOrganization`

### **Workaround Available:**
✅ Yes - Users can manually switch organizations

### **Data Loss Risk:**
❌ None - No data is lost, just inaccessible

---

## 🎯 RECOMMENDED FIXES (Priority Order)

### **1. SHORT TERM (Immediate)**
- Add validation in `UserProvider` to auto-correct invalid organization selection
- Clear organization state on logout
- Add error boundary to show "Wrong organization" message instead of generic 403

### **2. MEDIUM TERM (Next Sprint)**
- Investigate why wrong organization is selected in the first place
- Add organization validation to all org-scoped API calls
- Implement organization switcher UI if not present
- Add "Active Organization" indicator in header

### **3. LONG TERM (Future)**
- Implement URL-based organization routing (`/org/[orgId]/grid`)
- Add multi-org context with proper state management
- Create organization migration tool for moved users
- Add telemetry to track organization mismatch occurrences

---

## 📝 RELATED FILES

- `/src/contexts/user-context.tsx` - Organization state management
- `/src/hooks/use-preferences.ts` - Preferences API hook
- `/src/lib/api-rbac.ts` - RBAC validation logic
- `/src/app/api/organizations/[orgId]/preferences/route.ts` - API endpoint

---

## 🧪 TESTING CHECKLIST

When implementing fix, verify:

- [ ] User can access Backdrop tab with correct organization
- [ ] Invalid organization selection is auto-corrected on page load
- [ ] Organization switcher updates `selectedOrganization` correctly
- [ ] Logout clears organization state
- [ ] Login auto-selects user's first active organization
- [ ] URL navigation preserves organization context
- [ ] Multi-org users can switch between organizations
- [ ] Single-org users don't see switcher
- [ ] 403 error provides helpful message about organization access

---

## 📌 NOTES

- This issue doesn't affect backend functionality - the API is correctly enforcing RBAC
- The problem is entirely in frontend state management
- Other endpoints (e.g., `/api/sessions`) work because they don't rely on `selectedOrganization`
- Debug logging has been added and should be removed after fix is confirmed

---

**Last Updated**: 2025-09-30  
**Status**: Documented, Awaiting Fix Implementation





