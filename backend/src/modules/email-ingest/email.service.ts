import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import { db } from '../../config/db';
import { pendingOpportunities } from '../../db/schema';
import { eq, and } from 'drizzle-orm';
import { v4 as uuid } from 'uuid';
import { logger } from '../../utils/logger';

export interface ParsedEmail {
  messageId: string;
  from: string;
  subject: string;
  text: string;
  html?: string;
  receivedDate: Date;
}

export interface ParsedOpportunity {
  title: string;
  description: string;
  deadline?: Date;
  mediaType?: string;
  outletName?: string;
}

export class EmailIngestionService {
  private imap: ImapFlow | null = null;

  /**
   * Connect to IMAP server
   */
  async connect(host: string, port: number, user: string, password: string): Promise<void> {
    try {
      this.imap = new ImapFlow({
        host,
        port,
        secure: port === 993,
        auth: { user, pass: password },
        logger: false,
      });

      await this.imap.connect();
      logger.info('📧 Connected to email server');
    } catch (error) {
      logger.error('Failed to connect to email server:', error);
      throw error;
    }
  }

  /**
   * Disconnect from IMAP server
   */
  async disconnect(): Promise<void> {
    if (this.imap) {
      await this.imap.logout();
      logger.info('📧 Disconnected from email server');
    }
  }

  /**
   * Fetch new emails from inbox
   */
  async fetchNewEmails(
    folder: string = 'INBOX',
    since?: Date
  ): Promise<ParsedEmail[]> {
    if (!this.imap) {
      throw new Error('IMAP connection not established');
    }

    try {
      await this.imap.mailboxOpen(folder, { readOnly: true });

      // Build search query - ImapFlow expects specific format
      const searchQuery: { unseen?: boolean; since?: Date } = { unseen: true };
      if (since) {
        searchQuery.since = since;
      }

      // Search for emails
      const uids = await this.imap.search(searchQuery);
      const uidArray = Array.isArray(uids) ? uids : [];
      logger.info(`📧 Found ${uidArray.length} new emails`);

      if (uidArray.length === 0) {
        return [];
      }

      const emails: ParsedEmail[] = [];

      // Fetch each email
      for await (const message of this.imap.fetch(uidArray, { source: true })) {
        try {
          const parsed = await simpleParser(message.source as Buffer);

          emails.push({
            messageId: message.uid.toString(),
            from: (parsed.from?.text as string) || 'unknown@example.com',
            subject: (parsed.subject as string) || '(No Subject)',
            text: (parsed.text as string) || '',
            html: parsed.html as string | undefined,
            receivedDate: (parsed.date as Date) || new Date(),
          });
        } catch (err) {
          logger.warn(`Failed to parse email UID ${message.uid}:`, err);
        }
      }

      return emails;
    } catch (error) {
      logger.error('Failed to fetch emails:', error);
      throw error;
    }
  }

  /**
   * Parse email into opportunity fields
   * Basic extraction - can be enhanced with AI/ML later
   */
  parseEmailToOpportunity(email: ParsedEmail): ParsedOpportunity {
    const subject = email.subject.toLowerCase();
    const body = `${email.subject}\n\n${email.text}`.toLowerCase();

    // Simple deadline extraction (look for common patterns)
    let deadline: Date | undefined;
    const deadlineMatch = body.match(/deadline[:\s]*([\d\w\s,]+)/i);
    if (deadlineMatch) {
      const dateStr = deadlineMatch[1];
      const parsed = new Date(dateStr);
      if (!isNaN(parsed.getTime())) {
        deadline = parsed;
      }
    }

    // Extract outlet name (email domain)
    const domainMatch = email.from.match(/@([a-z0-9.-]+\.[a-z]{2,})/i);
    const outletName = domainMatch ? domainMatch[1] : undefined;

    // Infer media type from subject (very basic)
    let mediaType = 'feature_article'; // default
    if (subject.includes('podcast')) mediaType = 'podcast';
    if (subject.includes('newsletter')) mediaType = 'newsletter';
    if (subject.includes('event')) mediaType = 'event';
    if (subject.includes('speaking')) mediaType = 'speaking_engagement';
    if (subject.includes('panel')) mediaType = 'panel';

    return {
      title: email.subject,
      description: email.text || email.html || '',
      deadline,
      mediaType,
      outletName,
    };
  }

  /**
   * Create pending opportunity record
   */
  async createPendingOpportunity(
    agencyId: string,
    email: ParsedEmail,
    parsed: ParsedOpportunity
  ): Promise<string> {
    const pendingOppId = uuid();

    try {
      await db.insert(pendingOpportunities).values({
        id: pendingOppId,
        agency_id: agencyId,
        email_from: email.from,
        email_subject: email.subject,
        email_body: email.text,
        email_html: email.html,
        parsed_title: parsed.title,
        parsed_description: parsed.description,
        parsed_deadline: parsed.deadline,
        parsed_media_type: parsed.mediaType,
        parsed_outlet_name: parsed.outletName,
        source_email_id: email.messageId,
        status: 'pending_review',
        assigned_client_ids: [],
      });

      logger.info(`✓ Created pending opportunity: ${pendingOppId}`);
      return pendingOppId;
    } catch (error) {
      logger.error('Failed to create pending opportunity:', error);
      throw error;
    }
  }

  /**
   * Get all pending opportunities for an agency
   */
  async getPendingOpportunities(agencyId: string) {
    try {
      const pending = await db
        .select()
        .from(pendingOpportunities)
        .where(
          and(
            eq(pendingOpportunities.agency_id, agencyId),
            eq(pendingOpportunities.status, 'pending_review')
          )
        )
        .orderBy(pendingOpportunities.created_at);

      return pending;
    } catch (error) {
      logger.error('Failed to fetch pending opportunities:', error);
      throw error;
    }
  }

  /**
   * Assign pending opportunity to clients and create actual opportunity
   */
  async assignToClients(
    agencyId: string,
    pendingOppId: string,
    clientIds: string[],
    userId: string
  ): Promise<void> {
    try {
      // Get the pending opportunity
      const pending = await db
        .select()
        .from(pendingOpportunities)
        .where(eq(pendingOpportunities.id, pendingOppId))
        .then((rows) => rows[0]);

      if (!pending) {
        throw new Error(`Pending opportunity not found: ${pendingOppId}`);
      }

      // Update status
      await db
        .update(pendingOpportunities)
        .set({
          status: 'assigned',
          assigned_client_ids: clientIds,
          assigned_by_user_id: userId,
          updated_at: new Date(),
        })
        .where(eq(pendingOpportunities.id, pendingOppId));

      logger.info(`✓ Assigned pending opportunity ${pendingOppId} to ${clientIds.length} clients`);
    } catch (error) {
      logger.error('Failed to assign clients:', error);
      throw error;
    }
  }

  /**
   * Discard a pending opportunity
   */
  async discardOpportunity(pendingOppId: string): Promise<void> {
    try {
      await db
        .update(pendingOpportunities)
        .set({
          status: 'discarded',
          updated_at: new Date(),
        })
        .where(eq(pendingOpportunities.id, pendingOppId));

      logger.info(`✓ Discarded pending opportunity: ${pendingOppId}`);
    } catch (error) {
      logger.error('Failed to discard opportunity:', error);
      throw error;
    }
  }

  /**
   * Poll for new emails (called periodically)
   */
  async pollEmails(
    agencyId: string,
    emailConfig: {
      host: string;
      port: number;
      user: string;
      password: string;
    }
  ): Promise<number> {
    try {
      await this.connect(emailConfig.host, emailConfig.port, emailConfig.user, emailConfig.password);

      const emails = await this.fetchNewEmails('INBOX');
      logger.info(`📧 Polling found ${emails.length} new emails`);

      let created = 0;
      for (const email of emails) {
        // Skip if already processed
        const exists = await db
          .select()
          .from(pendingOpportunities)
          .where(
            and(
              eq(pendingOpportunities.agency_id, agencyId),
              eq(pendingOpportunities.source_email_id, email.messageId)
            )
          )
          .then((rows) => rows.length > 0);

        if (exists) {
          logger.info(`⚠️ Email already processed: ${email.messageId}`);
          continue;
        }

        // Parse and create pending opportunity
        const parsed = this.parseEmailToOpportunity(email);
        await this.createPendingOpportunity(agencyId, email, parsed);
        created++;
      }

      logger.info(`✓ Created ${created} new pending opportunities`);
      return created;
    } catch (error) {
      logger.error('Email polling failed:', error);
      return 0;
    } finally {
      await this.disconnect();
    }
  }
}

export const emailIngestionService = new EmailIngestionService();
