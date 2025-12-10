-- ==============================================================================
-- PRISM Phase 2A Migration - NEW TABLES ONLY
-- ==============================================================================
-- This migration adds only the NEW tables needed for Phase 2A client portal
-- Run this in Neon SQL Editor if you already have the base schema
-- ==============================================================================

-- Step 1: Create NEW ENUM types only
DO $$ BEGIN
    CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE invitation_role AS ENUM ('platform_admin', 'agency_admin', 'agency_member', 'client_owner', 'client_team');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE chat_message_type AS ENUM ('client_question', 'ai_response', 'aopr_response', 'system_message');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE restore_request_status AS ENUM ('pending', 'approved', 'denied');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- Step 2: Create NEW tables only

-- Platform Admins table
CREATE TABLE IF NOT EXISTS platform_admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status user_status DEFAULT 'active',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Invitations table
CREATE TABLE IF NOT EXISTS invitations (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL,
  agency_id TEXT REFERENCES agencies(id),
  role invitation_role NOT NULL,
  token TEXT NOT NULL UNIQUE,
  invited_by_user_id TEXT,
  invited_by_user_type TEXT,
  status invitation_status DEFAULT 'pending',
  expires_at TIMESTAMP NOT NULL,
  accepted_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Opportunity Chats table
CREATE TABLE IF NOT EXISTS opportunity_chats (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  client_user_id TEXT REFERENCES client_users(id),
  message_type chat_message_type NOT NULL,
  sender_type TEXT NOT NULL,
  sender_id TEXT,
  message TEXT NOT NULL,
  is_escalated BOOLEAN DEFAULT false,
  escalated_to_user_id TEXT REFERENCES agency_users(id),
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Restore Requests table
CREATE TABLE IF NOT EXISTS restore_requests (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  client_user_id TEXT NOT NULL REFERENCES client_users(id),
  status restore_request_status DEFAULT 'pending',
  reviewed_by_user_id TEXT REFERENCES agency_users(id),
  reviewed_at TIMESTAMP,
  review_notes TEXT,
  requested_at TIMESTAMP DEFAULT NOW() NOT NULL,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Notification Preferences table
CREATE TABLE IF NOT EXISTS notification_preferences (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  user_type TEXT NOT NULL,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  sms_enabled BOOLEAN DEFAULT false,
  phone_number TEXT,
  push_subscription JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

-- Step 3: Create indexes for new tables

-- Platform admins indexes
CREATE UNIQUE INDEX IF NOT EXISTS platform_admins_email_idx ON platform_admins (email);

-- Invitations indexes
CREATE INDEX IF NOT EXISTS invitations_agency_id_idx ON invitations (agency_id);
CREATE UNIQUE INDEX IF NOT EXISTS invitations_token_idx ON invitations (token);
CREATE INDEX IF NOT EXISTS invitations_status_idx ON invitations (status);
CREATE INDEX IF NOT EXISTS invitations_expires_at_idx ON invitations (expires_at);

-- Opportunity chats indexes
CREATE INDEX IF NOT EXISTS opp_chats_agency_id_idx ON opportunity_chats (agency_id);
CREATE INDEX IF NOT EXISTS opp_chats_opp_id_idx ON opportunity_chats (opportunity_id);
CREATE INDEX IF NOT EXISTS opp_chats_client_id_idx ON opportunity_chats (client_id);
CREATE INDEX IF NOT EXISTS opp_chats_created_at_idx ON opportunity_chats (created_at);

-- Restore requests indexes
CREATE INDEX IF NOT EXISTS restore_requests_agency_id_idx ON restore_requests (agency_id);
CREATE INDEX IF NOT EXISTS restore_requests_opp_id_idx ON restore_requests (opportunity_id);
CREATE INDEX IF NOT EXISTS restore_requests_client_id_idx ON restore_requests (client_id);
CREATE INDEX IF NOT EXISTS restore_requests_status_idx ON restore_requests (status);

-- Notification preferences indexes
CREATE INDEX IF NOT EXISTS notif_prefs_agency_id_idx ON notification_preferences (agency_id);
CREATE UNIQUE INDEX IF NOT EXISTS notif_prefs_user_idx ON notification_preferences (user_id, user_type);

-- ==============================================================================
-- Migration Complete!
-- ==============================================================================
-- New tables created:
-- ✓ platform_admins
-- ✓ invitations
-- ✓ opportunity_chats
-- ✓ restore_requests
-- ✓ notification_preferences
--
-- You can verify by checking the Tables list in Neon's left sidebar
-- ==============================================================================
