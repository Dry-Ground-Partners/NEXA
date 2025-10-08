-- Seed initial event definitions for NEXA Platform usage tracking
-- Based on the events specified: structuring, visuals, solutioning, and data push operations

INSERT INTO event_definitions (event_type, config) VALUES 

-- STRUCTURING EVENTS
('structuring_diagnose', '{
  "baseCredits": 10,
  "description": "Problem analysis in Structuring",
  "category": "ai_analysis",
  "endpoint": "/api/structuring/diagnose",
  "multipliers": {
    "complexity": {"min": 1.0, "max": 2.5},
    "features": {"echo": 5, "traceback": 3}
  }
}'),

('structuring_generate_solution', '{
  "baseCredits": 15,
  "description": "Solution generation with optional enhancements",
  "category": "ai_analysis",
  "endpoint": "/api/structuring/generate-solution",
  "multipliers": {
    "features": {"echo": 5, "traceback": 3}
  }
}'),

-- VISUALS EVENTS
('visuals_planning', '{
  "baseCredits": 8,
  "description": "Visual planning generation",
  "category": "ai_visual",
  "endpoint": "/api/visuals/planning"
}'),

('visuals_sketch', '{
  "baseCredits": 12,
  "description": "Visual sketch creation (the arrows)",
  "category": "ai_visual",
  "endpoint": "/api/visuals/sketch"
}'),

-- SOLUTIONING EVENTS
('solutioning_image_analysis', '{
  "baseCredits": 8,
  "description": "Image analysis in Solutioning",
  "category": "ai_analysis",
  "endpoint": "/api/solutioning/image-analysis"
}'),

('solutioning_ai_enhance', '{
  "baseCredits": 12,
  "description": "AI enhancement in Solutioning",
  "category": "ai_enhancement",
  "endpoint": "/api/solutioning/ai-enhance"
}'),

('solutioning_structure_solution', '{
  "baseCredits": 15,
  "description": "Structure solution generation",
  "category": "ai_analysis",
  "endpoint": "/api/solutioning/structure-solution"
}'),

('solutioning_node_stack', '{
  "baseCredits": 6,
  "description": "Per node stack generation",
  "category": "ai_analysis",
  "endpoint": "/api/solutioning/node-stack",
  "multipliers": {
    "complexity": {"min": 1.0, "max": 3.0}
  }
}'),

('solutioning_formatting', '{
  "baseCredits": 5,
  "description": "Solution formatting",
  "category": "formatting",
  "endpoint": "/api/solutioning/formatting"
}'),

('solutioning_hyper_canvas', '{
  "baseCredits": 10,
  "description": "Hyper-canvas usage",
  "category": "ai_canvas",
  "endpoint": "/api/solutioning/hyper-canvas"
}'),

-- DATA PUSH EVENTS
('push_structuring_to_visuals', '{
  "baseCredits": 3,
  "description": "Push data from Structuring to Visuals",
  "category": "data_transfer",
  "endpoint": "/api/push/structuring-to-visuals"
}'),

('push_visuals_to_solutioning', '{
  "baseCredits": 3,
  "description": "Push data from Visuals to Solutioning",
  "category": "data_transfer",
  "endpoint": "/api/push/visuals-to-solutioning"
}'),

('push_solutioning_to_sow', '{
  "baseCredits": 5,
  "description": "Push data from Solutioning to SoW",
  "category": "data_transfer",
  "endpoint": "/api/push/solutioning-to-sow"
}'),

('push_sow_to_loe', '{
  "baseCredits": 5,
  "description": "Push data from SoW to LoE",
  "category": "data_transfer",
  "endpoint": "/api/push/sow-to-loe"
}'),

-- ADDITIONAL SYSTEM EVENTS (for future use)
('session_create', '{
  "baseCredits": 2,
  "description": "Create new session",
  "category": "session_management",
  "endpoint": "/api/sessions/create"
}'),

('session_save', '{
  "baseCredits": 1,
  "description": "Save session data",
  "category": "session_management",
  "endpoint": "/api/sessions/save"
}'),

('pdf_export_sow', '{
  "baseCredits": 8,
  "description": "Export SoW as PDF",
  "category": "pdf_export",
  "endpoint": "/api/pdf/sow"
}'),

('pdf_export_loe', '{
  "baseCredits": 8,
  "description": "Export LoE as PDF",
  "category": "pdf_export",
  "endpoint": "/api/pdf/loe"
}'),

('pdf_export_visuals', '{
  "baseCredits": 10,
  "description": "Export Visuals as PDF",
  "category": "pdf_export",
  "endpoint": "/api/pdf/visuals"
}'),

('ai_chat_message', '{
  "baseCredits": 3,
  "description": "AI chat interaction",
  "category": "ai_interaction",
  "multipliers": {
    "complexity": {"min": 1.0, "max": 2.0}
  }
}');

-- Create index for faster lookups by category
CREATE INDEX IF NOT EXISTS idx_event_definitions_category ON event_definitions USING GIN ((config->>'category'));









