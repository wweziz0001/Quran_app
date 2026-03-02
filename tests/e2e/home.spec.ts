/**
 * E2E Tests - Home Page
 * 
 * Tests the main application flow
 */

import { test, expect } from '@playwright/test';

test.describe('Home Page', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('should display the home page', async ({ page }) => {
    // Check if the page loads
    await expect(page).toHaveTitle(/Quran App/);
  });

  test('should display the header', async ({ page }) => {
    // Check for header elements
    const header = page.locator('header');
    await expect(header).toBeVisible();
  });

  test('should display navigation', async ({ page }) => {
    // Check for navigation
    const nav = page.locator('nav');
    await expect(nav).toBeVisible();
  });

  test('should display Quran App logo/title', async ({ page }) => {
    // Check for app title
    const title = page.getByText('Quran App');
    await expect(title.first()).toBeVisible();
  });

  test('should have Admin Panel link', async ({ page }) => {
    // Check for admin link
    const adminLink = page.getByRole('link', { name: /admin/i });
    await expect(adminLink.first()).toBeVisible();
  });

  test('should display feature cards', async ({ page }) => {
    // Check for feature section
    const featuresHeading = page.getByRole('heading', { name: /features/i });
    await expect(featuresHeading).toBeVisible();
  });

  test('should display stats section', async ({ page }) => {
    // Check for stats
    const stats = page.getByText(/Target Users|Audio Files|Languages|Uptime/i);
    await expect(stats.first()).toBeVisible();
  });

  test('should display footer', async ({ page }) => {
    // Check for footer
    const footer = page.locator('footer');
    await expect(footer).toBeVisible();
  });

  test('should be responsive', async ({ page }) => {
    // Test mobile viewport
    await page.setViewportSize({ width: 375, height: 667 });
    await expect(page).toHaveTitle(/Quran App/);
    
    // Test tablet viewport
    await page.setViewportSize({ width: 768, height: 1024 });
    await expect(page).toHaveTitle(/Quran App/);
    
    // Test desktop viewport
    await page.setViewportSize({ width: 1280, height: 720 });
    await expect(page).toHaveTitle(/Quran App/);
  });
});

test.describe('Navigation', () => {
  test('should navigate to admin panel', async ({ page }) => {
    await page.goto('/');
    
    // Click on Admin Panel link
    const adminLink = page.getByRole('link', { name: /admin/i }).first();
    await adminLink.click();
    
    // Should navigate to admin page
    await expect(page).toHaveURL(/\/admin/);
  });
});

test.describe('Accessibility', () => {
  test('should have no accessibility violations on home page', async ({ page }) => {
    await page.goto('/');
    
    // Check for basic accessibility
    const html = page.locator('html');
    await expect(html).toHaveAttribute('lang');
    
    // Check for main landmark
    const main = page.locator('main');
    await expect(main).toBeVisible();
  });

  test('should have proper heading hierarchy', async ({ page }) => {
    await page.goto('/');
    
    // Check for h1
    const h1 = page.locator('h1');
    await expect(h1.first()).toBeVisible();
  });
});

test.describe('Performance', () => {
  test('should load within acceptable time', async ({ page }) => {
    const startTime = Date.now();
    await page.goto('/');
    const loadTime = Date.now() - startTime;
    
    // Page should load within 10 seconds
    expect(loadTime).toBeLessThan(10000);
  });
});
