-- Two simple tables handle infinite configurability
CREATE TABLE event_definitions (
    event_type VARCHAR(50) PRIMARY KEY,
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE plan_definitions (
    plan_name VARCHAR(50) PRIMARY KEY,  
    config JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMP DEFAULT NOW(),
    updated_at TIMESTAMP DEFAULT NOW()
);

