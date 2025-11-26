-- PRISM Database Schema
-- Generated from backend/src/db/schema.ts

-- Create ENUMs first (required before creating tables that reference them)

CREATE TYPE "agency_user_role" AS ENUM (
  'AGENCY_ADMIN',
  'AGENCY_MEMBER'
);

CREATE TYPE "client_user_role" AS ENUM (
  'CLIENT_OWNER',
  'CLIENT_TEAM'
);

CREATE TYPE "media_type" AS ENUM (
  'feature_article',
  'news_brief',
  'panel',
  'podcast',
  'tv_appearance',
  'speaking_engagement',
  'event',
  'other'
);

CREATE TYPE "opportunity_type" AS ENUM (
  'PR',
  'Event',
  'Speaking',
  'Partnership'
);

CREATE TYPE "opportunity_status" AS ENUM (
  'active',
  'closed',
  'paused',
  'expired'
);

CREATE TYPE "visibility" AS ENUM (
  'internal_only',
  'shared_with_clients'
);

CREATE TYPE "client_opportunity_response" AS ENUM (
  'pending',
  'interested',
  'accepted',
  'declined',
  'no_response'
);

CREATE TYPE "user_status" AS ENUM (
  'active',
  'inactive',
  'invited'
);

CREATE TYPE "client_status" AS ENUM (
  'active',
  'inactive',
  'paused'
);

CREATE TYPE "task_status" AS ENUM (
  'pending',
  'in_progress',
  'completed',
  'cancelled'
);

CREATE TYPE "task_type" AS ENUM (
  'briefing',
  'media_training',
  'asset_collection',
  'scheduling',
  'follow_up',
  'other'
);

CREATE TYPE "notification_channel" AS ENUM (
  'email',
  'in_app',
  'sms'
);

CREATE TYPE "notification_status" AS ENUM (
  'pending',
  'sent',
  'failed',
  'bounced'
);

-- Create TABLES

-- Agencies table
CREATE TABLE "agencies" (
  "id" TEXT PRIMARY KEY,
  "name" TEXT NOT NULL,
  "slug" TEXT NOT NULL UNIQUE,
  "primary_contact_name" TEXT,
  "primary_contact_email" TEXT,
  "timezone" TEXT DEFAULT 'America/New_York',
  "settings" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE UNIQUE INDEX "agencies_slug_idx" ON "agencies" ("slug");

-- Agency Users table
CREATE TABLE "agency_users" (
  "id" TEXT PRIMARY KEY,
  "agency_id" TEXT NOT NULL REFERENCES "agencies"("id"),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT,
  "role" "agency_user_role" NOT NULL,
  "status" "user_status" DEFAULT 'active',
  "avatar_url" TEXT,
  "last_login_at" TIMESTAMP,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX "agency_users_agency_id_idx" ON "agency_users" ("agency_id");
CREATE UNIQUE INDEX "agency_users_email_agency_id_idx" ON "agency_users" ("email", "agency_id");

-- Clients table
CREATE TABLE "clients" (
  "id" TEXT PRIMARY KEY,
  "agency_id" TEXT NOT NULL REFERENCES "agencies"("id"),
  "name" TEXT NOT NULL,
  "industry" TEXT,
  "primary_contact_name" TEXT,
  "primary_contact_email" TEXT,
  "tags" JSONB DEFAULT '[]',
  "media_readiness_flags" JSONB,
  "status" "client_status" DEFAULT 'active',
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX "clients_agency_id_idx" ON "clients" ("agency_id");

-- Client Users table
CREATE TABLE "client_users" (
  "id" TEXT PRIMARY KEY,
  "client_id" TEXT NOT NULL REFERENCES "clients"("id"),
  "agency_id" TEXT NOT NULL REFERENCES "agencies"("id"),
  "name" TEXT NOT NULL,
  "email" TEXT NOT NULL,
  "password_hash" TEXT,
  "role" "client_user_role" NOT NULL,
  "status" "user_status" DEFAULT 'active',
  "last_login_at" TIMESTAMP,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX "client_users_agency_id_idx" ON "client_users" ("agency_id");
CREATE INDEX "client_users_client_id_idx" ON "client_users" ("client_id");
CREATE UNIQUE INDEX "client_users_email_client_id_idx" ON "client_users" ("email", "client_id");

-- Opportunities table
CREATE TABLE "opportunities" (
  "id" TEXT PRIMARY KEY,
  "agency_id" TEXT NOT NULL REFERENCES "agencies"("id"),
  "created_by_user_id" TEXT REFERENCES "agency_users"("id"),
  "title" TEXT NOT NULL,
  "summary" TEXT,
  "source" TEXT NOT NULL,
  "source_reference" TEXT,
  "source_raw_payload" JSONB,
  "media_type" "media_type" NOT NULL,
  "outlet_name" TEXT,
  "opportunity_type" "opportunity_type" NOT NULL,
  "category_tags" JSONB DEFAULT '[]',
  "topic_tags" JSONB DEFAULT '[]',
  "industry_tags" JSONB DEFAULT '[]',
  "deadline_at" TIMESTAMP,
  "publish_window_start" TIMESTAMP,
  "publish_window_end" TIMESTAMP,
  "status" "opportunity_status" DEFAULT 'active',
  "visibility" "visibility" DEFAULT 'internal_only',
  "ai_enrichment" JSONB,
  "ingestion_metadata" JSONB,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX "opportunities_agency_id_idx" ON "opportunities" ("agency_id");
CREATE INDEX "opportunities_status_idx" ON "opportunities" ("status");
CREATE INDEX "opportunities_deadline_idx" ON "opportunities" ("deadline_at");

-- Client Opportunity Statuses table
CREATE TABLE "client_opportunity_statuses" (
  "id" TEXT PRIMARY KEY,
  "agency_id" TEXT NOT NULL REFERENCES "agencies"("id"),
  "client_id" TEXT NOT NULL REFERENCES "clients"("id"),
  "opportunity_id" TEXT NOT NULL REFERENCES "opportunities"("id"),
  "response_state" "client_opportunity_response" DEFAULT 'pending',
  "response_source" TEXT,
  "responded_at" TIMESTAMP,
  "decline_reason" TEXT,
  "notes_for_agency" TEXT,
  "last_notified_at" TIMESTAMP,
  "reminder_count" INTEGER DEFAULT 0,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX "client_opp_status_agency_id_idx" ON "client_opportunity_statuses" ("agency_id");
CREATE INDEX "client_opp_status_client_id_idx" ON "client_opportunity_statuses" ("client_id");
CREATE INDEX "client_opp_status_opp_id_idx" ON "client_opportunity_statuses" ("opportunity_id");
CREATE UNIQUE INDEX "client_opp_status_composite_idx" ON "client_opportunity_statuses" ("agency_id", "client_id", "opportunity_id");

-- Follow-up Tasks table
CREATE TABLE "follow_up_tasks" (
  "id" TEXT PRIMARY KEY,
  "agency_id" TEXT NOT NULL REFERENCES "agencies"("id"),
  "opportunity_id" TEXT NOT NULL REFERENCES "opportunities"("id"),
  "client_id" TEXT NOT NULL REFERENCES "clients"("id"),
  "assigned_to_user_id" TEXT REFERENCES "agency_users"("id"),
  "title" TEXT NOT NULL,
  "description" TEXT,
  "due_at" TIMESTAMP,
  "status" "task_status" DEFAULT 'pending',
  "task_type" "task_type",
  "priority" TEXT DEFAULT 'normal',
  "created_by_user_id" TEXT,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX "tasks_agency_id_idx" ON "follow_up_tasks" ("agency_id");
CREATE INDEX "tasks_opp_id_idx" ON "follow_up_tasks" ("opportunity_id");
CREATE INDEX "tasks_client_id_idx" ON "follow_up_tasks" ("client_id");
CREATE INDEX "tasks_status_idx" ON "follow_up_tasks" ("status");

-- Activity Logs table
CREATE TABLE "activity_logs" (
  "id" TEXT PRIMARY KEY,
  "agency_id" TEXT NOT NULL REFERENCES "agencies"("id"),
  "actor_user_id" TEXT,
  "entity_type" TEXT NOT NULL,
  "entity_id" TEXT NOT NULL,
  "action" TEXT NOT NULL,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX "activity_logs_agency_id_idx" ON "activity_logs" ("agency_id");
CREATE INDEX "activity_logs_entity_idx" ON "activity_logs" ("entity_type", "entity_id");

-- Notifications table
CREATE TABLE "notifications" (
  "id" TEXT PRIMARY KEY,
  "agency_id" TEXT NOT NULL REFERENCES "agencies"("id"),
  "channel" "notification_channel" NOT NULL,
  "recipient_type" TEXT NOT NULL,
  "recipient_id" TEXT NOT NULL,
  "subject" TEXT,
  "body_preview" TEXT,
  "status" "notification_status" DEFAULT 'pending',
  "related_entity_type" TEXT,
  "related_entity_id" TEXT,
  "sent_at" TIMESTAMP,
  "metadata" JSONB,
  "created_at" TIMESTAMP DEFAULT NOW() NOT NULL,
  "updated_at" TIMESTAMP DEFAULT NOW() NOT NULL
);

CREATE INDEX "notifications_agency_id_idx" ON "notifications" ("agency_id");
CREATE INDEX "notifications_recipient_idx" ON "notifications" ("recipient_type", "recipient_id");
CREATE INDEX "notifications_status_idx" ON "notifications" ("status");
