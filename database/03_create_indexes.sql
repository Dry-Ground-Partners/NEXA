-- Indexes for performance optimization

-- Users indexes
CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_created_at ON users(created_at);
CREATE INDEX idx_users_email_verified ON users(email_verified_at) WHERE email_verified_at IS NOT NULL;

-- Organizations indexes
CREATE INDEX idx_organizations_slug ON organizations(slug);
CREATE INDEX idx_organizations_domain ON organizations(domain) WHERE domain IS NOT NULL;
CREATE INDEX idx_organizations_status ON organizations(status);
CREATE INDEX idx_organizations_plan ON organizations(plan_type);

-- Organization memberships indexes
CREATE INDEX idx_memberships_user_id ON organization_memberships(user_id);
CREATE INDEX idx_memberships_org_id ON organization_memberships(organization_id);
CREATE INDEX idx_memberships_role ON organization_memberships(role);
CREATE INDEX idx_memberships_status ON organization_memberships(status);
CREATE INDEX idx_memberships_invitation_token ON organization_memberships(invitation_token) WHERE invitation_token IS NOT NULL;

-- User sessions indexes
CREATE INDEX idx_sessions_user_id ON user_sessions(user_id);
CREATE INDEX idx_sessions_token ON user_sessions(session_token);
CREATE INDEX idx_sessions_refresh_token ON user_sessions(refresh_token) WHERE refresh_token IS NOT NULL;
CREATE INDEX idx_sessions_expires_at ON user_sessions(expires_at);
CREATE INDEX idx_sessions_active ON user_sessions(user_id, expires_at) WHERE revoked_at IS NULL;

-- AI Architecture sessions indexes
CREATE INDEX idx_ai_sessions_user_id ON ai_architecture_sessions(user_id);
CREATE INDEX idx_ai_sessions_org_id ON ai_architecture_sessions(organization_id);
CREATE INDEX idx_ai_sessions_uuid ON ai_architecture_sessions(uuid);
CREATE INDEX idx_ai_sessions_type ON ai_architecture_sessions(session_type);
CREATE INDEX idx_ai_sessions_created_at ON ai_architecture_sessions(created_at);
CREATE INDEX idx_ai_sessions_title ON ai_architecture_sessions(title) WHERE title IS NOT NULL;

-- Usage events indexes
CREATE INDEX idx_usage_events_org_id ON usage_events(organization_id);
CREATE INDEX idx_usage_events_user_id ON usage_events(user_id);
CREATE INDEX idx_usage_events_type ON usage_events(event_type);
CREATE INDEX idx_usage_events_created_at ON usage_events(created_at);
CREATE INDEX idx_usage_events_monthly ON usage_events(organization_id, event_type, created_at);

-- Audit logs indexes
CREATE INDEX idx_audit_logs_org_id ON audit_logs(organization_id);
CREATE INDEX idx_audit_logs_user_id ON audit_logs(user_id);
CREATE INDEX idx_audit_logs_action ON audit_logs(action);
CREATE INDEX idx_audit_logs_resource ON audit_logs(resource_type, resource_id);
CREATE INDEX idx_audit_logs_created_at ON audit_logs(created_at);

-- Partial indexes for soft deletes
CREATE INDEX idx_users_active ON users(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_organizations_active ON organizations(id) WHERE deleted_at IS NULL;
CREATE INDEX idx_ai_sessions_active ON ai_architecture_sessions(id) WHERE deleted_at IS NULL;


