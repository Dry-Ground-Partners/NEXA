-- Function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at columns
CREATE TRIGGER update_users_updated_at 
    BEFORE UPDATE ON users 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_organizations_updated_at 
    BEFORE UPDATE ON organizations 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_memberships_updated_at 
    BEFORE UPDATE ON organization_memberships 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_ai_sessions_updated_at 
    BEFORE UPDATE ON ai_architecture_sessions 
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Function to generate organization slug from name
CREATE OR REPLACE FUNCTION generate_organization_slug(org_name TEXT)
RETURNS TEXT AS $$
DECLARE
    base_slug TEXT;
    final_slug TEXT;
    counter INTEGER := 1;
BEGIN
    -- Convert to lowercase, replace spaces and special chars with hyphens
    base_slug := lower(regexp_replace(org_name, '[^a-zA-Z0-9\s]', '', 'g'));
    base_slug := regexp_replace(base_slug, '\s+', '-', 'g');
    base_slug := trim(both '-' from base_slug);
    
    -- Limit length
    base_slug := left(base_slug, 50);
    final_slug := base_slug;
    
    -- Check for uniqueness and append counter if needed
    WHILE EXISTS (SELECT 1 FROM organizations WHERE slug = final_slug) LOOP
        final_slug := base_slug || '-' || counter;
        counter := counter + 1;
    END LOOP;
    
    RETURN final_slug;
END;
$$ LANGUAGE plpgsql;

-- Function to automatically set organization slug
CREATE OR REPLACE FUNCTION set_organization_slug()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.slug IS NULL OR NEW.slug = '' THEN
        NEW.slug := generate_organization_slug(NEW.name);
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-generate slug
CREATE TRIGGER set_organization_slug_trigger
    BEFORE INSERT OR UPDATE ON organizations
    FOR EACH ROW EXECUTE FUNCTION set_organization_slug();

-- Function to automatically set user full_name
CREATE OR REPLACE FUNCTION set_user_full_name()
RETURNS TRIGGER AS $$
BEGIN
    NEW.full_name := TRIM(CONCAT(COALESCE(NEW.first_name, ''), ' ', COALESCE(NEW.last_name, '')));
    IF NEW.full_name = '' THEN
        NEW.full_name := NULL;
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to auto-generate full_name
CREATE TRIGGER set_user_full_name_trigger
    BEFORE INSERT OR UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION set_user_full_name();

-- Function to auto-accept membership when user joins their own organization
CREATE OR REPLACE FUNCTION auto_accept_owner_membership()
RETURNS TRIGGER AS $$
BEGIN
    -- If this is an owner role membership and the user is being invited by themselves
    IF NEW.role = 'owner' AND NEW.invited_by = NEW.user_id THEN
        NEW.status := 'active';
        NEW.joined_at := NOW();
    END IF;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger for auto-accepting owner memberships
CREATE TRIGGER auto_accept_owner_membership_trigger
    BEFORE INSERT ON organization_memberships
    FOR EACH ROW EXECUTE FUNCTION auto_accept_owner_membership();

-- Function to cleanup expired sessions
CREATE OR REPLACE FUNCTION cleanup_expired_sessions()
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM user_sessions 
    WHERE expires_at < NOW() 
    OR revoked_at IS NOT NULL;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- View for active user sessions with user info
CREATE VIEW active_user_sessions AS
SELECT 
    s.id,
    s.session_token,
    s.user_id,
    s.organization_id,
    s.expires_at,
    s.last_activity_at,
    s.created_at,
    u.email,
    u.full_name,
    u.avatar_url,
    o.name as organization_name,
    o.slug as organization_slug
FROM user_sessions s
JOIN users u ON s.user_id = u.id
LEFT JOIN organizations o ON s.organization_id = o.id
WHERE s.expires_at > NOW() 
AND s.revoked_at IS NULL
AND u.status = 'active';

-- View for organization members with user details
CREATE VIEW organization_members AS
SELECT 
    m.id as membership_id,
    m.organization_id,
    m.user_id,
    m.role,
    m.status as membership_status,
    m.joined_at,
    m.created_at as member_since,
    u.email,
    u.full_name,
    u.avatar_url,
    u.last_login_at,
    u.status as user_status,
    o.name as organization_name,
    o.slug as organization_slug
FROM organization_memberships m
JOIN users u ON m.user_id = u.id
JOIN organizations o ON m.organization_id = o.id
WHERE m.status = 'active'
AND u.deleted_at IS NULL
AND o.deleted_at IS NULL;


