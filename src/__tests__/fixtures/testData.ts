import type { User, Organization, SurveyCampaign } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * Test data fixtures and factories for generating test data
 */

export const createMockOrganization = (
  overrides?: Partial<Organization>
): Organization => ({
  id: uuidv4(),
  name: 'Test Bank',
  sizeRange: '$1B-$5B',
  locationCountry: 'USA',
  locationState: 'California',
  locationMetro: 'San Francisco',
  locationCity: 'San Francisco',
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockUser = (overrides?: Partial<User>): User => ({
  id: uuidv4(),
  email: `test-${Date.now()}@example.com`,
  name: 'Test User',
  passwordHash: null,
  role: 'ORG_ADMIN',
  organizationId: uuidv4(),
  isActive: true,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

export const createMockCampaign = (
  overrides?: Partial<SurveyCampaign>
): SurveyCampaign => ({
  id: uuidv4(),
  surveyId: 'test-survey-id',
  surveyTitle: 'Test Survey',
  organizationId: uuidv4(),
  status: 'ACTIVE',
  startDate: new Date(),
  endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
  createdById: null,
  deletedAt: null,
  deletedBy: null,
  accessCode: 'TESTCODE',
  maxResponses: null,
  allowBackNavigation: false,
  splashConfig: null,
  createdAt: new Date(),
  updatedAt: new Date(),
  ...overrides,
});

/**
 * Create multiple users with sequential emails
 */
export const createMockUsers = (
  count: number,
  baseOverrides?: Partial<User>
): User[] => {
  return Array.from({ length: count }, (_, i) =>
    createMockUser({
      ...baseOverrides,
      email: `test-user-${i}@example.com`,
      name: `Test User ${i + 1}`,
    })
  );
};

/**
 * Sample survey data for testing
 */
export const mockSurveyData = {
  _id: 'survey-test-1',
  _type: 'survey',
  title: 'Test Survey',
  slug: { current: 'test-survey' },
  surveyType: 'likert5' as const,
  estimatedMinutes: 10,
  isActive: true,
  sections: [
    {
      _id: 'section-1',
      _type: 'section',
      title: 'Goal Setting',
      sortOrder: 1,
      questions: [
        {
          _id: 'q1',
          _type: 'question',
          number: 1,
          text: 'The team has clear goals',
          isReversed: false,
          category: {
            _id: 'cat-communication',
            _type: 'category',
            name: 'Communication',
          },
        },
        {
          _id: 'q2',
          _type: 'question',
          number: 2,
          text: 'Goals are unclear',
          isReversed: true,
          category: {
            _id: 'cat-communication',
            _type: 'category',
            name: 'Communication',
          },
        },
      ],
    },
  ],
};
