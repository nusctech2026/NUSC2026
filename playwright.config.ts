import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./artifacts/browser",
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: "http://localhost:3000",
    browserName: "chromium",
    viewport: { width: 1366, height: 768 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command: "npm run dev -w @nusc/web",
      url: "http://localhost:3000",
      reuseExistingServer: true,
      timeout: 120000,
    },
  ],
});
