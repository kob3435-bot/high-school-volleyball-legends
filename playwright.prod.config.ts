import { defineConfig } from '@playwright/test';

export default defineConfig({
  testDir: './e2e',
  testMatch: 'prod.spec.ts',
  timeout: 180_000,
  retries: 1,
  use: {
    baseURL: 'https://kob3435-bot.github.io/high-school-volleyball-legends/',
    headless: true,
  },
});
