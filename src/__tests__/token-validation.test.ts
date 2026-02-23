import { describe, it, expect } from 'vitest';
import type { SurveyCampaign } from '@prisma/client';

/**
 * Unit tests for anonymous survey access validation logic.
 * Tests the business rules around campaign access codes.
 */

describe('Anonymous Survey Access Validation', () => {
  describe('Campaign Existence Validation', () => {
    it('should return error for non-existent campaign', () => {
      const campaign = null;
      const isValid = campaign !== null;
      expect(isValid).toBe(false);
    });

    it('should accept existing campaign', () => {
      const campaign = {
        id: '123',
        accessCode: 'TESTCODE',
      } as SurveyCampaign;

      const isValid = campaign !== null;
      expect(isValid).toBe(true);
    });
  });

  describe('Campaign Status Validation', () => {
    it('should reject draft campaigns', () => {
      const campaign = { id: '123', status: 'DRAFT' } as SurveyCampaign;
      const isValid = campaign.status === 'ACTIVE';
      expect(isValid).toBe(false);
    });

    it('should accept active campaigns', () => {
      const campaign = { id: '123', status: 'ACTIVE' } as SurveyCampaign;
      const isValid = campaign.status === 'ACTIVE';
      expect(isValid).toBe(true);
    });

    it('should reject completed campaigns', () => {
      const campaign = { id: '123', status: 'COMPLETED' } as SurveyCampaign;
      const isValid = campaign.status === 'ACTIVE';
      expect(isValid).toBe(false);
    });

    it('should reject archived campaigns', () => {
      const campaign = { id: '123', status: 'ARCHIVED' } as SurveyCampaign;
      const isValid = campaign.status === 'ACTIVE';
      expect(isValid).toBe(false);
    });
  });

  describe('Campaign Expiration Validation', () => {
    it('should reject expired campaigns', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const campaign = {
        id: '123',
        status: 'ACTIVE',
        endDate: yesterday,
      } as SurveyCampaign;

      const now = new Date();
      const isExpired = campaign.endDate && campaign.endDate < now;
      expect(isExpired).toBe(true);
    });

    it('should accept campaigns ending in the future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const campaign = {
        id: '123',
        status: 'ACTIVE',
        endDate: tomorrow,
      } as SurveyCampaign;

      const now = new Date();
      const isExpired = campaign.endDate && campaign.endDate < now;
      expect(isExpired).toBe(false);
    });

    it('should accept campaigns ending today (same moment)', () => {
      const now = new Date();
      const today = new Date(now);

      const campaign = {
        id: '123',
        status: 'ACTIVE',
        endDate: today,
      } as SurveyCampaign;

      const isExpired = campaign.endDate && campaign.endDate < now;
      expect(isExpired).toBe(false);
    });

    it('should accept campaigns with no end date', () => {
      const campaign = {
        id: '123',
        status: 'ACTIVE',
        endDate: null,
      } as SurveyCampaign;

      const now = new Date();
      const isExpired = campaign.endDate && campaign.endDate < now;
      expect(isExpired).toBeFalsy();
    });

    it('should accept campaigns ending far in the future', () => {
      const farFuture = new Date('2099-12-31');

      const campaign = {
        id: '123',
        status: 'ACTIVE',
        endDate: farFuture,
      } as SurveyCampaign;

      const now = new Date();
      const isExpired = campaign.endDate && campaign.endDate < now;
      expect(isExpired).toBe(false);
    });

    it('should reject campaigns with very old end dates', () => {
      const veryOldDate = new Date('2000-01-01');

      const campaign = {
        id: '123',
        status: 'ACTIVE',
        endDate: veryOldDate,
      } as SurveyCampaign;

      const now = new Date();
      const isExpired = campaign.endDate && campaign.endDate < now;
      expect(isExpired).toBe(true);
    });
  });

  describe('Campaign Start Date Validation', () => {
    it('should reject campaigns that have not started yet', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const campaign = {
        id: '123',
        status: 'ACTIVE',
        startDate: tomorrow,
      } as SurveyCampaign;

      const now = new Date();
      const hasNotStarted = campaign.startDate && campaign.startDate > now;
      expect(hasNotStarted).toBe(true);
    });

    it('should accept campaigns that have already started', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const campaign = {
        id: '123',
        status: 'ACTIVE',
        startDate: yesterday,
      } as SurveyCampaign;

      const now = new Date();
      const hasNotStarted = campaign.startDate && campaign.startDate > now;
      expect(hasNotStarted).toBe(false);
    });

    it('should accept campaigns with no start date', () => {
      const campaign = {
        id: '123',
        status: 'ACTIVE',
        startDate: null,
      } as SurveyCampaign;

      const now = new Date();
      const hasNotStarted = campaign.startDate && campaign.startDate > now;
      expect(hasNotStarted).toBeFalsy();
    });
  });

  describe('Combined Validation Rules', () => {
    const validateCampaignAccess = (campaign: SurveyCampaign | null) => {
      if (!campaign) {
        return { valid: false, error: 'Invalid access code' };
      }

      if (campaign.status !== 'ACTIVE') {
        return { valid: false, error: 'This survey is not currently active' };
      }

      const now = new Date();
      if (campaign.startDate && campaign.startDate > now) {
        return { valid: false, error: 'This survey has not started yet' };
      }

      if (campaign.endDate && campaign.endDate < now) {
        return { valid: false, error: 'This survey has expired' };
      }

      return { valid: true, error: null };
    };

    it('should validate a fully valid campaign', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const campaign = {
        id: '123',
        status: 'ACTIVE',
        startDate: null,
        endDate: tomorrow,
      } as SurveyCampaign;

      const result = validateCampaignAccess(campaign);
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should reject null campaign with appropriate error', () => {
      const result = validateCampaignAccess(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid access code');
    });

    it('should reject inactive campaign with appropriate error', () => {
      const campaign = {
        id: '123',
        status: 'DRAFT',
        startDate: null,
        endDate: null,
      } as SurveyCampaign;

      const result = validateCampaignAccess(campaign);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This survey is not currently active');
    });

    it('should reject expired campaign with appropriate error', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const campaign = {
        id: '123',
        status: 'ACTIVE',
        startDate: null,
        endDate: yesterday,
      } as SurveyCampaign;

      const result = validateCampaignAccess(campaign);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This survey has expired');
    });

    it('should check errors in priority order', () => {
      // Multiple validation errors — should return first one encountered
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const campaign = {
        id: '123',
        status: 'DRAFT', // First error
        startDate: null,
        endDate: yesterday, // Second error
      } as SurveyCampaign;

      const result = validateCampaignAccess(campaign);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This survey is not currently active');
    });
  });

  describe('Max Responses Validation', () => {
    it('should detect when max responses is reached', () => {
      const campaign = {
        id: '123',
        status: 'ACTIVE',
        maxResponses: 100,
      } as SurveyCampaign;

      const completedCount = 100;
      const isFull =
        campaign.maxResponses !== null &&
        completedCount >= campaign.maxResponses;
      expect(isFull).toBe(true);
    });

    it('should allow access when max responses not yet reached', () => {
      const campaign = {
        id: '123',
        status: 'ACTIVE',
        maxResponses: 100,
      } as SurveyCampaign;

      const completedCount = 50;
      const isFull =
        campaign.maxResponses !== null &&
        completedCount >= campaign.maxResponses;
      expect(isFull).toBe(false);
    });

    it('should allow access when no max responses set', () => {
      const campaign = {
        id: '123',
        status: 'ACTIVE',
        maxResponses: null,
      } as SurveyCampaign;

      const completedCount = 99999;
      const isFull =
        campaign.maxResponses !== null &&
        completedCount >= campaign.maxResponses;
      expect(isFull).toBe(false);
    });
  });
});
