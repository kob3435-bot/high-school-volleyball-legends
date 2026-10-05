import { test, expect } from '@playwright/test';
import path from 'path';

const shot = (name: string) => path.join('/workspace/hsvl/screenshots', name);

test.describe('HSVL v3 full flow', () => {
  test('desktop: full flow + block shot + analysis + rematch', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize({ width: 1400, height: 900 });
    await page.goto('/');
    await expect(page.getByTestId('home')).toBeVisible();

    await page.getByTestId('mode-quick').click();
    await page.getByTestId('school-date').click();
    await page.getByTestId('btn-continue-school').click();
    await page.getByTestId('btn-finish-team').click();
    await page.getByTestId('opp-karasawa').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();
    await expect(page.getByTestId('live-match')).toBeVisible({ timeout: 15000 });

    // Mid-rally / block-friendly window
    await page.waitForTimeout(2800);
    await page.screenshot({ path: shot('v3-live-desktop-block.png') });

    // Substitution
    await page.getByTestId('btn-sub').click();
    await expect(page.getByTestId('sub-picker')).toBeVisible();
    await page.locator('[data-testid^="sub-out-"]').first().click();
    await page.locator('[data-testid^="sub-in-"]').first().click();
    await page.getByTestId('btn-confirm-sub').click();
    await expect(page.getByTestId('sub-picker')).toBeHidden({ timeout: 5000 });

    // Timeout + tactic change (panel opens under huddle; force-click)
    await page.getByTestId('btn-timeout').click();
    await expect(page.getByTestId('timeout-huddle')).toBeVisible();
    const tacBtn = page.locator('[data-testid="tactical-panel"] button.btn.sm').nth(1);
    if (await tacBtn.count()) await tacBtn.click({ force: true });
    await page.getByTestId('btn-huddle-close').click();

    // Skip to end
    for (let i = 0; i < 30; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      const skip = page.getByTestId('btn-skip-set');
      if (await skip.isVisible()) await skip.click();
      await page.waitForTimeout(120);
    }
    await expect(page.getByTestId('results')).toBeVisible({ timeout: 30000 });
    await page.getByTestId('tab-analysis').click();
    await expect(page.getByTestId('charts')).toBeVisible();
    await page.screenshot({ path: shot('v3-analysis-charts.png'), fullPage: true });
    await page.getByTestId('btn-save').click();
    await expect(page.getByTestId('toast')).toBeVisible();

    // Reload -> history load
    await page.goto('/');
    await page.getByTestId('nav-history').click();
    await expect(page.getByTestId('history-list')).toBeVisible();

    // Rematch
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

  test('mobile spike framing + thai team builder', async ({ page }) => {
    const errors: string[] = [];
    page.on('pageerror', (e) => errors.push(e.message));
    page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto('/');
    // Switch language to Thai via settings
    await page.getByTestId('nav-settings').click();
    await page.getByTestId('setting-language').selectOption('th');
    await page.getByTestId('back').click().catch(async () => {
      await page.locator('button', { hasText: /กลับ|Back/ }).first().click();
    });
    await page.goto('/');
    // Ensure Thai persisted
    await page.evaluate(() => {
      const raw = localStorage.getItem('hsvl_v1_settings');
      const s = raw ? JSON.parse(raw) : {};
      s.language = 'th';
      localStorage.setItem('hsvl_v1_settings', JSON.stringify(s));
    });
    await page.reload();
    await page.getByTestId('mode-dream').click();
    await expect(page.getByTestId('team-builder').or(page.locator('.screen')).first()).toBeVisible();
    await page.screenshot({ path: shot('v3-team-builder-thai.png'), fullPage: true });

    await page.goto('/');
    await page.evaluate(() => {
      const raw = localStorage.getItem('hsvl_v1_settings');
      const s = raw ? JSON.parse(raw) : {};
      s.language = 'en';
      localStorage.setItem('hsvl_v1_settings', JSON.stringify(s));
    });
    await page.reload();
    await page.getByTestId('mode-quick').click();
    await page.getByTestId('btn-continue-school').click();
    await page.getByTestId('btn-finish-team').click();
    await page.getByTestId('btn-to-preview').click();
    await page.getByTestId('btn-start-match').click();
    await expect(page.getByTestId('live-match')).toBeVisible();
    await page.waitForTimeout(2400);
    await page.screenshot({ path: shot('v3-live-mobile-spike.png') });
    for (let i = 0; i < 25; i++) {
      if (await page.getByTestId('results').isVisible().catch(() => false)) break;
      if (await page.getByTestId('btn-skip-set').isVisible()) await page.getByTestId('btn-skip-set').click();
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
    await expect(page.getByTestId('btn-start-tournament')).toBeVisible();
    await page.getByTestId('btn-start-tournament').click();
    // Prefer sim user match if available to finish quickly
    const sim = page.getByTestId('btn-sim-match');
    if (await sim.isVisible().catch(() => false)) {
      await sim.click();
    } else {
      const play = page.getByTestId('btn-play-next');
      if (await play.isVisible().catch(() => false)) {
        await play.click();
        await expect(page.getByTestId('live-match')).toBeVisible({ timeout: 15000 });
        for (let i = 0; i < 30; i++) {
          if (await page.getByTestId('results').isVisible().catch(() => false)) break;
          if (await page.getByTestId('btn-skip-set').isVisible()) await page.getByTestId('btn-skip-set').click();
          await page.waitForTimeout(100);
        }
      }
    }
    await page.screenshot({ path: shot('v3-tournament.png'), fullPage: true });
    expect(errors.filter((e) => !/AudioContext|NotAllowedError/i.test(e))).toEqual([]);
  });
});
