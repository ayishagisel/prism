/**
 * TMX Messenger Single Query Email Parser
 *
 * Parses individual query emails from TMX Messenger.
 * These are free-form and less structured than digest emails.
 *
 * Example format:
 * Hello, I am a consumer reporter at the Daily Mail. We are looking into writing
 * a story about the impact of the Trump Administration's enforcement of English
 * proficiency tests for truck drivers. We'd love to get emailed responses from
 * bankers who work with trucking companies, supply chain logistics analysts,
 * trucking companies, and pricing experts...
 *
 * Features:
 * - Deterministic regex parsing as primary method
 * - Optional LLM extraction when API keys are configured
 * - Falls back to regex if LLM fails
 */

import { ParsedQuery, ParseEvidence, RequestType } from './types';

export interface TMXSingleQuery {
  outlet: string | null;
  journalistTitle: string | null;
  storyTopic: string | null;
  expertTypes: string[];
  questions: string[];
  deadlineText: string | null;
  deadlineAt: Date | null;
  replyEmail: string | null;
  rawText: string;
}

export interface TMXSingleParseResult {
  success: boolean;
  query: TMXSingleQuery | null;
  errors: string[];
  parseConfidence: number;
  parseMethod: 'regex' | 'llm' | 'hybrid';
}

/**
 * LLM Provider interface - supports multiple providers
 */
export interface LLMProvider {
  name: string;
  extract(prompt: string): Promise<string>;
}

/**
 * Check if LLM is available based on environment variables
 */
export function isLLMAvailable(): boolean {
  return !!(
    process.env.OPENAI_API_KEY ||
    process.env.ANTHROPIC_API_KEY ||
    process.env.CLAUDE_API_KEY
  );
}

/**
 * Parse a TMX single query email
 * Uses regex as primary, LLM as optional enhancement
 */
export async function parseTMXSingleEmail(
  bodyText: string,
  useLLM: boolean = false
): Promise<TMXSingleParseResult> {
  // Always try regex first
  const regexResult = parseWithRegex(bodyText);

  // If LLM is requested and available, try to enhance
  if (useLLM && isLLMAvailable() && regexResult.parseConfidence < 0.8) {
    try {
      const llmResult = await parseWithLLM(bodyText);
      if (llmResult && llmResult.parseConfidence > regexResult.parseConfidence) {
        return {
          ...llmResult,
          parseMethod: 'llm',
        };
      }
    } catch (err) {
      // LLM failed, fall back to regex
      console.warn('LLM parsing failed, using regex fallback:', err);
    }
  }

  return regexResult;
}

/**
 * Parse using deterministic regex patterns
 */
function parseWithRegex(bodyText: string): TMXSingleParseResult {
  const query: TMXSingleQuery = {
    outlet: null,
    journalistTitle: null,
    storyTopic: null,
    expertTypes: [],
    questions: [],
    deadlineText: null,
    deadlineAt: null,
    replyEmail: null,
    rawText: bodyText,
  };

  let confidence = 0;
  const errors: string[] = [];

  // Extract outlet from subject line pattern or body
  // Pattern: "I am a [title] at the [Outlet]" or "reporter at [Outlet]"
  const outletPattern =
    /(?:I am|I'm)\s+(?:a\s+)?([a-z\s]+(?:reporter|journalist|writer|editor|producer))\s+(?:at|for|with)\s+(?:the\s+)?([A-Z][A-Za-z\s]+?)(?:\.|,|We)/i;
  const outletMatch = bodyText.match(outletPattern);
  if (outletMatch) {
    query.journalistTitle = outletMatch[1].trim();
    query.outlet = outletMatch[2].trim();
    confidence += 0.2;
  }

  // Try to extract outlet from "Sent from:" pattern (TMX format)
  const sentFromPattern = /Sent from:\s*([^\/]+)/i;
  const sentFromMatch = bodyText.match(sentFromPattern);
  if (sentFromMatch && !query.outlet) {
    query.outlet = sentFromMatch[1].trim();
    confidence += 0.15;
  }

  // Extract TMX reply email
  const replyEmailPattern = /send\+[\d.]+@tmxmessenger\.com/i;
  const replyMatch = bodyText.match(replyEmailPattern);
  if (replyMatch) {
    query.replyEmail = replyMatch[0];
    confidence += 0.1;
  }

  // Extract story topic
  // Patterns: "story about", "writing about", "article on", "looking into"
  const topicPatterns = [
    /(?:story|article|piece|report)\s+(?:about|on|regarding|concerning)\s+(.+?)(?:\.|We'd|We would)/i,
    /looking into\s+(?:writing\s+)?(?:a\s+)?(?:story\s+)?(?:about\s+)?(.+?)(?:\.|We'd|We would)/i,
    /researching\s+(?:a\s+)?(?:story\s+)?(?:about\s+)?(.+?)(?:\.|We'd|We would)/i,
  ];

  for (const pattern of topicPatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      query.storyTopic = match[1].trim();
      confidence += 0.15;
      break;
    }
  }

  // Extract expert types requested
  // Patterns: "seeking [experts]", "looking for [experts]", "love to get responses from [experts]"
  const expertPatterns = [
    /(?:seeking|looking for|want to speak with|love to (?:get|hear from))\s+(.+?)(?:\s+to\s+|\s+who\s+|\s+that\s+|\.)/gi,
    /(?:responses from|comments from|insights from)\s+(.+?)(?:\s+to\s+|\.)/gi,
  ];

  for (const pattern of expertPatterns) {
    let match;
    while ((match = pattern.exec(bodyText)) !== null) {
      // Split by common separators
      const experts = match[1]
        .split(/,\s*|\s+and\s+|\s*,\s*and\s+/)
        .map((e) => e.trim())
        .filter((e) => e.length > 0 && e.length < 50);
      query.expertTypes.push(...experts);
    }
  }

  if (query.expertTypes.length > 0) {
    confidence += 0.15;
  }

  // Dedupe expert types
  query.expertTypes = [...new Set(query.expertTypes)];

  // Extract questions
  // Look for question marks, or "Here is what we are trying to answer:"
  const questionSection = bodyText.match(
    /(?:trying to answer|questions?)[:\s]*([\s\S]+?)(?:We're hoping|Thanks|Please|$)/i
  );
  if (questionSection) {
    const questions = questionSection[1].match(/[^.!?]*\?/g);
    if (questions) {
      query.questions = questions.map((q) => q.trim()).filter((q) => q.length > 10);
      confidence += 0.1;
    }
  }

  // Also look for bulleted/dashed questions
  const bulletQuestions = bodyText.match(/[-•]\s*([^.!?]+\?)/g);
  if (bulletQuestions) {
    query.questions.push(
      ...bulletQuestions.map((q) => q.replace(/^[-•]\s*/, '').trim())
    );
  }

  // Dedupe questions
  query.questions = [...new Set(query.questions)];

  // Extract deadline
  // Patterns: "by [time]", "as of [time]", "deadline [time]", "hoping to have [by time]"
  const deadlinePatterns = [
    /(?:by|as of|deadline[:\s]*|hoping to have[^.]*?by)\s*(\d{1,2}(?::\d{2})?\s*(?:am|pm)\s*(?:[A-Z]{2,4})?)/i,
    /(?:by|before|no later than)\s+((?:Monday|Tuesday|Wednesday|Thursday|Friday|Saturday|Sunday)[^.]*)/i,
    /(?:by|before)\s+(December|January|February|March|April|May|June|July|August|September|October|November)\s+\d{1,2}/i,
  ];

  for (const pattern of deadlinePatterns) {
    const match = bodyText.match(pattern);
    if (match) {
      query.deadlineText = match[1].trim();
      query.deadlineAt = parseDeadlineText(match[1]);
      confidence += 0.15;
      break;
    }
  }

  // Calculate overall success
  const success = confidence >= 0.3 || query.outlet !== null;

  return {
    success,
    query: success ? query : null,
    errors,
    parseConfidence: Math.min(confidence, 1.0),
    parseMethod: 'regex',
  };
}

/**
 * Parse using LLM (when available)
 */
async function parseWithLLM(bodyText: string): Promise<TMXSingleParseResult | null> {
  // Check which provider is available
  const provider = getLLMProvider();
  if (!provider) {
    return null;
  }

  const prompt = buildExtractionPrompt(bodyText);

  try {
    const response = await provider.extract(prompt);
    const parsed = JSON.parse(response);

    return {
      success: true,
      query: {
        outlet: parsed.outlet || null,
        journalistTitle: parsed.journalist_title || null,
        storyTopic: parsed.story_topic || null,
        expertTypes: parsed.expert_types || [],
        questions: parsed.questions || [],
        deadlineText: parsed.deadline_text || null,
        deadlineAt: parsed.deadline_at ? new Date(parsed.deadline_at) : null,
        replyEmail: parsed.reply_email || null,
        rawText: bodyText,
      },
      errors: [],
      parseConfidence: parsed.confidence || 0.9,
      parseMethod: 'llm',
    };
  } catch (err) {
    return null;
  }
}

/**
 * Get available LLM provider
 */
function getLLMProvider(): LLMProvider | null {
  if (process.env.OPENAI_API_KEY) {
    return {
      name: 'openai',
      async extract(prompt: string): Promise<string> {
        // Dynamic import to avoid loading if not needed
        const { OpenAI } = await import('openai');
        const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

        const response = await client.chat.completions.create({
          model: 'gpt-4o-mini',
          messages: [{ role: 'user', content: prompt }],
          response_format: { type: 'json_object' },
          temperature: 0,
        });

        return response.choices[0]?.message?.content || '{}';
      },
    };
  }

  if (process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY) {
    return {
      name: 'anthropic',
      async extract(prompt: string): Promise<string> {
        const Anthropic = (await import('@anthropic-ai/sdk')).default;
        const client = new Anthropic({
          apiKey: process.env.ANTHROPIC_API_KEY || process.env.CLAUDE_API_KEY,
        });

        const response = await client.messages.create({
          model: 'claude-3-haiku-20240307',
          max_tokens: 1024,
          messages: [{ role: 'user', content: prompt }],
        });

        const content = response.content[0];
        if (content.type === 'text') {
          return content.text;
        }
        return '{}';
      },
    };
  }

  return null;
}

/**
 * Build the extraction prompt for LLM
 */
function buildExtractionPrompt(bodyText: string): string {
  return `Extract structured information from this media query email. Return ONLY valid JSON.

EMAIL:
${bodyText}

Extract and return JSON with these fields:
{
  "outlet": "name of the media outlet (e.g., Daily Mail, NBC News)",
  "journalist_title": "title of the journalist (e.g., consumer reporter, senior producer)",
  "story_topic": "what the story is about (one sentence)",
  "expert_types": ["array of expert types they are seeking"],
  "questions": ["array of specific questions they want answered"],
  "deadline_text": "the deadline as stated in the email",
  "deadline_at": "ISO 8601 datetime if you can parse it, else null",
  "reply_email": "the reply email address if present",
  "confidence": 0.0-1.0 confidence in extraction quality
}

If a field cannot be determined, use null or empty array. Be precise and only extract what is explicitly stated.`;
}

/**
 * Parse deadline text into a Date
 */
function parseDeadlineText(text: string): Date | null {
  try {
    // Pattern: "3 PM EST" or "12:00 pm Eastern"
    const timeMatch = text.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)\s*([A-Z]{2,4})?/i);

    if (timeMatch) {
      const [, hourStr, minuteStr, ampm, tz] = timeMatch;
      let hour = parseInt(hourStr, 10);
      const minute = minuteStr ? parseInt(minuteStr, 10) : 0;

      if (ampm.toLowerCase() === 'pm' && hour !== 12) {
        hour += 12;
      } else if (ampm.toLowerCase() === 'am' && hour === 12) {
        hour = 0;
      }

      // Assume today or next business day
      const date = new Date();
      date.setHours(hour, minute, 0, 0);

      // If time is in the past, assume tomorrow
      if (date < new Date()) {
        date.setDate(date.getDate() + 1);
      }

      return date;
    }

    // Try parsing as a date string
    const parsed = new Date(text);
    if (!isNaN(parsed.getTime())) {
      return parsed;
    }

    return null;
  } catch {
    return null;
  }
}

/**
 * Convert TMX Single query to standardized ParsedQuery format
 */
export function tmxSingleQueryToParsedQuery(
  tmxQuery: TMXSingleQuery,
  ingestionJobId: string,
  agencyId: string,
  parseMethod: 'regex' | 'llm' | 'hybrid',
  parseConfidence: number
): { parsedQuery: Partial<ParsedQuery>; evidence: Partial<ParseEvidence>[] } {
  const evidence: Partial<ParseEvidence>[] = [];

  // Determine request type
  const requestType = inferRequestType(tmxQuery);

  // Build evidence
  if (tmxQuery.outlet) {
    evidence.push({
      field_name: 'outlet_name',
      field_value: tmxQuery.outlet,
      excerpt: findExcerpt(tmxQuery.rawText, tmxQuery.outlet),
      confidence: parseConfidence.toFixed(2),
    });
  }

  if (tmxQuery.deadlineText) {
    evidence.push({
      field_name: 'deadline_at',
      field_value: tmxQuery.deadlineAt?.toISOString() || null,
      excerpt: findExcerpt(tmxQuery.rawText, tmxQuery.deadlineText),
      confidence: parseConfidence.toFixed(2),
    });
  }

  const parsedQuery: Partial<ParsedQuery> = {
    agency_id: agencyId,
    ingestion_job_id: ingestionJobId,
    query_index: '0', // Single query
    // Client-safe fields
    headline: tmxQuery.storyTopic || 'Media Query',
    summary: tmxQuery.rawText.substring(0, 500),
    category: inferCategory(tmxQuery),
    request_type: requestType,
    query_text: tmxQuery.rawText,
    expert_roles: tmxQuery.expertTypes,
    expert_constraints: [],
    questions: tmxQuery.questions,
    // Deadline
    deadline_at: tmxQuery.deadlineAt,
    is_hard_deadline: tmxQuery.deadlineText !== null,
    // Agency-only fields
    journalist_title: tmxQuery.journalistTitle,
    journalist_reply_alias: tmxQuery.replyEmail,
    outlet_name: tmxQuery.outlet,
    // Parse metadata
    parse_confidence: parseConfidence.toFixed(2),
    parse_method: parseMethod,
    status: 'pending_review',
  };

  return { parsedQuery, evidence };
}

/**
 * Infer request type from query
 */
function inferRequestType(query: TMXSingleQuery): RequestType {
  const text = query.rawText.toLowerCase();

  if (text.includes('emailed response') || text.includes('emailed comment')) {
    return 'EMAILED_QA';
  }
  if (text.includes('phone') || text.includes('call')) {
    return 'PHONE_INTERVIEW';
  }
  if (text.includes('live') && text.includes('interview')) {
    return 'LIVE_VIRTUAL';
  }
  if (text.includes('comment') || text.includes('quote')) {
    return 'QUOTE';
  }

  return 'EMAILED_QA'; // Default for TMX single queries
}

/**
 * Infer category from query content
 */
function inferCategory(query: TMXSingleQuery): string {
  const text = (query.storyTopic || query.rawText).toLowerCase();

  if (
    text.includes('finance') ||
    text.includes('money') ||
    text.includes('bank') ||
    text.includes('economic')
  ) {
    return 'Business and Finance';
  }
  if (text.includes('health') || text.includes('medical') || text.includes('doctor')) {
    return 'Health';
  }
  if (text.includes('tech') || text.includes('software') || text.includes('ai')) {
    return 'Technology';
  }
  if (text.includes('travel') || text.includes('vacation') || text.includes('hotel')) {
    return 'Travel';
  }
  if (text.includes('politic') || text.includes('government') || text.includes('policy')) {
    return 'Politics';
  }

  return 'General';
}

/**
 * Find excerpt containing the target text
 */
function findExcerpt(fullText: string, target: string): string {
  const index = fullText.toLowerCase().indexOf(target.toLowerCase());
  if (index === -1) return target;

  const start = Math.max(0, index - 20);
  const end = Math.min(fullText.length, index + target.length + 20);

  let excerpt = fullText.substring(start, end);
  if (start > 0) excerpt = '...' + excerpt;
  if (end < fullText.length) excerpt = excerpt + '...';

  return excerpt;
}
