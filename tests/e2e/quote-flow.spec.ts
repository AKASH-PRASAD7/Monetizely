import { test, expect } from '@playwright/test';

test('Full quote flow', async ({ page }) => {
  // Start on the dashboard
  await page.goto('/');
  await expect(page.locator('h1')).toContainText('Monetizely');

  // Go to catalog
  await page.click('text=Catalog');
  
  // Start creating a new product
  await page.click('text=New Product');
  
  // Fill in product details
  await page.fill('input[placeholder="e.g., Analytics Suite"]', 'E2E Test Suite');
  await page.fill('input[placeholder="Tier name"] >> nth=0', 'Starter');
  await page.fill('input[placeholder="0.00"] >> nth=0', '10');
  
  // Save product and wait for navigation
  await page.click('button:has-text("Create Product")');
  await expect(page.locator('h2').first()).toContainText('Pricing Tiers');

  // Go back to dashboard to start a quote
  await page.goto('/');
  await page.click('text=Quotes');
  await page.click('text=New Quote');

  // Basics step
  await page.fill('input[id="quote-name"]', 'E2E Quote');
  await page.fill('input[id="customer-name"]', 'Test Corp');
  await page.click('button:has-text("Next")');

  // Product step
  await page.selectOption('select#product-select', { label: 'E2E Test Suite' });
  await page.click('text=Starter'); // Select the tier we created
  await page.click('button:has-text("Next")');

  // Config step
  await page.fill('input#seat-count', '5');
  await page.click('text=Annual (12 months)');
  await page.click('button:has-text("Next")');

  // Addons step (skip selecting addons for this simple test)
  await page.click('button:has-text("Next")');

  // Review step
  await expect(page.locator('h2')).toContainText('Review Quote');
  await expect(page.locator('td.font-medium').first()).toContainText('E2E Test Suite — Starter tier');
  
  // Save the quote
  await page.click('button:has-text("Save Quote")');

  // Verify the quote document
  await expect(page.locator('h1')).toContainText('Test Corp');
  await expect(page.locator('text=E2E Test Suite')).toBeVisible();
});
