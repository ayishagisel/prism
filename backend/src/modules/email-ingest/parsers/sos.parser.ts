/**
 * SOS (Source of Sources) Email Parser
 *
 * Parses structured media query emails from Source of Sources.
 * Each email contains multiple numbered queries with consistent field labels.
 *
 * Example format:
 * 1) SUMMARY: Here's the Minimum Net Worth to Be Considered Upper Class by 2027
 * CATEGORY: Business and Finance
 * NAME: Cindy Lamothe
 * EMAIL: clamothe.garcia@gmail.com
 * MUCK RACK URL: https://muckrack.com/cindy-lamothe-1
 * MEDIA OUTLET: GOBankingRates
 * MEDIA WEBSITE: https://www.gobankingrates.com
 * DEADLINE DATE: 2025-12-17
 * DEADLINE TIME: 12:00 pm
 * TIME ZONE: Eastern Standard Time
 * QUERY: SEEKING QUALIFIED CFPs AND FINANCE EXPERTS ONLY...
 * _____
 */

import { ParsedQuery, ParseEvidence, RequestType } from './types';

export interface SOSQuery {
  index: number;
  summary: string;
  category: string;
  journalistName: string;
  journalistEmail: string;
  muckRackUrl: string | null;
  mediaOutlet: string;
  mediaWebsite: string | null;
  deadlineDate: string; // YYYY-MM-DD
  deadlineTime: string; // e.g., "12:00 pm"
  timeZone: string;
  queryText: string;
  rawBlock: string; // Original text block for evidence
  startChar: number; // Position in source email
  endChar: number;
}

export interface SOSParseResult {
  success: boolean;
  queries: SOSQuery[];
  errors: string[];
  parseConfidence: number;
}

/**
 * Parse an SOS email body into individual queries
 */
export function parseSOSEmail(bodyText: string): SOSParseResult {
  const queries: SOSQuery[] = [];
  const errors: string[] = [];

  // Split by the separator pattern (5 underscores or numbered entry)
  // Match pattern: N) SUMMARY: ... until next N) SUMMARY: or end
  const queryPattern =
    /(\d+)\)\s*SUMMARY:\s*(.+?)[\r\n]+CATEGORY:\s*(.+?)[\r\n]+NAME:\s*(.+?)[\r\n]+EMAIL:\s*(.+?)[\r\n]+MUCK RACK URL:\s*(.*?)[\r\n]+MEDIA OUTLET:\s*(.+?)[\r\n]+MEDIA WEBSITE:\s*(.*?)[\r\n]+DEADLINE DATE:\s*(.+?)[\r\n]+DEADLINE TIME:\s*(.+?)[\r\n]+TIME ZONE:\s*(.+?)[\r\n]+QUERY:\s*([\s\S]+?)(?=_____|\d+\)\s*SUMMARY:|Source of Sources|Unsubscribe|$)/gi;

  let match;
  let matchCount = 0;

  while ((match = queryPattern.exec(bodyText)) !== null) {
    matchCount++;
    try {
      const [
        fullMatch,
        indexStr,
        summary,
        category,
        name,
        email,
        muckRackUrl,
        mediaOutlet,
        mediaWebsite,
        deadlineDate,
        deadlineTime,
        timeZone,
        queryText,
      ] = match;

      queries.push({
        index: parseInt(indexStr, 10),
        summary: summary.trim(),
        category: category.trim(),
        journalistName: name.trim(),
        journalistEmail: email.trim(),
        muckRackUrl: muckRackUrl.trim() || null,
        mediaOutlet: mediaOutlet.trim(),
        mediaWebsite: mediaWebsite.trim() || null,
        deadlineDate: deadlineDate.trim(),
        deadlineTime: deadlineTime.trim(),
        timeZone: timeZone.trim(),
        queryText: queryText.trim(),
        rawBlock: fullMatch,
        startChar: match.index,
        endChar: match.index + fullMatch.length,
      });
    } catch (err) {
      errors.push(`Failed to parse query block at position ${match.index}: ${err}`);
    }
  }

  // Calculate confidence based on successful parsing
  const confidence = queries.length > 0 ? Math.min(queries.length / matchCount, 1.0) : 0;

  return {
    success: queries.length > 0,
    queries,
    errors,
    parseConfidence: errors.length === 0 ? confidence : confidence * 0.8,
  };
}

/**
 * Convert SOS query to standardized ParsedQuery format
 */
export function sosQueryToParsedQuery(
  sosQuery: SOSQuery,
  ingestionJobId: string,
  agencyId: string
): { parsedQuery: Partial<ParsedQuery>; evidence: Partial<ParseEvidence>[] } {
  const evidence: Partial<ParseEvidence>[] = [];

  // Parse deadline into timestamp
  const deadlineAt = parseSOSDeadline(
    sosQuery.deadlineDate,
    sosQuery.deadlineTime,
    sosQuery.timeZone
  );

  // Determine request type from query text
  const requestType = inferRequestType(sosQuery.queryText);

  // Extract expert requirements from query
  const { roles, constraints } = extractExpertRequirements(sosQuery.queryText);

  // Extract questions if present
  const questions = extractQuestions(sosQuery.queryText);

  // Build evidence records
  evidence.push({
    field_name: 'headline',
    field_value: sosQuery.summary,
    excerpt: `SUMMARY: ${sosQuery.summary}`,
    confidence: '1.00',
  });

  evidence.push({
    field_name: 'journalist_email',
    field_value: sosQuery.journalistEmail,
    excerpt: `EMAIL: ${sosQuery.journalistEmail}`,
    confidence: '1.00',
  });

  evidence.push({
    field_name: 'deadline_at',
    field_value: deadlineAt?.toISOString() || null,
    excerpt: `DEADLINE DATE: ${sosQuery.deadlineDate}\nDEADLINE TIME: ${sosQuery.deadlineTime}\nTIME ZONE: ${sosQuery.timeZone}`,
    confidence: '1.00',
  });

  const parsedQuery: Partial<ParsedQuery> = {
    agency_id: agencyId,
    ingestion_job_id: ingestionJobId,
    query_index: sosQuery.index.toString(),
    // Client-safe fields
    headline: sosQuery.summary,
    summary: sosQuery.queryText.substring(0, 500),
    category: sosQuery.category,
    request_type: requestType,
    query_text: sosQuery.queryText,
    expert_roles: roles,
    expert_constraints: constraints,
    questions: questions,
    // Deadline
    deadline_date: sosQuery.deadlineDate,
    deadline_time: sosQuery.deadlineTime,
    deadline_timezone: sosQuery.timeZone,
    deadline_at: deadlineAt,
    is_hard_deadline: true,
    // Agency-only fields
    journalist_name: sosQuery.journalistName,
    journalist_email: sosQuery.journalistEmail,
    journalist_muckrack_url: sosQuery.muckRackUrl,
    outlet_name: sosQuery.mediaOutlet,
    outlet_website: sosQuery.mediaWebsite,
    // Parse metadata
    parse_confidence: '0.95', // SOS is very structured
    parse_method: 'regex',
    status: 'pending_review',
  };

  return { parsedQuery, evidence };
}

/**
 * Parse SOS deadline format into a Date object
 * Example: "2025-12-17", "12:00 pm", "Eastern Standard Time"
 */
export function parseSOSDeadline(
  dateStr: string,
  timeStr: string,
  timezoneStr: string
): Date | null {
  try {
    // Parse date (YYYY-MM-DD format)
    const dateParts = dateStr.match(/(\d{4})-(\d{2})-(\d{2})/);
    if (!dateParts) return null;

    const [, year, month, day] = dateParts;

    // Parse time (e.g., "12:00 pm", "5:00 pm")
    const timeMatch = timeStr.match(/(\d{1,2}):(\d{2})\s*(am|pm)?/i);
    if (!timeMatch) return null;

    let [, hourStr, minuteStr, ampm] = timeMatch;
    let hour = parseInt(hourStr, 10);
    const minute = parseInt(minuteStr, 10);

    // Convert to 24-hour format
    if (ampm) {
      ampm = ampm.toLowerCase();
      if (ampm === 'pm' && hour !== 12) {
        hour += 12;
      } else if (ampm === 'am' && hour === 12) {
        hour = 0;
      }
    }

    // Map timezone string to offset
    const tzOffset = getTimezoneOffset(timezoneStr);

    // Create date in UTC, adjusted for timezone
    const date = new Date(
      Date.UTC(
        parseInt(year, 10),
        parseInt(month, 10) - 1,
        parseInt(day, 10),
        hour - tzOffset,
        minute
      )
    );

    return date;
  } catch (err) {
    return null;
  }
}

/**
 * Map common timezone names to UTC offsets
 */
function getTimezoneOffset(tzStr: string): number {
  const tzLower = tzStr.toLowerCase();

  // Eastern Time
  if (tzLower.includes('eastern') || tzLower.includes('est') || tzLower.includes('edt')) {
    return tzLower.includes('daylight') || tzLower.includes('edt') ? -4 : -5;
  }

  // Central Time
  if (tzLower.includes('central') || tzLower.includes('cst') || tzLower.includes('cdt')) {
    return tzLower.includes('daylight') || tzLower.includes('cdt') ? -5 : -6;
  }

  // Mountain Time
  if (tzLower.includes('mountain') || tzLower.includes('mst') || tzLower.includes('mdt')) {
    return tzLower.includes('daylight') || tzLower.includes('mdt') ? -6 : -7;
  }

  // Pacific Time
  if (tzLower.includes('pacific') || tzLower.includes('pst') || tzLower.includes('pdt')) {
    return tzLower.includes('daylight') || tzLower.includes('pdt') ? -7 : -8;
  }

  // Default to Eastern
  return -5;
}

/**
 * Infer request type from query text
 */
function inferRequestType(queryText: string): RequestType {
  const text = queryText.toLowerCase();

  if (text.includes('live') && (text.includes('interview') || text.includes('virtual'))) {
    return 'LIVE_VIRTUAL';
  }
  if (text.includes('phone') && text.includes('interview')) {
    return 'PHONE_INTERVIEW';
  }
  if (text.includes('studio') || text.includes('in-person')) {
    return 'IN_STUDIO';
  }
  if (text.includes('email') && (text.includes('response') || text.includes('comment'))) {
    return 'EMAILED_QA';
  }
  if (text.includes('quote') || text.includes('comment')) {
    return 'QUOTE';
  }
  if (text.includes('background') || text.includes('off the record')) {
    return 'BACKGROUND';
  }

  // Default to QUOTE for most SOS queries
  return 'QUOTE';
}

/**
 * Extract expert roles and constraints from query text
 */
function extractExpertRequirements(queryText: string): {
  roles: string[];
  constraints: string[];
} {
  const roles: string[] = [];
  const constraints: string[] = [];

  // Common role patterns
  const rolePatterns = [
    /seeking\s+(?:qualified\s+)?([A-Z]+s?(?:\s+and\s+[A-Z\s]+)?)\s+(?:only|to)/gi,
    /looking for\s+(?:a\s+)?([a-z\s]+(?:expert|professional|specialist|analyst))/gi,
    /speak with\s+(?:a\s+)?([a-z\s]+)/gi,
  ];

  for (const pattern of rolePatterns) {
    const match = queryText.match(pattern);
    if (match) {
      roles.push(match[1] || match[0]);
    }
  }

  // Extract explicit constraints
  if (/us-based/i.test(queryText)) {
    constraints.push('US-based only');
  }
  if (/human-sourced/i.test(queryText)) {
    constraints.push('Human-sourced quotes only (no AI)');
  }
  if (/no\s+(?:travel\s+)?bloggers/i.test(queryText)) {
    constraints.push('No travel bloggers');
  }
  if (/no\s+(?:seo|influencers)/i.test(queryText)) {
    constraints.push('No SEO specialists or influencers');
  }
  if (/detailed.*quotes/i.test(queryText)) {
    constraints.push('Include detailed/lengthy quotes');
  }

  return { roles, constraints };
}

/**
 * Extract questions from query text if explicitly listed
 */
function extractQuestions(queryText: string): string[] {
  const questions: string[] = [];

  // Look for question patterns
  // Pattern 1: Bulleted or numbered questions
  const bulletPattern = /[-•]\s*(.+\?)/g;
  let match;
  while ((match = bulletPattern.exec(queryText)) !== null) {
    questions.push(match[1].trim());
  }

  // Pattern 2: "Here is what we are trying to answer:" followed by questions
  const questionBlockMatch = queryText.match(
    /(?:trying to answer|questions?)[:\s]*([\s\S]+?)(?:Please|Thanks|$)/i
  );
  if (questionBlockMatch) {
    const block = questionBlockMatch[1];
    const sentenceQuestions = block.match(/[^.!?]*\?/g);
    if (sentenceQuestions) {
      questions.push(...sentenceQuestions.map((q) => q.trim()));
    }
  }

  return questions;
}
