import { prisma } from '@/lib/prisma/client';

/**
 * Fraud Detection for Anonymous Surveys
 *
 * Detects suspicious response patterns without identifying individuals:
 * - Too-fast completion (< 2 minutes)
 * - Straight-lining (all same answers)
 * - Duplicate IP submissions
 * - Duplicate browser fingerprints
 *
 * Returns risk score (0-100) and flags responses for admin review.
 */

export interface FraudCheckResult {
  isSuspicious: boolean;
  reasons: string[];
  riskScore: number; // 0-100
  details: {
    completionTime?: number; // in milliseconds
    uniqueValueCount?: number;
    ipDuplicateCount?: number;
    fingerprintDuplicateCount?: number;
  };
}

const RISK_THRESHOLDS = {
  TOO_FAST_MINUTES: 2,
  RECENT_WINDOW_MINUTES: 5,
  SUSPICIOUS_THRESHOLD: 50, // Risk score >= 50 triggers flag
};

const RISK_WEIGHTS = {
  TOO_FAST: 30,
  STRAIGHT_LINE: 40,
  IP_DUPLICATE: 20,
  FINGERPRINT_DUPLICATE: 10,
};

/**
 * Detect fraudulent response patterns
 *
 * Analyzes completed anonymous response for suspicious patterns
 * Returns fraud assessment with risk score and reasons
 */
export async function detectFraudulentResponse(
  anonymousResponseId: string
): Promise<FraudCheckResult> {
  // Fetch response with all items
  const response = await prisma.anonymousResponse.findUnique({
    where: { id: anonymousResponseId },
    include: { responses: true },
  });

  if (!response) {
    throw new Error(`AnonymousResponse not found: ${anonymousResponseId}`);
  }

  const reasons: string[] = [];
  let riskScore = 0;
  const details: FraudCheckResult['details'] = {};

  // ============================================
  // Check 1: Completion time too fast
  // ============================================
  if (response.completedAt) {
    const completionTime = response.completedAt.getTime() - response.startedAt.getTime();
    details.completionTime = completionTime;

    const minTime = RISK_THRESHOLDS.TOO_FAST_MINUTES * 60 * 1000;
    if (completionTime < minTime) {
      reasons.push(`Completed in ${Math.round(completionTime / 1000)}s (minimum ${RISK_THRESHOLDS.TOO_FAST_MINUTES} min expected)`);
      riskScore += RISK_WEIGHTS.TOO_FAST;
    }
  }

  // ============================================
  // Check 2: Straight-lining (all same answers)
  // ============================================
  const numericValues = response.responses
    .filter(r => r.value !== null)
    .map(r => r.value);

  if (numericValues.length > 0) {
    const uniqueValues = new Set(numericValues);
    details.uniqueValueCount = uniqueValues.size;

    if (uniqueValues.size === 1) {
      reasons.push(`All ${numericValues.length} answers identical (value: ${Array.from(uniqueValues)[0]})`);
      riskScore += RISK_WEIGHTS.STRAIGHT_LINE;
    }
  }

  // ============================================
  // Check 3: Duplicate IP hash in recent window
  // ============================================
  if (response.ipHash) {
    const recentWindow = new Date(Date.now() - RISK_THRESHOLDS.RECENT_WINDOW_MINUTES * 60 * 1000);

    const ipDuplicates = await prisma.anonymousResponse.count({
      where: {
        campaignId: response.campaignId,
        ipHash: response.ipHash,
        completedAt: {
          gte: recentWindow,
        },
        id: { not: anonymousResponseId }, // Exclude current response
      },
    });

    details.ipDuplicateCount = ipDuplicates;

    if (ipDuplicates > 0) {
      reasons.push(`${ipDuplicates + 1} submission(s) from same IP in ${RISK_THRESHOLDS.RECENT_WINDOW_MINUTES} minutes`);
      riskScore += RISK_WEIGHTS.IP_DUPLICATE;
    }
  }

  // ============================================
  // Check 4: Duplicate browser fingerprint
  // ============================================
  if (response.browserFingerprint) {
    const fingerprintDuplicates = await prisma.anonymousResponse.count({
      where: {
        campaignId: response.campaignId,
        browserFingerprint: response.browserFingerprint,
        completedAt: { not: null }, // Only count completed responses
        id: { not: anonymousResponseId },
      },
    });

    details.fingerprintDuplicateCount = fingerprintDuplicates;

    if (fingerprintDuplicates > 0) {
      reasons.push(`${fingerprintDuplicates + 1} submission(s) with identical browser fingerprint`);
      riskScore += RISK_WEIGHTS.FINGERPRINT_DUPLICATE;
    }
  }

  // ============================================
  // Determine if suspicious
  // ============================================
  const isSuspicious = riskScore >= RISK_THRESHOLDS.SUSPICIOUS_THRESHOLD;

  return {
    isSuspicious,
    reasons,
    riskScore: Math.min(riskScore, 100), // Cap at 100
    details,
  };
}

/**
 * Flag response for admin review
 *
 * Updates database to mark response as flagged with reasons
 */
export async function flagResponseForReview(
  anonymousResponseId: string,
  fraudCheck: FraudCheckResult
): Promise<void> {
  await prisma.anonymousResponse.update({
    where: { id: anonymousResponseId },
    data: {
      flaggedForReview: true,
      flagReason: fraudCheck.reasons.join(' | '),
    },
  });
}

/**
 * Get flagged responses for campaign
 *
 * Admin utility to retrieve all flagged responses for review
 */
export async function getFlaggedResponses(campaignId: string) {
  return prisma.anonymousResponse.findMany({
    where: {
      campaignId,
      flaggedForReview: true,
    },
    include: {
      responses: true,
    },
    orderBy: {
      completedAt: 'desc',
    },
  });
}

/**
 * Clear fraud flag
 *
 * Admin action to clear flag after manual review
 */
export async function clearFraudFlag(anonymousResponseId: string): Promise<void> {
  await prisma.anonymousResponse.update({
    where: { id: anonymousResponseId },
    data: {
      flaggedForReview: false,
      flagReason: null,
    },
  });
}
