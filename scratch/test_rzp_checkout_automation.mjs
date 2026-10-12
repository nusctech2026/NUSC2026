import { chromium } from '@playwright/test';
import Razorpay from 'razorpay';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../apps/web/.env.local') });

const rzp = new Razorpay({
  key_id: process.env.RAZORPAY_KEY_ID,
  key_secret: process.env.RAZORPAY_KEY_SECRET,
});

async function completeRazorpayCapture() {
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  console.log('Navigating to /membership...');
  await page.goto('http://localhost:3000/membership');
  await page.waitForSelector('form');

  page.on('console', msg => console.log('PAGE LOG:', msg.text()));
  page.on('pageerror', err => console.log('PAGE ERROR:', err.message));

  const timestamp = Date.now();
  const testEmail = `rzp.realtest.${timestamp}@example.com`;

  await page.fill('input[name="firstName"]', 'Real');
  await page.fill('input[name="lastName"]', 'TestCapture');
  await page.fill('input[name="email"]', testEmail);
  await page.fill('input[name="phone"]', '9436012345');
  await page.fill('input[name="dateOfBirth"]', '1995-05-15');
  await page.fill('input[name="cityDistrict"]', 'Kohima');
  await page.fill('input[name="password"]', 'SecurePassword123!');
  await page.locator('input[name="termsAccepted"]').dispatchEvent('click');
  await page.locator('button[type="submit"]').click();
  console.log('Submitted form, waiting for Razorpay checkout modal...');

  await page.waitForSelector('iframe.razorpay-checkout-frame', { state: 'attached', timeout: 30000 });
  console.log('Razorpay iframe attached!');
  const rzpFrame = page.frameLocator('iframe.razorpay-checkout-frame');
  await page.waitForTimeout(4000);

  const contactInput = rzpFrame.getByTestId('contactNumber');
  if (await contactInput.isVisible().catch(() => false)) {
    console.log('Filling contact number...');
    await contactInput.click();
    await contactInput.fill('9436012345');
    await page.waitForTimeout(500);

    const continueBtn = rzpFrame.locator('button').filter({ hasText: /Continue/i });
    await continueBtn.click();
    console.log('Clicked Continue');
    await page.waitForTimeout(3000);
  }

  console.log('Looking for Netbanking...');
  const netbankingBtn = rzpFrame.locator('text=Netbanking').first();
  await netbankingBtn.waitFor({ state: 'visible', timeout: 30000 });
  await netbankingBtn.click();
  console.log('Clicked Netbanking');

  const popupPromise = context.waitForEvent('page', { timeout: 20000 });
  await rzpFrame.locator('text=Bank of Baroda').first().click();

  const popup = await popupPromise;
  console.log('Popup opened! URL:', popup.url());
  await popup.waitForLoadState('domcontentloaded');

  console.log('Popup HTML:');
  console.log(await popup.content());

  // Click success button and wait for popup navigation/close
  console.log('Clicking Success...');
  const successButton = popup.locator('form button, button, input[type="submit"]').filter({ hasText: /Success/i }).first();
  await Promise.all([
    popup.waitForEvent('close', { timeout: 20000 }).catch(e => console.log('Popup close error/timeout:', e.message)),
    successButton.click()
  ]);

  console.log('Waiting after popup action...');
  await page.waitForTimeout(5000);

  // Check recent payments
  const recentPayments = await rzp.payments.all({ count: 3 });
  const latestPayment = recentPayments.items[0];
  console.log('Payment ID:', latestPayment.id);
  console.log('Payment Status:', latestPayment.status);
  console.log('Payment Amount:', latestPayment.amount);

  const order = await rzp.orders.fetch(latestPayment.order_id);
  console.log('Order ID:', order.id);
  console.log('Order Status:', order.status);
  console.log('Order Amount Paid:', order.amount_paid);

  await browser.close();
}

completeRazorpayCapture().catch(console.error);
