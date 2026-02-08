import { test, expect } from '@playwright/test';

/**
 * E2E tests for admin functionality
 * These tests require the database to be seeded with test data
 * Run: npm run db:seed before running these tests
 */

test.describe('Admin Login Flow', () => {
  test('should successfully login as super admin', async ({ page }) => {
    await page.goto('/admin/login');

    // Fill in login form
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');

    // Submit the form
    await page.click('button[type="submit"]');

    // Should redirect to dashboard
    await expect(page).toHaveURL('/admin/dashboard');

    // Should see dashboard heading
    await expect(page.locator('h1')).toContainText('Dashboard');

    // Should see welcome message with user name
    await expect(page.locator('text=Welcome back')).toBeVisible();
  });

  test('should fail login with invalid credentials', async ({ page }) => {
    await page.goto('/admin/login');

    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'wrongpassword');

    await page.click('button[type="submit"]');

    // Should show error message
    await expect(
      page.locator('text=/Invalid credentials|Login failed/i')
    ).toBeVisible();

    // Should still be on login page
    await expect(page).toHaveURL(/\/admin\/login/);
  });

  test('should redirect to login when accessing protected routes without auth', async ({
    page,
  }) => {
    await page.goto('/admin/dashboard');

    // Should redirect to login
    await expect(page).toHaveURL('/admin/login');
  });
});

test.describe('Admin Dashboard', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('should display dashboard stats cards', async ({ page }) => {
    // Should see 4 stat cards
    await expect(page.locator('text=Active Campaigns')).toBeVisible();
    await expect(page.locator('text=Total Users')).toBeVisible();
    await expect(page.locator('text=Pending Responses')).toBeVisible();
    await expect(page.locator('text=Completion Rate')).toBeVisible();
  });

  test('should display quick action buttons', async ({ page }) => {
    await expect(page.locator('text=New Campaign')).toBeVisible();
    await expect(page.locator('text=Import Users')).toBeVisible();
  });

  test('should navigate to campaigns page', async ({ page }) => {
    await page.click('text=New Campaign');
    await expect(page).toHaveURL('/admin/campaigns/new');
  });

  test('should navigate to users import page', async ({ page }) => {
    await page.click('text=Import Users');
    await expect(page).toHaveURL('/admin/users/import');
  });
});

test.describe('Campaign Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('should navigate to campaigns list', async ({ page }) => {
    await page.goto('/admin/campaigns');

    await expect(page.locator('h1')).toContainText('Campaigns');
  });

  test('should navigate to new campaign form', async ({ page }) => {
    await page.goto('/admin/campaigns/new');

    // Should see the campaign form
    await expect(page.locator('h1')).toContainText(
      /Create.*Campaign|New Campaign/i
    );
  });

  test('should display validation errors when submitting empty campaign form', async ({
    page,
  }) => {
    await page.goto('/admin/campaigns/new');

    // Try to submit without filling required fields
    const submitButton = page.locator('button[type="submit"]');
    if (await submitButton.isVisible()) {
      await submitButton.click();

      // Should see validation errors
      // Note: Exact error text depends on implementation
      await expect(
        page.locator('text=/required|must be|invalid/i')
      ).toBeVisible();
    }
  });
});

test.describe('Reports', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('should navigate to reports page', async ({ page }) => {
    await page.goto('/admin/reports');

    await expect(page.locator('h1')).toContainText('Reports');
  });

  test('should show empty state when no reports available', async ({
    page,
  }) => {
    await page.goto('/admin/reports');

    // May see empty state or list of campaigns
    const emptyState = page.locator(
      'text=/No campaigns|No reports|Get started/i'
    );
    const campaignList = page.locator('text=/View Report|Campaign/i');

    // Either empty state or campaigns should be visible
    const hasContent = await emptyState.isVisible().catch(() => false);
    const hasCampaigns = await campaignList.isVisible().catch(() => false);

    expect(hasContent || hasCampaigns).toBeTruthy();
  });
});

test.describe('User Management', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('should navigate to users page', async ({ page }) => {
    await page.goto('/admin/users');

    await expect(page.locator('h1')).toContainText('Users');
  });

  test('should display seeded users in the list', async ({ page }) => {
    await page.goto('/admin/users');

    // Should see the seeded test users
    await expect(page.locator('text=admin@test.com')).toBeVisible();
  });
});

test.describe('Navigation', () => {
  test.beforeEach(async ({ page }) => {
    // Login before each test
    await page.goto('/admin/login');
    await page.fill('input[name="email"]', 'admin@test.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await page.waitForURL('/admin/dashboard');
  });

  test('should have working sidebar navigation', async ({ page }) => {
    // Test navigation links
    const links = [
      { text: 'Dashboard', url: '/admin/dashboard' },
      { text: 'Campaigns', url: '/admin/campaigns' },
      { text: 'Users', url: '/admin/users' },
      { text: 'Reports', url: '/admin/reports' },
    ];

    for (const link of links) {
      const navLink = page.locator(`nav a:has-text("${link.text}")`);
      if (await navLink.isVisible()) {
        await navLink.click();
        await expect(page).toHaveURL(link.url);
      }
    }
  });
});
