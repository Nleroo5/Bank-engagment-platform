import { sanityFetch } from './client';
import type { Survey, SurveyListItem, Category } from '@/types/survey';

// GROQ query fragments
const SCALE_FRAGMENT = `
  scale->{
    _id,
    _type,
    name,
    scaleType,
    min,
    max,
    labels
  }
`;

const CATEGORY_FRAGMENT = `
  category->{
    _id,
    _type,
    name,
    colorCode,
    description,
    sortOrder
  }
`;

const QUESTION_FRAGMENT = `
  _id,
  _type,
  number,
  text,
  ${CATEGORY_FRAGMENT},
  isReversed,
  anchorText
`;

const SECTION_FRAGMENT = `
  _id,
  _type,
  title,
  sortOrder,
  directions,
  "questions": questions[]->{
    ${QUESTION_FRAGMENT}
  }
`;

// Fetch a full survey by slug with all nested content
export async function getSurveyBySlug(slug: string): Promise<Survey | null> {
  const query = `
    *[_type == "survey" && slug.current == $slug][0]{
      _id,
      _type,
      title,
      slug,
      surveyNumber,
      surveyType,
      instructions,
      "sections": sections[]->{
        ${SECTION_FRAGMENT}
      },
      ${SCALE_FRAGMENT},
      respondentNameField,
      welcomeMessage,
      completionMessage,
      estimatedMinutes,
      isActive
    }
  `;

  return sanityFetch<Survey | null>({
    query,
    params: { slug },
    tags: [`survey:${slug}`],
  });
}

// Fetch all surveys (list view) - includes both active and inactive
export async function getAllSurveys(): Promise<SurveyListItem[]> {
  const query = `
    *[_type == "survey"] | order(surveyNumber asc, title asc) {
      _id,
      title,
      slug,
      surveyNumber,
      surveyType,
      isActive,
      estimatedMinutes
    }
  `;

  return sanityFetch<SurveyListItem[]>({
    query,
    tags: ['surveys'],
  });
}

// Fetch all categories used in a specific survey
export async function getCategoriesForSurvey(
  surveyId: string
): Promise<Category[]> {
  const query = `
    *[_type == "survey" && _id == $surveyId][0]{
      "categories": sections[]->questions[]->category->{
        _id,
        _type,
        name,
        colorCode,
        description,
        sortOrder
      }
    }.categories
  `;

  const categories = await sanityFetch<Category[]>({
    query,
    params: { surveyId },
    tags: [`survey:${surveyId}`, 'categories'],
  });

  // Remove duplicates based on _id
  const uniqueCategories = Array.from(
    new Map(categories.map((cat) => [cat._id, cat])).values()
  );

  // Sort by sortOrder if available
  return uniqueCategories.sort((a, b) => {
    if (a.sortOrder !== undefined && b.sortOrder !== undefined) {
      return a.sortOrder - b.sortOrder;
    }
    return a.name.localeCompare(b.name);
  });
}

// Fetch survey by ID (useful for admin views)
export async function getSurveyById(surveyId: string): Promise<Survey | null> {
  const query = `
    *[_type == "survey" && _id == $surveyId][0]{
      _id,
      _type,
      title,
      slug,
      surveyNumber,
      surveyType,
      instructions,
      "sections": sections[]->{
        ${SECTION_FRAGMENT}
      },
      ${SCALE_FRAGMENT},
      respondentNameField,
      welcomeMessage,
      completionMessage,
      estimatedMinutes,
      isActive
    }
  `;

  return sanityFetch<Survey | null>({
    query,
    params: { surveyId },
    tags: [`survey:${surveyId}`],
  });
}

// Fetch all categories (for admin/reporting)
export async function getAllCategories(): Promise<Category[]> {
  const query = `
    *[_type == "category"] | order(sortOrder asc, name asc) {
      _id,
      _type,
      name,
      colorCode,
      description,
      sortOrder
    }
  `;

  return sanityFetch<Category[]>({
    query,
    tags: ['categories'],
  });
}
