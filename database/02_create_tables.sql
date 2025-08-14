-- Users table
CREATE TABLE users (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    email_verified_at TIMESTAMP,
    password_hash VARCHAR(255), -- NULL for OAuth-only users
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    full_name VARCHAR(200), -- Computed or stored for search
    avatar_url VARCHAR(500),
    timezone VARCHAR(50) DEFAULT 'UTC',
    locale VARCHAR(10) DEFAULT 'en',
    
    -- Authentication tracking
    last_login_at TIMESTAMP,
    login_count INTEGER DEFAULT 0,
    failed_login_attempts INTEGER DEFAULT 0,
    locked_until TIMESTAMP,
    
    -- Profile & preferences (flexible JSON storage)
    profile_data JSONB DEFAULT '{}',
    notification_settings JSONB DEFAULT '{}',
    
    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    status user_status DEFAULT 'pending'
);

-- Organizations table
CREATE TABLE organizations (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(100) UNIQUE,
    domain VARCHAR(255), -- for domain-based auto-joining
    
    -- Branding & identity
    logo_url VARCHAR(500),
    brand_colors JSONB DEFAULT '{}',
    website VARCHAR(255),
    industry VARCHAR(100),
    
    -- Business information
    address JSONB DEFAULT '{}',
    tax_id VARCHAR(50),
    billing_email VARCHAR(255),
    
    -- Subscription & limits
    plan_type organization_plan DEFAULT 'free',
    subscription_status subscription_status DEFAULT 'active',
    subscription_data JSONB DEFAULT '{}',
    usage_limits JSONB DEFAULT '{
        "ai_calls_per_month": 100,
        "pdf_exports_per_month": 10,
        "sessions_limit": 20,
        "team_members_limit": 3,
        "storage_limit_mb": 500,
        "features": {
            "custom_branding": false,
            "priority_support": false,
            "sso_enabled": false,
            "api_access": false
        }
    }',
    
    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP,
    status organization_status DEFAULT 'active'
);

-- Organization memberships (many-to-many relationship)
CREATE TABLE organization_memberships (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Role & permissions
    role membership_role DEFAULT 'member',
    permissions JSONB DEFAULT '{}', -- granular permissions if needed
    
    -- Invitation tracking
    invited_by UUID REFERENCES users(id),
    invited_at TIMESTAMP,
    joined_at TIMESTAMP,
    invitation_token VARCHAR(255), -- for pending invites
    
    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    status membership_status DEFAULT 'pending',
    
    UNIQUE(user_id, organization_id)
);

-- User sessions for authentication
CREATE TABLE user_sessions (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id), -- active org context
    
    -- Session data
    session_token VARCHAR(255) UNIQUE NOT NULL,
    refresh_token VARCHAR(255) UNIQUE,
    ip_address INET,
    user_agent TEXT,
    
    -- Security tracking
    expires_at TIMESTAMP NOT NULL,
    last_activity_at TIMESTAMP DEFAULT NOW(),
    created_at TIMESTAMP DEFAULT NOW(),
    revoked_at TIMESTAMP
);

-- AI Architecture Sessions (NEXA sessions equivalent)
CREATE TABLE ai_architecture_sessions (
    id SERIAL PRIMARY KEY,
    uuid UUID DEFAULT uuid_generate_v4() UNIQUE, -- For public references
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    
    -- Basic session info
    title VARCHAR(255),
    client VARCHAR(255),
    
    -- JSON Document Storage for different workflows (like original NEXA)
    session_objects JSONB DEFAULT '{}',      -- Solution Documents data
    sow_objects JSONB DEFAULT '{}',          -- Statement of Work data  
    loe_objects JSONB DEFAULT '{}',          -- Level of Effort data
    diagram_texts_json JSONB DEFAULT '{}',   -- Structuring data
    visual_assets_json JSONB DEFAULT '{}',   -- Visuals data
    
    -- Metadata
    session_type VARCHAR(50) DEFAULT 'solution', -- solution, sow, loe, visual, structuring
    is_template BOOLEAN DEFAULT FALSE,
    tags JSONB DEFAULT '[]',
    
    -- System fields
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW(),
    deleted_at TIMESTAMP
);

-- Organization domains for auto-join
CREATE TABLE organization_domains (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    domain VARCHAR(255) NOT NULL,
    auto_join_role membership_role DEFAULT 'member',
    verification_required BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT NOW(),
    
    UNIQUE(organization_id, domain)
);

-- Usage tracking for billing/limits
CREATE TABLE usage_events (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- 'ai_call', 'pdf_export', 'session_create', 'storage_used'
    event_data JSONB DEFAULT '{}',
    credits_consumed INTEGER DEFAULT 1,
    session_id INTEGER REFERENCES ai_architecture_sessions(id),
    created_at TIMESTAMP DEFAULT NOW()
);

-- Audit logs for compliance
CREATE TABLE audit_logs (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    organization_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    action VARCHAR(100) NOT NULL, -- 'create_session', 'invite_user', 'change_role'
    resource_type VARCHAR(50) NOT NULL, -- 'session', 'user', 'organization'
    resource_id UUID,
    old_values JSONB DEFAULT '{}',
    new_values JSONB DEFAULT '{}',
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP DEFAULT NOW()
);


