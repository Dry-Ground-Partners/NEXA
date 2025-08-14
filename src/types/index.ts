// User types
export interface User {
  id: string
  email: string
  emailVerifiedAt: Date | null
  firstName: string | null
  lastName: string | null
  fullName: string | null
  avatarUrl: string | null
  timezone: string
  locale: string
  lastLoginAt: Date | null
  loginCount: number
  failedLoginAttempts: number
  lockedUntil: Date | null
  profileData: Record<string, any>
  notificationSettings: Record<string, any>
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  status: 'active' | 'pending' | 'suspended' | 'deleted'
}

// Organization types
export interface Organization {
  id: string
  name: string
  slug: string
  domain: string | null
  logoUrl: string | null
  brandColors: Record<string, any>
  website: string | null
  industry: string | null
  address: Record<string, any>
  taxId: string | null
  billingEmail: string | null
  planType: 'free' | 'starter' | 'professional' | 'enterprise'
  subscriptionStatus: 'active' | 'past_due' | 'canceled' | 'trialing'
  subscriptionData: Record<string, any>
  usageLimits: UsageLimits
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
  status: 'active' | 'suspended' | 'deleted'
}

export interface UsageLimits {
  ai_calls_per_month: number
  pdf_exports_per_month: number
  sessions_limit: number
  team_members_limit: number
  storage_limit_mb: number
  features: {
    custom_branding: boolean
    priority_support: boolean
    sso_enabled: boolean
    api_access: boolean
  }
}

// Organization membership types
export interface OrganizationMembership {
  id: string
  userId: string
  organizationId: string
  role: 'owner' | 'admin' | 'member' | 'viewer' | 'billing'
  permissions: Record<string, any>
  invitedBy: string | null
  invitedAt: Date | null
  joinedAt: Date | null
  invitationToken: string | null
  createdAt: Date
  updatedAt: Date
  status: 'active' | 'pending' | 'suspended'
  user?: User
  organization?: Organization
  inviter?: User
}

// Session types
export interface UserSession {
  id: string
  userId: string
  organizationId: string | null
  sessionToken: string
  refreshToken: string | null
  ipAddress: string | null
  userAgent: string | null
  expiresAt: Date
  lastActivityAt: Date
  createdAt: Date
  revokedAt: Date | null
}

// AI Architecture Session types (NEXA sessions)
export interface AIArchitectureSession {
  id: number
  uuid: string
  userId: string
  organizationId: string
  title: string | null
  client: string | null
  sessionObjects: Record<string, any>
  sowObjects: Record<string, any>
  loeObjects: Record<string, any>
  diagramTextsJson: Record<string, any>
  visualAssetsJson: Record<string, any>
  sessionType: string
  isTemplate: boolean
  tags: string[]
  createdAt: Date
  updatedAt: Date
  deletedAt: Date | null
}

// Authentication types
export interface LoginCredentials {
  email: string
  password: string
  rememberMe?: boolean
}

export interface RegisterCredentials {
  email: string
  password: string
  passwordConfirm: string
  firstName: string
  lastName: string
  company?: string
}

export interface AuthUser {
  id: string
  email: string
  fullName: string | null
  avatarUrl: string | null
  organizations: OrganizationMembership[]
  currentOrganization?: Organization
}

// API Response types
export interface APIResponse<T = any> {
  success: boolean
  data?: T
  error?: string
  message?: string
}

export interface PaginatedResponse<T> {
  data: T[]
  total: number
  page: number
  limit: number
  totalPages: number
}

// Form types
export interface FormField {
  name: string
  label: string
  type: 'text' | 'email' | 'password' | 'textarea' | 'select' | 'checkbox'
  placeholder?: string
  required?: boolean
  disabled?: boolean
  options?: Array<{ value: string; label: string }>
}

// Usage tracking types
export interface UsageEvent {
  id: string
  organizationId: string
  userId: string
  eventType: string
  eventData: Record<string, any>
  creditsConsumed: number
  sessionId: number | null
  createdAt: Date
}

// Audit log types
export interface AuditLog {
  id: string
  organizationId: string
  userId: string | null
  action: string
  resourceType: string
  resourceId: string | null
  oldValues: Record<string, any>
  newValues: Record<string, any>
  ipAddress: string | null
  userAgent: string | null
  createdAt: Date
}

// Component prop types
export interface BaseProps {
  className?: string
  children?: React.ReactNode
}

// Tool card types for dashboard
export interface ToolCard {
  id: string
  title: string
  description: string
  icon: string
  href: string
  color: 'warning' | 'success' | 'info' | 'primary' | 'secondary'
  isAvailable?: boolean
}

// Navigation types
export interface NavItem {
  title: string
  href: string
  icon?: string
  disabled?: boolean
  external?: boolean
}

export interface SidebarNavItem extends NavItem {
  items?: SidebarNavItem[]
}

// Notification types
export interface Notification {
  id: string
  title: string
  message: string
  type: 'success' | 'error' | 'warning' | 'info'
  createdAt: Date
  read: boolean
}

// Error types
export interface FormError {
  field: string
  message: string
}

export interface ValidationError {
  errors: FormError[]
  message: string
}


