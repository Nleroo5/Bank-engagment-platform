/**
 * Scoring System Type Definitions
 *
 * Defines all types for weighted category scoring, including:
 * - Category score calculations
 * - Reverse-scoring adjustments
 * - Aggregated results
 * - Validation structures
 */

import type { Category } from './survey';

/**
 * Raw response from database
 */
export interface ResponseData {
  sanityQuestionId: string;
  questionNumber: number;
  value: number; // Raw value as submitted by respondent (1-3 or 1-5)
  isReversed: boolean; // Whether this question uses reverse scoring
  categoryId: string;
  categoryName: string;
  categoryWeight: number;
}

/**
 * Response with adjusted value after reverse-scoring applied
 */
export interface AdjustedResponse extends ResponseData {
  adjustedValue: number; // Value after reverse-scoring (if applicable)
  wasAdjusted: boolean; // True if reverse-scoring was applied
}

/**
 * Score breakdown for a single category
 */
export interface CategoryScore {
  categoryId: string;
  categoryName: string;
  categoryWeight: number;
  colorCode?: string;
  sortOrder?: number;

  // Question count and responses
  questionCount: number; // Total questions in this category
  responseCount: number; // Actual responses received (may be < questionCount if partial)

  // Score calculations
  rawTotal: number; // Sum of adjusted values (after reverse-scoring)
  weightedScore: number; // rawTotal × categoryWeight

  // Scale information
  scaleMin: number; // Minimum possible value (usually 1)
  scaleMax: number; // Maximum possible value (3 or 5)
  maxPossibleRaw: number; // questionCount × scaleMax
  maxPossibleWeighted: number; // maxPossibleRaw × categoryWeight

  // Percentages
  rawPercentage: number; // (rawTotal / maxPossibleRaw) × 100

  // Detailed breakdown
  responses: AdjustedResponse[];
}

/**
 * Complete scoring result for a survey response session
 */
export interface ScoringResult {
  // Identifiers
  invitationId: string;
  responseSessionId?: string;
  surveyId: string;
  surveyTitle: string;

  // Metadata
  completedAt: Date;
  scaleType: 'likert3' | 'likert5';
  scaleMin: number;
  scaleMax: number;

  // Category-level scores
  categoryScores: CategoryScore[];

  // Overall metrics
  overallMetrics: {
    totalQuestions: number;
    totalResponses: number;
    completionRate: number; // (totalResponses / totalQuestions) × 100

    // Aggregate weighted score across all categories
    totalWeightedScore: number; // Sum of all categoryScores.weightedScore
    maxPossibleWeighted: number; // Sum of all categoryScores.maxPossibleWeighted
    overallPercentage: number; // (totalWeightedScore / maxPossibleWeighted) × 100
  };

  // Validation
  isComplete: boolean; // True if all questions have responses
  missingQuestions: number[]; // Question numbers without responses
}

/**
 * Aggregated scores across multiple respondents
 */
export interface AggregatedCategoryScore {
  categoryId: string;
  categoryName: string;
  categoryWeight: number;
  colorCode?: string;
  sortOrder?: number;

  // Statistics
  respondentCount: number;
  questionCount: number;

  // Weighted score statistics
  averageWeightedScore: number;
  minWeightedScore: number;
  maxWeightedScore: number;
  standardDeviation: number;

  // Raw score statistics (before weighting)
  averageRawScore: number;
  minRawScore: number;
  maxRawScore: number;

  // Percentage
  averagePercentage: number; // Based on weighted scores

  // Distribution (for histograms)
  distribution: ScoreDistribution[];
}

/**
 * Score distribution bucket for histograms
 */
export interface ScoreDistribution {
  rangeLabel: string; // e.g., "0-20%", "21-40%"
  minScore: number;
  maxScore: number;
  count: number;
  percentage: number; // (count / totalRespondents) × 100
}

/**
 * Campaign-level aggregated results
 */
export interface CampaignScoringResult {
  campaignId: string;
  surveyId: string;
  surveyTitle: string;
  organizationId: string;

  // Metadata
  startDate: Date;
  endDate: Date;
  generatedAt: Date;

  // Respondent info
  totalInvitations: number;
  totalResponses: number;
  responseRate: number; // (totalResponses / totalInvitations) × 100

  // Aggregated category scores
  categoryAggregates: AggregatedCategoryScore[];

  // Individual scores (for non-anonymous surveys)
  individualScores?: ScoringResult[];

  // Overall campaign metrics
  overallMetrics: {
    averageTotalWeightedScore: number;
    averageCompletionRate: number;
  };
}

/**
 * Options for scoring calculation
 */
export interface ScoringOptions {
  includePartialResponses: boolean; // If true, calculate scores even if not all questions answered
  roundTo: number; // Decimal places to round to (default: 1)
  includeIndividualResponses: boolean; // If true, include detailed response breakdown
  enforceMinRespondents?: number; // For anonymous surveys, minimum respondents before showing results
}

/**
 * Error types for scoring validation
 */
export type ScoringError =
  | { type: 'MISSING_CATEGORY'; categoryId: string; message: string }
  | { type: 'MISSING_WEIGHT'; categoryId: string; message: string }
  | { type: 'INVALID_VALUE'; questionId: string; value: number; message: string }
  | { type: 'INCOMPLETE_RESPONSE'; invitationId: string; missingCount: number; message: string }
  | { type: 'INSUFFICIENT_RESPONDENTS'; required: number; actual: number; message: string };

/**
 * Validation result
 */
export interface ScoringValidation {
  isValid: boolean;
  errors: ScoringError[];
  warnings: ScoringError[];
}
