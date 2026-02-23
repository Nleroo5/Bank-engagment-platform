import { prisma } from '@/lib/prisma';

/**
 * Minimum number of respondents required for Survey 7 (Associate 180) reports
 */
export const ANONYMITY_THRESHOLD = 5;

/**
 * Survey types that require anonymity protection
 */
export const ANONYMOUS_SURVEY_TYPES = ['associate_180', 'survey-7'];

/**
 * Demographic filter option
 */
export interface DemographicFilter {
  field: string;
  label: string;
  value: string;
  count: number;
}

/**
 * Checks if a campaign has enough respondents to meet the anonymity threshold.
 *
 * CRITICAL: For Survey 7 (Associate 180), individual responses are NEVER visible.
 * Reports require a minimum of 5 respondents before generating any aggregated data.
 *
 * @param campaignId - The ID of the campaign to check
 * @param surveyType - The type of survey (e.g., 'associate-180', 'survey-7')
 * @returns True if the campaign meets the anonymity threshold (or doesn't require it)
 */
export async function checkAnonymityThreshold(
  campaignId: string,
  surveyType?: string
): Promise<boolean> {
  // Only enforce threshold for anonymous survey types
  const requiresAnonymity = surveyType
    ? ANONYMOUS_SURVEY_TYPES.includes(surveyType.toLowerCase())
    : false;

  if (!requiresAnonymity) {
    return true; // No anonymity requirements, allow access
  }

  // Count completed anonymous responses
  const completedCount = await prisma.anonymousResponse.count({
    where: {
      campaignId,
      completedAt: { not: null },
    },
  });

  return completedCount >= ANONYMITY_THRESHOLD;
}

/**
 * Gets demographic filter options for a campaign.
 *
 * Parses demographics from the JSON column of anonymous responses.
 * Only returns filter options that maintain the anonymity threshold (>= 5 respondents).
 *
 * @param campaignId - The ID of the campaign
 * @returns Array of safe demographic filter options
 */
export async function getFilterableOptions(
  campaignId: string
): Promise<{
  divisions: DemographicFilter[];
  jobRoles: DemographicFilter[];
  genders: DemographicFilter[];
  timeAtBank: DemographicFilter[];
}> {
  return getFilterableOptionsAnonymous(campaignId);
}

/**
 * Validates that applying a set of filters maintains the anonymity threshold.
 *
 * @param campaignId - The ID of the campaign
 * @param _surveyType - The type of survey (unused — all campaigns are anonymous)
 * @param filters - Filters to apply (e.g., { division: 'Technology', gender: 'FEMALE' })
 * @returns True if the filtered pool meets the threshold
 */
export async function validateFilteredAnonymity(
  campaignId: string,
  _surveyType: string,
  filters: Record<string, string>
): Promise<{ valid: boolean; count: number }> {
  return validateFilteredAnonymityAnonymous(campaignId, filters);
}

/**
 * Gets demographic filter options for anonymous campaigns.
 *
 * Parses demographics from JSON instead of User table.
 * Only returns filter options that maintain the anonymity threshold (>= 5 respondents).
 *
 * @param campaignId - The ID of the anonymous campaign
 * @returns Array of safe demographic filter options
 */
export async function getFilterableOptionsAnonymous(
  campaignId: string
): Promise<{
  divisions: DemographicFilter[];
  jobRoles: DemographicFilter[];
  genders: DemographicFilter[];
  timeAtBank: DemographicFilter[];
}> {
  // Get all completed anonymous responses with demographics
  const responses = await prisma.anonymousResponse.findMany({
    where: {
      campaignId,
      completedAt: { not: null },
    },
    select: {
      demographics: true,
    },
  });

  // If below threshold, return empty filters
  if (responses.length < ANONYMITY_THRESHOLD) {
    return {
      divisions: [],
      jobRoles: [],
      genders: [],
      timeAtBank: [],
    };
  }

  // Helper function to count respondents for each value of a field
  const countByField = (field: string) => {
    const counts = new Map<string, number>();

    for (const response of responses) {
      const demographics =
        (response.demographics as Record<string, unknown>) || {};
      const value = demographics[field];

      if (value && typeof value === 'string') {
        counts.set(value, (counts.get(value) || 0) + 1);
      }
    }

    return counts;
  };

  // Helper function to convert counts to filter options
  const toFilterOptions = (
    field: string,
    label: string,
    counts: Map<string, number>
  ): DemographicFilter[] => {
    const options: DemographicFilter[] = [];

    for (const [value, count] of counts) {
      // Only include options that maintain the threshold
      if (count >= ANONYMITY_THRESHOLD) {
        options.push({
          field,
          label: `${label}: ${value}`,
          value,
          count,
        });
      }
    }

    return options.sort((a, b) => a.value.localeCompare(b.value));
  };

  // Get counts for each demographic field
  const divisionCounts = countByField('division');
  const jobRoleCounts = countByField('jobRole');
  const genderCounts = countByField('gender');
  const timeAtBankCounts = countByField('timeAtBank');

  return {
    divisions: toFilterOptions('division', 'Division', divisionCounts),
    jobRoles: toFilterOptions('jobRole', 'Job Role', jobRoleCounts),
    genders: toFilterOptions('gender', 'Gender', genderCounts),
    timeAtBank: toFilterOptions('timeAtBank', 'Time at Bank', timeAtBankCounts),
  };
}

/**
 * Validates that applying filters to anonymous responses maintains the anonymity threshold.
 *
 * @param campaignId - The ID of the anonymous campaign
 * @param filters - Filters to apply (e.g., { division: 'Technology', gender: 'FEMALE' })
 * @returns Object with valid flag and count
 */
export async function validateFilteredAnonymityAnonymous(
  campaignId: string,
  filters: Record<string, string>
): Promise<{ valid: boolean; count: number }> {
  // Get all completed anonymous responses
  const responses = await prisma.anonymousResponse.findMany({
    where: {
      campaignId,
      completedAt: { not: null },
    },
    select: {
      demographics: true,
    },
  });

  // Filter responses based on demographics JSON
  const filteredResponses = responses.filter((response) => {
    const demographics =
      (response.demographics as Record<string, unknown>) || {};

    return Object.entries(filters).every(([key, value]) => {
      return demographics[key] === value;
    });
  });

  const count = filteredResponses.length;

  return {
    valid: count >= ANONYMITY_THRESHOLD,
    count,
  };
}
