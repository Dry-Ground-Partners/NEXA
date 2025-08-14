-- Seed data for development/testing

-- Insert sample users
INSERT INTO users (
    email, 
    password_hash, 
    first_name, 
    last_name, 
    email_verified_at, 
    status,
    profile_data,
    notification_settings
) VALUES 
(
    'admin@dryground.ai', 
    crypt('password123', gen_salt('bf')), 
    'Admin', 
    'User', 
    NOW(), 
    'active',
    '{"bio": "Platform administrator", "job_title": "System Admin"}',
    '{"email_notifications": true, "marketing_emails": false}'
),
(
    'john.doe@example.com', 
    crypt('password123', gen_salt('bf')), 
    'John', 
    'Doe', 
    NOW(), 
    'active',
    '{"bio": "Solution architect specializing in AI implementations", "job_title": "Senior Architect"}',
    '{"email_notifications": true, "marketing_emails": true}'
),
(
    'jane.smith@company.com', 
    crypt('password123', gen_salt('bf')), 
    'Jane', 
    'Smith', 
    NOW(), 
    'active',
    '{"bio": "Project manager with 5+ years experience", "job_title": "Project Manager"}',
    '{"email_notifications": true, "marketing_emails": false}'
);

-- Insert sample organizations
INSERT INTO organizations (
    name, 
    domain,
    industry,
    website,
    plan_type,
    usage_limits
) VALUES 
(
    'Dry Ground AI', 
    'dryground.ai',
    'Artificial Intelligence',
    'https://dryground.ai',
    'enterprise',
    '{
        "ai_calls_per_month": 10000,
        "pdf_exports_per_month": 500,
        "sessions_limit": 1000,
        "team_members_limit": 50,
        "storage_limit_mb": 10000,
        "features": {
            "custom_branding": true,
            "priority_support": true,
            "sso_enabled": true,
            "api_access": true
        }
    }'
),
(
    'Example Corp', 
    'example.com',
    'Technology',
    'https://example.com',
    'professional',
    '{
        "ai_calls_per_month": 1000,
        "pdf_exports_per_month": 100,
        "sessions_limit": 200,
        "team_members_limit": 20,
        "storage_limit_mb": 5000,
        "features": {
            "custom_branding": true,
            "priority_support": false,
            "sso_enabled": false,
            "api_access": true
        }
    }'
),
(
    'Startup Inc', 
    NULL,
    'Software',
    NULL,
    'starter',
    '{
        "ai_calls_per_month": 500,
        "pdf_exports_per_month": 25,
        "sessions_limit": 50,
        "team_members_limit": 5,
        "storage_limit_mb": 1000,
        "features": {
            "custom_branding": false,
            "priority_support": false,
            "sso_enabled": false,
            "api_access": false
        }
    }'
);

-- Create organization memberships
-- Admin user as owner of Dry Ground AI
INSERT INTO organization_memberships (
    user_id, 
    organization_id, 
    role, 
    status,
    invited_by,
    joined_at
) VALUES 
(
    (SELECT id FROM users WHERE email = 'admin@dryground.ai'),
    (SELECT id FROM organizations WHERE name = 'Dry Ground AI'),
    'owner',
    'active',
    (SELECT id FROM users WHERE email = 'admin@dryground.ai'),
    NOW()
);

-- John Doe as admin of Example Corp
INSERT INTO organization_memberships (
    user_id, 
    organization_id, 
    role, 
    status,
    invited_by,
    joined_at
) VALUES 
(
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    (SELECT id FROM organizations WHERE name = 'Example Corp'),
    'owner',
    'active',
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    NOW()
);

-- Jane Smith as member of Example Corp
INSERT INTO organization_memberships (
    user_id, 
    organization_id, 
    role, 
    status,
    invited_by,
    joined_at
) VALUES 
(
    (SELECT id FROM users WHERE email = 'jane.smith@company.com'),
    (SELECT id FROM organizations WHERE name = 'Example Corp'),
    'member',
    'active',
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    NOW()
);

-- Sample AI Architecture Session
INSERT INTO ai_architecture_sessions (
    user_id,
    organization_id,
    title,
    client,
    session_type,
    session_objects
) VALUES (
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    (SELECT id FROM organizations WHERE name = 'Example Corp'),
    'E-commerce AI Chatbot Solution',
    'Retail Client Inc',
    'solution',
    '{
        "badge": {
            "created-at": "2024-01-15 10:30:00",
            "row": 1,
            "glyph": "ecommerceAI2024"
        },
        "basic": {
            "title": "E-commerce AI Chatbot Solution",
            "prepared_for": "Retail Client Inc",
            "date": "2024-01-15",
            "engineer": "John Doe"
        },
        "current_solution": 1,
        "solution_count": 1,
        "solution_1": {
            "variables": {
                "title": "AI-Powered Customer Service Chatbot",
                "steps": "1. OpenAI GPT-4 integration 2. Customer data analysis 3. Automated response system 4. Human handoff protocols",
                "approach": "Implement using OpenAI API with custom training on product catalog and FAQ data",
                "difficulty": 65
            },
            "structure": {
                "stack": "OpenAI GPT-4, Node.js backend, React frontend, PostgreSQL database"
            }
        }
    }'
);

-- Add domain for auto-join
INSERT INTO organization_domains (
    organization_id,
    domain,
    auto_join_role,
    verification_required
) VALUES (
    (SELECT id FROM organizations WHERE name = 'Example Corp'),
    'company.com',
    'member',
    TRUE
);

-- Sample usage events
INSERT INTO usage_events (
    organization_id,
    user_id,
    event_type,
    event_data,
    credits_consumed
) VALUES 
(
    (SELECT id FROM organizations WHERE name = 'Example Corp'),
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    'ai_call',
    '{"model": "gpt-4o", "tokens": 1500, "endpoint": "solution_generation"}',
    1
),
(
    (SELECT id FROM organizations WHERE name = 'Example Corp'),
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    'session_create',
    '{"session_type": "solution", "title": "E-commerce AI Chatbot Solution"}',
    1
);

-- Sample audit log
INSERT INTO audit_logs (
    organization_id,
    user_id,
    action,
    resource_type,
    resource_id,
    new_values
) VALUES (
    (SELECT id FROM organizations WHERE name = 'Example Corp'),
    (SELECT id FROM users WHERE email = 'john.doe@example.com'),
    'create_session',
    'session',
    (SELECT uuid FROM ai_architecture_sessions WHERE title = 'E-commerce AI Chatbot Solution'),
    '{"title": "E-commerce AI Chatbot Solution", "client": "Retail Client Inc", "session_type": "solution"}'
);


