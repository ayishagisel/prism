/**
 * Email Source Detection
 *
 * Detects the source type of incoming opportunity emails:
 * - SOS (Source of Sources): Structured multi-query emails
 * - TMX_DIGEST: TMX Messenger digest with multiple queries
 * - TMX_SINGLE: TMX Messenger single query
 * - OTHER: Unknown format
 */

export type EmailSourceType = 'SOS' | 'TMX_DIGEST' | 'TMX_SINGLE' | 'OTHER';

export interface SourceDetectionResult {
  sourceType: EmailSourceType;
  confidence: number; // 0.0 - 1.0
  indicators: string[]; // What patterns were matched
}

/**
 * Detect the source type of an email based on subject and body content
 */
export function detectEmailSource(
  subject: string,
  bodyText: string,
  from: string
): SourceDetectionResult {
  const indicators: string[] = [];

  // Normalize inputs
  const subjectLower = subject.toLowerCase();
  const bodyLower = bodyText.toLowerCase();
  const fromLower = from.toLowerCase();

  // ============================================
  // SOS (Source of Sources) Detection
  // ============================================
  // Key patterns:
  // - Subject contains "[SOS]"
  // - Body contains structured blocks with "SUMMARY:", "CATEGORY:", "DEADLINE DATE:"
  // - From: peter@shankman.com or contains "shankman"

  const sosPatterns = {
    subjectTag: subjectLower.includes('[sos]'),
    fromShankman: fromLower.includes('shankman') || fromLower.includes('sourceofsources'),
    hasStructuredBlocks: /\d+\)\s*summary:/i.test(bodyText),
    hasCategory: /category:\s*.+/i.test(bodyText),
    hasDeadlineDate: /deadline date:\s*\d{4}-\d{2}-\d{2}/i.test(bodyText),
    hasDeadlineTime: /deadline time:\s*.+/i.test(bodyText),
    hasMuckRack: /muck rack url:/i.test(bodyText),
    hasMediaOutlet: /media outlet:\s*.+/i.test(bodyText),
    hasQuery: /query:\s*.+/i.test(bodyText),
  };

  const sosScore = Object.values(sosPatterns).filter(Boolean).length;

  if (sosScore >= 5) {
    Object.entries(sosPatterns).forEach(([key, value]) => {
      if (value) indicators.push(`SOS:${key}`);
    });
    return {
      sourceType: 'SOS',
      confidence: Math.min(sosScore / 9, 1.0),
      indicators,
    };
  }

  // ============================================
  // TMX Messenger Detection
  // ============================================
  // Key patterns for DIGEST:
  // - Subject contains "TMX" and "Newsroom Messages" or "Messages"
  // - Body contains numbered items with "Synopsis:"
  // - Contains "Sent from:" followed by outlet name
  // - Contains TMX reply email: send+XXXXX.XXXXX@tmxmessenger.com

  const tmxPatterns = {
    subjectTMX: subjectLower.includes('tmx'),
    subjectNewsroom: subjectLower.includes('newsroom') || subjectLower.includes('messages'),
    fromTMX: fromLower.includes('tmxmessenger') || fromLower.includes('tmx'),
    hasSynopsis: /synopsis:\s*.+/i.test(bodyText),
    hasSentFrom: /sent from:\s*.+/i.test(bodyText),
    hasTmxReplyEmail: /send\+\d+\.\d+@tmxmessenger\.com/i.test(bodyText),
    hasNumberedItems: /^\d+\.\s+.+$/m.test(bodyText),
    multipleItems: (bodyText.match(/synopsis:/gi) || []).length > 1,
  };

  const tmxDigestScore = Object.values(tmxPatterns).filter(Boolean).length;

  // Check if it's a digest (multiple items) or single query
  if (tmxDigestScore >= 4) {
    Object.entries(tmxPatterns).forEach(([key, value]) => {
      if (value) indicators.push(`TMX:${key}`);
    });

    // Distinguish between digest and single
    if (tmxPatterns.multipleItems || tmxPatterns.hasNumberedItems) {
      return {
        sourceType: 'TMX_DIGEST',
        confidence: Math.min(tmxDigestScore / 8, 1.0),
        indicators,
      };
    } else {
      return {
        sourceType: 'TMX_SINGLE',
        confidence: Math.min(tmxDigestScore / 8, 1.0),
        indicators,
      };
    }
  }

  // ============================================
  // TMX Single Query Detection (fallback)
  // ============================================
  // Single TMX query might not have all the digest patterns
  // but will have the reply email format

  if (tmxPatterns.fromTMX || tmxPatterns.hasTmxReplyEmail) {
    indicators.push('TMX:fromTMX');
    if (tmxPatterns.hasTmxReplyEmail) indicators.push('TMX:hasTmxReplyEmail');
    return {
      sourceType: 'TMX_SINGLE',
      confidence: 0.7,
      indicators,
    };
  }

  // ============================================
  // Unknown Source
  // ============================================
  return {
    sourceType: 'OTHER',
    confidence: 1.0,
    indicators: ['NO_MATCH'],
  };
}

/**
 * Get a human-readable description of the source type
 */
export function getSourceTypeDescription(sourceType: EmailSourceType): string {
  switch (sourceType) {
    case 'SOS':
      return 'Source of Sources - Structured media query service';
    case 'TMX_DIGEST':
      return 'TMX Messenger - Multiple newsroom requests in one email';
    case 'TMX_SINGLE':
      return 'TMX Messenger - Single newsroom request';
    case 'OTHER':
      return 'Unknown source - requires manual parsing';
  }
}
