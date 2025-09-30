-- ============================================================
-- BACKDROP TAB IMPLEMENTATION
-- Organization Preferences Table for Dynamic Prompt Variables
-- ============================================================

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
    CONSTRAINT valid_main_logo_mime CHECK (main_logo_mime_type IS NULL OR main_logo_mime_type IN ('image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml')),
    CONSTRAINT valid_second_logo_mime CHECK (second_logo_mime_type IS NULL OR second_logo_mime_type IN ('image/png', 'image/jpeg', 'image/jpg', 'image/webp', 'image/svg+xml'))
);

-- Indexes for performance
CREATE INDEX idx_org_preferences_org_id ON organization_preferences(organization_id);
CREATE INDEX idx_org_preferences_updated_at ON organization_preferences(updated_at);

-- Trigger for updated_at timestamp
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

-- Comments for documentation
COMMENT ON TABLE organization_preferences IS 'Stores organization-level preferences that influence AI prompts and document generation';
COMMENT ON COLUMN organization_preferences.main_logo IS 'Base64 encoded primary organization logo';
COMMENT ON COLUMN organization_preferences.general_approach IS 'General approach text applied to all AI prompts';
COMMENT ON COLUMN organization_preferences.structuring_preferences IS 'Stage-specific preferences for structuring workflow';
COMMENT ON COLUMN organization_preferences.change_history IS 'Audit trail of all changes to preferences';
