import { prisma } from '@/lib/prisma';
import type { Response } from '@prisma/client';

/**
 * Question score interface
 */
export interface QuestionScore {
  questionId: string;
  questionNumber: number;
  rawValue: number;
  adjustedValue: number;
  isReversed: boolean;
}

/**
 * Category score interface
 */
export interface CategoryScore {
  categoryId: string;
  categoryName: string;
  averageScore: number;
  questionCount: number;
  responseCount: number;
}

/**
 * Section score interface
 */
export interface SectionScore {
  sectionId: string;
  sectionTitle: string;
  averageScore: number;
  questionCount: number;
  responseCount: number;
}

/**
 * Survey score interface
 */
export interface SurveyScore {
  averageScore: number;
  totalQuestions: number;
  totalResponses: number;
  categoryScores: CategoryScore[];
  sectionScores: SectionScore[];
}

/**
 * Campaign scores interface
 */
export interface CampaignScores {
  campaignId: string;
  respondentCount: number;
  completionRate: number;
  surveyScore: SurveyScore;
}

/**
 * Question definition with metadata
 */
export interface QuestionDefinition {
  _id: string;
  questionNumber: number;
  isReversed?: boolean;
  category?: {
    _id: string;
    name: string;
  };
  section?: {
    _id: string;
    title: string;
  };
}

/**
 * Calculates the adjusted score for a question, applying reverse scoring if needed.
 *
 * CRITICAL: For reverse-scored questions:
 * - 3-point scale (1-3): raw 1 becomes 3, raw 3 becomes 1, raw 2 stays 2
 * - 5-point scale (1-5): raw 1 becomes 5, raw 5 becomes 1, etc.
 *
 * Formula: adjustedScore = (scaleMax + 1) - rawValue
 *
 * @param rawValue - The value as selected by the respondent
 * @param isReversed - Whether this question uses reverse scoring
 * @param scaleMax - The maximum value on the scale (3 or 5)
 * @returns The adjusted score to use in calculations
 */
export function calculateQuestionScore(
  rawValue: number,
  isReversed: boolean,
  scaleMax: number
): number {
  if (isReversed) {
    return scaleMax + 1 - rawValue;
  }
  return rawValue;
}

/**
 * Calculates average scores grouped by category.
 *
 * CRITICAL: Never average averages. Always aggregates from individual response values.
 * All scores are rounded to 1 decimal place.
 *
 * @param responses - Array of individual response records
 * @param questions - Array of question definitions with category mappings
 * @param scaleMax - The maximum value on the scale (3 or 5)
 * @returns Array of category scores
 */
export function calculateCategoryScores(
  responses: Response[],
  questions: QuestionDefinition[],
  scaleMax: number
): CategoryScore[] {
  // Create a map of questionId -> question definition
  const questionMap = new Map(
    questions.map((q) => [q._id, q])
  );

  // Group responses by category
  const categoryGroups = new Map<string, { name: string; values: number[]; questionIds: Set<string> }>();

  for (const response of responses) {
    if (response.value === null) continue;

    const question = questionMap.get(response.sanityQuestionId);
    if (!question || !question.category) continue;

    const categoryId = question.category._id;
    const categoryName = question.category.name;

    if (!categoryGroups.has(categoryId)) {
      categoryGroups.set(categoryId, {
        name: categoryName,
        values: [],
        questionIds: new Set(),
      });
    }

    const group = categoryGroups.get(categoryId)!;
    const adjustedValue = calculateQuestionScore(
      response.value,
      question.isReversed || false,
      scaleMax
    );
    group.values.push(adjustedValue);
    group.questionIds.add(question._id);
  }

  // Calculate averages for each category
  const categoryScores: CategoryScore[] = [];

  for (const [categoryId, group] of categoryGroups) {
    if (group.values.length === 0) continue;

    const sum = group.values.reduce((acc, val) => acc + val, 0);
    const average = sum / group.values.length;

    categoryScores.push({
      categoryId,
      categoryName: group.name,
      averageScore: Math.round(average * 10) / 10,
      questionCount: group.questionIds.size,
      responseCount: group.values.length,
    });
  }

  return categoryScores.sort((a, b) => a.categoryName.localeCompare(b.categoryName));
}

/**
 * Calculates average scores grouped by section.
 *
 * CRITICAL: Never average averages. Always aggregates from individual response values.
 * All scores are rounded to 1 decimal place.
 *
 * @param responses - Array of individual response records
 * @param questions - Array of question definitions with section mappings
 * @param scaleMax - The maximum value on the scale (3 or 5)
 * @returns Array of section scores
 */
export function calculateSectionScores(
  responses: Response[],
  questions: QuestionDefinition[],
  scaleMax: number
): SectionScore[] {
  // Create a map of questionId -> question definition
  const questionMap = new Map(
    questions.map((q) => [q._id, q])
  );

  // Group responses by section
  const sectionGroups = new Map<string, { title: string; values: number[]; questionIds: Set<string> }>();

  for (const response of responses) {
    if (response.value === null) continue;

    const question = questionMap.get(response.sanityQuestionId);
    if (!question || !question.section) continue;

    const sectionId = question.section._id;
    const sectionTitle = question.section.title;

    if (!sectionGroups.has(sectionId)) {
      sectionGroups.set(sectionId, {
        title: sectionTitle,
        values: [],
        questionIds: new Set(),
      });
    }

    const group = sectionGroups.get(sectionId)!;
    const adjustedValue = calculateQuestionScore(
      response.value,
      question.isReversed || false,
      scaleMax
    );
    group.values.push(adjustedValue);
    group.questionIds.add(question._id);
  }

  // Calculate averages for each section
  const sectionScores: SectionScore[] = [];

  for (const [sectionId, group] of sectionGroups) {
    if (group.values.length === 0) continue;

    const sum = group.values.reduce((acc, val) => acc + val, 0);
    const average = sum / group.values.length;

    sectionScores.push({
      sectionId,
      sectionTitle: group.title,
      averageScore: Math.round(average * 10) / 10,
      questionCount: group.questionIds.size,
      responseCount: group.values.length,
    });
  }

  return sectionScores;
}

/**
 * Calculates the overall survey score.
 *
 * CRITICAL: Never average averages. Always aggregates from individual response values.
 * All scores are rounded to 1 decimal place.
 *
 * @param responses - Array of individual response records
 * @param questions - Array of question definitions
 * @param scaleMax - The maximum value on the scale (3 or 5)
 * @returns Overall survey score with breakdowns
 */
export function calculateSurveyScore(
  responses: Response[],
  questions: QuestionDefinition[],
  scaleMax: number
): SurveyScore {
  // Create a map of questionId -> question definition
  const questionMap = new Map(
    questions.map((q) => [q._id, q])
  );

  // Collect all adjusted values
  const allValues: number[] = [];
  const uniqueQuestions = new Set<string>();

  for (const response of responses) {
    if (response.value === null) continue;

    const question = questionMap.get(response.sanityQuestionId);
    if (!question) continue;

    const adjustedValue = calculateQuestionScore(
      response.value,
      question.isReversed || false,
      scaleMax
    );
    allValues.push(adjustedValue);
    uniqueQuestions.add(response.sanityQuestionId);
  }

  // Calculate overall average
  const sum = allValues.reduce((acc, val) => acc + val, 0);
  const average = allValues.length > 0 ? sum / allValues.length : 0;

  // Calculate category and section breakdowns
  const categoryScores = calculateCategoryScores(responses, questions, scaleMax);
  const sectionScores = calculateSectionScores(responses, questions, scaleMax);

  return {
    averageScore: Math.round(average * 10) / 10,
    totalQuestions: uniqueQuestions.size,
    totalResponses: allValues.length,
    categoryScores,
    sectionScores,
  };
}

/**
 * Calculates aggregate scores for an entire campaign.
 *
 * CRITICAL: Never average averages. This function fetches all individual responses
 * and aggregates from those raw values.
 *
 * @param campaignId - The ID of the campaign to score
 * @param questions - Array of question definitions from Sanity
 * @param scaleMax - The maximum value on the scale (3 or 5)
 * @returns Campaign scores with all breakdowns
 */
export async function calculateCampaignScores(
  campaignId: string,
  questions: QuestionDefinition[],
  scaleMax: number
): Promise<CampaignScores> {
  // Fetch the campaign with invitations
  const campaign = await prisma.surveyCampaign.findUnique({
    where: { id: campaignId },
    include: {
      invitations: {
        include: {
          responses: true,
        },
      },
    },
  });

  if (!campaign) {
    throw new Error('Campaign not found');
  }

  // Count completed respondents
  const completedInvitations = campaign.invitations.filter(
    (inv) => inv.status === 'COMPLETED'
  );

  const respondentCount = completedInvitations.length;
  const totalInvitations = campaign.invitations.length;
  const completionRate = totalInvitations > 0
    ? Math.round((respondentCount / totalInvitations) * 100 * 10) / 10
    : 0;

  // Collect all responses from completed invitations
  const allResponses: Response[] = [];
  for (const invitation of completedInvitations) {
    allResponses.push(...invitation.responses);
  }

  // Calculate survey score from all individual responses
  const surveyScore = calculateSurveyScore(allResponses, questions, scaleMax);

  return {
    campaignId,
    respondentCount,
    completionRate,
    surveyScore,
  };
}
