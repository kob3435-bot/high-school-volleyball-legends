import { test, expect } from '@playwright/test';
import path from 'path';

const shot = (name: string) => path.join('/workspace/hsvl/screenshots', name);

test.describe('HSVL v4 full flow', () => {
  test('desktop: full flow + mid-spike + analysis rotation', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('home')).toBeVisible();

    await page.getByTestId('mode-quick').click();
    await page.getByTestId('school-karasawa').click();
    await page.getByTestId('btn-continue-school').click();
    await page.getByTestId('btn-finish-team').click();
    await page.getByTestId('opp-nekoma').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();
    await expect(page.getByTestId('live-match')).toBeVisible({ timeout: 15000 });

    await page.waitForTimeout(2800);
    await page.screenshot({ path: shot('v4-live-desktop-midspike.png') });

    await page.getByTestId('btn-sub').click();
    await expect(page.getByTestId('sub-picker')).toBeVisible();
    await page.locator('[data-testid^="sub-out-"]').first().click();
    await page.locator('[data-testid^="sub-in-"]').first().click();
    await page.getByTestId('btn-confirm-sub').click();
    await expect(page.getByTestId('sub-picker')).toBeHidden({ timeout: 5000 });

    await page.getByTestId('btn-timeout').click();
    await expect(page.getByTestId('timeout-huddle')).toBeVisible();
    const tacBtn = page.locator('[data-testid="tactical-panel"] button.btn.sm').nth(1);
    if (await tacBtn.count()) await tacBtn.click({ force: true });
    await page.getByTestId('btn-huddle-close').click();

    for (let i = 0; i < 30; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      const skip = page.getByTestId('btn-skip-set');
      if (await skip.isVisible()) await skip.click();
      await page.waitForTimeout(120);
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('tab-analysis').click();
    await expect(page.getByTestId('charts')).toBeVisible();
    await page.screenshot({ path: shot('v4-analysis-rotation.png'), fullPage: true });
    await page.getByTestId('btn-save').click();
    await expect(page.getByTestId('toast')).toBeVisible();

    await page.goto('/');
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-list')).toBeVisible();

    await page.goto('/');
    await page.getByTestId('mode-quick').click();
    await page.getByTestId('btn-continue-school').click();
    await page.getByTestId('btn-finish-team').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();
    for (let i = 0; i < 25; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      if (await page.getByTestId('btn-skip-set').isVisible()) await page.getByTestId('btn-skip-set').click();
      await page.waitForTimeout(100);
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('btn-rematch').click();
    await expect(page.getByTestId('live-match')).toBeVisible();

    expect(errors.filter((e) => !/AudioContext|NotAllowedError/i.test(e))).toEqual([]);
  });

  test('mobile mid-rally + menu open', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    await page.getByTestId('mode-quick').click();
    await page.getByTestId('btn-continue-school').click();
    await page.getByTestId('btn-finish-team').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();
    await expect(page.getByTestId('live-match')).toBeVisible();
    await page.waitForTimeout(2400);
    await page.screenshot({ path: shot('v4-live-mobile-midrally.png') });

    await page.getByTestId('btn-menu').click();
    await expect(page.getByTestId('live-menu')).toBeVisible();
    await page.screenshot({ path: shot('v4-mobile-menu-open.png') });
    await page.getByTestId('live-menu').getByTestId('btn-timeout').click();
    await expect(page.getByTestId('timeout-huddle')).toBeVisible();
    await page.getByTestId('btn-huddle-close').click();

    for (let i = 0; i < 30; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      // Close huddle/sub if still open
      if (await page.getByTestId('btn-huddle-close').isVisible().catch(() => false)) {
        await page.getByTestId('btn-huddle-close').click();
      }
      if (!(await page.getByTestId('live-menu').isVisible().catch(() => false))) {
        const menu = page.getByTestId('btn-menu');
        if (await menu.isVisible().catch(() => false)) await menu.click({ timeout: 3000 }).catch(() => {});
      }
      const skip = page.getByTestId('live-menu').getByTestId('btn-skip-set');
      if (await skip.isVisible().catch(() => false)) await skip.click({ force: true });
      else if (await page.getByTestId('btn-skip-set').first().isVisible().catch(() => false)) {
        await page.getByTestId('btn-skip-set').first().click({ force: true });
      }
      await page.waitForTimeout(100);
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30000 });
    expect(errors.filter((e) => !/AudioContext|NotAllowedError/i.test(e))).toEqual([]);
  });

  test('tournament run', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    await page.getByTestId('mode-tournament').click();
    await page.getByTestId('btn-start-tournament').click();
    const sim = page.getByTestId('btn-sim-match');
    if (await sim.isVisible().catch(() => false)) await sim.click();
    expect(errors.filter((e) => !/AudioContext|NotAllowedError/i.test(e))).toEqual([]);
  });
});
