import { test, expect } from '@playwright/test';

const PROD = 'https://kob3435-bot.github.io/high-school-volleyball-legends/';

test('production: build -> match -> finish -> box -> save -> reload', async ({ page }) => {
  test.setTimeout(180_000);
  const errors: string[] = [];
  page.on('pageerror', (e) => errors.push(e.message));

  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto(PROD);
  await expect(page.getByTestId('home')).toBeVisible({ timeout: 20000 });
  await page.getByTestId('mode-quick').click();
  await page.getByTestId('btn-continue-school').click();
  await page.getByTestId('btn-finish-team').click();
  await page.getByTestId('opp-nekoma').click();
  await page.getByTestId('btn-to-preview').click();
  await page.getByTestId('btn-start-match').click();
  await expect(page.getByTestId('live-match')).toBeVisible({ timeout: 20000 });
  await page.screenshot({ path: 'screenshots/06-prod-live.png' });

  for (let i = 0; i < 25; i++) {
    if (await page.getByTestId('results').isVisible().catch(() => false)) break;
    const skip = page.getByTestId('btn-skip-set');
    if (await skip.isVisible()) await skip.click();
    await page.waitForTimeout(200);
  }
  await expect(page.getByTestId('results')).toBeVisible({ timeout: 60000 });
  await page.getByTestId('tab-box').click();
  await expect(page.getByTestId('box-score')).toBeVisible();
  await page.getByTestId('tab-analysis').click();
  await expect(page.getByTestId('analysis')).toBeVisible();
  await page.getByTestId('btn-save').click();
  await page.reload();
  await page.goto(PROD);
  await page.getByTestId('nav-history').click();
  await expect(page.getByTestId('history-list')).toBeVisible();
  expect(errors.filter((e) => !/AudioContext|NotAllowedError/i.test(e))).toEqual([]);
});
