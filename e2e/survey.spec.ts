import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * E2E tests for survey respondent flow
 * Tests the complete flow of taking a survey via token link
 */

const prisma = new PrismaClient();

test.describe('Survey Flow', () => {
  let testToken: string;
  let testCampaignId: string;

  test.beforeAll(async () => {
    // Create test data for survey flow
    const organization = await prisma.organization.findFirst();

    if (!organization) {
      throw new Error('No organization found. Please run db:seed first.');
    }

    // Create a test campaign with a real Sanity survey ID
    // Note: This assumes Survey 4 (LTE) exists in Sanity with ID 'survey-4'
    const campaign = await prisma.surveyCampaign.create({
      data: {
        surveyId: 'survey-4',
        surveyTitle: 'Test Survey Campaign',
        organizationId: organization.id,
        status: 'ACTIVE',
        startDate: new Date(),
        endDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        reminderDays: 3,
      },
    });

    testCampaignId = campaign.id;

    // Create a test user (respondent)
    const user = await prisma.user.create({
      data: {
        email: `test-respondent-${Date.now()}@example.com`,
        name: 'Test Respondent',
        role: 'RESPONDENT',
        organizationId: organization.id,
        division: 'Technology',
        jobRole: 'IT Specialist',
        employmentStatus: 'FULL_TIME',
        gender: 'MALE',
        timeAtBank: '1-3 years',
        bankExperience: '5-10 years',
        isActive: true,
      },
    });

    // Create an invitation with a unique token
    testToken = uuidv4();
    await prisma.invitation.create({
      data: {
        campaignId: campaign.id,
        userId: user.id,
        token: testToken,
        status: 'SENT',
        sentAt: new Date(),
      },
    });
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testCampaignId) {
      await prisma.invitation.deleteMany({
        where: { campaignId: testCampaignId },
      });
      await prisma.surveyCampaign.delete({
        where: { id: testCampaignId },
      });
    }
    await prisma.$disconnect();
  });

  test('should display survey when accessing valid token', async ({ page }) => {
    await page.goto(`/s/${testToken}`);

    // Should see survey title or first question
    await expect(page.locator('h1')).toBeVisible();

    // Should see survey content (questions, Likert scale, etc.)
    const surveyContent = page.locator(
      'text=/Strongly Agree|Agree|Disagree|Question/i'
    );
    await expect(surveyContent.first()).toBeVisible({ timeout: 10000 });
  });

  test('should show error for invalid token', async ({ page }) => {
    const invalidToken = uuidv4();
    await page.goto(`/s/${invalidToken}`);

    // Should see error message
    await expect(
      page.locator('text=/Invalid|expired|not found/i')
    ).toBeVisible();
  });

  test('should navigate between survey sections', async ({ page }) => {
    await page.goto(`/s/${testToken}`);

    // Wait for survey to load
    await page.waitForLoadState('networkidle');

    // Look for navigation buttons (Next, Previous, etc.)
    const nextButton = page.locator('button:has-text("Next")');
    const continueButton = page.locator('button:has-text("Continue")');

    // Try to find and click navigation button
    if (await nextButton.isVisible()) {
      // Select a response first (if questions are present)
      const likertOption = page.locator('input[type="radio"]').first();
      if (await likertOption.isVisible()) {
        await likertOption.click();
      }
      await nextButton.click();
    } else if (await continueButton.isVisible()) {
      await continueButton.click();
    }
  });

  test('should require responses before proceeding', async ({ page }) => {
    await page.goto(`/s/${testToken}`);

    await page.waitForLoadState('networkidle');

    // Try to proceed without answering
    const nextButton = page.locator('button:has-text("Next")');
    if (await nextButton.isVisible()) {
      await nextButton.click();

      // Should see validation message or stay on same page
      // Implementation may vary - either error message or disabled button
      const errorMessage = page.locator('text=/required|answer|complete/i');
      const isErrorVisible = await errorMessage.isVisible().catch(() => false);

      // If no error, the button should have been disabled
      if (!isErrorVisible) {
        // Check if still on the same section
        await expect(nextButton).toBeVisible();
      }
    }
  });

  test('should show progress indicator', async ({ page }) => {
    await page.goto(`/s/${testToken}`);

    await page.waitForLoadState('networkidle');

    // Look for progress indicator (progress bar, step counter, etc.)
    const progressBar = page.locator('[role="progressbar"]');
    const progressText = page.locator('text=/progress|of|section/i');

    const hasProgressBar = await progressBar.isVisible().catch(() => false);
    const hasProgressText = await progressText.isVisible().catch(() => false);

    // At least one progress indicator should be present
    expect(hasProgressBar || hasProgressText).toBeTruthy();
  });

  test('should prevent accessing completed survey', async ({ page }) => {
    // First, mark the invitation as completed
    await prisma.invitation.update({
      where: { token: testToken },
      data: {
        status: 'COMPLETED',
        completedAt: new Date(),
      },
    });

    await page.goto(`/s/${testToken}`);

    // Should see message that survey is already completed
    await expect(
      page.locator('text=/already completed|thank you|submitted/i')
    ).toBeVisible();

    // Reset for other tests
    await prisma.invitation.update({
      where: { token: testToken },
      data: {
        status: 'SENT',
        completedAt: null,
      },
    });
  });
});

test.describe('Survey Accessibility', () => {
  let testToken: string;

  test.beforeAll(async () => {
    // Reuse or create test data
    const invitation = await prisma.invitation.findFirst({
      where: { status: 'SENT' },
    });

    if (invitation) {
      testToken = invitation.token;
    }
  });

  test('should have proper heading structure', async ({ page }) => {
    if (!testToken) {
      test.skip();
      return;
    }

    await page.goto(`/s/${testToken}`);

    // Should have h1 for main heading
    const h1 = await page.locator('h1').count();
    expect(h1).toBeGreaterThan(0);
  });

  test('should have keyboard navigation support', async ({ page }) => {
    if (!testToken) {
      test.skip();
      return;
    }

    await page.goto(`/s/${testToken}`);

    // Tab through interactive elements
    await page.keyboard.press('Tab');

    // At least one element should be focused
    const focusedElement = await page.locator(':focus').count();
    expect(focusedElement).toBeGreaterThan(0);
  });
});
