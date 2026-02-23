import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';

/**
 * E2E tests for viewing reports and export functionality
 */

const prisma = new PrismaClient();

test.describe('Report Viewing', () => {
  let testCampaignId: string;

  test.beforeAll(async () => {
    // Create a completed campaign with anonymous responses for testing
    const organization = await prisma.organization.findFirst();

    if (!organization) {
      throw new Error('No organization found. Please run db:seed first.');
    }

    // Create test campaign
    const campaign = await prisma.surveyCampaign.create({
      data: {
        surveyId: 'survey-4',
        surveyTitle: 'Test Report Campaign',
        organizationId: organization.id,
        status: 'COMPLETED',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        accessCode: `RPTTEST${Date.now()}`,
      },
    });

    testCampaignId = campaign.id;

    // Create 5 completed anonymous responses with answers
    for (let i = 0; i < 5; i++) {
      const anonResponse = await prisma.anonymousResponse.create({
        data: {
          campaignId: campaign.id,
          startedAt: new Date(),
          completedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });

      // Create sample answers (5 questions)
      for (let q = 1; q <= 5; q++) {
        await prisma.anonymousResponseItem.create({
          data: {
            anonymousResponseId: anonResponse.id,
            questionId: `q${q}`,
            questionNumber: q,
            value: Math.floor(Math.random() * 5) + 1, // Random 1-5
            submittedAt: new Date(),
          },
        });
      }
    }
  });

  test.afterAll(async () => {
    // Clean up test data
    if (testCampaignId) {
      const anonResponses = await prisma.anonymousResponse.findMany({
        where: { campaignId: testCampaignId },
      });

      for (const anonResponse of anonResponses) {
        await prisma.anonymousResponseItem.deleteMany({
          where: { anonymousResponseId: anonResponse.id },
        });
      }

      await prisma.anonymousResponse.deleteMany({
        where: { campaignId: testCampaignId },
      });

      await prisma.surveyCampaign.delete({
        where: { id: testCampaignId },
      });
    }
    await prisma.$disconnect();
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('should display report for completed campaign', async ({ page }) => {
    await page.goto(`/admin/reports/${testCampaignId}`);

    // Should see campaign title
    await expect(page.locator('h1')).toContainText('Test Report Campaign');

    // Should see organization name
    await expect(page.locator('text=Test Bank')).toBeVisible();

    // Should see summary cards or metrics
    await expect(
      page.locator('text=/Overall Score|Average|Response Rate/i')
    ).toBeVisible();
  });

  test('should display category scores chart', async ({ page }) => {
    await page.goto(`/admin/reports/${testCampaignId}`);

    await page.waitForLoadState('networkidle');

    // Should see category-related content
    await expect(page.locator('text=/Category|Categories/i')).toBeVisible();

    // Should see chart or score visualization
    const chart = page.locator('[class*="recharts"]');
    const hasChart = await chart.isVisible().catch(() => false);

    // Either Recharts component or category data should be visible
    if (!hasChart) {
      // At least category names should be visible
      await expect(
        page.locator(
          'text=/Communication|Leadership|Culture|Accountability|Execution/i'
        )
      ).toBeVisible();
    }
  });

  test('should display section scores', async ({ page }) => {
    await page.goto(`/admin/reports/${testCampaignId}`);

    await page.waitForLoadState('networkidle');

    // Should see section-related content
    await expect(page.locator('text=/Section|Sections/i')).toBeVisible();
  });

  test('should show export buttons', async ({ page }) => {
    await page.goto(`/admin/reports/${testCampaignId}`);

    // Should see export buttons
    await expect(
      page.locator('text=/Export.*Excel|Export.*PDF/i')
    ).toBeVisible();
  });

  test('should enforce anonymity threshold', async ({ page }) => {
    // Create a Survey 7 campaign with only 3 responses (below threshold)
    const organization = await prisma.organization.findFirst();

    const anonymousCampaign = await prisma.surveyCampaign.create({
      data: {
        surveyId: 'survey-7',
        surveyTitle: 'Anonymous Survey Test',
        organizationId: organization!.id,
        status: 'COMPLETED',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        accessCode: `ANONTEST${Date.now()}`,
      },
    });

    // Create only 3 completed anonymous responses (below threshold of 5)
    for (let i = 0; i < 3; i++) {
      await prisma.anonymousResponse.create({
        data: {
          campaignId: anonymousCampaign.id,
          startedAt: new Date(),
          completedAt: new Date(),
          lastActiveAt: new Date(),
        },
      });
    }

    await page.goto(`/admin/reports/${anonymousCampaign.id}`);

    // Should see insufficient respondents message
    await expect(
      page.locator('text=/minimum.*5|Insufficient.*respondents|Not enough/i')
    ).toBeVisible();

    // Clean up
    await prisma.anonymousResponse.deleteMany({
      where: { campaignId: anonymousCampaign.id },
    });
    await prisma.surveyCampaign.delete({
      where: { id: anonymousCampaign.id },
    });
  });
});

test.describe('Export Functionality', () => {
  let testCampaignId: string;

  test.beforeAll(async () => {
    // Find an existing completed campaign with enough anonymous responses
    const campaign = await prisma.surveyCampaign.findFirst({
      where: { status: 'COMPLETED' },
      include: {
        _count: {
          select: { anonymousResponses: true },
        },
      },
    });

    if (campaign && campaign._count.anonymousResponses >= 5) {
      testCampaignId = campaign.id;
    }
  });

  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('should have Excel export button', async ({ page }) => {
    if (!testCampaignId) {
      test.skip();
      return;
    }

    await page.goto(`/admin/reports/${testCampaignId}`);

    const excelButton = page.locator('button:has-text("Excel")');
    await expect(excelButton).toBeVisible();
  });

  test('should have PDF export button', async ({ page }) => {
    if (!testCampaignId) {
      test.skip();
      return;
    }

    await page.goto(`/admin/reports/${testCampaignId}`);

    const pdfButton = page.locator('button:has-text("PDF")');
    await expect(pdfButton).toBeVisible();
  });

  test('should show loading state when exporting', async ({ page }) => {
    if (!testCampaignId) {
      test.skip();
      return;
    }

    await page.goto(`/admin/reports/${testCampaignId}`);

    const excelButton = page.locator('button:has-text("Excel")');

    // Click export button
    await excelButton.click();

    // Should show loading state
    const loadingIndicator = page.locator('text=/Exporting|Loading/i');
    const isLoadingVisible = await loadingIndicator
      .isVisible()
      .catch(() => false);

    // Either loading indicator should appear briefly, or button should be disabled
    if (!isLoadingVisible) {
      // Button should be disabled during export
      await expect(excelButton).toBeDisabled();
    }
  });
});

test.describe('Report Access Control', () => {
  test('should prevent unauthorized access to reports', async ({ page }) => {
    // Try to access report without authentication
    await page.goto('/admin/reports');

    // Should redirect to login
    await expect(page).toHaveURL('/admin/login');
  });

  test('should allow ORG_ADMIN to view their organization reports', async ({
    page,
  }) => {
    // Login as ORG_ADMIN
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'orgadmin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');

    // Should be able to access reports page
    await page.goto('/admin/reports');
    await expect(page.locator('h1')).toContainText('Reports');
  });
});
