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
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('agency_users_agency_id_idx').on(t.agency_id),
    emailIdx: uniqueIndex('agency_users_email_agency_id_idx').on(t.email, t.agency_id),
  })
);

export const clients = pgTable(
  'clients',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
    name: text('name').notNull(),
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
    last_login_at: timestamp('last_login_at'),
    metadata: jsonb('metadata'),
    created_at: timestamp('created_at').defaultNow().notNull(),
    updated_at: timestamp('updated_at').defaultNow().notNull(),
  },
  (t) => ({
    agencyIdIdx: index('client_users_agency_id_idx').on(t.agency_id),
    clientIdIdx: index('client_users_client_id_idx').on(t.client_id),
    emailIdx: uniqueIndex('client_users_email_client_id_idx').on(t.email, t.client_id),
  })
);

export const opportunities = pgTable(
  'opportunities',
  {
    id: text('id').primaryKey(),
    agency_id: text('agency_id')
      .notNull()
      .references(() => agencies.id),
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
