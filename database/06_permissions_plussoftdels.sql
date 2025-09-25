-- Add granular permissions to AI sessions
ALTER TABLE ai_architecture_sessions 
ADD COLUMN access_permissions JSONB DEFAULT '{}';

-- Add offboarding data to memberships  
ALTER TABLE organization_memberships 
ADD COLUMN offboarding_data JSONB DEFAULT '{}';

-- Add indexes for performance
CREATE INDEX idx_ai_sessions_access_permissions 
ON ai_architecture_sessions USING GIN (access_permissions);

CREATE INDEX idx_memberships_offboarding 
ON organization_memberships USING GIN (offboarding_data);

-- Add specific identifier indexes for fast lookups
CREATE INDEX idx_ai_sessions_granular_control 
ON ai_architecture_sessions ((access_permissions->'nexa_access_control'->>'type')) 
WHERE access_permissions ? 'nexa_access_control';

CREATE INDEX idx_memberships_offboarded_status 
ON organization_memberships ((offboarding_data->'nexa_offboarded'->>'status')) 
WHERE offboarding_data ? 'nexa_offboarded';

-- Document the columns
COMMENT ON COLUMN ai_architecture_sessions.access_permissions IS 
'JSONB field for granular session access control. Empty = organization-level access. Contains "nexa_access_control" key when granular permissions are configured.';

COMMENT ON COLUMN organization_memberships.offboarding_data IS 
'JSONB field for member offboarding information. Empty = active member. Contains "nexa_offboarded" key when member is offboarded with full audit trail.';