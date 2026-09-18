import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/browser",
  outputDir: "./artifacts/browser",
  workers: 1,
  timeout: 45_000,
  use: {
    baseURL: "http://127.0.0.1:3102",
    browserName: "chromium",
    viewport: { width: 1366, height: 768 },
    trace: "retain-on-failure",
  },
  webServer: [
    {
      command:
        "npm run start -w @nusc/web -- -p 3102 -H 127.0.0.1",
      url: "http://127.0.0.1:3102",
      reuseExistingServer: false,
    },
    {
      command:
        "npm run start -w @nusc/store -- -p 3103 -H 127.0.0.1",
      url: "http://127.0.0.1:3103",
      reuseExistingServer: false,
    },
  ],
});
