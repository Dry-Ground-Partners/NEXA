# 🔄 **Organizations Switching Functionality - Implementation Plan**
## **Dynamic Organization Context & Advanced Management Features**

---

## 📋 **EXECUTIVE SUMMARY**

This document outlines the implementation plan for **dynamic organization switching** in the NEXA platform, transforming the `/organizations` page from a static view into a **context-aware management hub**. Users will be able to switch between organizations and see relevant data for Access, Billing, and History tabs.

**Key Features:**
- **Organization Context Switching** via → buttons
- **Dynamic Data Loading** based on selected organization
- **Enhanced Member Management** with real organization data
- **Role-Based Access Cards** with drill-down functionality
- **Session Access Control** with granular permissions

---

## 🎯 **CURRENT STATE RECAP**

### **✅ Recently Completed UI Improvements:**
- ❌ **Removed "Back to Dashboard" link** for cleaner navigation
- ✅ **Moved "Create Organization" button** to tab body for better UX
- ✅ **Simplified organization cards** to single → button (from cog + chevron)
- ✅ **Enhanced Member Management** with "Invite Member" button and member list display
- ✅ **Added keyboard shortcuts** (1-4) for tab navigation

### **✅ Current Tab Structure:**
1. **"All" Tab** - Organization display with → switch buttons
2. **"Access" Tab** - Access management with three sections
3. **"Billing" Tab** - Financial overview and usage metrics  
4. **"History" Tab** - Placeholder for activity tracking

---

## 🔄 **ORGANIZATION SWITCHING ARCHITECTURE**

### **Core Concept: Context-Aware Organization Management**

When a user clicks the **→ button** on any organization card in the "All" tab, the entire `/organizations` page switches context to that organization. All subsequent tab data (Access, Billing, History) will be loaded and filtered for the selected organization.

### **🎯 User Flow:**
```typescript
1. User visits /organizations
2. Sees all their organization memberships in "All" tab
3. Clicks → button on desired organization
4. Page context switches to that organization
5. Access, Billing, History tabs now show data for selected org
6. User can switch between tabs to manage that specific organization
7. Can return to "All" tab to switch to different organization
```

### **🔧 Technical Implementation Strategy:**

#### **State Management:**
```typescript
// Add to existing state in organizations page
const [selectedOrganization, setSelectedOrganization] = useState<Organization | null>(null)
const [organizationData, setOrganizationData] = useState({
  members: [],
  sessions: [],
  billing: null,
  usage: null,
  auditLogs: [],
  roles: {}
})
const [loading, setLoading] = useState(false)
```

#### **Organization Switching Function:**
```typescript
const switchToOrganization = async (organization: Organization) => {
  setLoading(true)
  setSelectedOrganization(organization)
  
  try {
    // Parallel data fetching for better performance
    const [members, sessions, billing, auditLogs] = await Promise.all([
      fetch(`/api/organizations/${organization.id}/members`),
      fetch(`/api/organizations/${organization.id}/sessions`),
      fetch(`/api/organizations/${organization.id}/billing`),
      fetch(`/api/organizations/${organization.id}/audit-logs?limit=50`)
    ])
    
    setOrganizationData({
      members: await members.json(),
      sessions: await sessions.json(), 
      billing: await billing.json(),
      auditLogs: await auditLogs.json()
    })
    
    // Automatically switch to Access tab to show the data
    setActiveTab('access')
    
  } catch (error) {
    console.error('Failed to switch organization:', error)
    // Show error toast/notification
  } finally {
    setLoading(false)
  }
}
```

#### **Visual State Indicator:**
```typescript
// Update page header to show current organization context
{selectedOrganization && (
  <div className="flex items-center gap-2 text-blue-400 text-sm">
    <Building className="w-4 h-4" />
    <span>Viewing: {selectedOrganization.name}</span>
    <button 
      onClick={() => setSelectedOrganization(null)}
      className="text-nexa-muted hover:text-white"
    >
      <X className="w-3 h-3" />
    </button>
  </div>
)}
```

---

## 👥 **ENHANCED MEMBER MANAGEMENT**

### **Real Organization Member Display**

Transform the current mock member management into a **fully functional organization member system** that displays actual members for the selected organization.

#### **📊 Member Data Structure:**
```typescript
interface OrganizationMember {
  id: string
  user: {
    id: string
    email: string
    firstName: string
    lastName: string
    fullName: string
    avatarUrl?: string
    status: 'active' | 'pending' | 'suspended'
    lastActiveAt: Date
  }
  membership: {
    role: 'owner' | 'admin' | 'member' | 'viewer' | 'billing'
    status: 'active' | 'pending' | 'suspended'
    joinedAt: Date
    permissions: Record<string, boolean>
    invitedBy?: string
  }
  sessionAccess: {
    totalSessions: number
    accessibleSessions: number
    recentActivity: Date
  }
}
```

#### **🎯 Member Management Features:**

**1. Real-Time Member List:**
```typescript
// API endpoint: GET /api/organizations/{orgId}/members
// Returns: Array of OrganizationMember objects

// Display features:
- Profile avatar (or generated initials)
- Full name and email
- Role badge with color coding
- Join date and last active timestamp  
- Session access count
- Status indicator (active/pending/suspended)
- Quick action buttons (edit role, suspend, remove)
```

**2. Enhanced Invite Member Functionality:**
```typescript
// Expand the current "Invite Member" button to open a modal:

interface InviteMemberModal {
  email: string
  role: MembershipRole
  customPermissions: Record<string, boolean>
  personalMessage: string
  expirationDays: number // 7, 14, 30 days
}

// Features:
- Email validation with domain checking
- Role selection with permission preview
- Custom permission overrides
- Personal invitation message
- Invitation expiration settings
- Bulk invite via CSV upload
- Preview of what the invitation email will look like
```

**3. Member Actions:**
```typescript
// Each member row includes quick actions:
- Edit Role: Change member role with permission diff preview
- Manage Permissions: Granular permission customization
- View Activity: Show member's recent actions in the org
- Suspend Access: Temporarily disable without removing
- Remove Member: Complete removal with data retention options
- Resend Invitation: For pending members
```

---

## 🔐 **ROLE ENFORCEMENT REDESIGN**

### **Visual Role Cards Interface**

Replace the current placeholder with an **interactive role management dashboard** featuring visual role cards with drill-down functionality.

#### **🎨 Role Cards Design:**
```typescript
interface RoleCard {
  role: MembershipRole
  icon: LucideIcon
  color: string
  memberCount: number
  permissions: string[]
  description: string
}

// Example role cards:
const roleCards = [
  {
    role: 'owner',
    icon: Crown,
    color: 'from-yellow-500 to-amber-600',
    memberCount: 1,
    permissions: ['Full Access', 'Billing', 'Member Management', 'Delete Organization'],
    description: 'Complete control over organization and billing'
  },
  {
    role: 'admin', 
    icon: Shield,
    color: 'from-blue-500 to-blue-600',
    memberCount: 3,
    permissions: ['User Management', 'Session Control', 'Analytics', 'Settings'],
    description: 'Administrative access to manage users and settings'
  },
  {
    role: 'member',
    icon: User,
    color: 'from-green-500 to-green-600', 
    memberCount: 12,
    permissions: ['Create Sessions', 'Collaborate', 'Export', 'Comment'],
    description: 'Standard access to create and collaborate on sessions'
  },
  {
    role: 'viewer',
    icon: Eye,
    color: 'from-gray-500 to-gray-600',
    memberCount: 5,
    permissions: ['View Sessions', 'Comment', 'Export Read-Only'],
    description: 'Read-only access to view and comment on sessions'
  },
  {
    role: 'billing',
    icon: CreditCard,
    color: 'from-purple-500 to-purple-600',
    memberCount: 2,
    permissions: ['Billing Access', 'Usage Reports', 'Plan Management'],
    description: 'Access to billing and subscription management'
  }
]
```

#### **🔍 Role Card Interactions:**
```typescript
// Clicking each role card opens a drill-down view:

const RoleDetailModal = ({ role, members }) => (
  <Modal title={`${role.label} Members (${members.length})`}>
    {/* Member list for this specific role */}
    <div className="space-y-3">
      {members.map(member => (
        <MemberRow 
          key={member.id}
          member={member}
          showRoleActions={true}
          onRoleChange={handleRoleChange}
          onRemove={handleRemoveMember}
        />
      ))}
    </div>
    
    {/* Role-specific actions */}
    <div className="mt-6 flex gap-3">
      <Button onClick={() => openBulkInvite(role)}>
        Bulk Invite {role.label}s
      </Button>
      <Button variant="outline" onClick={() => exportRoleMembers(role)}>
        Export List
      </Button>
    </div>
  </Modal>
)
```

#### **📈 Role Analytics Dashboard:**
```typescript
// Additional role insights in the Role Enforcement section:

interface RoleAnalytics {
  roleDistribution: { role: string; count: number; percentage: number }[]
  recentChanges: { user: string; from: string; to: string; date: Date; by: string }[]
  pendingInvitations: { email: string; role: string; sentDate: Date; expiresDate: Date }[]
  accessPatterns: { role: string; avgSessionsPerWeek: number; topFeatures: string[] }[]
}

// Visual components:
- Pie chart of role distribution
- Timeline of recent role changes
- Pending invitations table with resend/cancel actions
- Role-based feature usage heatmap
```

---

## 📊 **SESSION CONTROLS REDESIGN**

### **Comprehensive Session Access Management**

Transform Session Controls into a **powerful session permission management system** showing all organization sessions with granular access control.

#### **🗃️ Session Data Structure:**
```typescript
interface OrganizationSession {
  id: string
  uuid: string
  title: string
  type: 'structuring' | 'visuals' | 'solutioning' | 'sow' | 'loe'
  createdBy: {
    id: string
    name: string
    email: string
  }
  createdAt: Date
  lastModified: Date
  collaborators: {
    userId: string
    name: string
    email: string
    role: string
    permissions: SessionPermission[]
    lastAccessed: Date
  }[]
  accessLevel: 'public' | 'organization' | 'private' | 'restricted'
  tags: string[]
  status: 'active' | 'archived' | 'deleted'
}

interface SessionPermission {
  type: 'read' | 'write' | 'comment' | 'export' | 'share' | 'delete'
  granted: boolean
  grantedBy: string
  grantedAt: Date
}
```

#### **📋 Session List Interface:**
```typescript
// Main session list with filtering and search:

const SessionControlsList = () => (
  <div className="space-y-4">
    {/* Session filters and search */}
    <div className="flex gap-4 items-center">
      <Input placeholder="Search sessions..." />
      <Select value={sessionTypeFilter}>
        <option value="all">All Types</option>
        <option value="structuring">Structuring</option>
        <option value="visuals">Visuals</option>
        <option value="solutioning">Solutioning</option>
        <option value="sow">SOW</option>
        <option value="loe">LOE</option>
      </Select>
      <Select value={accessLevelFilter}>
        <option value="all">All Access Levels</option>
        <option value="public">Public</option>
        <option value="organization">Organization</option>
        <option value="private">Private</option>
        <option value="restricted">Restricted</option>
      </Select>
    </div>

    {/* Session table */}
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Session</TableHead>
          <TableHead>Type</TableHead>
          <TableHead>Created By</TableHead>
          <TableHead>Collaborators</TableHead>
          <TableHead>Access Level</TableHead>
          <TableHead>Last Modified</TableHead>
          <TableHead>Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {sessions.map(session => (
          <SessionRow 
            key={session.id}
            session={session}
            onManageAccess={openAccessModal}
            onViewDetails={openSessionDetails}
          />
        ))}
      </TableBody>
    </Table>
  </div>
)
```

#### **🔧 Session Access Management Modal:**
```typescript
// Detailed access management for individual sessions:

const SessionAccessModal = ({ session, onClose }) => (
  <Modal title={`Manage Access: ${session.title}`} size="large">
    <Tabs defaultValue="current-access">
      <TabsList>
        <TabsTrigger value="current-access">Current Access</TabsTrigger>
        <TabsTrigger value="add-users">Add Users</TabsTrigger>
        <TabsTrigger value="access-history">Access History</TabsTrigger>
      </TabsList>

      {/* Current collaborators and their permissions */}
      <TabsContent value="current-access">
        <div className="space-y-4">
          {session.collaborators.map(collaborator => (
            <div key={collaborator.userId} className="flex items-center justify-between p-4 border rounded-lg">
              <UserInfo user={collaborator} />
              <PermissionToggles 
                permissions={collaborator.permissions}
                onChange={(perms) => updateUserPermissions(session.id, collaborator.userId, perms)}
              />
              <Button 
                variant="destructive" 
                size="sm"
                onClick={() => removeUserAccess(session.id, collaborator.userId)}
              >
                Remove Access
              </Button>
            </div>
          ))}
        </div>
      </TabsContent>

      {/* Add new users to session */}
      <TabsContent value="add-users">
        <AddUsersToSession 
          sessionId={session.id}
          organizationMembers={organizationData.members}
          onUsersAdded={refreshSessionData}
        />
      </TabsContent>

      {/* Access history and audit trail */}
      <TabsContent value="access-history">
        <AccessHistoryLog sessionId={session.id} />
      </TabsContent>
    </Tabs>
  </Modal>
)
```

#### **⚡ Bulk Session Operations:**
```typescript
// Bulk operations for managing multiple sessions:

const BulkSessionOperations = ({ selectedSessions }) => (
  <div className="flex gap-2 p-4 bg-blue-50 rounded-lg">
    <span className="text-sm text-blue-700">
      {selectedSessions.length} sessions selected
    </span>
    
    <Button 
      size="sm"
      onClick={() => bulkUpdateAccess(selectedSessions)}
    >
      Bulk Update Access
    </Button>
    
    <Button 
      size="sm" 
      variant="outline"
      onClick={() => bulkChangeAccessLevel(selectedSessions)}
    >
      Change Access Level
    </Button>
    
    <Button 
      size="sm"
      variant="outline" 
      onClick={() => bulkExportSessions(selectedSessions)}
    >
      Export Sessions
    </Button>
  </div>
)
```

---

## 🔗 **API ENDPOINTS REQUIRED**

### **Organization Context APIs:**
```typescript
// Organization switching and data loading
GET    /api/organizations/{orgId}/context
GET    /api/organizations/{orgId}/members
GET    /api/organizations/{orgId}/sessions
GET    /api/organizations/{orgId}/billing
GET    /api/organizations/{orgId}/usage
GET    /api/organizations/{orgId}/audit-logs

// Member management
POST   /api/organizations/{orgId}/invitations
PUT    /api/organizations/{orgId}/members/{userId}/role
PUT    /api/organizations/{orgId}/members/{userId}/permissions  
DELETE /api/organizations/{orgId}/members/{userId}
POST   /api/organizations/{orgId}/members/bulk-invite

// Session access control
GET    /api/organizations/{orgId}/sessions/{sessionId}/access
PUT    /api/organizations/{orgId}/sessions/{sessionId}/access
POST   /api/organizations/{orgId}/sessions/bulk-update-access
GET    /api/organizations/{orgId}/sessions/{sessionId}/audit-log

// Role management
GET    /api/organizations/{orgId}/roles/analytics
PUT    /api/organizations/{orgId}/roles/bulk-update
```

---

## 📱 **USER EXPERIENCE ENHANCEMENTS**

### **🎯 Navigation Flow Improvements:**
1. **Context Breadcrumbs**: Show current organization in header when switched
2. **Quick Switch**: Dropdown in header for rapid organization switching
3. **Recent Organizations**: Remember last 3 accessed organizations for quick access
4. **Return to All**: Clear "View All Organizations" button when in organization context

### **⚡ Performance Optimizations:**
1. **Lazy Loading**: Load organization data only when → button is clicked
2. **Caching**: Cache organization data for 5 minutes to avoid repeated API calls
3. **Pagination**: Implement pagination for large member lists and session lists
4. **Virtual Scrolling**: For organizations with 100+ members or sessions

### **🔔 Real-Time Updates:**
1. **WebSocket Integration**: Real-time updates for member status changes
2. **Optimistic Updates**: Immediate UI updates with server confirmation
3. **Conflict Resolution**: Handle concurrent edits to member roles/permissions
4. **Activity Notifications**: Toast notifications for important organization events

---

## 🏗️ **IMPLEMENTATION PHASES**

### **Phase 1: Organization Switching Foundation** *(Week 1)*
- [ ] Add organization context state management
- [ ] Implement → button switching functionality
- [ ] Create organization context indicator in header
- [ ] Add loading states for data fetching
- [ ] Build basic API endpoints for organization data

### **Phase 2: Enhanced Member Management** *(Week 2)*
- [ ] Replace mock data with real organization members
- [ ] Implement functional "Invite Member" modal
- [ ] Add member action buttons (edit, suspend, remove)
- [ ] Build member role change functionality
- [ ] Add bulk member operations

### **Phase 3: Role Enforcement System** *(Week 3)*
- [ ] Create visual role cards interface
- [ ] Implement role drill-down modals
- [ ] Add role analytics dashboard
- [ ] Build role change audit trail
- [ ] Add bulk role management tools

### **Phase 4: Session Controls** *(Week 4)*
- [ ] Build session list with organization filtering
- [ ] Implement session access management modal
- [ ] Add session permission toggles
- [ ] Create bulk session operations
- [ ] Add session access audit logs

### **Phase 5: Polish & Optimization** *(Week 5)*
- [ ] Add performance optimizations
- [ ] Implement real-time updates
- [ ] Add comprehensive error handling
- [ ] Create user onboarding for new features
- [ ] Add analytics tracking for feature usage

---

## 🎯 **SUCCESS METRICS**

### **Functionality Metrics:**
- ✅ Organization switching completes under 2 seconds
- ✅ Member management operations complete under 1 second  
- ✅ Session access updates are applied immediately
- ✅ Real-time updates appear within 5 seconds
- ✅ Bulk operations handle 100+ items efficiently

### **User Experience Metrics:**
- ✅ 95% of organization switches happen via → button
- ✅ Users can complete member invitations in under 3 clicks
- ✅ Role management tasks completed 50% faster than before
- ✅ Session access changes require 75% fewer clicks
- ✅ Zero data loss during organization context switches

### **Technical Metrics:**
- ✅ API response times under 500ms for organization data
- ✅ UI state transitions complete under 200ms
- ✅ Memory usage stays under 100MB for organization data
- ✅ 99.9% uptime for organization switching functionality
- ✅ Zero cross-organization data leakage incidents

---

## 🚀 **READY FOR IMPLEMENTATION**

This comprehensive plan provides:

✅ **Complete technical specifications** for organization switching
✅ **Detailed UI/UX designs** for all enhanced features
✅ **Clear implementation phases** with realistic timelines
✅ **API endpoint definitions** for all required functionality
✅ **Performance considerations** and optimization strategies
✅ **Success metrics** and testing criteria

**The organizations page will transform from a static display into a powerful, context-aware organization management hub!** 🎯

---

*This plan enables users to seamlessly switch between organizations and manage members, roles, and session access with unprecedented ease and efficiency.*






