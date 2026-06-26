// WaterMart Admin E2E Tests
// Tests the admin panel at http://localhost:3001
//
// Prerequisites: Admin dev server running on port 3001
// (playwright.config.ts webServer handles this automatically)

import { test, expect } from '@playwright/test';

const ADMIN_URL = 'http://localhost:3001';

test.describe('WaterMart Admin Panel', () => {
  test('admin panel loads successfully', async ({ page }) => {
    await page.goto(ADMIN_URL);

    // The admin panel should render — look for any content
    await expect(page.locator('body')).not.toBeEmpty();
    await page.waitForLoadState('networkidle');

    // Check for sidebar, header, or main content area
    const hasContent = await page.locator('header, nav, aside, main, [role="main"]')
      .first()
      .isVisible({ timeout: 10_000 })
      .catch(() => false);
    expect(hasContent).toBeTruthy();
  });

  test('scraper page has textarea and Start Scraping button', async ({ page }) => {
    // Navigate to the scraper page
    await page.goto(`${ADMIN_URL}/products/scraper`);
    await page.waitForLoadState('networkidle');

    // Verify the textarea for URL input exists
    const textarea = page.locator('textarea').first();
    await expect(textarea).toBeVisible({ timeout: 10_000 });

    // Verify placeholder text
    const placeholder = await textarea.getAttribute('placeholder');
    expect(placeholder).toBeTruthy();

    // Verify the "Start Scraping" button exists
    const startButton = page.locator(
      'button:has-text("Start Scraping")'
    ).first();
    await expect(startButton).toBeVisible({ timeout: 5_000 });

    // The button should contain the text "Start Scraping"
    const buttonText = await startButton.textContent();
    expect(buttonText?.toLowerCase()).toContain('start scraping');
  });

  test('scraper page shows scrape jobs table or empty state', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/products/scraper`);
    await page.waitForLoadState('networkidle');

    // The page should show either scrape jobs or an empty state message
    const jobsSection = page.locator('text=Scrape Jobs, text=No scrape jobs yet, text=Import Products');
    const hasJobsSection = await jobsSection.first().isVisible({ timeout: 10_000 }).catch(() => false);
    expect(hasJobsSection).toBeTruthy();
  });

  test('AI optimize page renders', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/products/ai-optimize`);
    await page.waitForLoadState('networkidle');

    // The page should show optimization content
    const heading = page.locator('h2, h1').first();
    await expect(heading).toBeVisible({ timeout: 10_000 });

    const headingText = await heading.textContent();
    expect(headingText?.toLowerCase()).toMatch(/ai|optim|product/i);
  });

  test('products page renders product list or empty state', async ({ page }) => {
    await page.goto(`${ADMIN_URL}/products`);
    await page.waitForLoadState('networkidle');

    // The products page should render
    await expect(page.locator('body')).not.toBeEmpty();

    // Check for table, cards, or product list
    const hasContent = await page.locator(
      'table, [role="grid"], .product-card, article, text=product'
    ).first().isVisible({ timeout: 10_000 }).catch(() => false);
    expect(hasContent).toBeTruthy();
  });
});
