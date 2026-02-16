import { prisma } from '@/lib/prisma';
import type { Survey } from '@/types/survey';

/**
 * Fetch a survey by ID from PostgreSQL with all nested content
 * Returns data in the same format as Sanity for backward compatibility
 */
export async function getSurveyById(surveyId: string): Promise<Survey | null> {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      scale: true,
      sections: {
        orderBy: { sortOrder: 'asc' },
        include: {
          questions: {
            orderBy: { questionNumber: 'asc' },
            include: {
              categories: {
                include: {
                  category: true,
                },
              },
            },
          },
        },
      },
      questions: {
        orderBy: { questionNumber: 'asc' },
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  if (!survey) {
    return null;
  }

  // If survey has no sections, create a virtual section with all questions
  let sectionsData = survey.sections;
  if (sectionsData.length === 0 && survey.questions.length > 0) {
    sectionsData = [
      {
        id: 'virtual-section',
        surveyId: survey.id,
        title: survey.title,
        description: survey.description,
        sortOrder: 1,
        createdAt: survey.createdAt,
        updatedAt: survey.updatedAt,
        questions: survey.questions,
      },
    ];
  }

  // Transform PostgreSQL data to match Sanity structure
  return {
    _id: survey.id,
    _type: 'survey' as const,
    title: survey.title,
    slug: { current: survey.surveyNumber || survey.id },
    surveyNumber: survey.surveyNumber
      ? parseInt(survey.surveyNumber.replace('Survey ', ''))
      : undefined,
    surveyType: survey.surveyType as
      | 'likert3'
      | 'likert5'
      | 'demographics'
      | 'managerial'
      | 'ote'
      | 'associate_180',
    instructions: survey.description || undefined,
    sections: sectionsData.map((section) => ({
      _id: section.id,
      _type: 'section' as const,
      title: section.title,
      sortOrder: section.sortOrder,
      description: section.description || undefined,
      directions: undefined,
      questions: section.questions.map((question) => {
        // Validation: All questions should have categories
        if (question.categories.length === 0) {
          console.error(
            `Data integrity error: Question ${question.id} (number ${question.questionNumber}) has no categories`
          );
          throw new Error(
            `Question ${question.questionNumber} in section "${section.title}" has no category mapping`
          );
        }

        const qCategory = question.categories[0]!.category;
        return {
          _id: question.id,
          _type: 'question' as const,
          number: question.questionNumber,
          text: question.text,
          category: {
            _id: qCategory.id,
            _type: 'category' as const,
            name: qCategory.name,
            colorCode: qCategory.colorCode || undefined,
            description: qCategory.description || undefined,
            sortOrder: qCategory.sortOrder,
            weight: parseFloat(qCategory.weight.toString()),
          },
          isReversed: question.isReversed,
          anchorText: (question.config as { anchorText?: string })?.anchorText,
          fieldType: undefined,
          slug: undefined,
        };
      }),
    })),
    scale: survey.scale
      ? {
          _id: survey.scale.id,
          _type: 'scale' as const,
          name: survey.scale.name,
          scaleType: survey.scale.scaleType as 'likert3' | 'likert5',
          min: survey.scale.min,
          max: survey.scale.max,
          minLabel: undefined,
          maxLabel: undefined,
          midLabel: undefined,
          labels: Object.entries(
            survey.scale.labels as Record<string, string>
          ).map(([value, label]) => ({
            value: parseInt(value),
            label,
          })),
        }
      : undefined,
    respondentNameField: undefined, // Not yet migrated from Sanity
    welcomeMessage: undefined, // Not yet migrated from Sanity
    completionMessage: undefined, // Not yet migrated from Sanity
    estimatedMinutes: undefined, // Not yet migrated from Sanity
    isActive: survey.status === 'PUBLISHED',
  };
}

/**
 * Fetch all surveys from PostgreSQL
 */
export async function getAllSurveys() {
  const surveys = await prisma.survey.findMany({
    where: {
      status: 'PUBLISHED',
    },
    orderBy: [{ surveyNumber: 'asc' }, { title: 'asc' }],
    include: {
      _count: {
        select: {
          questions: true,
        },
      },
    },
  });

  return surveys.map((survey) => ({
    _id: survey.id,
    title: survey.title,
    slug: { current: survey.surveyNumber || survey.id },
    surveyNumber: survey.surveyNumber
      ? parseInt(survey.surveyNumber.replace('Survey ', ''))
      : undefined,
    surveyType: survey.surveyType,
    isActive: survey.status === 'PUBLISHED',
    estimatedMinutes: undefined,
  }));
}

/**
 * Fetch all categories from PostgreSQL
 */
export async function getAllCategories() {
  const categories = await prisma.category.findMany({
    orderBy: [{ sortOrder: 'asc' }, { name: 'asc' }],
  });

  return categories.map((category) => ({
    _id: category.id,
    _type: 'category' as const,
    name: category.name,
    colorCode: category.colorCode || undefined,
    description: category.description || undefined,
    sortOrder: category.sortOrder,
    weight: parseFloat(category.weight.toString()),
  }));
}

/**
 * Fetch categories for a specific survey
 */
export async function getCategoriesForSurvey(surveyId: string) {
  const survey = await prisma.survey.findUnique({
    where: { id: surveyId },
    include: {
      questions: {
        include: {
          categories: {
            include: {
              category: true,
            },
          },
        },
      },
    },
  });

  if (!survey) {
    return [];
  }

  // Extract unique categories
  const categoryMap = new Map();
  for (const question of survey.questions) {
    for (const qc of question.categories) {
      if (!categoryMap.has(qc.category.id)) {
        categoryMap.set(qc.category.id, {
          _id: qc.category.id,
          _type: 'category' as const,
          name: qc.category.name,
          colorCode: qc.category.colorCode || undefined,
          description: qc.category.description || undefined,
          sortOrder: qc.category.sortOrder,
          weight: parseFloat(qc.category.weight.toString()),
        });
      }
    }
  }

  return Array.from(categoryMap.values()).sort(
    (a, b) => a.sortOrder - b.sortOrder
  );
}
