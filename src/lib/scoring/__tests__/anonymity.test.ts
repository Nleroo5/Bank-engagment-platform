import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  checkAnonymityThreshold,
  ANONYMITY_THRESHOLD,
  ANONYMOUS_SURVEY_TYPES,
} from '../anonymity';

// Mock Prisma
vi.mock('@/lib/prisma', () => ({
  prisma: {
    anonymousResponse: {
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
      vi.mocked(prisma.anonymousResponse.count).mockResolvedValue(4);

      const result = await checkAnonymityThreshold(
        'campaign-1',
        'associate_180'
      );
      expect(result).toBe(false);
      expect(prisma.anonymousResponse.count).toHaveBeenCalledWith({
        where: {
          campaignId: 'campaign-1',
          completedAt: { not: null },
        },
      });
    });

    it('should return true when Survey 7 has exactly 5 respondents', async () => {
      vi.mocked(prisma.anonymousResponse.count).mockResolvedValue(5);

      const result = await checkAnonymityThreshold(
        'campaign-1',
        'associate_180'
      );
      expect(result).toBe(true);
    });

    it('should return true when Survey 7 has more than 5 respondents', async () => {
      vi.mocked(prisma.anonymousResponse.count).mockResolvedValue(10);

      const result = await checkAnonymityThreshold(
        'campaign-1',
        'associate_180'
      );
      expect(result).toBe(true);
    });

    it('should be case-insensitive for survey type', async () => {
      vi.mocked(prisma.anonymousResponse.count).mockResolvedValue(3);

      const result = await checkAnonymityThreshold(
        'campaign-1',
        'ASSOCIATE_180'
      );
      expect(result).toBe(false);
    });
  });

  describe('ANONYMITY_THRESHOLD constant', () => {
    it('should be set to 5', () => {
      expect(ANONYMITY_THRESHOLD).toBe(5);
    });
  });

  describe('ANONYMOUS_SURVEY_TYPES constant', () => {
    it('should include expected survey types', () => {
      expect(ANONYMOUS_SURVEY_TYPES).toContain('associate_180');
      expect(ANONYMOUS_SURVEY_TYPES).toContain('survey-7');
    });

    it('should not include non-anonymous types', () => {
      expect(ANONYMOUS_SURVEY_TYPES).not.toContain('likert5');
      expect(ANONYMOUS_SURVEY_TYPES).not.toContain('demographics');
    });
  });
});
