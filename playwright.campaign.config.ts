import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './tests/browser', testMatch: 'campaign.spec.ts',
  outputDir: './artifacts/campaign-browser', workers: 1, timeout: 30000,
  use: { browserName: 'chromium', viewport: { width: 1366, height: 900 }, trace: 'retain-on-failure' },
});
