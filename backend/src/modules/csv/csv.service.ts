import { parse } from 'csv-parse/sync';
import { opportunityService } from '../opportunity/opportunity.service';
import { clientService } from '../client/client.service';
import { logger } from '../../utils/logger';

export interface CSVRow {
  [key: string]: string;
}

/**
 * CSV Import Service
 * Handles ingestion of opportunities from CSV files (e.g., Zoho exports)
 */
export class CSVImportService {
  /**
   * Parse CSV content
   */
  parseCSV(content: string): CSVRow[] {
    try {
      const records = parse(content, {
        columns: true,
        skip_empty_lines: true,
      });
      return records;
    } catch (err) {
      logger.error('CSV parse error', err);
      throw new Error('Failed to parse CSV');
    }
  }

  /**
   * Normalize CSV row to opportunity input
   * TODO Phase 2: Make this configurable per agency
   */
  normalizeRow(row: CSVRow): {
    title?: string;
    summary?: string;
    media_type?: string;
    outlet_name?: string;
    opportunity_type?: string;
    deadline_at?: string;
    client_name?: string;
  } {
    return {
      title: row['Title'] || row['title'],
      summary: row['Description'] || row['description'],
      media_type: this.mapMediaType(row['Type'] || row['type']),
      outlet_name: row['Outlet'] || row['outlet'],
      opportunity_type: row['Category'] || row['Opportunity Type'] || 'PR',
      deadline_at: this.parseDate(row['Deadline'] || row['deadline']),
      client_name: row['Client'] || row['client'],
    };
  }

  /**
   * Map CSV media type to schema enum
   */
  private mapMediaType(value?: string): string {
    if (!value) return 'other';

    const mapping: Record<string, string> = {
      article: 'feature_article',
      feature: 'feature_article',
      news: 'news_brief',
      brief: 'news_brief',
      panel: 'panel',
      podcast: 'podcast',
      tv: 'tv_appearance',
      speaking: 'speaking_engagement',
      event: 'event',
    };

    const normalized = value.toLowerCase().trim();
    return mapping[normalized] || 'other';
  }

  /**
   * Parse date string (flexible format support)
   */
  private parseDate(dateStr?: string): string | undefined {
    if (!dateStr) return undefined;

    try {
      const date = new Date(dateStr);
      if (isNaN(date.getTime())) return undefined;
      return date.toISOString();
    } catch {
      return undefined;
    }
  }

  /**
   * Import opportunities from CSV
   */
  async importFromCSV(
    agencyId: string,
    userId: string,
    csvContent: string,
    clientMapping?: Record<string, string>
  ) {
    try {
      const rows = this.parseCSV(csvContent);
      const results = {
        created: 0,
        skipped: 0,
        errors: [] as Array<{ row: number; error: string }>,
      };

      for (let i = 0; i < rows.length; i++) {
        const row = rows[i];

        try {
          const normalized = this.normalizeRow(row);

          if (!normalized.title) {
            results.skipped++;
            continue;
          }

          // Try to match client by name
          let targetClientIds: string[] = [];
          if (normalized.client_name && clientMapping) {
            const matchedClientId = clientMapping[normalized.client_name.toLowerCase()];
            if (matchedClientId) {
              targetClientIds = [matchedClientId];
            }
          }

          const opp = await opportunityService.createOpportunity(agencyId, userId, {
            title: normalized.title,
            summary: normalized.summary,
            media_type: normalized.media_type,
            outlet_name: normalized.outlet_name,
            opportunity_type: normalized.opportunity_type,
            deadline_at: normalized.deadline_at,
            target_client_ids: targetClientIds,
          });

          results.created++;
          logger.info('CSV row imported', { row: i + 1, opportunityId: opp.id });
        } catch (err) {
          results.errors.push({
            row: i + 1,
            error: err instanceof Error ? err.message : 'Unknown error',
          });
          logger.error('CSV row import error', { row: i + 1, error: err });
        }
      }

      logger.info('CSV import complete', results);
      return results;
    } catch (err) {
      logger.error('CSV import error', err);
      throw err;
    }
  }
}

export const csvImportService = new CSVImportService();
