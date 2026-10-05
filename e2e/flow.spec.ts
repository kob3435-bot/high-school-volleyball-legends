import { test, expect } from '@playwright/test';
import path from 'path';

const shot = (name: string) => path.join('/workspace/hsvl/screenshots', name);

test.describe('HSVL full flow', () => {
  test('desktop: home -> build -> match -> box score -> save -> reload', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await expect(page.getByTestId('home')).toBeVisible();
    await page.screenshot({ path: shot('01-home-desktop.png'), fullPage: true });

    await page.getByTestId('mode-quick').click();
    await expect(page.getByTestId('school-pick')).toBeVisible();
    await page.getByTestId('school-karasawa').click();
    await page.getByTestId('btn-continue-school').click();
    await expect(page.getByTestId('tactics-pick')).toBeVisible();
    await page.screenshot({ path: shot('02-team-builder.png'), fullPage: true });
    await page.getByTestId('btn-finish-team').click();

    await expect(page.getByTestId('opp-nekoma')).toBeVisible();
    await page.getByTestId('opp-nekoma').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();

    await expect(page.getByTestId('live-match')).toBeVisible({ timeout: 15000 });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: shot('03-live-match-desktop.png') });

    // Skip through match
    for (let i = 0; i < 20; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      const skip = page.getByTestId('btn-skip-set');
      if (await skip.isVisible()) await skip.click();
      await page.waitForTimeout(200);
    }
    // Timeout / tactics buttons should work mid-match if still live
    if (await page.getByTestId('live-match').isVisible().catch(() => false)) {
      await page.getByTestId('btn-timeout').click();
      await page.getByTestId('btn-tactics').click();
      await expect(page.getByTestId('tactical-panel')).toBeVisible();
      // finish
      for (let i = 0; i < 15; i++) {
        if (await page.getByTestId('results').isVisible().catch(() => false)) break;
        await page.getByTestId('btn-skip-set').click();
        await page.waitForTimeout(150);
      }
    }

    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('tab-box').click();
    await expect(page.getByTestId('box-score')).toBeVisible();
    await page.screenshot({ path: shot('04-box-score.png'), fullPage: true });
    await page.getByTestId('tab-analysis').click();
    await expect(page.getByTestId('analysis')).toBeVisible();
    await page.getByTestId('btn-save').click();
    await expect(page.getByTestId('toast')).toBeVisible();

    await page.reload();
    await page.goto('/');
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-list')).toBeVisible();

    expect(errors.filter((e) => !e.includes('AudioContext'))).toEqual([]);
  });

  test('mobile live match framing', async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByTestId('mode-quick').click();
    await page.getByTestId('btn-continue-school').click();
    await page.getByTestId('btn-finish-team').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();
    await expect(page.getByTestId('live-match')).toBeVisible();
    await page.waitForTimeout(1200);
    await page.screenshot({ path: shot('05-live-match-mobile.png') });
    // finish quickly
    for (let i = 0; i < 20; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      const skip = page.getByTestId('btn-skip-set');
      if (await skip.isVisible()) await skip.click();
      await page.waitForTimeout(150);
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30000 });
  });
});
