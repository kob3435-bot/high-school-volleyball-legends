import { test, expect } from '@playwright/test';
import path from 'path';

const shot = (name: string) => path.join('/workspace/hsvl/screenshots', name);

test.describe('HSVL v2 full flow', () => {
  test('desktop: home -> build -> match -> sub -> timeout -> finish -> charts -> save -> reload', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('home')).toBeVisible();

    await page.getByTestId('mode-quick').click();
    await page.getByTestId('btn-continue-school').click();
    await page.getByTestId('btn-finish-team').click();
    await page.getByTestId('opp-nekoma').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();
    await expect(page.getByTestId('live-match')).toBeVisible({ timeout: 15000 });

    // Let a couple rallies play for mid-rally visual
    await page.waitForTimeout(2500);
    await page.screenshot({ path: shot('v2-live-desktop-midrally.png') });

    // Substitution
    await page.getByTestId('btn-sub').click();
    await expect(page.getByTestId('sub-picker')).toBeVisible();
    const outBtn = page.locator('[data-testid^="sub-out-"]').first();
    const inBtn = page.locator('[data-testid^="sub-in-"]').first();
    await outBtn.click();
    await inBtn.click();
    await page.getByTestId('btn-confirm-sub').click();
    await expect(page.getByTestId('sub-picker')).toBeHidden({ timeout: 5000 });

    // Timeout huddle
    await page.getByTestId('btn-timeout').click();
    await expect(page.getByTestId('timeout-huddle')).toBeVisible();
    await page.screenshot({ path: shot('v2-timeout-huddle.png') });
    await page.getByTestId('btn-huddle-close').click();

    // Skip to end
    for (let i = 0; i < 25; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      const skip = page.getByTestId('btn-skip-set');
      if (await skip.isVisible()) await skip.click();
      await page.waitForTimeout(150);
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('tab-analysis').click();
    await expect(page.getByTestId('analysis')).toBeVisible();
    await expect(page.getByTestId('charts')).toBeVisible();
    await page.screenshot({ path: shot('v2-analysis-charts.png'), fullPage: true });
    await page.getByTestId('tab-box').click();
    await page.getByTestId('btn-save').click();
    await expect(page.getByTestId('toast')).toBeVisible();

    await page.goto('/');
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-list')).toBeVisible();

    // Rematch path
    await page.goto('/');
    await page.getByTestId('mode-quick').click();
    await page.getByTestId('btn-continue-school').click();
    await page.getByTestId('btn-finish-team').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();
    for (let i = 0; i < 20; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      if (await page.getByTestId('btn-skip-set').isVisible()) await page.getByTestId('btn-skip-set').click();
      await page.waitForTimeout(120);
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('btn-rematch').click();
    await expect(page.getByTestId('live-match')).toBeVisible();

    expect(errors.filter((e) => !/AudioContext|NotAllowedError/i.test(e))).toEqual([]);
  });

  test('mobile mid-rally framing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByTestId('mode-quick').click();
    await page.getByTestId('btn-continue-school').click();
    await page.getByTestId('btn-finish-team').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();
    await expect(page.getByTestId('live-match')).toBeVisible();
    await page.waitForTimeout(2200);
    await page.screenshot({ path: shot('v2-live-mobile-midrally.png') });
    for (let i = 0; i < 20; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      if (await page.getByTestId('btn-skip-set').isVisible()) await page.getByTestId('btn-skip-set').click();
      await page.waitForTimeout(120);
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30000 });
  });
});
