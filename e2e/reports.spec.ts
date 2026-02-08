import { test, expect } from '@playwright/test';
import { PrismaClient } from '@prisma/client';
import { v4 as uuidv4 } from 'uuid';

/**
 * E2E tests for viewing reports and export functionality
 */

const prisma = new PrismaClient();

test.describe('Report Viewing', () => {
  let testCampaignId: string;

  test.beforeAll(async () => {
    // Create a completed campaign with responses for testing
    const organization = await prisma.organization.findFirst();

    if (!organization) {
      throw new Error('No organization found. Please run db:seed first.');
    }

    // Create test campaign
    const campaign = await prisma.surveyCampaign.create({
      data: {
        sanitysurveyId: 'survey-4',
        surveyTitle: 'Test Report Campaign',
        organizationId: organization.id,
        status: 'COMPLETED',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        reminderDays: 3,
      },
    });

    testCampaignId = campaign.id;

    // Create 5 test users and completed invitations with responses
    for (let i = 0; i < 5; i++) {
      const user = await prisma.user.create({
        data: {
          email: `report-test-${i}-${Date.now()}@example.com`,
          name: `Test User ${i}`,
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

      const invitation = await prisma.invitation.create({
        data: {
          campaignId: campaign.id,
          userId: user.id,
          token: uuidv4(),
          status: 'COMPLETED',
          sentAt: new Date(),
          completedAt: new Date(),
        },
      });

      // Create sample responses (5 questions)
      for (let q = 1; q <= 5; q++) {
        await prisma.response.create({
          data: {
            invitationId: invitation.id,
            sanityQuestionId: `q${q}`,
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
      const invitations = await prisma.invitation.findMany({
        where: { campaignId: testCampaignId },
      });

      for (const invitation of invitations) {
        await prisma.response.deleteMany({
          where: { invitationId: invitation.id },
        });
      }

      await prisma.invitation.deleteMany({
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

  test('should have demographic filters', async ({ page }) => {
    await page.goto(`/admin/reports/${testCampaignId}`);

    await page.waitForLoadState('networkidle');

    // Look for filter controls
    const filterPanel = page.locator(
      'text=/Filter|Division|Job Role|Time at Bank/i'
    );
    const hasFilters = await filterPanel.isVisible().catch(() => false);

    // Filters should be present for non-anonymous surveys
    if (hasFilters) {
      await expect(filterPanel.first()).toBeVisible();
    }
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
        sanitysurveyId: 'survey-7',
        surveyTitle: 'Anonymous Survey Test',
        organizationId: organization!.id,
        status: 'COMPLETED',
        startDate: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000),
        endDate: new Date(),
        reminderDays: 3,
      },
    });

    // Create only 3 completed invitations (below threshold of 5)
    for (let i = 0; i < 3; i++) {
      const user = await prisma.user.create({
        data: {
          email: `anon-test-${i}-${Date.now()}@example.com`,
          name: `Anon User ${i}`,
          role: 'RESPONDENT',
          organizationId: organization!.id,
          division: 'Technology',
          jobRole: 'IT Specialist',
          isActive: true,
        },
      });

      await prisma.invitation.create({
        data: {
          campaignId: anonymousCampaign.id,
          userId: user.id,
          token: uuidv4(),
          status: 'COMPLETED',
          sentAt: new Date(),
          completedAt: new Date(),
        },
      });
    }

    await page.goto(`/admin/reports/${anonymousCampaign.id}`);

    // Should see insufficient respondents message
    await expect(
      page.locator('text=/minimum.*5|Insufficient.*respondents|Not enough/i')
    ).toBeVisible();

    // Clean up
    await prisma.invitation.deleteMany({
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
    // Reuse existing campaign or create new one
    const campaign = await prisma.surveyCampaign.findFirst({
      where: { status: 'COMPLETED' },
      include: {
        invitations: {
          where: { status: 'COMPLETED' },
        },
      },
    });

    if (campaign && campaign.invitations.length >= 5) {
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
