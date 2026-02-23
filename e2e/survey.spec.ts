import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * E2E tests for the anonymous survey respondent flow.
 * Tests the complete flow of taking a survey via access code.
 */

const prisma = new PrismaClient();

test.describe('Anonymous Survey Flow', () => {
  let testAccessCode: string;
  let testCampaignId: string;

  test.beforeAll(async () => {
    // Create test data for anonymous survey flow
    const organization = await prisma.organization.findFirst();

    if (!organization) {
      throw new Error('No organization found. Please run db:seed first.');
    }

    // Create a test campaign
    // Note: This assumes Survey 4 (LTE) exists in Sanity with ID 'survey-4'
    testAccessCode = `E2ETEST${Date.now()}`.slice(0, 12).toUpperCase();
    const campaign = await prisma.surveyCampaign.create({
      data: {
        surveyId: 'survey-4',
        surveyTitle: 'Test Survey Campaign',
        organizationId: organization.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        accessCode: testAccessCode,
      },
    });

    testCampaignId = campaign.id;
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testCampaignId) {
      await prisma.anonymousResponse.deleteMany({
        where: { campaignId: testCampaignId },
      });
      await prisma.surveyCampaign.delete({
        where: { id: testCampaignId },
      });
    }
    await prisma.$disconnect();
  });

  test('should display splash page when accessing valid access code', async ({
    page,
  }) => {
    await page.goto(`/a/${testAccessCode}`);

    // Should see survey title or access code entry
    await expect(page.locator('h1')).toBeVisible();
  });

  test('should show error for invalid access code', async ({ page }) => {
    await page.goto('/a/INVALIDCODE999');

    // Should see 404 or error message
    const has404 = await page
      .locator('h1:has-text("404")')
      .isVisible()
      .catch(() => false);
    const errorContent = page.locator('text=/not found|invalid|unavailable/i');
    if (!has404) {
      await expect(errorContent.first()).toBeVisible();
    }
  });

  test('should show survey unavailable for inactive campaign', async ({
    page,
  }) => {
    // Create a draft campaign
    const organization = await prisma.organization.findFirst();
    const draftCode = `DRAFT${Date.now()}`.slice(0, 12).toUpperCase();
    const draftCampaign = await prisma.surveyCampaign.create({
      data: {
        surveyId: 'survey-4',
        surveyTitle: 'Draft Campaign',
        organizationId: organization!.id,
        status: 'DRAFT',
        accessCode: draftCode,
      },
    });

    await page.goto(`/a/${draftCode}`);

    // Should see unavailable message
    await expect(
      page.locator('text=/not currently active|unavailable/i')
    ).toBeVisible();

    // Clean up
    await prisma.surveyCampaign.delete({ where: { id: draftCampaign.id } });
  });
});

test.describe('Survey Accessibility', () => {
  let testAccessCode: string;

  test.beforeAll(async () => {
    // Reuse an existing active campaign with an access code
    const existing = await prisma.surveyCampaign.findFirst({
      where: { status: 'ACTIVE', accessCode: { not: null } },
    });

    if (existing?.accessCode) {
      testAccessCode = existing.accessCode;
    }
  });

  test.afterAll(async () => {
    await prisma.$disconnect();
  });

  test('should have proper heading structure', async ({ page }) => {
    if (!testAccessCode) {
      test.skip();
      return;
    }

    await page.goto(`/a/${testAccessCode}`);

    // Should have h1 for main heading
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);
  });

  test('should have keyboard navigation support', async ({ page }) => {
    if (!testAccessCode) {
      test.skip();
      return;
    }

    await page.goto(`/a/${testAccessCode}`);

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // At least one element should be focused
    const focusedElement = await page.locator(':focus').count();
    expect(focusedElement).toBeGreaterThan(0);
  });
});
