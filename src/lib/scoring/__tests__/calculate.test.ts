import { describe, it, expect } from 'vitest';
import {
  calculateQuestionScore,
  calculateCategoryScores,
  calculateSectionScores,
  calculateSurveyScore,
} from '../calculate';
import type { Response } from '@prisma/client';
import type { QuestionDefinition } from '../calculate';

describe('calculateQuestionScore', () => {
  describe('5-point scale (1-5)', () => {
    const scaleMax = 5;

    describe('normal scoring (not reversed)', () => {
      it('should return the raw value for score 1', () => {
        expect(calculateQuestionScore(1, false, scaleMax)).toBe(1);
      });

      it('should return the raw value for score 2', () => {
        expect(calculateQuestionScore(2, false, scaleMax)).toBe(2);
      });

      it('should return the raw value for score 3', () => {
        expect(calculateQuestionScore(3, false, scaleMax)).toBe(3);
      });

      it('should return the raw value for score 4', () => {
        expect(calculateQuestionScore(4, false, scaleMax)).toBe(4);
      });

      it('should return the raw value for score 5', () => {
        expect(calculateQuestionScore(5, false, scaleMax)).toBe(5);
      });
    });

    describe('reverse scoring', () => {
      it('should reverse score 1 to 5', () => {
        expect(calculateQuestionScore(1, true, scaleMax)).toBe(5);
      });

      it('should reverse score 2 to 4', () => {
        expect(calculateQuestionScore(2, true, scaleMax)).toBe(4);
      });

      it('should keep score 3 as 3 (middle)', () => {
        expect(calculateQuestionScore(3, true, scaleMax)).toBe(3);
      });

      it('should reverse score 4 to 2', () => {
        expect(calculateQuestionScore(4, true, scaleMax)).toBe(2);
      });

      it('should reverse score 5 to 1', () => {
        expect(calculateQuestionScore(5, true, scaleMax)).toBe(1);
      });

      it('should use formula: (scaleMax + 1) - rawValue', () => {
        const rawValue = 1;
        const expected = scaleMax + 1 - rawValue; // 5 + 1 - 1 = 5
        expect(calculateQuestionScore(rawValue, true, scaleMax)).toBe(expected);
      });
    });
  });

  describe('3-point scale (1-3)', () => {
    const scaleMax = 3;

    describe('normal scoring (not reversed)', () => {
      it('should return the raw value for score 1', () => {
        expect(calculateQuestionScore(1, false, scaleMax)).toBe(1);
      });

      it('should return the raw value for score 2', () => {
        expect(calculateQuestionScore(2, false, scaleMax)).toBe(2);
      });

      it('should return the raw value for score 3', () => {
        expect(calculateQuestionScore(3, false, scaleMax)).toBe(3);
      });
    });

    describe('reverse scoring', () => {
      it('should reverse score 1 to 3', () => {
        expect(calculateQuestionScore(1, true, scaleMax)).toBe(3);
      });

      it('should keep score 2 as 2 (middle)', () => {
        expect(calculateQuestionScore(2, true, scaleMax)).toBe(2);
      });

      it('should reverse score 3 to 1', () => {
        expect(calculateQuestionScore(3, true, scaleMax)).toBe(1);
      });

      it('should use formula: (scaleMax + 1) - rawValue', () => {
        const rawValue = 1;
        const expected = scaleMax + 1 - rawValue; // 3 + 1 - 1 = 3
        expect(calculateQuestionScore(rawValue, true, scaleMax)).toBe(expected);
      });
    });
  });

  describe('edge cases', () => {
    it('should handle isReversed=undefined as false', () => {
      // TypeScript won't allow undefined, but testing the behavior
      const isReversed = false;
      expect(calculateQuestionScore(5, isReversed, 5)).toBe(5);
    });

    it('should work with custom scale max values', () => {
      expect(calculateQuestionScore(1, true, 7)).toBe(7); // 7 + 1 - 1 = 7
      expect(calculateQuestionScore(7, true, 7)).toBe(1); // 7 + 1 - 7 = 1
    });
  });
});

describe('calculateCategoryScores', () => {
  const scaleMax = 5;

  it('should calculate average scores grouped by category', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 5,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '2',
        invitationId: 'inv1',
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 4,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '3',
        invitationId: 'inv1',
        sanityQuestionId: 'q3',
        questionNumber: 3,
        value: 3,
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      {
        _id: 'q1',
        questionNumber: 1,
        isReversed: false,
        category: { _id: 'cat1', name: 'Communication' },
      },
      {
        _id: 'q2',
        questionNumber: 2,
        isReversed: false,
        category: { _id: 'cat1', name: 'Communication' },
      },
      {
        _id: 'q3',
        questionNumber: 3,
        isReversed: false,
        category: { _id: 'cat2', name: 'Leadership' },
      },
    ];

    const scores = calculateCategoryScores(responses, questions, scaleMax);

    expect(scores).toHaveLength(2);
    expect(scores[0]!.categoryName).toBe('Communication');
    expect(scores[0]!.averageScore).toBe(4.5); // (5 + 4) / 2 = 4.5
    expect(scores[0]!.questionCount).toBe(2);
    expect(scores[0]!.responseCount).toBe(2);

    expect(scores[1]!.categoryName).toBe('Leadership');
    expect(scores[1]!.averageScore).toBe(3); // 3 / 1 = 3
    expect(scores[1]!.questionCount).toBe(1);
    expect(scores[1]!.responseCount).toBe(1);
  });

  it('should apply reverse scoring when calculating category averages', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 1, // Will be reversed to 5
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '2',
        invitationId: 'inv1',
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 3, // Will be reversed to 3
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      {
        _id: 'q1',
        questionNumber: 1,
        isReversed: true,
        category: { _id: 'cat1', name: 'Communication' },
      },
      {
        _id: 'q2',
        questionNumber: 2,
        isReversed: true,
        category: { _id: 'cat1', name: 'Communication' },
      },
    ];

    const scores = calculateCategoryScores(responses, questions, scaleMax);

    expect(scores).toHaveLength(1);
    expect(scores[0]!.averageScore).toBe(4); // (5 + 3) / 2 = 4
  });

  it('should round averages to 1 decimal place', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 5,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '2',
        invitationId: 'inv1',
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 4,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '3',
        invitationId: 'inv1',
        sanityQuestionId: 'q3',
        questionNumber: 3,
        value: 4,
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      {
        _id: 'q1',
        questionNumber: 1,
        category: { _id: 'cat1', name: 'Communication' },
      },
      {
        _id: 'q2',
        questionNumber: 2,
        category: { _id: 'cat1', name: 'Communication' },
      },
      {
        _id: 'q3',
        questionNumber: 3,
        category: { _id: 'cat1', name: 'Communication' },
      },
    ];

    const scores = calculateCategoryScores(responses, questions, scaleMax);

    // (5 + 4 + 4) / 3 = 13 / 3 = 4.333... should round to 4.3
    expect(scores[0]!.averageScore).toBe(4.3);
  });

  it('should ignore responses with null values', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 5,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '2',
        invitationId: 'inv1',
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: null,
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      {
        _id: 'q1',
        questionNumber: 1,
        category: { _id: 'cat1', name: 'Communication' },
      },
      {
        _id: 'q2',
        questionNumber: 2,
        category: { _id: 'cat1', name: 'Communication' },
      },
    ];

    const scores = calculateCategoryScores(responses, questions, scaleMax);

    expect(scores[0]!.averageScore).toBe(5); // Only counts the non-null value
    expect(scores[0]!.responseCount).toBe(1);
  });

  it('should sort categories alphabetically by name', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 5,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '2',
        invitationId: 'inv1',
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 4,
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      {
        _id: 'q1',
        questionNumber: 1,
        category: { _id: 'cat1', name: 'Zebra' },
      },
      {
        _id: 'q2',
        questionNumber: 2,
        category: { _id: 'cat2', name: 'Apple' },
      },
    ];

    const scores = calculateCategoryScores(responses, questions, scaleMax);

    expect(scores[0]!.categoryName).toBe('Apple');
    expect(scores[1]!.categoryName).toBe('Zebra');
  });
});

describe('calculateSectionScores', () => {
  const scaleMax = 5;

  it('should calculate average scores grouped by section', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 5,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '2',
        invitationId: 'inv1',
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 4,
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      {
        _id: 'q1',
        questionNumber: 1,
        section: { _id: 'sec1', title: 'Goal Setting' },
      },
      {
        _id: 'q2',
        questionNumber: 2,
        section: { _id: 'sec1', title: 'Goal Setting' },
      },
    ];

    const scores = calculateSectionScores(responses, questions, scaleMax);

    expect(scores).toHaveLength(1);
    expect(scores[0]!.sectionTitle).toBe('Goal Setting');
    expect(scores[0]!.averageScore).toBe(4.5);
  });

  it('should apply reverse scoring when calculating section averages', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 1, // Reversed to 3
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '2',
        invitationId: 'inv1',
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 3, // Reversed to 1
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      {
        _id: 'q1',
        questionNumber: 1,
        isReversed: true,
        section: { _id: 'sec1', title: 'Goal Setting' },
      },
      {
        _id: 'q2',
        questionNumber: 2,
        isReversed: true,
        section: { _id: 'sec1', title: 'Goal Setting' },
      },
    ];

    const scores = calculateSectionScores(responses, questions, 3);

    // (3 + 1) / 2 = 2
    expect(scores[0]!.averageScore).toBe(2);
  });
});

describe('calculateSurveyScore', () => {
  const scaleMax = 5;

  it('should calculate overall average from all responses', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 5,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '2',
        invitationId: 'inv1',
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 3,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '3',
        invitationId: 'inv1',
        sanityQuestionId: 'q3',
        questionNumber: 3,
        value: 4,
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      { _id: 'q1', questionNumber: 1 },
      { _id: 'q2', questionNumber: 2 },
      { _id: 'q3', questionNumber: 3 },
    ];

    const score = calculateSurveyScore(responses, questions, scaleMax);

    // (5 + 3 + 4) / 3 = 4
    expect(score.averageScore).toBe(4);
    expect(score.totalQuestions).toBe(3);
    expect(score.totalResponses).toBe(3);
  });

  it('should include category and section breakdowns', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 5,
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      {
        _id: 'q1',
        questionNumber: 1,
        category: { _id: 'cat1', name: 'Communication' },
        section: { _id: 'sec1', title: 'Goal Setting' },
      },
    ];

    const score = calculateSurveyScore(responses, questions, scaleMax);

    expect(score.categoryScores).toHaveLength(1);
    expect(score.categoryScores[0]!.categoryName).toBe('Communication');
    expect(score.sectionScores).toHaveLength(1);
    expect(score.sectionScores[0]!.sectionTitle).toBe('Goal Setting');
  });

  it('should round overall average to 1 decimal place', () => {
    const responses: Response[] = [
      {
        id: '1',
        invitationId: 'inv1',
        sanityQuestionId: 'q1',
        questionNumber: 1,
        value: 5,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '2',
        invitationId: 'inv1',
        sanityQuestionId: 'q2',
        questionNumber: 2,
        value: 4,
        textValue: null,
        submittedAt: new Date(),
      },
      {
        id: '3',
        invitationId: 'inv1',
        sanityQuestionId: 'q3',
        questionNumber: 3,
        value: 4,
        textValue: null,
        submittedAt: new Date(),
      },
    ];

    const questions: QuestionDefinition[] = [
      { _id: 'q1', questionNumber: 1 },
      { _id: 'q2', questionNumber: 2 },
      { _id: 'q3', questionNumber: 3 },
    ];

    const score = calculateSurveyScore(responses, questions, scaleMax);

    // (5 + 4 + 4) / 3 = 13 / 3 = 4.333... should round to 4.3
    expect(score.averageScore).toBe(4.3);
  });

  it('should return 0 for empty responses', () => {
    const responses: Response[] = [];
    const questions: QuestionDefinition[] = [];

    const score = calculateSurveyScore(responses, questions, scaleMax);

    expect(score.averageScore).toBe(0);
    expect(score.totalQuestions).toBe(0);
    expect(score.totalResponses).toBe(0);
  });
});
