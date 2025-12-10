-- ==============================================================================
-- PRISM Database Schema - Copy/Paste Version for Neon SQL Editor
-- ==============================================================================
-- Instructions:
-- 1. Go to https://console.neon.tech/
-- 2. Navigate to your project
-- 3. Click "SQL Editor" in the left sidebar
-- 4. Copy this ENTIRE file
-- 5. Paste into the SQL Editor
-- 6. Click "Run"
-- ==============================================================================

-- Step 1: Create all ENUM types
CREATE TYPE agency_user_role AS ENUM ('AGENCY_ADMIN', 'AGENCY_MEMBER');
CREATE TYPE client_user_role AS ENUM ('CLIENT_OWNER', 'CLIENT_TEAM');
CREATE TYPE media_type AS ENUM ('feature_article', 'news_brief', 'panel', 'podcast', 'tv_appearance', 'speaking_engagement', 'event', 'other');
CREATE TYPE opportunity_type AS ENUM ('PR', 'Event', 'Speaking', 'Partnership');
CREATE TYPE opportunity_status AS ENUM ('active', 'closed', 'paused', 'expired');
CREATE TYPE visibility AS ENUM ('internal_only', 'shared_with_clients');
CREATE TYPE client_opportunity_response AS ENUM ('pending', 'interested', 'accepted', 'declined', 'no_response');
CREATE TYPE user_status AS ENUM ('active', 'inactive', 'invited');
CREATE TYPE client_status AS ENUM ('active', 'inactive', 'paused');
CREATE TYPE task_status AS ENUM ('pending', 'in_progress', 'completed', 'cancelled');
CREATE TYPE task_type AS ENUM ('briefing', 'media_training', 'asset_collection', 'scheduling', 'follow_up', 'other');
CREATE TYPE notification_channel AS ENUM ('email', 'in_app', 'sms');
CREATE TYPE notification_status AS ENUM ('pending', 'sent', 'failed', 'bounced');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'expired', 'revoked');
CREATE TYPE invitation_role AS ENUM ('platform_admin', 'agency_admin', 'agency_member', 'client_owner', 'client_team');
CREATE TYPE chat_message_type AS ENUM ('client_question', 'ai_response', 'aopr_response', 'system_message');
CREATE TYPE restore_request_status AS ENUM ('pending', 'approved', 'denied');

-- Step 2: Create all tables

CREATE TABLE agencies (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  timezone TEXT DEFAULT 'America/New_York',
  settings JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE agency_users (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  role agency_user_role NOT NULL,
  status user_status DEFAULT 'active',
  avatar_url TEXT,
  last_login_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE refresh_tokens (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  user_id TEXT NOT NULL REFERENCES agency_users(id),
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  revoked_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE clients (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  industry TEXT,
  primary_contact_name TEXT,
  primary_contact_email TEXT,
  tags JSONB DEFAULT '[]',
  media_readiness_flags JSONB,
  status client_status DEFAULT 'active',
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE client_users (
  id TEXT PRIMARY KEY,
  client_id TEXT NOT NULL REFERENCES clients(id),
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT,
  role client_user_role NOT NULL,
  status user_status DEFAULT 'active',
  last_login_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE opportunities (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  created_by_user_id TEXT REFERENCES agency_users(id),
  title TEXT NOT NULL,
  summary TEXT,
  source TEXT NOT NULL,
  source_reference TEXT,
  source_raw_payload JSONB,
  media_type media_type NOT NULL,
  outlet_name TEXT,
  opportunity_type opportunity_type NOT NULL,
  category_tags JSONB DEFAULT '[]',
  topic_tags JSONB DEFAULT '[]',
  industry_tags JSONB DEFAULT '[]',
  deadline_at TIMESTAMP,
  publish_window_start TIMESTAMP,
  publish_window_end TIMESTAMP,
  status opportunity_status DEFAULT 'active',
  visibility visibility DEFAULT 'internal_only',
  ai_enrichment JSONB,
  ingestion_metadata JSONB,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE client_opportunity_statuses (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  response_state client_opportunity_response DEFAULT 'pending',
  response_source TEXT,
  responded_at TIMESTAMP,
  decline_reason TEXT,
  notes_for_agency TEXT,
  last_notified_at TIMESTAMP,
  reminder_count INTEGER DEFAULT 0,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE follow_up_tasks (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  opportunity_id TEXT NOT NULL REFERENCES opportunities(id),
  client_id TEXT NOT NULL REFERENCES clients(id),
  assigned_to_user_id TEXT REFERENCES agency_users(id),
  title TEXT NOT NULL,
  description TEXT,
  due_at TIMESTAMP,
  status task_status DEFAULT 'pending',
  task_type task_type,
  priority TEXT DEFAULT 'normal',
  created_by_user_id TEXT,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE activity_logs (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  actor_user_id TEXT,
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE notifications (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  channel notification_channel NOT NULL,
  recipient_type TEXT NOT NULL,
  recipient_id TEXT NOT NULL,
  subject TEXT,
  body_preview TEXT,
  status notification_status DEFAULT 'pending',
  related_entity_type TEXT,
  related_entity_id TEXT,
  sent_at TIMESTAMP,
  metadata JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE zoho_tokens (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  access_token TEXT NOT NULL,
  refresh_token TEXT NOT NULL,
  expires_at TIMESTAMP NOT NULL,
  scope TEXT,
  api_domain TEXT,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE pending_opportunities (
  id TEXT PRIMARY KEY,
  agency_id TEXT NOT NULL REFERENCES agencies(id),
  email_from TEXT NOT NULL,
  email_subject TEXT NOT NULL,
  email_body TEXT NOT NULL,
  email_html TEXT,
  parsed_title TEXT,
  parsed_description TEXT,
  parsed_deadline TIMESTAMP,
  parsed_media_type TEXT,
  parsed_outlet_name TEXT,
  source_email_id TEXT,
  status TEXT NOT NULL DEFAULT 'pending_review',
  assigned_client_ids JSONB DEFAULT '[]',
  assigned_by_user_id TEXT REFERENCES agency_users(id),
  notes TEXT,
  raw_email_data JSONB,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE platform_admins (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  status user_status DEFAULT 'active',
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE TABLE invitations (
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

CREATE TABLE opportunity_chats (
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

CREATE TABLE restore_requests (
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

CREATE TABLE notification_preferences (
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

-- Step 3: Create all indexes

CREATE UNIQUE INDEX agencies_slug_idx ON agencies (slug);

CREATE INDEX agency_users_agency_id_idx ON agency_users (agency_id);
CREATE UNIQUE INDEX agency_users_email_agency_id_idx ON agency_users (email, agency_id);

CREATE INDEX refresh_tokens_agency_id_idx ON refresh_tokens (agency_id);
CREATE INDEX refresh_tokens_user_id_idx ON refresh_tokens (user_id);
CREATE INDEX refresh_tokens_expires_at_idx ON refresh_tokens (expires_at);

CREATE INDEX clients_agency_id_idx ON clients (agency_id);

CREATE INDEX client_users_agency_id_idx ON client_users (agency_id);
CREATE INDEX client_users_client_id_idx ON client_users (client_id);
CREATE UNIQUE INDEX client_users_email_client_id_idx ON client_users (email, client_id);

CREATE INDEX opportunities_agency_id_idx ON opportunities (agency_id);
CREATE INDEX opportunities_status_idx ON opportunities (status);
CREATE INDEX opportunities_deadline_idx ON opportunities (deadline_at);

CREATE INDEX client_opp_status_agency_id_idx ON client_opportunity_statuses (agency_id);
CREATE INDEX client_opp_status_client_id_idx ON client_opportunity_statuses (client_id);
CREATE INDEX client_opp_status_opp_id_idx ON client_opportunity_statuses (opportunity_id);
CREATE UNIQUE INDEX client_opp_status_composite_idx ON client_opportunity_statuses (agency_id, client_id, opportunity_id);

CREATE INDEX tasks_agency_id_idx ON follow_up_tasks (agency_id);
CREATE INDEX tasks_opp_id_idx ON follow_up_tasks (opportunity_id);
CREATE INDEX tasks_client_id_idx ON follow_up_tasks (client_id);
CREATE INDEX tasks_status_idx ON follow_up_tasks (status);

CREATE INDEX activity_logs_agency_id_idx ON activity_logs (agency_id);
CREATE INDEX activity_logs_entity_idx ON activity_logs (entity_type, entity_id);

CREATE INDEX notifications_agency_id_idx ON notifications (agency_id);
CREATE INDEX notifications_recipient_idx ON notifications (recipient_type, recipient_id);
CREATE INDEX notifications_status_idx ON notifications (status);

CREATE UNIQUE INDEX zoho_tokens_agency_id_idx ON zoho_tokens (agency_id);
CREATE INDEX zoho_tokens_expires_at_idx ON zoho_tokens (expires_at);

CREATE INDEX pending_opps_agency_id_idx ON pending_opportunities (agency_id);
CREATE INDEX pending_opps_status_idx ON pending_opportunities (status);
CREATE INDEX pending_opps_email_id_idx ON pending_opportunities (source_email_id);

CREATE UNIQUE INDEX platform_admins_email_idx ON platform_admins (email);

CREATE INDEX invitations_agency_id_idx ON invitations (agency_id);
CREATE UNIQUE INDEX invitations_token_idx ON invitations (token);
CREATE INDEX invitations_status_idx ON invitations (status);
CREATE INDEX invitations_expires_at_idx ON invitations (expires_at);

CREATE INDEX opp_chats_agency_id_idx ON opportunity_chats (agency_id);
CREATE INDEX opp_chats_opp_id_idx ON opportunity_chats (opportunity_id);
CREATE INDEX opp_chats_client_id_idx ON opportunity_chats (client_id);
CREATE INDEX opp_chats_created_at_idx ON opportunity_chats (created_at);

CREATE INDEX restore_requests_agency_id_idx ON restore_requests (agency_id);
CREATE INDEX restore_requests_opp_id_idx ON restore_requests (opportunity_id);
CREATE INDEX restore_requests_client_id_idx ON restore_requests (client_id);
CREATE INDEX restore_requests_status_idx ON restore_requests (status);

CREATE INDEX notif_prefs_agency_id_idx ON notification_preferences (agency_id);
CREATE UNIQUE INDEX notif_prefs_user_idx ON notification_preferences (user_id, user_type);

-- ==============================================================================
-- Done! Your schema is now ready.
-- Next steps:
-- 1. Verify tables were created (they should appear in the left sidebar)
-- 2. Run: npm run seed (to populate initial data)
-- 3. Run: npm run dev (to start the development server)
-- ==============================================================================
