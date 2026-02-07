import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  checkAnonymityThreshold,
  validateFilteredAnonymity,
  ANONYMITY_THRESHOLD,
  ANONYMOUS_SURVEY_TYPES,
} from '../anonymity';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    invitation: {
      count: vi.fn(),
    },
  },
}));

describe('Anonymity Protection', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('checkAnonymityThreshold', () => {
    it('should return true for non-anonymous survey types', async () => {
      const result = await checkAnonymityThreshold('campaign-1', 'likert5');
      expect(result).toBe(true);
    });

    it('should return true for undefined survey type', async () => {
      const result = await checkAnonymityThreshold('campaign-1');
      expect(result).toBe(true);
    });

    it('should return false when Survey 7 has fewer than 5 respondents', async () => {
      vi.mocked(prisma.invitation.count).mockResolvedValue(4);

      const result = await checkAnonymityThreshold('campaign-1', 'associate-180');
      expect(result).toBe(false);
      expect(prisma.invitation.count).toHaveBeenCalledWith({
        where: {
          campaignId: 'campaign-1',
          status: 'COMPLETED',
        },
      });
    });

    it('should return true when Survey 7 has exactly 5 respondents', async () => {
      vi.mocked(prisma.invitation.count).mockResolvedValue(5);

      const result = await checkAnonymityThreshold('campaign-1', 'associate-180');
      expect(result).toBe(true);
    });

    it('should return true when Survey 7 has more than 5 respondents', async () => {
      vi.mocked(prisma.invitation.count).mockResolvedValue(10);

      const result = await checkAnonymityThreshold('campaign-1', 'associate-180');
      expect(result).toBe(true);
    });

    it('should be case-insensitive for survey type', async () => {
      vi.mocked(prisma.invitation.count).mockResolvedValue(3);

      const result = await checkAnonymityThreshold('campaign-1', 'ASSOCIATE-180');
      expect(result).toBe(false);
    });
  });

  describe('validateFilteredAnonymity', () => {
    it('should return valid for non-anonymous surveys regardless of count', async () => {
      vi.mocked(prisma.invitation.count).mockResolvedValue(2);

      const result = await validateFilteredAnonymity(
        'campaign-1',
        'likert5',
        { division: 'Technology' }
      );

      expect(result.valid).toBe(true);
      expect(result.count).toBe(2);
    });

    it('should return valid when anonymous survey has >= 5 matching respondents', async () => {
      vi.mocked(prisma.invitation.count).mockResolvedValue(5);

      const result = await validateFilteredAnonymity(
        'campaign-1',
        'associate-180',
        { division: 'Technology' }
      );

      expect(result.valid).toBe(true);
      expect(result.count).toBe(5);
    });

    it('should return invalid when anonymous survey has < 5 matching respondents', async () => {
      vi.mocked(prisma.invitation.count).mockResolvedValue(3);

      const result = await validateFilteredAnonymity(
        'campaign-1',
        'associate-180',
        { division: 'Technology' }
      );

      expect(result.valid).toBe(false);
      expect(result.count).toBe(3);
    });

    it('should handle multiple filters', async () => {
      vi.mocked(prisma.invitation.count).mockResolvedValue(6);

      const result = await validateFilteredAnonymity(
        'campaign-1',
        'associate-180',
        { division: 'Technology', gender: 'FEMALE' }
      );

      expect(result.valid).toBe(true);
      expect(result.count).toBe(6);
    });
  });

  describe('ANONYMITY_THRESHOLD constant', () => {
    it('should be set to 5', () => {
      expect(ANONYMITY_THRESHOLD).toBe(5);
    });
  });

  describe('ANONYMOUS_SURVEY_TYPES constant', () => {
    it('should include expected survey types', () => {
      expect(ANONYMOUS_SURVEY_TYPES).toContain('associate-180');
      expect(ANONYMOUS_SURVEY_TYPES).toContain('survey-7');
    });

    it('should not include non-anonymous types', () => {
      expect(ANONYMOUS_SURVEY_TYPES).not.toContain('likert5');
      expect(ANONYMOUS_SURVEY_TYPES).not.toContain('demographics');
    });
  });
});
