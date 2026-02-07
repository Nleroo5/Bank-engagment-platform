/**
 * Scoring Module
 *
 * Exports all scoring-related functions and utilities
 */

export {
  calculateCategoryScores,
  applyReverseScoring,
  adjustResponse,
  validateScoringData,
  roundScore,
  prepareResponsesForScoring,
} from './categoryScoring';

export type {
  ResponseData,
  AdjustedResponse,
  CategoryScore,
  ScoringResult,
  ScoringOptions,
  ScoringValidation,
  ScoringError,
  AggregatedCategoryScore,
  ScoreDistribution,
  CampaignScoringResult,
} from '@/types/scoring';
