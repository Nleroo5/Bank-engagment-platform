/**
 * Category Scoring Engine - Unit Tests
 *
 * Comprehensive tests for weighted scoring logic including:
 * - Reverse-scoring transformations
 * - Category weight application
 * - Edge cases and error handling
 * - Validation logic
 */

import { describe, it, expect } from 'vitest';
import {
  applyReverseScoring,
  adjustResponse,
  validateScoringData,
  roundScore,
  calculateCategoryScores,
  prepareResponsesForScoring,
} from './categoryScoring';
import type { ResponseData } from '@/types/scoring';
import type { Category } from '@/types/survey';

// =============================================================================
// Test Data Fixtures
// =============================================================================

const mockCategories: Category[] = [
  {
    _id: 'cat-communication',
    _type: 'category',
    name: 'Communication',
    weight: 1.75,
    sortOrder: 1,
  },
  {
    _id: 'cat-leadership',
    _type: 'category',
    name: 'Leadership',
    weight: 1.0,
    sortOrder: 2,
  },
  {
    _id: 'cat-culture',
    _type: 'category',
    name: 'Culture',
    weight: 2.3,
    sortOrder: 3,
  },
];

// =============================================================================
// Reverse Scoring Tests
// =============================================================================

describe('applyReverseScoring', () => {
  describe('3-point scale', () => {
    it('should reverse score 1 to 3', () => {
      expect(applyReverseScoring(1, 3)).toBe(3);
    });

    it('should reverse score 3 to 1', () => {
      expect(applyReverseScoring(3, 3)).toBe(1);
    });

    it('should keep 2 as 2 (middle value)', () => {
      expect(applyReverseScoring(2, 3)).toBe(2);
    });
  });

  describe('5-point scale', () => {
    it('should reverse score 1 to 5', () => {
      expect(applyReverseScoring(1, 5)).toBe(5);
    });

    it('should reverse score 5 to 1', () => {
      expect(applyReverseScoring(5, 5)).toBe(1);
    });

    it('should reverse score 2 to 4', () => {
      expect(applyReverseScoring(2, 5)).toBe(4);
    });

    it('should keep 3 as 3 (middle value)', () => {
      expect(applyReverseScoring(3, 5)).toBe(3);
    });
  });
});

describe('adjustResponse', () => {
  it('should not adjust non-reversed responses', () => {
    const response: ResponseData = {
      sanityQuestionId: 'q1',
      questionNumber: 1,
      value: 2,
      isReversed: false,
      categoryId: 'cat1',
      categoryName: 'Test',
      categoryWeight: 1.0,
    };

    const adjusted = adjustResponse(response, 3);
    expect(adjusted.adjustedValue).toBe(2);
    expect(adjusted.wasAdjusted).toBe(false);
  });

  it('should adjust reversed responses', () => {
    const response: ResponseData = {
      sanityQuestionId: 'q1',
      questionNumber: 1,
      value: 1, // Rarely
      isReversed: true,
      categoryId: 'cat1',
      categoryName: 'Test',
      categoryWeight: 1.0,
    };

    const adjusted = adjustResponse(response, 3);
    expect(adjusted.adjustedValue).toBe(3); // Should become Frequently
    expect(adjusted.wasAdjusted).toBe(true);
  });
});

// =============================================================================
// Validation Tests
// =============================================================================

describe('validateScoringData', () => {
  it('should pass validation for valid data', () => {
    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 2,
        isReversed: false,
        categoryId: 'cat-communication',
        categoryName: 'Communication',
        categoryWeight: 1.75,
      },
    ];

    const validation = validateScoringData(responses, mockCategories, 1, 3);
    expect(validation.isValid).toBe(true);
    expect(validation.errors).toHaveLength(0);
  });

  it('should fail when category is missing weight', () => {
    const invalidCategories: Category[] = [
      {
        _id: 'cat1',
        _type: 'category',
        name: 'Test',
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        weight: undefined as any, // Intentionally invalid for testing
      },
    ];

    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 2,
        isReversed: false,
        categoryId: 'cat1',
        categoryName: 'Test',
        categoryWeight: 1.0,
      },
    ];

    const validation = validateScoringData(responses, invalidCategories, 1, 3);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0]!.type).toBe('MISSING_WEIGHT');
  });

  it('should fail when response value is out of range', () => {
    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 5, // Invalid for 3-point scale
        isReversed: false,
        categoryId: 'cat-communication',
        categoryName: 'Communication',
        categoryWeight: 1.75,
      },
    ];

    const validation = validateScoringData(responses, mockCategories, 1, 3);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0]!.type).toBe('INVALID_VALUE');
  });

  it('should fail when category does not exist', () => {
    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 2,
        isReversed: false,
        categoryId: 'non-existent-cat',
        categoryName: 'Unknown',
        categoryWeight: 1.0,
      },
    ];

    const validation = validateScoringData(responses, mockCategories, 1, 3);
    expect(validation.isValid).toBe(false);
    expect(validation.errors).toHaveLength(1);
    expect(validation.errors[0]!.type).toBe('MISSING_CATEGORY');
  });
});

// =============================================================================
// Utility Tests
// =============================================================================

describe('roundScore', () => {
  it('should round to 1 decimal place by default', () => {
    expect(roundScore(12.345)).toBe(12.3);
    expect(roundScore(12.35)).toBe(12.4);
  });

  it('should round to specified decimal places', () => {
    expect(roundScore(12.3456, 2)).toBe(12.35);
    expect(roundScore(12.3456, 0)).toBe(12);
  });

  it('should handle negative numbers', () => {
    expect(roundScore(-12.345, 1)).toBe(-12.3);
  });
});

// =============================================================================
// Category Score Calculation Tests
// =============================================================================

describe('calculateCategoryScores', () => {
  it('should calculate weighted scores correctly', () => {
    // 2 Communication questions, both answered with value 3
    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 3,
        isReversed: false,
        categoryId: 'cat-communication',
        categoryName: 'Communication',
        categoryWeight: 1.75,
      },
      {
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 3,
        isReversed: false,
        categoryId: 'cat-communication',
        categoryName: 'Communication',
        categoryWeight: 1.75,
      },
    ];

    const result = calculateCategoryScores(
      responses,
      mockCategories,
      'survey1',
      'Test Survey',
      'invitation1',
      1,
      3,
      'likert3'
    );

    // Raw total = 3 + 3 = 6
    // Weighted score = 6 × 1.75 = 10.5
    const commScore = result.categoryScores.find(
      (cs) => cs.categoryName === 'Communication'
    );

    expect(commScore).toBeDefined();
    expect(commScore!.rawTotal).toBe(6);
    expect(commScore!.weightedScore).toBe(10.5);
    expect(commScore!.questionCount).toBe(2);
    expect(commScore!.maxPossibleRaw).toBe(6); // 2 questions × 3 max
    expect(commScore!.maxPossibleWeighted).toBe(10.5); // 6 × 1.75
  });

  it('should apply reverse scoring before calculating totals', () => {
    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 1, // Rarely (raw)
        isReversed: true, // Should become 3 (Frequently)
        categoryId: 'cat-leadership',
        categoryName: 'Leadership',
        categoryWeight: 1.0,
      },
      {
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 3, // Frequently (raw)
        isReversed: true, // Should become 1 (Rarely)
        categoryId: 'cat-leadership',
        categoryName: 'Leadership',
        categoryWeight: 1.0,
      },
    ];

    const result = calculateCategoryScores(
      responses,
      mockCategories,
      'survey1',
      'Test Survey',
      'invitation1',
      1,
      3,
      'likert3'
    );

    const leaderScore = result.categoryScores.find(
      (cs) => cs.categoryName === 'Leadership'
    );

    // After reverse: 3 + 1 = 4
    // Weighted: 4 × 1.0 = 4
    expect(leaderScore!.rawTotal).toBe(4);
    expect(leaderScore!.weightedScore).toBe(4);
  });

  it('should calculate overall metrics correctly', () => {
    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 2,
        isReversed: false,
        categoryId: 'cat-communication',
        categoryName: 'Communication',
        categoryWeight: 1.75,
      },
      {
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 3,
        isReversed: false,
        categoryId: 'cat-leadership',
        categoryName: 'Leadership',
        categoryWeight: 1.0,
      },
    ];

    const result = calculateCategoryScores(
      responses,
      mockCategories,
      'survey1',
      'Test Survey',
      'invitation1',
      1,
      3,
      'likert3'
    );

    expect(result.overallMetrics.totalQuestions).toBe(2);
    expect(result.overallMetrics.totalResponses).toBe(2);
    expect(result.overallMetrics.completionRate).toBe(100);
    expect(result.isComplete).toBe(true);
    expect(result.missingQuestions).toHaveLength(0);
  });

  it('should handle multiple categories', () => {
    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 3,
        isReversed: false,
        categoryId: 'cat-communication',
        categoryName: 'Communication',
        categoryWeight: 1.75,
      },
      {
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 2,
        isReversed: false,
        categoryId: 'cat-leadership',
        categoryName: 'Leadership',
        categoryWeight: 1.0,
      },
      {
        sanityQuestionId: 'q3',
        questionNumber: 3,
        value: 1,
        isReversed: false,
        categoryId: 'cat-culture',
        categoryName: 'Culture',
        categoryWeight: 2.3,
      },
    ];

    const result = calculateCategoryScores(
      responses,
      mockCategories,
      'survey1',
      'Test Survey',
      'invitation1',
      1,
      3,
      'likert3'
    );

    expect(result.categoryScores).toHaveLength(3);

    // Communication: 3 × 1.75 = 5.25
    const comm = result.categoryScores.find(
      (cs) => cs.categoryName === 'Communication'
    );
    expect(comm!.weightedScore).toBe(5.3); // Rounded to 1 decimal

    // Leadership: 2 × 1.0 = 2.0
    const leader = result.categoryScores.find(
      (cs) => cs.categoryName === 'Leadership'
    );
    expect(leader!.weightedScore).toBe(2.0);

    // Culture: 1 × 2.3 = 2.3
    const culture = result.categoryScores.find(
      (cs) => cs.categoryName === 'Culture'
    );
    expect(culture!.weightedScore).toBe(2.3);

    // Total: 5.3 + 2.0 + 2.3 = 9.6 (rounded)
    expect(result.overallMetrics.totalWeightedScore).toBe(9.6);
  });

  it('should calculate percentages correctly', () => {
    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 2, // 2 out of 3
        isReversed: false,
        categoryId: 'cat-leadership',
        categoryName: 'Leadership',
        categoryWeight: 1.0,
      },
    ];

    const result = calculateCategoryScores(
      responses,
      mockCategories,
      'survey1',
      'Test Survey',
      'invitation1',
      1,
      3,
      'likert3'
    );

    const leader = result.categoryScores.find(
      (cs) => cs.categoryName === 'Leadership'
    );

    // Raw: 2/3 = 66.67%
    expect(leader!.rawPercentage).toBeCloseTo(66.7, 1);
  });

  it('should throw error for invalid data', () => {
    const responses: ResponseData[] = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 10, // Invalid
        isReversed: false,
        categoryId: 'cat-communication',
        categoryName: 'Communication',
        categoryWeight: 1.75,
      },
    ];

    expect(() => {
      calculateCategoryScores(
        responses,
        mockCategories,
        'survey1',
        'Test Survey',
        'invitation1',
        1,
        3,
        'likert3'
      );
    }).toThrow('Scoring validation failed');
  });
});

// =============================================================================
// Response Preparation Tests
// =============================================================================

describe('prepareResponsesForScoring', () => {
  it('should transform database responses correctly', () => {
    const dbResponses = [
      {
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 3,
      },
    ];

    const questions = [
      {
        _id: 'q1',
        number: 1,
        isReversed: true,
        category: {
          _id: 'cat1',
          name: 'Test Category',
          weight: 1.5,
        },
      },
    ];

    const prepared = prepareResponsesForScoring(dbResponses, questions);

    expect(prepared).toHaveLength(1);
    expect(prepared[0]!.sanityQuestionId).toBe('q1');
    expect(prepared[0]!.value).toBe(3);
    expect(prepared[0]!.isReversed).toBe(true);
    expect(prepared[0]!.categoryName).toBe('Test Category');
    expect(prepared[0]!.categoryWeight).toBe(1.5);
  });

  it('should throw error for missing question', () => {
    const dbResponses = [
      {
        sanityQuestionId: 'q-missing',
        questionNumber: 1,
        value: 3,
      },
    ];

    const questions = [
      {
        _id: 'q1',
        number: 1,
        isReversed: false,
        category: {
          _id: 'cat1',
          name: 'Test',
          weight: 1.0,
        },
      },
    ];

    expect(() => {
      prepareResponsesForScoring(dbResponses, questions);
    }).toThrow('Question not found');
  });
});
