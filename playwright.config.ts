import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testIgnore: ['**/prod.spec.ts'],
  timeout: 120_000,
  retries: 1,
  use: {
    baseURL: 'http://127.0.0.1:4180',
    headless: true,
    screenshot: 'only-on-failure',
  },
  webServer: {
    command: 'npm run preview',
    port: 4180,
    reuseExistingServer: true,
    timeout: 60_000,
  },
});
