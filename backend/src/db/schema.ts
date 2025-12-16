import {
  pgTable,
  text,
  serial,
  timestamp,
  jsonb,
  uuid,
  varchar,
  pgEnum,
  boolean,
  index,
  uniqueIndex,
  foreignKey,
  decimal,
} from 'drizzle-orm/pg-core';

// Enums
export const agencyUserRoleEnum = pgEnum('agency_user_role', [
  'AGENCY_ADMIN',
  'AGENCY_MEMBER',
]);

export const clientUserRoleEnum = pgEnum('client_user_role', [
  'CLIENT_OWNER',
  'CLIENT_TEAM',
]);

export const mediaTypeEnum = pgEnum('media_type', [
  'feature_article',
  'news_brief',
  'panel',
  'podcast',
  'tv_appearance',
  'speaking_engagement',
  'event',
  'other',
]);

export const opportunityTypeEnum = pgEnum('opportunity_type', [
  'PR',
  'Event',
  'Speaking',
  'Partnership',
]);

export const opportunityStatusEnum = pgEnum('opportunity_status', [
  'active',
  'closed',
  'paused',
  'expired',
]);

export const visibilityEnum = pgEnum('visibility', [
  'internal_only',
  'shared_with_clients',
]);

export const clientOpportunityResponseEnum = pgEnum('client_opportunity_response', [
  'pending',
  'interested',
  'accepted',
  'declined',
  'no_response',
]);

export const userStatusEnum = pgEnum('user_status', [
  'active',
  'inactive',
  'invited',
]);

export const clientStatusEnum = pgEnum('client_status', [
  'active',
  'inactive',
  'paused',
]);

export const taskStatusEnum = pgEnum('task_status', [
  'pending',
  'in_progress',
  'completed',
  'cancelled',
]);

export const taskTypeEnum = pgEnum('task_type', [
  'briefing',
  'media_training',
  'asset_collection',
  'scheduling',
  'follow_up',
  'other',
]);

export const notificationChannelEnum = pgEnum('notification_channel', [
  'email',
  'in_app',
  'sms',
]);

export const notificationStatusEnum = pgEnum('notification_status', [
  'pending',
  'sent',
  'failed',
  'bounced',
]);

export const invitationStatusEnum = pgEnum('invitation_status', [
  'pending',
  'accepted',
  'expired',
  'revoked',
]);

export const invitationRoleEnum = pgEnum('invitation_role', [
  'platform_admin',
  'agency_admin',
  'agency_member',
  'client_owner',
  'client_team',
]);

export const chatMessageTypeEnum = pgEnum('chat_message_type', [
  'client_question',
  'ai_response',
  'aopr_response',
  'system_message',
]);

export const restoreRequestStatusEnum = pgEnum('restore_request_status', [
  'pending',
  'approved',
  'denied',
]);

// Email ingestion enums
export const emailSourceTypeEnum = pgEnum('email_source_type', [
  'SOS',           // Source of Sources - structured multi-query
  'TMX_DIGEST',    // TMX Messenger digest - semi-structured multi-query
  'TMX_SINGLE',    // TMX Messenger single query - free-form
  'MANUAL',        // Manually entered
  'ZOHO_CRM',      // From Zoho CRM sync
  'OTHER',         // Unknown/other source
]);

export const ingestionJobStatusEnum = pgEnum('ingestion_job_status', [
  'received',      // Email received, not yet processed
  'parsing',       // Currently being parsed
  'parsed',        // Successfully parsed
  'needs_review',  // Parsed but needs human review (low confidence)
  'failed',        // Parsing failed
  'completed',     // Fully processed and opportunities created
]);

export const requestTypeEnum = pgEnum('request_type', [
  'QUOTE',              // Written quote for article
  'EMAILED_QA',         // Answer questions via email
  'PHONE_INTERVIEW',    // Phone call interview
  'LIVE_VIRTUAL',       // Live virtual interview (Zoom, etc.)
  'IN_STUDIO',          // In-person studio appearance
  'RECORDED',           // Pre-recorded interview
  'CONTACT_REQUEST',    // Just seeking contact info
  'BACKGROUND',         // Background/off-record conversation
  'OTHER',
]);

export const dedupeActionEnum = pgEnum('dedupe_action', [
  'none',              // No duplicate detected
  'auto_merged',       // Automatically merged (exact match)
  'merge_suggested',   // Suggested merge (strong fingerprint match)
  'possible_duplicate', // Possible duplicate (similarity match)
]);

// Tables

export const agencies = pgTable(
  'agencies',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    slug: text('slug').notNull().unique(),
    primary_contact_name: text('primary_contact_name'),
    primary_contact_email: text('primary_contact_email'),
    timezone: text('timezone').default('America/New_York'),
    settings: jsonb('settings'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    slugIdx: uniqueIndex('agencies_slug_idx').on(t.slug),
  })
);

export const agencyUsers = pgTable(
  'agency_users',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    name: text('name').notNull(),
    email: text('email').notNull(),
    password_hash: text('password_hash'),
    role: agencyUserRoleEnum('role').notNull(),
    status: userStatusEnum('status').default('active'),
    avatar_url: text('avatar_url'),
    last_login_at: timestamp('last_login_at'),
    // Presence tracking for real-time features
    is_online: boolean('is_online').default(false),
    last_seen_at: timestamp('last_seen_at'),
    socket_id: text('socket_id'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('agency_users_agency_id_idx').on(t.agency_id),
    emailIdx: uniqueIndex('agency_users_email_agency_id_idx').on(t.email, t.agency_id),
    isOnlineIdx: index('agency_users_is_online_idx').on(t.is_online),
  })
);

export const refreshTokens = pgTable(
  'refresh_tokens',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    user_id: text('user_id').notNull(),
    user_type: text('user_type').notNull().default('agency_user'), // 'agency_user' or 'client_user'
    token_hash: text('token_hash').notNull(),
    expires_at: timestamp('expires_at').notNull(),
    revoked_at: timestamp('revoked_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('refresh_tokens_agency_id_idx').on(t.agency_id),
    userIdIdx: index('refresh_tokens_user_id_idx').on(t.user_id),
    expiresAtIdx: index('refresh_tokens_expires_at_idx').on(t.expires_at),
  })
);

export const clients = pgTable(
  'clients',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    zoho_id: text('zoho_id'), // Zoho Account ID for sync tracking
    name: text('name').notNull(),
    company_name: text('company_name'),
    industry: text('industry'),
    primary_contact_name: text('primary_contact_name'),
    primary_contact_email: text('primary_contact_email'),
    tags: jsonb('tags').default('[]'),
    media_readiness_flags: jsonb('media_readiness_flags'),
    status: clientStatusEnum('status').default('active'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('clients_agency_id_idx').on(t.agency_id),
    zohoIdIdx: index('clients_zoho_id_idx').on(t.zoho_id),
  })
);

export const clientUsers = pgTable(
  'client_users',
  {
    id: text('id').primaryKey(),
    client_id: text('client_id')
      .notNull()
      .references(() => clients.id),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    name: text('name').notNull(),
    email: text('email').notNull(),
    password_hash: text('password_hash'),
    role: clientUserRoleEnum('role').notNull(),
    status: userStatusEnum('status').default('active'),
    avatar_url: text('avatar_url'),
    last_login_at: timestamp('last_login_at'),
    // Presence tracking for real-time features
    is_online: boolean('is_online').default(false),
    last_seen_at: timestamp('last_seen_at'),
    socket_id: text('socket_id'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('client_users_agency_id_idx').on(t.agency_id),
    clientIdIdx: index('client_users_client_id_idx').on(t.client_id),
    emailIdx: uniqueIndex('client_users_email_client_id_idx').on(t.email, t.client_id),
    isOnlineIdx: index('client_users_is_online_idx').on(t.is_online),
  })
);

export const opportunities = pgTable(
  'opportunities',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    zoho_id: text('zoho_id'), // Zoho Deal ID for sync tracking
    created_by_user_id: text('created_by_user_id').references(() => agencyUsers.id),
    title: text('title').notNull(),
    summary: text('summary'),
    source: text('source').notNull(), // manual_form, csv_import, email_parser, zoho_api
    source_reference: text('source_reference'), // CSV row ID, email message ID, etc.
    source_raw_payload: jsonb('source_raw_payload'),
    media_type: mediaTypeEnum('media_type').notNull(),
    outlet_name: text('outlet_name'),
    opportunity_type: opportunityTypeEnum('opportunity_type').notNull(),
    category_tags: jsonb('category_tags').default('[]'),
    topic_tags: jsonb('topic_tags').default('[]'),
    industry_tags: jsonb('industry_tags').default('[]'),
    deadline_at: timestamp('deadline_at'),
    publish_window_start: timestamp('publish_window_start'),
    publish_window_end: timestamp('publish_window_end'),
    status: opportunityStatusEnum('status').default('active'),
    visibility: visibilityEnum('visibility').default('internal_only'),
    ai_enrichment: jsonb('ai_enrichment'), // future: Gemini summaries, fit scores
    ingestion_metadata: jsonb('ingestion_metadata'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('opportunities_agency_id_idx').on(t.agency_id),
    zohoIdIdx: index('opportunities_zoho_id_idx').on(t.zoho_id),
    statusIdx: index('opportunities_status_idx').on(t.status),
    deadlineIdx: index('opportunities_deadline_idx').on(t.deadline_at),
  })
);

export const clientOpportunityStatus = pgTable(
  'client_opportunity_statuses',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    client_id: text('client_id')
      .notNull()
      .references(() => clients.id),
    opportunity_id: text('opportunity_id')
      .notNull()
      .references(() => opportunities.id),
    response_state: clientOpportunityResponseEnum('response_state').default('pending'),
    response_source: text('response_source'), // client_app, email, phone, etc.
    responded_at: timestamp('responded_at'),
    decline_reason: text('decline_reason'),
    notes_for_agency: text('notes_for_agency'),
    last_notified_at: timestamp('last_notified_at'),
    reminder_count: serial('reminder_count').default(0),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('client_opp_status_agency_id_idx').on(t.agency_id),
    clientIdIdx: index('client_opp_status_client_id_idx').on(t.client_id),
    oppIdIdx: index('client_opp_status_opp_id_idx').on(t.opportunity_id),
    compositeIdx: uniqueIndex('client_opp_status_composite_idx').on(
      t.agency_id,
      t.client_id,
      t.opportunity_id
    ),
  })
);

export const followUpTasks = pgTable(
  'follow_up_tasks',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    opportunity_id: text('opportunity_id')
      .notNull()
      .references(() => opportunities.id),
    client_id: text('client_id')
      .notNull()
      .references(() => clients.id),
    assigned_to_user_id: text('assigned_to_user_id').references(() => agencyUsers.id),
    title: text('title').notNull(),
    description: text('description'),
    due_at: timestamp('due_at'),
    status: taskStatusEnum('status').default('pending'),
    task_type: taskTypeEnum('task_type'),
    priority: text('priority').default('normal'), // low, normal, high
    created_by_user_id: text('created_by_user_id'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('tasks_agency_id_idx').on(t.agency_id),
    oppIdIdx: index('tasks_opp_id_idx').on(t.opportunity_id),
    clientIdIdx: index('tasks_client_id_idx').on(t.client_id),
    statusIdx: index('tasks_status_idx').on(t.status),
  })
);

export const activityLogs = pgTable(
  'activity_logs',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    actor_user_id: text('actor_user_id'),
    entity_type: text('entity_type').notNull(), // opportunity, client_opportunity_status, task, etc.
    entity_id: text('entity_id').notNull(),
    action: text('action').notNull(), // created, updated, deleted, status_changed, etc.
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('activity_logs_agency_id_idx').on(t.agency_id),
    entityIdx: index('activity_logs_entity_idx').on(t.entity_type, t.entity_id),
  })
);

export const emailVerificationTokens = pgTable(
  'email_verification_tokens',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull(),
    user_type: text('user_type').notNull(), // 'agency_user' or 'client_user'
    email: text('email').notNull(),
    token_hash: text('token_hash').notNull(),
    expires_at: timestamp('expires_at').notNull(),
    verified_at: timestamp('verified_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index('email_verification_tokens_user_id_idx').on(t.user_id),
    tokenIdx: index('email_verification_tokens_token_idx').on(t.token_hash),
    expiresAtIdx: index('email_verification_tokens_expires_at_idx').on(t.expires_at),
  })
);

export const passwordResetTokens = pgTable(
  'password_reset_tokens',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull(),
    user_type: text('user_type').notNull(), // 'agency_user' or 'client_user'
    email: text('email').notNull(),
    token_hash: text('token_hash').notNull(),
    expires_at: timestamp('expires_at').notNull(),
    used_at: timestamp('used_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    userIdIdx: index('password_reset_tokens_user_id_idx').on(t.user_id),
    tokenIdx: index('password_reset_tokens_token_idx').on(t.token_hash),
    expiresAtIdx: index('password_reset_tokens_expires_at_idx').on(t.expires_at),
  })
);

export const notifications = pgTable(
  'notifications',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    channel: notificationChannelEnum('channel').notNull(),
    recipient_type: text('recipient_type').notNull(), // client_user, agency_user
    recipient_id: text('recipient_id').notNull(),
    subject: text('subject'),
    body_preview: text('body_preview'),
    status: notificationStatusEnum('status').default('pending'),
    related_entity_type: text('related_entity_type'),
    related_entity_id: text('related_entity_id'),
    sent_at: timestamp('sent_at'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('notifications_agency_id_idx').on(t.agency_id),
    recipientIdx: index('notifications_recipient_idx').on(t.recipient_type, t.recipient_id),
    statusIdx: index('notifications_status_idx').on(t.status),
  })
);

export const zohoTokens = pgTable(
  'zoho_tokens',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    access_token: text('access_token').notNull(),
    refresh_token: text('refresh_token').notNull(),
    expires_at: timestamp('expires_at').notNull(),
    scope: text('scope'),
    api_domain: text('api_domain'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: uniqueIndex('zoho_tokens_agency_id_idx').on(t.agency_id),
    expiresAtIdx: index('zoho_tokens_expires_at_idx').on(t.expires_at),
  })
);

// ============================================
// EMAIL INGESTION TABLES
// ============================================

// Ingestion Jobs - tracks processing of incoming emails
export const ingestionJobs = pgTable(
  'ingestion_jobs',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    // Email metadata
    email_message_id: text('email_message_id'), // Unique message ID from email server
    email_from: text('email_from').notNull(),
    email_to: text('email_to'),
    email_subject: text('email_subject').notNull(),
    email_body_text: text('email_body_text').notNull(),
    email_body_html: text('email_body_html'),
    email_received_at: timestamp('email_received_at'),
    email_has_attachments: boolean('email_has_attachments').default(false),
    // Zoho-specific metadata
    zoho_folder_id: text('zoho_folder_id'),
    zoho_thread_id: text('zoho_thread_id'),
    // Source detection
    source_type: emailSourceTypeEnum('source_type'), // SOS, TMX_DIGEST, TMX_SINGLE, OTHER
    // Processing status
    status: ingestionJobStatusEnum('status').default('received'),
    parsed_query_count: text('parsed_query_count').default('0'), // How many queries extracted
    processing_started_at: timestamp('processing_started_at'),
    processing_completed_at: timestamp('processing_completed_at'),
    processing_error: text('processing_error'),
    processing_error_details: jsonb('processing_error_details'),
    // Raw storage
    raw_webhook_payload: jsonb('raw_webhook_payload'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('ingestion_jobs_agency_id_idx').on(t.agency_id),
    statusIdx: index('ingestion_jobs_status_idx').on(t.status),
    emailMessageIdIdx: uniqueIndex('ingestion_jobs_email_message_id_idx').on(t.email_message_id),
    sourceTypeIdx: index('ingestion_jobs_source_type_idx').on(t.source_type),
    receivedAtIdx: index('ingestion_jobs_received_at_idx').on(t.email_received_at),
  })
);

// Parsed Queries - individual opportunities extracted from emails
// One email (ingestionJob) can contain multiple queries (SOS has 5-10 per email)
export const parsedQueries = pgTable(
  'parsed_queries',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    ingestion_job_id: text('ingestion_job_id')
      .notNull()
      .references(() => ingestionJobs.id),
    // Position in source email (for multi-query emails)
    query_index: text('query_index').default('0'), // 0, 1, 2, ... position in email
    // Parsed fields - CLIENT-SAFE (what clients can see)
    headline: text('headline'), // e.g., "Here's the Minimum Net Worth to Be Considered Upper Class by 2027"
    summary: text('summary'),
    category: text('category'), // e.g., "Business and Finance"
    vertical: text('vertical'), // Industry vertical
    // Request details
    request_type: requestTypeEnum('request_type'), // QUOTE, EMAILED_QA, LIVE_VIRTUAL, etc.
    query_text: text('query_text'), // Full original query/request text
    expert_roles: jsonb('expert_roles').default('[]'), // ["CFP", "Finance Expert"]
    expert_constraints: jsonb('expert_constraints').default('[]'), // ["US-based only"]
    questions: jsonb('questions').default('[]'), // Array of questions to answer
    deliverable_instructions: jsonb('deliverable_instructions').default('[]'),
    // Deadline
    deadline_date: text('deadline_date'), // "2025-12-17"
    deadline_time: text('deadline_time'), // "12:00 pm"
    deadline_timezone: text('deadline_timezone'), // "Eastern Standard Time"
    deadline_at: timestamp('deadline_at'), // Computed full timestamp
    is_hard_deadline: boolean('is_hard_deadline').default(true),
    // Broadcast/Interview scheduling (for live appearances)
    broadcast_scheduled_at: timestamp('broadcast_scheduled_at'),
    broadcast_duration_minutes: text('broadcast_duration_minutes'),
    broadcast_format: text('broadcast_format'), // LIVE_VIRTUAL, IN_STUDIO, RECORDED
    broadcast_notes: text('broadcast_notes'),
    // Geography
    locations_mentioned: jsonb('locations_mentioned').default('[]'),
    // Tags
    topic_tags: jsonb('topic_tags').default('[]'),
    // AGENCY-ONLY fields (never exposed to clients)
    journalist_name: text('journalist_name'),
    journalist_title: text('journalist_title'),
    journalist_email: text('journalist_email'),
    journalist_reply_alias: text('journalist_reply_alias'), // TMX send+xxx@tmxmessenger.com
    journalist_muckrack_url: text('journalist_muckrack_url'),
    outlet_name: text('outlet_name'),
    outlet_website: text('outlet_website'),
    // Dedupe
    dedupe_fingerprint: text('dedupe_fingerprint'), // Hash for near-duplicate detection
    dedupe_action: dedupeActionEnum('dedupe_action').default('none'),
    duplicate_of_query_id: text('duplicate_of_query_id'), // If duplicate, points to original
    similar_query_ids: jsonb('similar_query_ids').default('[]'), // IDs of similar (not duplicate) queries
    // Parse quality
    parse_confidence: decimal('parse_confidence', { precision: 3, scale: 2 }), // 0.00-1.00
    parse_method: text('parse_method'), // "regex", "llm", "hybrid"
    // Review status
    status: text('status').default('pending_review'), // pending_review, approved, assigned, discarded
    reviewed_by_user_id: text('reviewed_by_user_id').references(() => agencyUsers.id),
    reviewed_at: timestamp('reviewed_at'),
    review_notes: text('review_notes'),
    // Assignment
    assigned_client_ids: jsonb('assigned_client_ids').default('[]'),
    assigned_by_user_id: text('assigned_by_user_id').references(() => agencyUsers.id),
    assigned_at: timestamp('assigned_at'),
    // Link to created opportunity (after approval)
    published_opportunity_id: text('published_opportunity_id').references(() => opportunities.id),
    published_at: timestamp('published_at'),
    // Metadata
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('parsed_queries_agency_id_idx').on(t.agency_id),
    ingestionJobIdIdx: index('parsed_queries_ingestion_job_id_idx').on(t.ingestion_job_id),
    statusIdx: index('parsed_queries_status_idx').on(t.status),
    deadlineIdx: index('parsed_queries_deadline_at_idx').on(t.deadline_at),
    dedupeIdx: index('parsed_queries_dedupe_fingerprint_idx').on(t.dedupe_fingerprint),
    publishedOppIdx: index('parsed_queries_published_opp_idx').on(t.published_opportunity_id),
  })
);

// Parse Evidence - anti-hallucination tracking
// Links extracted fields to exact text spans in source email
export const parseEvidence = pgTable(
  'parse_evidence',
  {
    id: text('id').primaryKey(),
    parsed_query_id: text('parsed_query_id')
      .notNull()
      .references(() => parsedQueries.id),
    field_name: text('field_name').notNull(), // e.g., "deadline_date", "journalist_email"
    field_value: text('field_value'), // The extracted value
    excerpt: text('excerpt').notNull(), // The source text that supports this extraction
    start_char: text('start_char'), // Character offset in source
    end_char: text('end_char'),
    confidence: decimal('confidence', { precision: 3, scale: 2 }), // 0.00-1.00
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    parsedQueryIdIdx: index('parse_evidence_parsed_query_id_idx').on(t.parsed_query_id),
    fieldNameIdx: index('parse_evidence_field_name_idx').on(t.field_name),
  })
);

// Keep legacy table for backward compatibility but mark as deprecated
// TODO: Migrate any existing data and remove this table
export const pendingOpportunities = pgTable(
  'pending_opportunities',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    email_from: text('email_from').notNull(),
    email_subject: text('email_subject').notNull(),
    email_body: text('email_body').notNull(),
    email_html: text('email_html'),
    parsed_title: text('parsed_title'),
    parsed_description: text('parsed_description'),
    parsed_deadline: timestamp('parsed_deadline'),
    parsed_media_type: text('parsed_media_type'),
    parsed_outlet_name: text('parsed_outlet_name'),
    source_email_id: text('source_email_id'), // Message ID from email server
    status: text('status').notNull().default('pending_review'), // pending_review, assigned, discarded
    assigned_client_ids: jsonb('assigned_client_ids').default('[]'), // array of client IDs
    assigned_by_user_id: text('assigned_by_user_id').references(() => agencyUsers.id),
    notes: text('notes'),
    raw_email_data: jsonb('raw_email_data'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('pending_opps_agency_id_idx').on(t.agency_id),
    statusIdx: index('pending_opps_status_idx').on(t.status),
    emailIdIdx: index('pending_opps_email_id_idx').on(t.source_email_id),
  })
);

export const platformAdmins = pgTable(
  'platform_admins',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    email: text('email').notNull().unique(),
    password_hash: text('password_hash').notNull(),
    status: userStatusEnum('status').default('active'),
    last_login_at: timestamp('last_login_at'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    emailIdx: uniqueIndex('platform_admins_email_idx').on(t.email),
  })
);

export const invitations = pgTable(
  'invitations',
  {
    id: text('id').primaryKey(),
    email: text('email').notNull(),
    agency_id: text('agency_id').references(() => agencies.id), // null for platform admin invites
    role: invitationRoleEnum('role').notNull(),
    token: text('token').notNull().unique(),
    invited_by_user_id: text('invited_by_user_id'), // platform_admin or agency_user id
    invited_by_user_type: text('invited_by_user_type'), // 'platform_admin' or 'agency_user'
    status: invitationStatusEnum('status').default('pending'),
    expires_at: timestamp('expires_at').notNull(),
    accepted_at: timestamp('accepted_at'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('invitations_agency_id_idx').on(t.agency_id),
    tokenIdx: uniqueIndex('invitations_token_idx').on(t.token),
    statusIdx: index('invitations_status_idx').on(t.status),
    expiresAtIdx: index('invitations_expires_at_idx').on(t.expires_at),
  })
);

export const opportunityChats = pgTable(
  'opportunity_chats',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    opportunity_id: text('opportunity_id')
      .notNull()
      .references(() => opportunities.id),
    client_id: text('client_id')
      .notNull()
      .references(() => clients.id),
    client_user_id: text('client_user_id').references(() => clientUsers.id),
    message_type: chatMessageTypeEnum('message_type').notNull(),
    sender_type: text('sender_type').notNull(), // 'client', 'ai_bot', 'aopr_rep', 'system'
    sender_id: text('sender_id'), // user_id if human, null if AI
    message: text('message').notNull(),
    is_escalated: boolean('is_escalated').default(false),
    escalated_to_user_id: text('escalated_to_user_id').references(() => agencyUsers.id),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('opp_chats_agency_id_idx').on(t.agency_id),
    oppIdIdx: index('opp_chats_opp_id_idx').on(t.opportunity_id),
    clientIdIdx: index('opp_chats_client_id_idx').on(t.client_id),
    createdAtIdx: index('opp_chats_created_at_idx').on(t.created_at),
  })
);

export const restoreRequests = pgTable(
  'restore_requests',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    opportunity_id: text('opportunity_id')
      .notNull()
      .references(() => opportunities.id),
    client_id: text('client_id')
      .notNull()
      .references(() => clients.id),
    client_user_id: text('client_user_id')
      .notNull()
      .references(() => clientUsers.id),
    status: restoreRequestStatusEnum('status').default('pending'),
    reviewed_by_user_id: text('reviewed_by_user_id').references(() => agencyUsers.id),
    reviewed_at: timestamp('reviewed_at'),
    review_notes: text('review_notes'),
    requested_at: timestamp('requested_at').defaultNow().notNull(),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('restore_requests_agency_id_idx').on(t.agency_id),
    oppIdIdx: index('restore_requests_opp_id_idx').on(t.opportunity_id),
    clientIdIdx: index('restore_requests_client_id_idx').on(t.client_id),
    statusIdx: index('restore_requests_status_idx').on(t.status),
  })
);

export const notificationPreferences = pgTable(
  'notification_preferences',
  {
    id: text('id').primaryKey(),
    user_id: text('user_id').notNull(), // client_user or agency_user id
    user_type: text('user_type').notNull(), // 'client_user' or 'agency_user'
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    email_enabled: boolean('email_enabled').default(true),
    push_enabled: boolean('push_enabled').default(true),
    sms_enabled: boolean('sms_enabled').default(false),
    phone_number: text('phone_number'),
    push_subscription: jsonb('push_subscription'), // Web Push API subscription object
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('notif_prefs_agency_id_idx').on(t.agency_id),
    userIdx: uniqueIndex('notif_prefs_user_idx').on(t.user_id, t.user_type),
  })
);
