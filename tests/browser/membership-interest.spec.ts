import { test, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://ogsgayboeaewzsbcbojs.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

test.describe('Membership Pre-Registration Flow', () => {
  test('should render pre-registration form, submit user details, and show confirmation', async ({ page }) => {
    const timestamp = Date.now();
    const firstName = 'Akum';
    const lastName = `Jamir_${timestamp}`;
    const testEmail = `akum.${timestamp}@example.com`;
    const testPhone = '9876543210';
    const testDob = '1998-08-15';

    // 1. Visit the pre-registration page
    await page.goto('/membership-interest');

    // Verify page heading and structure
    await expect(page.getByRole('heading', { level: 1 })).toBeVisible();
    await expect(page.locator('form.interest-form')).toBeVisible();

    // Verify all 3 RISE membership tier benefit cards are displayed
    await expect(page.getByRole('heading', { name: 'RISE General' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rise Premium' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'Rise VIP Box' })).toBeVisible();

    // 2. Fill the form with aligned fields
    await page.fill('input[name="firstName"]', firstName);
    await page.fill('input[name="lastName"]', lastName);
    await page.fill('input[name="email"]', testEmail);
    await page.fill('input[name="phone"]', testPhone);
    await page.fill('input[name="dateOfBirth"]', testDob);
    await page.selectOption('select[name="cityDistrict"]', 'Kohima');
    await page.selectOption('select[name="interestedTier"]', 'rise_premium');
    await page.fill('textarea[name="notes"]', 'Excited for official NUSC membership!');

    // 3. Submit
    await page.click('button[type="submit"]');

    // 4. Verify confirmation view
    await expect(page.locator('text=Pre-Registration Confirmed!')).toBeVisible({ timeout: 10000 });
    await expect(page.locator('.interest-success-msg strong')).toHaveText(`${firstName} ${lastName}`);

    // 5. Verify database persistence if service role key is available
    if (supabaseKey) {
      const supabase = createClient(supabaseUrl, supabaseKey);
      const { data, error } = await supabase
        .from('membership_interests')
        .select('*')
        .eq('email', testEmail)
        .single();

      expect(error).toBeNull();
      expect(data).not.toBeNull();
      expect(data.first_name).toBe(firstName);
      expect(data.last_name).toBe(lastName);
      expect(data.city_district).toBe('Kohima');
      expect(data.date_of_birth).toBe(testDob);
      expect(data.interested_tier).toBe('rise_premium');
      expect(data.terms_accepted).toBe(true);
    }
  });
});
