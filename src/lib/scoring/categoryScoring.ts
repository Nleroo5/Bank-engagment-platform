/**
 * Category Scoring Engine
 *
 * Core implementation of weighted category scoring with reverse-scoring support.
 *
 * Key Features:
 * - Applies reverse-scoring transformation: adjustedValue = (scaleMax + 1) - rawValue
 * - Groups responses by category
 * - Calculates weighted scores: rawTotal × categoryWeight
 * - Handles partial responses
 * - Provides detailed breakdowns for reporting
 *
 * @example
 * ```ts
 * const result = calculateCategoryScores(responses, categories, scale);
 * console.log(result.categoryScores[0].weightedScore); // e.g., 12.6
 * ```
 */

import type {
  ResponseData,
  AdjustedResponse,
  CategoryScore,
  ScoringResult,
  ScoringOptions,
  ScoringValidation,
  ScoringError,
} from '@/types/scoring';
import type { Category } from '@/types/survey';

/**
 * Default scoring options
 */
const DEFAULT_OPTIONS: ScoringOptions = {
  includePartialResponses: true,
  roundTo: 1,
  includeIndividualResponses: true,
};

/**
 * Applies reverse-scoring transformation to a value
 *
 * Formula: adjustedValue = (scaleMax + 1) - rawValue
 *
 * Examples (3-point scale):
 * - Raw 1 (Rarely) → Adjusted 3 (Frequently)
 * - Raw 2 (Sometimes) → Adjusted 2 (Sometimes)
 * - Raw 3 (Frequently) → Adjusted 1 (Rarely)
 *
 * @param rawValue - The original value submitted by respondent
 * @param scaleMax - Maximum value on the scale (3 or 5)
 * @returns The reverse-scored adjusted value
 */
export function applyReverseScoring(
  rawValue: number,
  scaleMax: number
): number {
  return scaleMax + 1 - rawValue;
}

/**
 * Adjusts a response value if reverse-scoring applies
 *
 * @param response - Raw response data
 * @param scaleMax - Maximum scale value
 * @returns Response with adjusted value
 */
export function adjustResponse(
  response: ResponseData,
  scaleMax: number
): AdjustedResponse {
  if (!response.isReversed) {
    return {
      ...response,
      adjustedValue: response.value,
      wasAdjusted: false,
    };
  }

  return {
    ...response,
    adjustedValue: applyReverseScoring(response.value, scaleMax),
    wasAdjusted: true,
  };
}

/**
 * Validates response data before scoring
 *
 * @param responses - Array of responses to validate
 * @param categories - Array of categories with weights
 * @param scaleMin - Minimum scale value
 * @param scaleMax - Maximum scale value
 * @returns Validation result with errors/warnings
 */
export function validateScoringData(
  responses: ResponseData[],
  categories: Category[],
  scaleMin: number,
  scaleMax: number
): ScoringValidation {
  const errors: ScoringError[] = [];
  const warnings: ScoringError[] = [];

  // Check all categories have weights
  for (const category of categories) {
    if (category.weight === undefined || category.weight === null) {
      errors.push({
        type: 'MISSING_WEIGHT',
        categoryId: category._id,
        message: `Category "${category.name}" is missing a weight value`,
      });
    }
  }

  // Check all responses have valid values
  for (const response of responses) {
    if (response.value < scaleMin || response.value > scaleMax) {
      errors.push({
        type: 'INVALID_VALUE',
        questionId: response.questionId,
        value: response.value,
        message: `Invalid value ${response.value} (expected ${scaleMin}-${scaleMax})`,
      });
    }

    // Check category exists
    const categoryExists = categories.some(
      (c) => c._id === response.categoryId
    );
    if (!categoryExists) {
      errors.push({
        type: 'MISSING_CATEGORY',
        categoryId: response.categoryId,
        message: `Category with ID "${response.categoryId}" not found`,
      });
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}

/**
 * Rounds a number to specified decimal places
 *
 * @param value - Number to round
 * @param decimals - Number of decimal places (default: 1)
 * @returns Rounded number
 */
export function roundScore(value: number, decimals: number = 1): number {
  const multiplier = Math.pow(10, decimals);
  return Math.round(value * multiplier) / multiplier;
}

/**
 * Calculates category score from responses
 *
 * @param categoryId - Category identifier
 * @param categoryName - Category name
 * @param categoryWeight - Weight multiplier for this category
 * @param responses - Adjusted responses for this category
 * @param scaleMin - Minimum scale value
 * @param scaleMax - Maximum scale value
 * @param roundTo - Decimal places to round to
 * @returns Complete category score breakdown
 */
function calculateSingleCategoryScore(
  categoryId: string,
  categoryName: string,
  categoryWeight: number,
  categoryColorCode: string | undefined,
  categorySortOrder: number | undefined,
  responses: AdjustedResponse[],
  scaleMin: number,
  scaleMax: number,
  roundTo: number
): CategoryScore {
  const questionCount = responses.length;
  const responseCount = responses.filter((r) => r.value !== null).length;

  // Calculate raw total (sum of adjusted values)
  const rawTotal = responses.reduce((sum, r) => sum + r.adjustedValue, 0);

  // Apply weight multiplier
  const weightedScore = rawTotal * categoryWeight;

  // Calculate maximum possible scores
  const maxPossibleRaw = questionCount * scaleMax;
  const maxPossibleWeighted = maxPossibleRaw * categoryWeight;

  // Calculate percentage
  const rawPercentage =
    maxPossibleRaw > 0 ? (rawTotal / maxPossibleRaw) * 100 : 0;

  return {
    categoryId,
    categoryName,
    categoryWeight,
    colorCode: categoryColorCode,
    sortOrder: categorySortOrder,
    questionCount,
    responseCount,
    rawTotal: roundScore(rawTotal, roundTo),
    weightedScore: roundScore(weightedScore, roundTo),
    scaleMin,
    scaleMax,
    maxPossibleRaw,
    maxPossibleWeighted: roundScore(maxPossibleWeighted, roundTo),
    rawPercentage: roundScore(rawPercentage, roundTo),
    responses,
  };
}

/**
 * Main scoring function: Calculates weighted category scores from responses
 *
 * This is the core function that:
 * 1. Validates input data
 * 2. Applies reverse-scoring adjustments
 * 3. Groups responses by category
 * 4. Calculates weighted scores per category
 * 5. Computes overall metrics
 *
 * @param responses - Array of raw response data from database
 * @param categories - Array of categories with weights
 * @param surveyId - Survey identifier
 * @param surveyTitle - Survey title
 * @param invitationId - Invitation identifier
 * @param scaleMin - Minimum scale value (usually 1)
 * @param scaleMax - Maximum scale value (3 or 5)
 * @param scaleType - Scale type ('likert3' or 'likert5')
 * @param options - Scoring options (optional)
 * @returns Complete scoring result with category breakdowns
 * @throws Error if validation fails
 */
export function calculateCategoryScores(
  responses: ResponseData[],
  categories: Category[],
  surveyId: string,
  surveyTitle: string,
  invitationId: string,
  scaleMin: number,
  scaleMax: number,
  scaleType: 'likert3' | 'likert5',
  options: Partial<ScoringOptions> = {}
): ScoringResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Validate input data
  const validation = validateScoringData(
    responses,
    categories,
    scaleMin,
    scaleMax
  );
  if (!validation.isValid) {
    const errorMessages = validation.errors.map((e) => e.message).join('; ');
    throw new Error(`Scoring validation failed: ${errorMessages}`);
  }

  // Apply reverse-scoring adjustments
  const adjustedResponses = responses.map((r) => adjustResponse(r, scaleMax));

  // Group responses by category
  const responsesByCategory = new Map<string, AdjustedResponse[]>();
  for (const response of adjustedResponses) {
    const existing = responsesByCategory.get(response.categoryId) || [];
    existing.push(response);
    responsesByCategory.set(response.categoryId, existing);
  }

  // Calculate score for each category
  const categoryScores: CategoryScore[] = [];
  for (const category of categories) {
    const categoryResponses = responsesByCategory.get(category._id) || [];

    // Skip categories with no responses if not including partial
    if (categoryResponses.length === 0 && !opts.includePartialResponses) {
      continue;
    }

    const categoryScore = calculateSingleCategoryScore(
      category._id,
      category.name,
      category.weight,
      category.colorCode,
      category.sortOrder,
      categoryResponses,
      scaleMin,
      scaleMax,
      opts.roundTo
    );

    categoryScores.push(categoryScore);
  }

  // Sort by sortOrder if available
  categoryScores.sort((a, b) => {
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    return a.categoryName.localeCompare(b.categoryName);
  });

  // Calculate overall metrics
  const totalQuestions = categoryScores.reduce(
    (sum, cs) => sum + cs.questionCount,
    0
  );
  const totalResponses = categoryScores.reduce(
    (sum, cs) => sum + cs.responseCount,
    0
  );
  const completionRate =
    totalQuestions > 0 ? (totalResponses / totalQuestions) * 100 : 0;

  const totalWeightedScore = categoryScores.reduce(
    (sum, cs) => sum + cs.weightedScore,
    0
  );
  const maxPossibleWeighted = categoryScores.reduce(
    (sum, cs) => sum + cs.maxPossibleWeighted,
    0
  );
  const overallPercentage =
    maxPossibleWeighted > 0
      ? (totalWeightedScore / maxPossibleWeighted) * 100
      : 0;

  // Check if response is complete
  const isComplete = totalResponses === totalQuestions;
  const missingQuestions = Array.from(
    { length: totalQuestions },
    (_, i) => i + 1
  ).filter((num) => !responses.some((r) => r.questionNumber === num));

  return {
    invitationId,
    surveyId,
    surveyTitle,
    completedAt: new Date(),
    scaleType,
    scaleMin,
    scaleMax,
    categoryScores,
    overallMetrics: {
      totalQuestions,
      totalResponses,
      completionRate: roundScore(completionRate, opts.roundTo),
      totalWeightedScore: roundScore(totalWeightedScore, opts.roundTo),
      maxPossibleWeighted: roundScore(maxPossibleWeighted, opts.roundTo),
      overallPercentage: roundScore(overallPercentage, opts.roundTo),
    },
    isComplete,
    missingQuestions,
  };
}

/**
 * Helper: Extracts ResponseData from Prisma query result
 *
 * This function transforms database query results into the format
 * expected by the scoring engine.
 *
 * @param dbResponses - Raw responses from Prisma query
 * @param questions - Question metadata (category, isReversed, etc.)
 * @returns Array of ResponseData ready for scoring
 */
export function prepareResponsesForScoring(
  dbResponses: Array<{
    questionId: string;
    questionNumber: number;
    value: number;
  }>,
  questions: Array<{
    _id: string;
    number: number;
    isReversed: boolean;
    category: {
      _id: string;
      name: string;
      weight: number;
    };
  }>
): ResponseData[] {
  const questionMap = new Map(questions.map((q) => [q._id, q]));

  return dbResponses.map((response) => {
    const question = questionMap.get(response.questionId);
    if (!question) {
      throw new Error(`Question not found: ${response.questionId}`);
    }

    return {
      questionId: response.questionId,
      questionNumber: response.questionNumber,
      value: response.value,
      isReversed: question.isReversed,
      categoryId: question.category._id,
      categoryName: question.category.name,
      categoryWeight: question.category.weight,
    };
  });
}
