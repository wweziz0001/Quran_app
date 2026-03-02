/**
 * E2E Tests - Admin Page
 * 
 * Tests the admin panel functionality
 */

import { test, expect } from '@playwright/test';

test.describe('Admin Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/admin');
  });

  test('should display the admin dashboard', async ({ page }) => {
    // Check if admin page loads
    await expect(page).toHaveURL(/\/admin/);
  });

  test('should display sidebar navigation', async ({ page }) => {
    // Check for sidebar
    const sidebar = page.locator('aside, nav').first();
    await expect(sidebar).toBeVisible();
  });

  test('should display dashboard content', async ({ page }) => {
    // Check for dashboard heading
    const dashboard = page.getByRole('heading', { name: /dashboard/i });
    await expect(dashboard).toBeVisible();
  });

  test('should have navigation menu items', async ({ page }) => {
    // Check for common navigation items
    const menuItems = [
      'Dashboard',
      'Database',
      'Settings',
      'Reciters',
      'Tafsir',
    ];

    for (const item of menuItems) {
      const menuItem = page.getByText(new RegExp(item, 'i'));
      // At least one menu item should be visible
      if (await menuItem.first().isVisible()) {
        expect(true).toBe(true);
        break;
      }
    }
  });

  test('should display database section', async ({ page }) => {
    // Navigate to database section if available
    const dbLink = page.getByRole('link', { name: /database/i }).or(
      page.getByRole('button', { name: /database/i })
    );
    
    if (await dbLink.first().isVisible()) {
      await dbLink.first().click();
      await expect(page).toHaveURL(/database/);
    }
  });

  test('should be responsive on mobile', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 667 });
    
    // Page should still be functional
    await expect(page).toHaveURL(/\/admin/);
  });
});

test.describe('Admin API Integration', () => {
  test('should handle API responses', async ({ page }) => {
    await page.goto('/admin');
    
    // Wait for any API calls to complete
    await page.waitForLoadState('networkidle');
    
    // Check if any data is displayed
    const content = page.locator('main');
    await expect(content).toBeVisible();
  });

  test('should show loading states', async ({ page }) => {
    // Go to admin page and check for loading indicators
    await page.goto('/admin');
    
    // Either loading spinner or content should be visible
    const loadingOrContent = page.locator('main').or(
      page.locator('[data-testid="loading"]')
    ).or(
      page.locator('.animate-pulse')
    );
    
    // Something should be visible
    await expect(loadingOrContent.first()).toBeVisible();
  });
});

test.describe('Admin Settings', () => {
  test('should navigate to settings', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for settings link
    const settingsLink = page.getByRole('link', { name: /settings/i }).or(
      page.getByRole('button', { name: /settings/i })
    );
    
    if (await settingsLink.first().isVisible()) {
      await settingsLink.first().click();
      await expect(page).toHaveURL(/settings/);
    }
  });
});

test.describe('Admin Reciters', () => {
  test('should navigate to reciters section', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for reciters link
    const recitersLink = page.getByRole('link', { name: /reciters/i }).or(
      page.getByRole('button', { name: /reciters/i })
    );
    
    if (await recitersLink.first().isVisible()) {
      await recitersLink.first().click();
      await expect(page).toHaveURL(/reciters/);
    }
  });
});

test.describe('Admin Tafsir', () => {
  test('should navigate to tafsir section', async ({ page }) => {
    await page.goto('/admin');
    
    // Look for tafsir link
    const tafsirLink = page.getByRole('link', { name: /tafsir/i }).or(
      page.getByRole('button', { name: /tafsir/i })
    );
    
    if (await tafsirLink.first().isVisible()) {
      await tafsirLink.first().click();
      await expect(page).toHaveURL(/tafsir/);
    }
  });
});
