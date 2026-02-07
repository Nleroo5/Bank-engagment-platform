import { prisma } from '@/lib/prisma';

/**
 * Minimum number of respondents required for Survey 7 (Associate 180) reports
 */
export const ANONYMITY_THRESHOLD = 5;

/**
 * Survey types that require anonymity protection
 */
export const ANONYMOUS_SURVEY_TYPES = ['associate-180', 'survey-7'];

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

  // Count completed invitations
  const completedCount = await prisma.invitation.count({
    where: {
      campaignId,
      status: 'COMPLETED',
    },
  });

  return completedCount >= ANONYMITY_THRESHOLD;
}

/**
 * Gets demographic filter options that maintain the anonymity threshold.
 *
 * CRITICAL: When filtering demographics, ensure the resulting pool never drops
 * below 5 respondents. Only return filter options that keep the pool >= 5.
 *
 * @param campaignId - The ID of the campaign
 * @param surveyType - The type of survey
 * @param currentFilters - Currently applied filters (to check combined effect)
 * @returns Array of safe demographic filter options
 */
export async function getFilterableOptions(
  campaignId: string,
  surveyType?: string,
  _currentFilters?: Record<string, string>
): Promise<{
  divisions: DemographicFilter[];
  jobRoles: DemographicFilter[];
  genders: DemographicFilter[];
  timeAtBank: DemographicFilter[];
}> {
  // Only enforce restrictions for anonymous survey types
  const requiresAnonymity = surveyType
    ? ANONYMOUS_SURVEY_TYPES.includes(surveyType.toLowerCase())
    : false;

  // Get all completed invitations with user data
  const invitations = await prisma.invitation.findMany({
    where: {
      campaignId,
      status: 'COMPLETED',
    },
    include: {
      user: true,
    },
  });

  // If not anonymous or below threshold, return empty filters
  if (requiresAnonymity && invitations.length < ANONYMITY_THRESHOLD) {
    return {
      divisions: [],
      jobRoles: [],
      genders: [],
      timeAtBank: [],
    };
  }

  // Helper function to count respondents for each value of a field
  const countByField = (field: keyof typeof invitations[0]['user']) => {
    const counts = new Map<string, number>();

    for (const invitation of invitations) {
      const value = invitation.user[field];
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
      // Only include options that maintain the threshold (or no threshold required)
      if (!requiresAnonymity || count >= ANONYMITY_THRESHOLD) {
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
 * Validates that applying a set of filters maintains the anonymity threshold.
 *
 * @param campaignId - The ID of the campaign
 * @param surveyType - The type of survey
 * @param filters - Filters to apply (e.g., { division: 'Technology', gender: 'FEMALE' })
 * @returns True if the filtered pool meets the threshold
 */
export async function validateFilteredAnonymity(
  campaignId: string,
  surveyType: string,
  filters: Record<string, string>
): Promise<{ valid: boolean; count: number }> {
  // Only enforce threshold for anonymous survey types
  const requiresAnonymity = ANONYMOUS_SURVEY_TYPES.includes(surveyType.toLowerCase());

  // Build where clause from filters
  const userFilters: Record<string, string> = {};
  for (const [key, value] of Object.entries(filters)) {
    if (value) {
      userFilters[key] = value;
    }
  }

  // Count invitations matching the filters
  const count = await prisma.invitation.count({
    where: {
      campaignId,
      status: 'COMPLETED',
      user: Object.keys(userFilters).length > 0 ? userFilters : undefined,
    },
  });

  return {
    valid: !requiresAnonymity || count >= ANONYMITY_THRESHOLD,
    count,
  };
}
