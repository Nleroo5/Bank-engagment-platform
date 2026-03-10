import { describe, it, expect, beforeEach, vi } from 'vitest';
import { prisma } from '@/lib/prisma';
import {
  checkAnonymityThreshold,
  ANONYMITY_THRESHOLD,
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
    it('should return false when campaign has fewer than 5 respondents', async () => {
      vi.mocked(prisma.anonymousResponse.count).mockResolvedValue(4);

      const result = await checkAnonymityThreshold('campaign-1', 'likert5');
      expect(result).toBe(false);
      expect(prisma.anonymousResponse.count).toHaveBeenCalledWith({
        where: {
          campaignId: 'campaign-1',
          completedAt: { not: null },
        },
      });
    });

    it('should return true when campaign has exactly 5 respondents', async () => {
      vi.mocked(prisma.anonymousResponse.count).mockResolvedValue(5);

      const result = await checkAnonymityThreshold('campaign-1', 'likert3');
      expect(result).toBe(true);
    });

    it('should return true when campaign has more than 5 respondents', async () => {
      vi.mocked(prisma.anonymousResponse.count).mockResolvedValue(10);

      const result = await checkAnonymityThreshold('campaign-1', 'custom');
      expect(result).toBe(true);
    });

    it('should enforce threshold even without survey type', async () => {
      vi.mocked(prisma.anonymousResponse.count).mockResolvedValue(3);

      const result = await checkAnonymityThreshold('campaign-1');
      expect(result).toBe(false);
    });
  });

  describe('ANONYMITY_THRESHOLD constant', () => {
    it('should be set to 5', () => {
      expect(ANONYMITY_THRESHOLD).toBe(5);
    });
  });
});
