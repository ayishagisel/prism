/**
 * Shared types for email parsing
 */

export type RequestType =
  | 'QUOTE'
  | 'EMAILED_QA'
  | 'PHONE_INTERVIEW'
  | 'LIVE_VIRTUAL'
  | 'IN_STUDIO'
  | 'RECORDED'
  | 'CONTACT_REQUEST'
  | 'BACKGROUND'
  | 'OTHER';

export type DedupeAction = 'none' | 'auto_merged' | 'merge_suggested' | 'possible_duplicate';

/**
 * Represents a parsed query extracted from an email
 * This matches the parsedQueries table schema
 */
export interface ParsedQuery {
  id: string;
  agency_id: string;
  ingestion_job_id: string;
  query_index: string;
  // Client-safe fields
  headline: string | null;
  summary: string | null;
  category: string | null;
  vertical: string | null;
  request_type: RequestType | null;
  query_text: string | null;
  expert_roles: string[];
  expert_constraints: string[];
  questions: string[];
  deliverable_instructions: string[];
  // Deadline
  deadline_date: string | null;
  deadline_time: string | null;
  deadline_timezone: string | null;
  deadline_at: Date | null;
  is_hard_deadline: boolean;
  // Broadcast
  broadcast_scheduled_at: Date | null;
  broadcast_duration_minutes: string | null;
  broadcast_format: string | null;
  broadcast_notes: string | null;
  // Geography
  locations_mentioned: string[];
  // Tags
  topic_tags: string[];
  // Agency-only
  journalist_name: string | null;
  journalist_title: string | null;
  journalist_email: string | null;
  journalist_reply_alias: string | null;
  journalist_muckrack_url: string | null;
  outlet_name: string | null;
  outlet_website: string | null;
  // Dedupe
  dedupe_fingerprint: string | null;
  dedupe_action: DedupeAction;
  duplicate_of_query_id: string | null;
  similar_query_ids: string[];
  // Parse quality
  parse_confidence: string;
  parse_method: string;
  // Status
  status: string;
  reviewed_by_user_id: string | null;
  reviewed_at: Date | null;
  review_notes: string | null;
  assigned_client_ids: string[];
  assigned_by_user_id: string | null;
  assigned_at: Date | null;
  published_opportunity_id: string | null;
  published_at: Date | null;
  metadata: Record<string, unknown> | null;
}

/**
 * Evidence record linking extracted field to source text
 */
export interface ParseEvidence {
  id: string;
  parsed_query_id: string;
  field_name: string;
  field_value: string | null;
  excerpt: string;
  start_char: string | null;
  end_char: string | null;
  confidence: string;
}

/**
 * Result from any parser
 */
export interface ParserResult {
  success: boolean;
  queries: Partial<ParsedQuery>[];
  evidence: Partial<ParseEvidence>[][];
  errors: string[];
  parseConfidence: number;
}

/**
 * Ingestion job status
 */
export interface IngestionJob {
  id: string;
  agency_id: string;
  email_message_id: string | null;
  email_from: string;
  email_to: string | null;
  email_subject: string;
  email_body_text: string;
  email_body_html: string | null;
  email_received_at: Date | null;
  email_has_attachments: boolean;
  zoho_folder_id: string | null;
  zoho_thread_id: string | null;
  source_type: string | null;
  status: string;
  parsed_query_count: string;
  processing_started_at: Date | null;
  processing_completed_at: Date | null;
  processing_error: string | null;
  processing_error_details: Record<string, unknown> | null;
  raw_webhook_payload: Record<string, unknown> | null;
}

/**
 * Webhook payload from Zoho Flow
 */
export interface ZohoEmailWebhookPayload {
  // Email content
  from: string;
  to?: string;
  subject: string;
  body_text: string;
  body_html?: string;
  received_at?: string;
  message_id?: string;
  // Zoho metadata
  folder_id?: string;
  thread_id?: string;
  has_attachments?: boolean;
  // Security
  api_key?: string;
}

/**
 * Client-safe opportunity card (what clients see)
 */
export interface ClientSafeOpportunityCard {
  id: string;
  headline: string;
  whatTheyNeed: string;
  deadlineAt: Date | null;
  timeSensitivityLabel: 'URGENT' | 'SOON' | 'FLEXIBLE';
  responseFormat: string;
  questions: string[];
  constraints: string[];
  broadcastScheduledAt: Date | null;
}

/**
 * Convert deadline to sensitivity label
 */
export function getTimeSensitivityLabel(
  deadlineAt: Date | null
): 'URGENT' | 'SOON' | 'FLEXIBLE' {
  if (!deadlineAt) return 'FLEXIBLE';

  const now = new Date();
  const hoursUntilDeadline = (deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60);

  if (hoursUntilDeadline < 24) return 'URGENT';
  if (hoursUntilDeadline < 72) return 'SOON';
  return 'FLEXIBLE';
}

/**
 * Generate a dedupe fingerprint for a parsed query
 */
export function generateDedupeFingerprint(query: Partial<ParsedQuery>): string {
  // Normalize components for fingerprinting
  const components = [
    query.outlet_name?.toLowerCase().trim() || '',
    query.headline?.toLowerCase().substring(0, 100).trim() || '',
    query.deadline_at?.toISOString().split('T')[0] || '', // Just the date part
    query.journalist_email?.toLowerCase().trim() || '',
  ];

  // Simple hash function
  const str = components.join('|');
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32bit integer
  }

  return `fp_${Math.abs(hash).toString(16)}`;
}
