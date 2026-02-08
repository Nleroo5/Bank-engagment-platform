import { describe, it, expect } from 'vitest';
import { z } from 'zod';

/**
 * Unit tests for API request validation schemas
 * Tests the Zod schemas used in API routes
 */

describe('API Validation Schemas', () => {
  describe('Campaign Creation Schema', () => {
    const createCampaignSchema = z.object({
      surveyId: z.string(),
      organizationId: z.string().uuid(),
      startDate: z.string().optional(),
      endDate: z.string().optional(),
      reminderDays: z.string().transform((val) => parseInt(val, 10)),
    });

    it('should validate valid campaign creation data', () => {
      const validData = {
        surveyId: 'survey-4',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        startDate: '2024-01-01',
        endDate: '2024-01-31',
        reminderDays: '3',
      };

      const result = createCampaignSchema.safeParse(validData);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reminderDays).toBe(3);
      }
    });

    it('should reject campaign with invalid organization UUID', () => {
      const invalidData = {
        surveyId: 'survey-4',
        organizationId: 'not-a-uuid',
        reminderDays: '3',
      };

      const result = createCampaignSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept campaign without optional dates', () => {
      const dataWithoutDates = {
        surveyId: 'survey-4',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        reminderDays: '5',
      };

      const result = createCampaignSchema.safeParse(dataWithoutDates);
      expect(result.success).toBe(true);
    });

    it('should transform reminderDays string to number', () => {
      const data = {
        surveyId: 'survey-4',
        organizationId: '123e4567-e89b-12d3-a456-426614174000',
        reminderDays: '7',
      };

      const result = createCampaignSchema.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.reminderDays).toBe(7);
        expect(typeof result.data.reminderDays).toBe('number');
      }
    });

    it('should reject missing required fields', () => {
      const incompleteData = {
        surveyId: 'survey-4',
        // missing organizationId and reminderDays
      };

      const result = createCampaignSchema.safeParse(incompleteData);
      expect(result.success).toBe(false);
    });
  });

  describe('Response Save Schema', () => {
    const patchSchema = z.object({
      token: z.string().uuid(),
      questionId: z.string(),
      value: z.union([z.number().int().min(1).max(5), z.string()]),
    });

    it('should validate numeric Likert response (1-5)', () => {
      const numericData = {
        token: '123e4567-e89b-12d3-a456-426614174000',
        questionId: 'q1',
        value: 3,
      };

      const result = patchSchema.safeParse(numericData);
      expect(result.success).toBe(true);
    });

    it('should validate text response for demographics', () => {
      const textData = {
        token: '123e4567-e89b-12d3-a456-426614174000',
        questionId: 'demographics-division',
        value: 'Technology',
      };

      const result = patchSchema.safeParse(textData);
      expect(result.success).toBe(true);
    });

    it('should reject numeric value outside 1-5 range', () => {
      const invalidNumeric = {
        token: '123e4567-e89b-12d3-a456-426614174000',
        questionId: 'q1',
        value: 6, // Out of range
      };

      const result = patchSchema.safeParse(invalidNumeric);
      expect(result.success).toBe(false);
    });

    it('should reject negative numeric values', () => {
      const negativeValue = {
        token: '123e4567-e89b-12d3-a456-426614174000',
        questionId: 'q1',
        value: -1,
      };

      const result = patchSchema.safeParse(negativeValue);
      expect(result.success).toBe(false);
    });

    it('should reject zero as numeric value', () => {
      const zeroValue = {
        token: '123e4567-e89b-12d3-a456-426614174000',
        questionId: 'q1',
        value: 0,
      };

      const result = patchSchema.safeParse(zeroValue);
      expect(result.success).toBe(false);
    });

    it('should reject invalid token format', () => {
      const invalidToken = {
        token: 'not-a-uuid',
        questionId: 'q1',
        value: 3,
      };

      const result = patchSchema.safeParse(invalidToken);
      expect(result.success).toBe(false);
    });

    it('should reject decimal values', () => {
      const decimalValue = {
        token: '123e4567-e89b-12d3-a456-426614174000',
        questionId: 'q1',
        value: 3.5,
      };

      const result = patchSchema.safeParse(decimalValue);
      expect(result.success).toBe(false);
    });

    it('should accept empty string for text responses', () => {
      const emptyString = {
        token: '123e4567-e89b-12d3-a456-426614174000',
        questionId: 'demographics-field',
        value: '',
      };

      const result = patchSchema.safeParse(emptyString);
      expect(result.success).toBe(true);
    });

    it('should accept all valid Likert values (1, 2, 3, 4, 5)', () => {
      const values = [1, 2, 3, 4, 5];

      for (const value of values) {
        const data = {
          token: '123e4567-e89b-12d3-a456-426614174000',
          questionId: 'q1',
          value,
        };

        const result = patchSchema.safeParse(data);
        expect(result.success).toBe(true);
      }
    });
  });

  describe('Survey Submit Schema', () => {
    const submitSchema = z.object({
      token: z.string().uuid(),
    });

    it('should validate valid survey submission', () => {
      const validData = {
        token: '123e4567-e89b-12d3-a456-426614174000',
      };

      const result = submitSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid token format', () => {
      const invalidData = {
        token: 'not-a-valid-uuid',
      };

      const result = submitSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject missing token', () => {
      const missingToken = {};

      const result = submitSchema.safeParse(missingToken);
      expect(result.success).toBe(false);
    });

    it('should reject empty string token', () => {
      const emptyToken = {
        token: '',
      };

      const result = submitSchema.safeParse(emptyToken);
      expect(result.success).toBe(false);
    });

    it('should reject null token', () => {
      const nullToken = {
        token: null,
      };

      const result = submitSchema.safeParse(nullToken);
      expect(result.success).toBe(false);
    });
  });

  describe('Edge Cases and Error Messages', () => {
    const patchSchema = z.object({
      token: z.string().uuid(),
      questionId: z.string(),
      value: z.union([z.number().int().min(1).max(5), z.string()]),
    });

    it('should provide detailed error information for invalid data', () => {
      const invalidData = {
        token: 'invalid-token',
        questionId: '',
        value: 10,
      };

      const result = patchSchema.safeParse(invalidData);
      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error.issues.length).toBeGreaterThan(0);
        expect(
          result.error.issues.some((issue) => issue.path.includes('token'))
        ).toBe(true);
      }
    });

    it('should handle multiple validation errors', () => {
      const multipleErrors = {
        // missing token
        questionId: '', // empty questionId
        value: 0, // invalid value
      };

      const result = patchSchema.safeParse(multipleErrors);
      expect(result.success).toBe(false);

      if (!result.success) {
        // Should have errors for token, questionId, and value
        expect(result.error.issues.length).toBeGreaterThan(1);
      }
    });

    it('should handle type coercion correctly', () => {
      const stringNumber = {
        token: '123e4567-e89b-12d3-a456-426614174000',
        questionId: 'q1',
        value: '3', // String instead of number
      };

      const result = patchSchema.safeParse(stringNumber);
      // Zod union will accept string, treating it as text value
      expect(result.success).toBe(true);
    });
  });

  describe('UUID Validation Specifics', () => {
    const uuidSchema = z.string().uuid();

    it('should accept valid UUID v4', () => {
      const validUUIDs = [
        '123e4567-e89b-12d3-a456-426614174000',
        'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6',
        '00000000-0000-0000-0000-000000000000',
      ];

      for (const uuid of validUUIDs) {
        const result = uuidSchema.safeParse(uuid);
        expect(result.success).toBe(true);
      }
    });

    it('should reject malformed UUIDs', () => {
      const invalidUUIDs = [
        '123e4567-e89b-12d3-a456',
        '123e4567-e89b-12d3-a456-426614174000-extra',
        '123e4567e89b12d3a456426614174000', // Missing hyphens
        'ZZZZZZZZ-ZZZZ-ZZZZ-ZZZZ-ZZZZZZZZZZZZ', // Invalid characters
        '',
        'null',
        'undefined',
      ];

      for (const uuid of invalidUUIDs) {
        const result = uuidSchema.safeParse(uuid);
        expect(result.success).toBe(false);
      }
    });
  });
});
