/**
 * Email Ingestion Service
 *
 * Orchestrates the email parsing pipeline:
 * 1. Receive email via webhook
 * 2. Create ingestion job
 * 3. Detect source type
 * 4. Route to appropriate parser
 * 5. Create parsed queries
 * 6. Store evidence
 * 7. Run dedupe
 */

import { db } from '../../config/db';
import { ingestionJobs, parsedQueries, parseEvidence } from '../../db/schema';
import { eq, and, or, sql } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';
import {
  detectEmailSource,
  EmailSourceType,
  ZohoEmailWebhookPayload,
  ParsedQuery,
  ParseEvidence as ParseEvidenceType,
  generateDedupeFingerprint,
} from './parsers';
import { parseSOSEmail, sosQueryToParsedQuery } from './parsers/sos.parser';
import { parseTMXDigestEmail, tmxDigestQueryToParsedQuery } from './parsers/tmx-digest.parser';
import {
  parseTMXSingleEmail,
  tmxSingleQueryToParsedQuery,
} from './parsers/tmx-single.parser';

export interface IngestionResult {
  success: boolean;
  ingestionJobId: string;
  sourceType: EmailSourceType;
  queriesCreated: number;
  errors: string[];
}

export class IngestService {
  /**
   * Process an incoming email from Zoho webhook
   */
  async processWebhookEmail(
    agencyId: string,
    payload: ZohoEmailWebhookPayload
  ): Promise<IngestionResult> {
    const ingestionJobId = uuid();
    const errors: string[] = [];

    try {
      // 1. Check for duplicate email (by message_id)
      if (payload.message_id) {
        const existing = await db
          .select()
          .from(ingestionJobs)
          .where(eq(ingestionJobs.email_message_id, payload.message_id))
          .limit(1);

        if (existing.length > 0) {
          logger.info(`Duplicate email detected: ${payload.message_id}`);
          return {
            success: false,
            ingestionJobId: existing[0].id,
            sourceType: (existing[0].source_type as EmailSourceType) || 'OTHER',
            queriesCreated: 0,
            errors: ['Duplicate email - already processed'],
          };
        }
      }

      // 2. Detect source type
      const detection = detectEmailSource(payload.subject, payload.body_text, payload.from);
      logger.info(
        `Source detected: ${detection.sourceType} (confidence: ${detection.confidence})`
      );

      // 3. Create ingestion job record
      await db.insert(ingestionJobs).values({
        id: ingestionJobId,
        agency_id: agencyId,
        email_message_id: payload.message_id || null,
        email_from: payload.from,
        email_to: payload.to || null,
        email_subject: payload.subject,
        email_body_text: payload.body_text,
        email_body_html: payload.body_html || null,
        email_received_at: payload.received_at ? new Date(payload.received_at) : new Date(),
        email_has_attachments: payload.has_attachments || false,
        zoho_folder_id: payload.folder_id || null,
        zoho_thread_id: payload.thread_id || null,
        source_type: detection.sourceType,
        status: 'parsing',
        processing_started_at: new Date(),
        raw_webhook_payload: payload as unknown as Record<string, unknown>,
      });

      // 4. Parse based on source type
      let queriesCreated = 0;

      switch (detection.sourceType) {
        case 'SOS':
          queriesCreated = await this.processSOS(
            agencyId,
            ingestionJobId,
            payload.body_text
          );
          break;

        case 'TMX_DIGEST':
          queriesCreated = await this.processTMXDigest(
            agencyId,
            ingestionJobId,
            payload.body_text
          );
          break;

        case 'TMX_SINGLE':
          queriesCreated = await this.processTMXSingle(
            agencyId,
            ingestionJobId,
            payload.body_text
          );
          break;

        case 'OTHER':
        default:
          // For unknown sources, try TMX Single parser with LLM if available
          queriesCreated = await this.processTMXSingle(
            agencyId,
            ingestionJobId,
            payload.body_text,
            true // Try LLM
          );
          break;
      }

      // 5. Update job status
      await db
        .update(ingestionJobs)
        .set({
          status: queriesCreated > 0 ? 'completed' : 'needs_review',
          parsed_query_count: queriesCreated.toString(),
          processing_completed_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(ingestionJobs.id, ingestionJobId));

      logger.info(
        `Ingestion complete: ${queriesCreated} queries from ${detection.sourceType} email`
      );

      return {
        success: true,
        ingestionJobId,
        sourceType: detection.sourceType,
        queriesCreated,
        errors,
      };
    } catch (error: any) {
      logger.error('Ingestion failed:', error);

      // Update job with error
      await db
        .update(ingestionJobs)
        .set({
          status: 'failed',
          processing_error: error.message,
          processing_error_details: { stack: error.stack },
          processing_completed_at: new Date(),
          updated_at: new Date(),
        })
        .where(eq(ingestionJobs.id, ingestionJobId));

      return {
        success: false,
        ingestionJobId,
        sourceType: 'OTHER',
        queriesCreated: 0,
        errors: [error.message],
      };
    }
  }

  /**
   * Process SOS (Source of Sources) email
   */
  private async processSOS(
    agencyId: string,
    ingestionJobId: string,
    bodyText: string
  ): Promise<number> {
    const result = parseSOSEmail(bodyText);

    if (!result.success) {
      logger.warn('SOS parsing failed:', result.errors);
      return 0;
    }

    let created = 0;

    for (const sosQuery of result.queries) {
      const { parsedQuery, evidence } = sosQueryToParsedQuery(
        sosQuery,
        ingestionJobId,
        agencyId
      );

      // Generate dedupe fingerprint
      parsedQuery.dedupe_fingerprint = generateDedupeFingerprint(parsedQuery);

      // Check for duplicates
      const dedupeResult = await this.checkDedupe(agencyId, parsedQuery.dedupe_fingerprint!);
      parsedQuery.dedupe_action = dedupeResult.action;
      parsedQuery.duplicate_of_query_id = dedupeResult.duplicateOfId;
      parsedQuery.similar_query_ids = dedupeResult.similarIds;

      // Skip if exact duplicate
      if (dedupeResult.action === 'auto_merged') {
        logger.info(`Skipping duplicate query: ${parsedQuery.headline}`);
        continue;
      }

      // Insert parsed query
      const queryId = uuid();
      await db.insert(parsedQueries).values({
        id: queryId,
        ...parsedQuery,
        expert_roles: JSON.stringify(parsedQuery.expert_roles || []),
        expert_constraints: JSON.stringify(parsedQuery.expert_constraints || []),
        questions: JSON.stringify(parsedQuery.questions || []),
        deliverable_instructions: JSON.stringify([]),
        locations_mentioned: JSON.stringify([]),
        topic_tags: JSON.stringify([]),
        assigned_client_ids: JSON.stringify([]),
        similar_query_ids: JSON.stringify(parsedQuery.similar_query_ids || []),
      } as any);

      // Insert evidence records
      for (const ev of evidence) {
        await db.insert(parseEvidence).values({
          id: uuid(),
          parsed_query_id: queryId,
          ...ev,
        } as any);
      }

      created++;
    }

    return created;
  }

  /**
   * Process TMX Messenger digest email
   */
  private async processTMXDigest(
    agencyId: string,
    ingestionJobId: string,
    bodyText: string
  ): Promise<number> {
    const result = parseTMXDigestEmail(bodyText);

    if (!result.success) {
      logger.warn('TMX Digest parsing failed:', result.errors);
      return 0;
    }

    let created = 0;

    for (const tmxQuery of result.queries) {
      const { parsedQuery, evidence } = tmxDigestQueryToParsedQuery(
        tmxQuery,
        ingestionJobId,
        agencyId
      );

      // Generate dedupe fingerprint
      parsedQuery.dedupe_fingerprint = generateDedupeFingerprint(parsedQuery);

      // Check for duplicates
      const dedupeResult = await this.checkDedupe(agencyId, parsedQuery.dedupe_fingerprint!);
      parsedQuery.dedupe_action = dedupeResult.action;
      parsedQuery.duplicate_of_query_id = dedupeResult.duplicateOfId;
      parsedQuery.similar_query_ids = dedupeResult.similarIds;

      if (dedupeResult.action === 'auto_merged') {
        continue;
      }

      const queryId = uuid();
      await db.insert(parsedQueries).values({
        id: queryId,
        ...parsedQuery,
        expert_roles: JSON.stringify(parsedQuery.expert_roles || []),
        expert_constraints: JSON.stringify(parsedQuery.expert_constraints || []),
        questions: JSON.stringify(parsedQuery.questions || []),
        deliverable_instructions: JSON.stringify([]),
        locations_mentioned: JSON.stringify([]),
        topic_tags: JSON.stringify([]),
        assigned_client_ids: JSON.stringify([]),
        similar_query_ids: JSON.stringify(parsedQuery.similar_query_ids || []),
      } as any);

      for (const ev of evidence) {
        await db.insert(parseEvidence).values({
          id: uuid(),
          parsed_query_id: queryId,
          ...ev,
        } as any);
      }

      created++;
    }

    return created;
  }

  /**
   * Process TMX Messenger single query email
   */
  private async processTMXSingle(
    agencyId: string,
    ingestionJobId: string,
    bodyText: string,
    useLLM: boolean = false
  ): Promise<number> {
    const result = await parseTMXSingleEmail(bodyText, useLLM);

    if (!result.success || !result.query) {
      logger.warn('TMX Single parsing failed:', result.errors);
      return 0;
    }

    const { parsedQuery, evidence } = tmxSingleQueryToParsedQuery(
      result.query,
      ingestionJobId,
      agencyId,
      result.parseMethod,
      result.parseConfidence
    );

    // Generate dedupe fingerprint
    parsedQuery.dedupe_fingerprint = generateDedupeFingerprint(parsedQuery);

    // Check for duplicates
    const dedupeResult = await this.checkDedupe(agencyId, parsedQuery.dedupe_fingerprint!);
    parsedQuery.dedupe_action = dedupeResult.action;
    parsedQuery.duplicate_of_query_id = dedupeResult.duplicateOfId;
    parsedQuery.similar_query_ids = dedupeResult.similarIds;

    if (dedupeResult.action === 'auto_merged') {
      return 0;
    }

    const queryId = uuid();
    await db.insert(parsedQueries).values({
      id: queryId,
      ...parsedQuery,
      expert_roles: JSON.stringify(parsedQuery.expert_roles || []),
      expert_constraints: JSON.stringify(parsedQuery.expert_constraints || []),
      questions: JSON.stringify(parsedQuery.questions || []),
      deliverable_instructions: JSON.stringify([]),
      locations_mentioned: JSON.stringify([]),
      topic_tags: JSON.stringify([]),
      assigned_client_ids: JSON.stringify([]),
      similar_query_ids: JSON.stringify(parsedQuery.similar_query_ids || []),
    } as any);

    for (const ev of evidence) {
      await db.insert(parseEvidence).values({
        id: uuid(),
        parsed_query_id: queryId,
        ...ev,
      } as any);
    }

    return 1;
  }

  /**
   * Check for duplicate/similar queries (3-layer dedupe)
   */
  private async checkDedupe(
    agencyId: string,
    fingerprint: string
  ): Promise<{
    action: 'none' | 'auto_merged' | 'merge_suggested' | 'possible_duplicate';
    duplicateOfId: string | null;
    similarIds: string[];
  }> {
    // Layer 1: Exact fingerprint match (auto-dedupe)
    const exactMatch = await db
      .select()
      .from(parsedQueries)
      .where(
        and(
          eq(parsedQueries.agency_id, agencyId),
          eq(parsedQueries.dedupe_fingerprint, fingerprint)
        )
      )
      .limit(1);

    if (exactMatch.length > 0) {
      return {
        action: 'auto_merged',
        duplicateOfId: exactMatch[0].id,
        similarIds: [],
      };
    }

    // Layer 2: Similar fingerprint (first 8 chars match)
    // This catches queries from same outlet with similar headlines
    const fingerprintPrefix = fingerprint.substring(0, 10);
    const similarMatches = await db
      .select()
      .from(parsedQueries)
      .where(
        and(
          eq(parsedQueries.agency_id, agencyId),
          sql`${parsedQueries.dedupe_fingerprint} LIKE ${fingerprintPrefix + '%'}`
        )
      )
      .limit(5);

    if (similarMatches.length > 0) {
      return {
        action: 'merge_suggested',
        duplicateOfId: null,
        similarIds: similarMatches.map((m) => m.id),
      };
    }

    // Layer 3: No match
    return {
      action: 'none',
      duplicateOfId: null,
      similarIds: [],
    };
  }

  /**
   * Get all parsed queries pending review for an agency
   */
  async getPendingQueries(agencyId: string) {
    return db
      .select()
      .from(parsedQueries)
      .where(
        and(
          eq(parsedQueries.agency_id, agencyId),
          eq(parsedQueries.status, 'pending_review')
        )
      )
      .orderBy(parsedQueries.deadline_at);
  }

  /**
   * Get ingestion jobs for an agency
   */
  async getIngestionJobs(agencyId: string, limit: number = 50) {
    return db
      .select()
      .from(ingestionJobs)
      .where(eq(ingestionJobs.agency_id, agencyId))
      .orderBy(sql`${ingestionJobs.created_at} DESC`)
      .limit(limit);
  }

  /**
   * Get a specific parsed query with evidence
   */
  async getQueryWithEvidence(queryId: string) {
    const query = await db
      .select()
      .from(parsedQueries)
      .where(eq(parsedQueries.id, queryId))
      .limit(1);

    if (query.length === 0) {
      return null;
    }

    const evidence = await db
      .select()
      .from(parseEvidence)
      .where(eq(parseEvidence.parsed_query_id, queryId));

    return {
      query: query[0],
      evidence,
    };
  }

  /**
   * Update query status (approve, discard, etc.)
   */
  async updateQueryStatus(
    queryId: string,
    status: string,
    userId: string,
    notes?: string
  ) {
    await db
      .update(parsedQueries)
      .set({
        status,
        reviewed_by_user_id: userId,
        reviewed_at: new Date(),
        review_notes: notes || null,
        updated_at: new Date(),
      })
      .where(eq(parsedQueries.id, queryId));
  }

  /**
   * Assign query to clients
   */
  async assignToClients(
    queryId: string,
    clientIds: string[],
    userId: string
  ) {
    await db
      .update(parsedQueries)
      .set({
        status: 'assigned',
        assigned_client_ids: JSON.stringify(clientIds),
        assigned_by_user_id: userId,
        assigned_at: new Date(),
        updated_at: new Date(),
      })
      .where(eq(parsedQueries.id, queryId));
  }
}

export const ingestService = new IngestService();
