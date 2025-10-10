# RBAC Integration Test Guide

This guide provides manual testing steps to verify the Role-Based Access Control (RBAC) implementation is working correctly across all phases.

## Test Prerequisites

1. **User Accounts**: Create test accounts with different roles in the same organization:
   - `owner@test.com` (Owner role)
   - `admin@test.com` (Admin role) 
   - `billing@test.com` (Billing role)
   - `member@test.com` (Member role)
   - `viewer@test.com` (Viewer role)

2. **Test Organization**: All users should be members of the same test organization.

## Phase 1 & 2: UI Access Control Tests

### Test 1: Organization Page Access

**Owner User (`owner@test.com`)**:
- ✅ Can access `/organizations`
- ✅ Sees all tabs: All, Access, Billing, History
- ✅ In Access tab, sees all sections: Session Controls, Role Enforcement, Member Management

**Admin User (`admin@test.com`)**:
- ✅ Can access `/organizations`
- ✅ Sees tabs: All, Access, History
- ❌ Does NOT see: Billing tab
- ✅ In Access tab, sees only: Session Controls
- ❌ In Access tab, does NOT see: Role Enforcement, Member Management

**Billing User (`billing@test.com`)**:
- ✅ Can access `/organizations`
- ✅ Sees tabs: All, Billing, History
- ❌ Does NOT see: Access tab

**Member/Viewer Users (`member@test.com`, `viewer@test.com`)**:
- ❌ Cannot access `/organizations` (redirected to `/profile?tab=organizations`)
- ✅ In `/profile`, sees Organizations tab
- ✅ Organizations tab shows organization switcher and read-only overview

### Test 2: Profile Page Access

**All Users**:
- ✅ Can access `/profile`
- ✅ See appropriate tabs based on role

**Member/Viewer Users Only**:
- ✅ See Organizations tab in `/profile`
- ✅ Can switch between organizations they have access to
- ✅ See read-only organization information
- ✅ See "Limited Access" notification

## Phase 3: API Protection Tests

### Test 3: Member Management APIs

**Test Endpoint**: `GET /api/organizations/[orgId]/members`

```bash
# Owner - Should succeed
curl -X GET "/api/organizations/test-org/members" \
  -H "Authorization: Bearer owner-token"

# Admin - Should succeed  
curl -X GET "/api/organizations/test-org/members" \
  -H "Authorization: Bearer admin-token"

# Billing - Should succeed
curl -X GET "/api/organizations/test-org/members" \
  -H "Authorization: Bearer billing-token"

# Member - Should fail (403)
curl -X GET "/api/organizations/test-org/members" \
  -H "Authorization: Bearer member-token"

# Viewer - Should fail (403)
curl -X GET "/api/organizations/test-org/members" \
  -H "Authorization: Bearer viewer-token"
```

### Test 4: Role Management APIs

**Test Endpoint**: `PATCH /api/organizations/[orgId]/members/[memberId]`

```bash
# Owner - Should succeed
curl -X PATCH "/api/organizations/test-org/members/member-id" \
  -H "Authorization: Bearer owner-token" \
  -H "Content-Type: application/json" \
  -d '{"action": "change_role", "role": "admin"}'

# Admin - Should fail (403)
curl -X PATCH "/api/organizations/test-org/members/member-id" \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{"action": "change_role", "role": "member"}'

# All others - Should fail (403)
```

### Test 5: Invitation APIs

**Test Endpoint**: `POST /api/organizations/[orgId]/invitations`

```bash
# Owner - Should succeed
curl -X POST "/api/organizations/test-org/invitations" \
  -H "Authorization: Bearer owner-token" \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser@test.com", "firstName": "New", "lastName": "User", "role": "member"}'

# Admin - Should fail (403) 
curl -X POST "/api/organizations/test-org/invitations" \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{"email": "newuser2@test.com", "firstName": "New", "lastName": "User", "role": "member"}'

# All others - Should fail (403)
```

### Test 6: Session Management APIs

**Test Endpoint**: `GET /api/organizations/[orgId]/sessions`

```bash
# Owner - Should succeed
curl -X GET "/api/organizations/test-org/sessions" \
  -H "Authorization: Bearer owner-token"

# Admin - Should succeed
curl -X GET "/api/organizations/test-org/sessions" \
  -H "Authorization: Bearer admin-token"

# Billing - Should fail (403)
curl -X GET "/api/organizations/test-org/sessions" \
  -H "Authorization: Bearer billing-token"

# Member/Viewer - Should fail (403)
```

## Test 7: Edge Cases and Error Scenarios

### Unauthorized Access
```bash
# No token - Should return 401
curl -X GET "/api/organizations/test-org/members"

# Invalid token - Should return 401  
curl -X GET "/api/organizations/test-org/members" \
  -H "Authorization: Bearer invalid-token"
```

### Cross-Organization Access
```bash
# User trying to access different organization - Should return 403
curl -X GET "/api/organizations/different-org/members" \
  -H "Authorization: Bearer member-token"
```

### Role Escalation Attempts
```bash
# Admin trying to promote themselves to owner - Should fail
curl -X PATCH "/api/organizations/test-org/members/admin-member-id" \
  -H "Authorization: Bearer admin-token" \
  -H "Content-Type: application/json" \
  -d '{"action": "change_role", "role": "owner"}'
```

## Expected Response Codes

| Role | Endpoint | Expected Code | Notes |
|------|----------|---------------|--------|
| Owner | Any | 200/201 | Full access |
| Admin | Member Mgmt APIs | 403 | No member management |
| Admin | Session APIs | 200 | Has access management |
| Billing | Access APIs | 403 | No access management |
| Billing | Billing APIs | 200 | Has billing access |
| Member/Viewer | Org APIs | 403 | No organization access |
| No Auth | Any | 401 | Requires authentication |

## Test Validation Checklist

- [ ] All Owner permissions work correctly
- [ ] Admin cannot access member/role management
- [ ] Admin cannot see billing information  
- [ ] Billing cannot access member/session management
- [ ] Member/Viewer redirected from organizations page
- [ ] Member/Viewer can use organization switcher in profile
- [ ] All API endpoints return appropriate error codes
- [ ] Error messages are informative but not revealing
- [ ] No role escalation vulnerabilities
- [ ] Cross-organization access properly blocked

## Success Criteria

✅ **Phase 1-3 Complete**: All tests pass with expected behavior
✅ **Security**: No unauthorized access possible
✅ **UX**: Clear feedback for denied actions
✅ **Performance**: RBAC checks don't significantly impact response times

---

**Next Phase**: Phase 4 - Production Readiness Testing with real users and stress testing.













