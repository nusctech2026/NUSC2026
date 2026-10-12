import { test, expect } from '@playwright/test';
import path from 'path';

test.describe('U23 Trials Registration E2E', () => {
  test('should block registration for non-indigenous applicants at pre-screening gate', async ({ page }) => {
    await page.goto('/trials');

    // Select "No" on indigenous question
    await page.locator('input[name="isIndigenous"][value="no"]').click();
    await expect(page.locator('text=Registration Restricted')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).not.toBeVisible();

    // Reset and select "No" on certificate question
    await page.locator('button:has-text("Change Answers")').click();
    await page.locator('input[name="isIndigenous"][value="yes"]').click();
    await page.locator('input[name="hasCertificate"][value="no"]').click();
    await expect(page.locator('text=Registration Restricted')).toBeVisible();
    await expect(page.locator('button[type="submit"]')).not.toBeVisible();
  });

  test('should load form, validate, and submit valid data via UI', async ({ page, request }) => {
    page.on('console', msg => console.log('BROWSER CONSOLE:', msg.text()));
    page.on('pageerror', err => console.log('BROWSER ERROR:', err.message));
    page.on('requestfailed', request => console.log('REQUEST FAILED:', request.url(), request.failure()?.errorText));

    await page.goto('/trials');

    // Confirm eligibility on pre-screening gate
    await page.locator('input[name="isIndigenous"][value="yes"]').click();
    await page.locator('input[name="hasCertificate"][value="yes"]').click();
    await page.locator('button:has-text("Proceed to Registration Form")').click();

    await page.locator('button[type="submit"]').click();
    await expect(page.locator('text=Application Submitted')).not.toBeVisible();

    await page.fill('input[name="firstName"]', 'Playwright');
    await page.fill('input[name="lastName"]', 'Tester');
    await page.fill('input[name="phone"]', '9988776655');
    await page.fill('input[name="email"]', `playwright-${Date.now()}@example.com`);
    await page.fill('input[name="dateOfBirth"]', '2005-05-15');
    await page.selectOption('select[name="playerPosition"]', 'Center Forward / Striker (ST)');
    await page.fill('textarea[name="address"]', '123 Fake Street, Kohima, Nagaland');
    await page.fill('input[name="crsNumber"]', `AIFF-${Date.now()}`.substring(0, 16));

    const dummyPng = path.join(__dirname, 'dummy.png');
    await page.setInputFiles('input[name="aadharCard"]', dummyPng);
    await page.setInputFiles('input[name="indigenousCertificate"]', dummyPng);

    await page.locator('button[type="submit"]').click();

    try {
        await expect(page.locator('text=Application Submitted')).toBeVisible({ timeout: 30000 });
    } catch (e) {
        console.error('Submission failed. Form content:', await page.locator('.form-container').innerHTML());
        throw e;
    }

    // Just verify the list to confirm it reached the DB? Actually the UI success message is enough for now.
  });
});
