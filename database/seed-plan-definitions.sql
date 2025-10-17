-- Seed initial plan definitions for NEXA Platform billing
-- Based on the pricing structure from the implementation plan

INSERT INTO plan_definitions (plan_name, config) VALUES 

-- FREE PLAN
('free', '{
  "displayName": "Free Plan",
  "monthlyCredits": 100,
  "pricing": {
    "monthly": 0,
    "annual": 0
  },
  "limits": {
    "aiCallsPerMonth": 50,
    "pdfExportsPerMonth": 5,
    "sessionLimit": 10,
    "teamMembersLimit": 1,
    "storageLimit": 100
  },
  "features": [
    "Basic AI tools",
    "PDF exports",
    "Community support",
    "Email support"
  ],
  "overageRate": 0
}'),

-- STARTER PLAN
('starter', '{
  "displayName": "Starter Plan",
  "monthlyCredits": 1000,
  "pricing": {
    "monthly": 19,
    "annual": 190
  },
  "limits": {
    "aiCallsPerMonth": 500,
    "pdfExportsPerMonth": 50,
    "sessionLimit": 50,
    "teamMembersLimit": 5,
    "storageLimit": 1000
  },
  "features": [
    "All AI tools",
    "Unlimited PDFs",
    "Email support",
    "Basic analytics",
    "Session templates"
  ],
  "overageRate": 0.015
}'),

-- PROFESSIONAL PLAN
('professional', '{
  "displayName": "Professional Plan",
  "monthlyCredits": 5000,
  "pricing": {
    "monthly": 49,
    "annual": 490
  },
  "limits": {
    "aiCallsPerMonth": 2000,
    "pdfExportsPerMonth": 200,
    "sessionLimit": 200,
    "teamMembersLimit": 20,
    "storageLimit": 5000
  },
  "features": [
    "Advanced AI tools",
    "Priority support",
    "Custom branding",
    "Advanced analytics",
    "Team collaboration",
    "API access",
    "Webhooks"
  ],
  "overageRate": 0.01
}'),

-- ENTERPRISE PLAN
('enterprise', '{
  "displayName": "Enterprise Plan",
  "monthlyCredits": 15000,
  "pricing": {
    "monthly": 99,
    "annual": 990
  },
  "limits": {
    "aiCallsPerMonth": -1,
    "pdfExportsPerMonth": -1,
    "sessionLimit": -1,
    "teamMembersLimit": -1,
    "storageLimit": 20000
  },
  "features": [
    "Unlimited AI tools",
    "Dedicated support",
    "SSO integration",
    "Custom integrations",
    "Advanced security",
    "Audit logs",
    "Priority processing",
    "Custom deployment",
    "SLA guarantees"
  ],
  "overageRate": 0.005
}');

-- Create index for faster lookups by pricing
CREATE INDEX IF NOT EXISTS idx_plan_definitions_pricing ON plan_definitions USING GIN ((config->'pricing'));





















