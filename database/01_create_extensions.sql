-- Enable required PostgreSQL extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Create ENUM types
CREATE TYPE user_status AS ENUM ('active', 'pending', 'suspended', 'deleted');
CREATE TYPE organization_status AS ENUM ('active', 'suspended', 'deleted');
CREATE TYPE organization_plan AS ENUM ('free', 'starter', 'professional', 'enterprise');
CREATE TYPE subscription_status AS ENUM ('active', 'past_due', 'canceled', 'trialing');
CREATE TYPE membership_role AS ENUM ('owner', 'admin', 'member', 'viewer', 'billing');
CREATE TYPE membership_status AS ENUM ('active', 'pending', 'suspended');


