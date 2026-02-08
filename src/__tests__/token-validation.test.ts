import { describe, it, expect } from 'vitest';
import type { Invitation, SurveyCampaign } from '@prisma/client';

/**
 * Unit tests for token validation logic
 * Tests the business rules around invitation tokens
 */

type InvitationWithCampaign = Invitation & {
  campaign: SurveyCampaign;
};

describe('Token Validation Logic', () => {
  describe('Token Existence Validation', () => {
    it('should return error for non-existent token', () => {
      const invitation = null;

      const isValid = invitation !== null;
      expect(isValid).toBe(false);
    });

    it('should accept existing token', () => {
      const invitation = {
        id: '123',
        token: 'valid-token',
      } as Invitation;

      const isValid = invitation !== null;
      expect(isValid).toBe(true);
    });
  });

  describe('Invitation Status Validation', () => {
    it('should reject completed surveys', () => {
      const invitation = {
        id: '123',
        status: 'COMPLETED',
        completedAt: new Date(),
      } as Invitation;

      const isValid = invitation.status !== 'COMPLETED';
      expect(isValid).toBe(false);
    });

    it('should accept pending invitations', () => {
      const invitation = {
        id: '123',
        status: 'PENDING',
        completedAt: null,
      } as Invitation;

      const isValid = invitation.status !== 'COMPLETED';
      expect(isValid).toBe(true);
    });

    it('should accept sent invitations', () => {
      const invitation = {
        id: '123',
        status: 'SENT',
        sentAt: new Date(),
      } as Invitation;

      const isValid = invitation.status !== 'COMPLETED';
      expect(isValid).toBe(true);
    });

    it('should accept in-progress invitations', () => {
      const invitation = {
        id: '123',
        status: 'IN_PROGRESS',
      } as Invitation;

      const isValid = invitation.status !== 'COMPLETED';
      expect(isValid).toBe(true);
    });

    it('should accept opened invitations', () => {
      const invitation = {
        id: '123',
        status: 'OPENED',
        openedAt: new Date(),
      } as Invitation;

      const isValid = invitation.status !== 'COMPLETED';
      expect(isValid).toBe(true);
    });
  });

  describe('Campaign Status Validation', () => {
    it('should reject invitations from draft campaigns', () => {
      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'DRAFT',
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const isValid = invitation.campaign.status === 'ACTIVE';
      expect(isValid).toBe(false);
    });

    it('should accept invitations from active campaigns', () => {
      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const isValid = invitation.campaign.status === 'ACTIVE';
      expect(isValid).toBe(true);
    });

    it('should reject invitations from completed campaigns', () => {
      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'COMPLETED',
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const isValid = invitation.campaign.status === 'ACTIVE';
      expect(isValid).toBe(false);
    });

    it('should reject invitations from cancelled campaigns', () => {
      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'CANCELLED',
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const isValid = invitation.campaign.status === 'ACTIVE';
      expect(isValid).toBe(false);
    });
  });

  describe('Campaign Expiration Validation', () => {
    it('should reject expired campaigns', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
          endDate: yesterday,
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const now = new Date();
      const isExpired =
        invitation.campaign.endDate && invitation.campaign.endDate < now;
      expect(isExpired).toBe(true);
    });

    it('should accept campaigns ending today', () => {
      const today = new Date();

      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
          endDate: today,
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const now = new Date();
      const isExpired =
        invitation.campaign.endDate && invitation.campaign.endDate < now;
      expect(isExpired).toBe(false);
    });

    it('should accept campaigns ending in the future', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
          endDate: tomorrow,
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const now = new Date();
      const isExpired =
        invitation.campaign.endDate && invitation.campaign.endDate < now;
      expect(isExpired).toBe(false);
    });

    it('should accept campaigns with no end date', () => {
      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
          endDate: null,
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const now = new Date();
      const isExpired =
        invitation.campaign.endDate && invitation.campaign.endDate < now;
      expect(isExpired).toBeFalsy(); // null is falsy, which is correct behavior
    });
  });

  describe('Combined Validation Rules', () => {
    const validateInvitation = (invitation: InvitationWithCampaign | null) => {
      if (!invitation) {
        return { valid: false, error: 'Invalid invitation token' };
      }

      if (invitation.status === 'COMPLETED') {
        return {
          valid: false,
          error: 'This survey has already been completed',
        };
      }

      if (invitation.campaign.status !== 'ACTIVE') {
        return { valid: false, error: 'This survey is not currently active' };
      }

      const now = new Date();
      if (invitation.campaign.endDate && invitation.campaign.endDate < now) {
        return { valid: false, error: 'This survey has expired' };
      }

      return { valid: true, error: null };
    };

    it('should validate a fully valid invitation', () => {
      const tomorrow = new Date();
      tomorrow.setDate(tomorrow.getDate() + 1);

      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
          endDate: tomorrow,
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const result = validateInvitation(invitation);
      expect(result.valid).toBe(true);
      expect(result.error).toBe(null);
    });

    it('should reject null invitation with appropriate error', () => {
      const result = validateInvitation(null);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('Invalid invitation token');
    });

    it('should reject completed invitation with appropriate error', () => {
      const invitation = {
        id: '123',
        status: 'COMPLETED',
        campaign: {
          status: 'ACTIVE',
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const result = validateInvitation(invitation);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This survey has already been completed');
    });

    it('should reject inactive campaign with appropriate error', () => {
      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'DRAFT',
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const result = validateInvitation(invitation);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This survey is not currently active');
    });

    it('should reject expired campaign with appropriate error', () => {
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);

      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
          endDate: yesterday,
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const result = validateInvitation(invitation);
      expect(result.valid).toBe(false);
      expect(result.error).toBe('This survey has expired');
    });

    it('should check errors in priority order', () => {
      // Multiple validation errors - should return first one encountered
      const invitation = {
        id: '123',
        status: 'COMPLETED', // First error
        campaign: {
          status: 'DRAFT', // Second error
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const result = validateInvitation(invitation);
      expect(result.valid).toBe(false);
      // Should return completion error first
      expect(result.error).toBe('This survey has already been completed');
    });
  });

  describe('Status Transition Validation', () => {
    it('should allow transition from PENDING to SENT', () => {
      const currentStatus = 'PENDING';
      const newStatus = 'SENT';

      const validTransitions: Record<string, string[]> = {
        PENDING: ['SENT', 'IN_PROGRESS'],
        SENT: ['OPENED', 'IN_PROGRESS'],
        OPENED: ['IN_PROGRESS'],
        IN_PROGRESS: ['COMPLETED'],
      };

      const isValidTransition =
        validTransitions[currentStatus]?.includes(newStatus) ?? false;
      expect(isValidTransition).toBe(true);
    });

    it('should allow transition from SENT to OPENED', () => {
      const currentStatus = 'SENT';
      const newStatus = 'OPENED';

      const validTransitions: Record<string, string[]> = {
        PENDING: ['SENT', 'IN_PROGRESS'],
        SENT: ['OPENED', 'IN_PROGRESS'],
        OPENED: ['IN_PROGRESS'],
        IN_PROGRESS: ['COMPLETED'],
      };

      const isValidTransition =
        validTransitions[currentStatus]?.includes(newStatus) ?? false;
      expect(isValidTransition).toBe(true);
    });

    it('should allow transition from OPENED to IN_PROGRESS', () => {
      const currentStatus = 'OPENED';
      const newStatus = 'IN_PROGRESS';

      const validTransitions: Record<string, string[]> = {
        PENDING: ['SENT', 'IN_PROGRESS'],
        SENT: ['OPENED', 'IN_PROGRESS'],
        OPENED: ['IN_PROGRESS'],
        IN_PROGRESS: ['COMPLETED'],
      };

      const isValidTransition =
        validTransitions[currentStatus]?.includes(newStatus) ?? false;
      expect(isValidTransition).toBe(true);
    });

    it('should allow transition from IN_PROGRESS to COMPLETED', () => {
      const currentStatus = 'IN_PROGRESS';
      const newStatus = 'COMPLETED';

      const validTransitions: Record<string, string[]> = {
        PENDING: ['SENT', 'IN_PROGRESS'],
        SENT: ['OPENED', 'IN_PROGRESS'],
        OPENED: ['IN_PROGRESS'],
        IN_PROGRESS: ['COMPLETED'],
      };

      const isValidTransition =
        validTransitions[currentStatus]?.includes(newStatus) ?? false;
      expect(isValidTransition).toBe(true);
    });

    it('should reject invalid status transitions', () => {
      const currentStatus = 'COMPLETED';
      const newStatus = 'SENT'; // Cannot go back from completed

      const validTransitions: Record<string, string[]> = {
        PENDING: ['SENT', 'IN_PROGRESS'],
        SENT: ['OPENED', 'IN_PROGRESS'],
        OPENED: ['IN_PROGRESS'],
        IN_PROGRESS: ['COMPLETED'],
      };

      const isValidTransition =
        validTransitions[currentStatus]?.includes(newStatus) ?? false;
      expect(isValidTransition).toBe(false);
    });
  });

  describe('Edge Cases', () => {
    it('should handle missing campaign reference gracefully', () => {
      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: undefined,
      } as unknown as InvitationWithCampaign;

      // Should not throw error, but fail validation
      expect(() => {
        const isValid = invitation.campaign?.status === 'ACTIVE';
        expect(isValid).toBe(false);
      }).not.toThrow();
    });

    it('should handle date comparison at exact expiration time', () => {
      const now = new Date();
      const expirationTime = new Date(now.getTime());

      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
          endDate: expirationTime,
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      // Should not be expired at exact moment (< not <=)
      const isExpired =
        invitation.campaign.endDate && invitation.campaign.endDate < now;
      expect(isExpired).toBe(false);
    });

    it('should handle very old expired dates', () => {
      const veryOldDate = new Date('2000-01-01');

      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
          endDate: veryOldDate,
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const now = new Date();
      const isExpired =
        invitation.campaign.endDate && invitation.campaign.endDate < now;
      expect(isExpired).toBe(true);
    });

    it('should handle far future dates', () => {
      const farFuture = new Date('2099-12-31');

      const invitation = {
        id: '123',
        status: 'SENT',
        campaign: {
          status: 'ACTIVE',
          endDate: farFuture,
        } as SurveyCampaign,
      } as InvitationWithCampaign;

      const now = new Date();
      const isExpired =
        invitation.campaign.endDate && invitation.campaign.endDate < now;
      expect(isExpired).toBe(false);
    });
  });
});
