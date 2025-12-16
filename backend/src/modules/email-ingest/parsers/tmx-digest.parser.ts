/**
 * TMX Messenger Digest Email Parser
 *
 * Parses digest emails from TMX Messenger containing multiple newsroom requests.
 *
 * Example format:
 * Messages below from newsrooms.
 *
 * Health
 * 1. Mental Health Expert Needed for Live Interview
 * Synopsis: The newsroom seeks a licensed mental health professional to discuss stress...
 * Sent from: NBC NEWS / reply to journalist, email: send+47440.21535@tmxmessenger.com
 *
 * News
 * 2. Contact Needed for Oregon Student Survey Story
 * Synopsis: A contact is needed for Chuck Gonzales...
 * Sent from: Newsmax / reply to journalist, email: send+47048.21532@tmxmessenger.com
 */

import { ParsedQuery, ParseEvidence, RequestType } from './types';

export interface TMXDigestQuery {
  index: number;
  category: string; // Health, News, Business, etc.
  title: string;
  synopsis: string;
  outlet: string;
  replyEmail: string; // send+XXXXX.XXXXX@tmxmessenger.com
  rawBlock: string;
  startChar: number;
  endChar: number;
}

export interface TMXDigestParseResult {
  success: boolean;
  queries: TMXDigestQuery[];
  errors: string[];
  parseConfidence: number;
}

/**
 * Parse a TMX Messenger digest email into individual queries
 */
export function parseTMXDigestEmail(bodyText: string): TMXDigestParseResult {
  const queries: TMXDigestQuery[] = [];
  const errors: string[] = [];

  // Track current category as we parse
  let currentCategory = 'General';

  // First, identify category headers (single word/phrase on its own line before numbered items)
  const categoryPattern = /^(Health|News|Business|Entertainment|Technology|Finance|Lifestyle|Sports|Politics|Science|Travel|Other)$/gim;

  // Build a map of category positions
  const categoryPositions: { category: string; position: number }[] = [];
  let catMatch;
  while ((catMatch = categoryPattern.exec(bodyText)) !== null) {
    categoryPositions.push({
      category: catMatch[1],
      position: catMatch.index,
    });
  }

  // Parse individual queries
  // Pattern: N. Title\nSynopsis: ...\nSent from: OUTLET / reply to journalist, email: EMAIL
  const queryPattern =
    /(\d+)\.\s+(.+?)[\r\n]+Synopsis:\s*(.+?)[\r\n]+Sent from:\s*(.+?)\s*\/\s*reply to journalist,?\s*email:\s*(\S+@tmxmessenger\.com)/gi;

  let match;
  while ((match = queryPattern.exec(bodyText)) !== null) {
    try {
      const [fullMatch, indexStr, title, synopsis, outlet, replyEmail] = match;

      // Determine category based on position
      let category = 'General';
      for (let i = categoryPositions.length - 1; i >= 0; i--) {
        if (categoryPositions[i].position < match.index) {
          category = categoryPositions[i].category;
          break;
        }
      }

      queries.push({
        index: parseInt(indexStr, 10),
        category,
        title: title.trim(),
        synopsis: synopsis.trim(),
        outlet: outlet.trim(),
        replyEmail: replyEmail.trim(),
        rawBlock: fullMatch,
        startChar: match.index,
        endChar: match.index + fullMatch.length,
      });
    } catch (err) {
      errors.push(`Failed to parse TMX digest query at position ${match.index}: ${err}`);
    }
  }

  const confidence = queries.length > 0 ? 0.9 : 0;

  return {
    success: queries.length > 0,
    queries,
    errors,
    parseConfidence: errors.length === 0 ? confidence : confidence * 0.8,
  };
}

/**
 * Convert TMX Digest query to standardized ParsedQuery format
 */
export function tmxDigestQueryToParsedQuery(
  tmxQuery: TMXDigestQuery,
  ingestionJobId: string,
  agencyId: string
): { parsedQuery: Partial<ParsedQuery>; evidence: Partial<ParseEvidence>[] } {
  const evidence: Partial<ParseEvidence>[] = [];

  // Infer request type from synopsis
  const requestType = inferRequestTypeFromSynopsis(tmxQuery.synopsis);

  // Try to extract deadline from synopsis if mentioned
  const { deadlineAt, broadcastScheduledAt, broadcastDuration } = extractSchedulingInfo(
    tmxQuery.synopsis
  );

  // Build evidence records
  evidence.push({
    field_name: 'headline',
    field_value: tmxQuery.title,
    excerpt: tmxQuery.title,
    confidence: '1.00',
  });

  evidence.push({
    field_name: 'journalist_reply_alias',
    field_value: tmxQuery.replyEmail,
    excerpt: `Sent from: ${tmxQuery.outlet} / reply to journalist, email: ${tmxQuery.replyEmail}`,
    confidence: '1.00',
  });

  if (broadcastScheduledAt) {
    evidence.push({
      field_name: 'broadcast_scheduled_at',
      field_value: broadcastScheduledAt.toISOString(),
      excerpt: tmxQuery.synopsis,
      confidence: '0.85',
    });
  }

  const parsedQuery: Partial<ParsedQuery> = {
    agency_id: agencyId,
    ingestion_job_id: ingestionJobId,
    query_index: tmxQuery.index.toString(),
    // Client-safe fields
    headline: tmxQuery.title,
    summary: tmxQuery.synopsis,
    category: tmxQuery.category,
    request_type: requestType,
    query_text: tmxQuery.synopsis,
    expert_roles: extractExpertRoles(tmxQuery.synopsis),
    expert_constraints: [],
    questions: [],
    // Deadline (TMX digests often don't have explicit deadlines)
    deadline_at: deadlineAt,
    is_hard_deadline: false,
    // Broadcast info
    broadcast_scheduled_at: broadcastScheduledAt,
    broadcast_duration_minutes: broadcastDuration,
    broadcast_format: requestType === 'LIVE_VIRTUAL' ? 'LIVE_VIRTUAL' : null,
    // Agency-only fields
    journalist_reply_alias: tmxQuery.replyEmail,
    outlet_name: tmxQuery.outlet,
    // Parse metadata
    parse_confidence: '0.85', // TMX digest is less structured than SOS
    parse_method: 'regex',
    status: 'pending_review',
  };

  return { parsedQuery, evidence };
}

/**
 * Infer request type from synopsis text
 */
function inferRequestTypeFromSynopsis(synopsis: string): RequestType {
  const text = synopsis.toLowerCase();

  // Live interview patterns
  if (text.includes('live') && text.includes('interview')) {
    return 'LIVE_VIRTUAL';
  }
  if (text.includes('live') && text.includes('virtual')) {
    return 'LIVE_VIRTUAL';
  }

  // Phone interview
  if (text.includes('phone') || text.includes('call')) {
    return 'PHONE_INTERVIEW';
  }

  // Contact/source request
  if (text.includes('contact') || text.includes('seeking') || text.includes('looking for')) {
    return 'CONTACT_REQUEST';
  }

  // Interview (general)
  if (text.includes('interview') || text.includes('speak with')) {
    return 'PHONE_INTERVIEW';
  }

  // Questions/comments
  if (text.includes('question') || text.includes('comment') || text.includes('insight')) {
    return 'EMAILED_QA';
  }

  return 'OTHER';
}

/**
 * Extract scheduling information from synopsis
 */
function extractSchedulingInfo(synopsis: string): {
  deadlineAt: Date | null;
  broadcastScheduledAt: Date | null;
  broadcastDuration: string | null;
} {
  let deadlineAt: Date | null = null;
  let broadcastScheduledAt: Date | null = null;
  let broadcastDuration: string | null = null;

  // Look for broadcast time patterns like "Saturday, November 29 at 6 pm"
  const broadcastPattern =
    /(?:on\s+)?(\w+day),?\s+(\w+)\s+(\d{1,2})(?:st|nd|rd|th)?\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/i;
  const broadcastMatch = synopsis.match(broadcastPattern);

  if (broadcastMatch) {
    try {
      const [, dayOfWeek, monthName, dayNum, hourStr, minuteStr, ampm] = broadcastMatch;

      // Get current year
      const year = new Date().getFullYear();

      // Parse month
      const monthMap: Record<string, number> = {
        january: 0,
        february: 1,
        march: 2,
        april: 3,
        may: 4,
        june: 5,
        july: 6,
        august: 7,
        september: 8,
        october: 9,
        november: 10,
        december: 11,
      };
      const month = monthMap[monthName.toLowerCase()];

      // Parse hour
      let hour = parseInt(hourStr, 10);
      const minute = minuteStr ? parseInt(minuteStr, 10) : 0;

      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && hour !== 12) {
          hour += 12;
        } else if (ampm.toLowerCase() === 'am' && hour === 12) {
          hour = 0;
        }
      }

      if (month !== undefined) {
        broadcastScheduledAt = new Date(year, month, parseInt(dayNum, 10), hour, minute);

        // If date is in past, it's probably next year
        if (broadcastScheduledAt < new Date()) {
          broadcastScheduledAt.setFullYear(year + 1);
        }
      }
    } catch (err) {
      // Failed to parse, leave as null
    }
  }

  // Look for duration patterns like "approximately 4 minutes"
  const durationPattern = /approximately\s+(\d+)\s*(?:minute|min)/i;
  const durationMatch = synopsis.match(durationPattern);
  if (durationMatch) {
    broadcastDuration = durationMatch[1];
  }

  // Look for deadline patterns like "as of 3 PM EST" or "by December 17"
  const deadlinePattern =
    /(?:by|as of|deadline[:\s]*)\s*(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\s*(\w+)?/i;
  const deadlineMatch = synopsis.match(deadlinePattern);

  if (deadlineMatch && !broadcastScheduledAt) {
    // Simple time-based deadline for today
    try {
      const [, hourStr, minuteStr, ampm, tz] = deadlineMatch;
      let hour = parseInt(hourStr, 10);
      const minute = minuteStr ? parseInt(minuteStr, 10) : 0;

      if (ampm) {
        if (ampm.toLowerCase() === 'pm' && hour !== 12) {
          hour += 12;
        } else if (ampm.toLowerCase() === 'am' && hour === 12) {
          hour = 0;
        }
      }

      const today = new Date();
      deadlineAt = new Date(today.getFullYear(), today.getMonth(), today.getDate(), hour, minute);

      // If deadline is in past, assume tomorrow
      if (deadlineAt < new Date()) {
        deadlineAt.setDate(deadlineAt.getDate() + 1);
      }
    } catch (err) {
      // Failed to parse
    }
  }

  return { deadlineAt, broadcastScheduledAt, broadcastDuration };
}

/**
 * Extract expert roles from synopsis
 */
function extractExpertRoles(synopsis: string): string[] {
  const roles: string[] = [];
  const text = synopsis.toLowerCase();

  // Common role patterns
  const patterns = [
    /(?:seeking|looking for|need)\s+(?:a\s+)?([a-z\s]+(?:expert|professional|specialist|analyst|doctor|therapist|attorney|consultant))/gi,
    /(?:mental health|licensed|certified)\s+([a-z\s]+)/gi,
    /([a-z]+ist)\s+(?:to|for|regarding)/gi, // psychologist, psychiatrist, etc.
  ];

  for (const pattern of patterns) {
    let match;
    while ((match = pattern.exec(synopsis)) !== null) {
      if (match[1]) {
        roles.push(match[1].trim());
      }
    }
  }

  return [...new Set(roles)]; // Dedupe
}
