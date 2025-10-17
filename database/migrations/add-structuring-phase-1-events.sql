-- Add new event types for Structuring Page Phase 1 & 2
-- These events were added when splitting Diagnose and Generate Solution into sequential calls

INSERT INTO event_definitions (event_type, config) VALUES 

-- Analysis Report (Phase 1 - Sequential call after diagnose)
('structuring_analysis_report', '{
  "baseCredits": 15,
  "description": "Generate detailed DMA analysis report after pain points",
  "category": "ai_analysis",
  "endpoint": "/api/organizations/[orgId]/structuring/generate-analysis-report",
  "multipliers": {
    "complexity": {"min": 1.0, "max": 2.0}
  }
}'),

-- Solution Overview (Phase 1 - Sequential call after generate solution)
('structuring_solution_overview', '{
  "baseCredits": 12,
  "description": "Generate Improve/Control overview after solutions",
  "category": "ai_analysis",
  "endpoint": "/api/organizations/[orgId]/structuring/generate-solution-overview",
  "multipliers": {
    "complexity": {"min": 1.0, "max": 1.5}
  }
}')

ON CONFLICT (event_type) DO NOTHING;

