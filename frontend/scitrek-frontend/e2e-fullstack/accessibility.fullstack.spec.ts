import AxeBuilder from '@axe-core/playwright';
import { expect, Page, test } from '@playwright/test';

import { loginThroughUI } from './helpers';

// Third-party embeds (YouTube, PhET, Human Protein Atlas, Utah Genetics) ship
// their own markup and their own violations. They are required curriculum
// content, so scan around them rather than failing on someone else's player.
const THIRD_PARTY_EMBEDS = [
  'iframe[src*="youtube"]',
  'iframe[src*="youtu.be"]',
  'iframe[src*="phet"]',
  'iframe[src*="proteinatlas"]',
  'iframe[src*="utah.edu"]',
  // Our Day page wrappers around those players (axe can flag YouTube's
  // #movie_player aria-label through the iframe / wrapper path).
  '.aspect-video',
];

async function expectNoSeriousViolations(page: Page, excludeEmbeds = false) {
  let builder = new AxeBuilder({ page });
  if (excludeEmbeds) {
    for (const selector of THIRD_PARTY_EMBEDS) {
      builder = builder.exclude(selector);
    }
  }
  const results = await builder.analyze();
  const serious = results.violations.filter(violation =>
    ['serious', 'critical'].includes(violation.impact || ''),
  );
  expect(serious, JSON.stringify(serious, null, 2)).toEqual([]);
}

test('login has no serious automated accessibility violations', async ({ page }) => {
  await page.goto('/login');
  await expect(page.getByRole('heading', { name: /Welcome to SciTrek/i })).toBeVisible();
  await expectNoSeriousViolations(page);
});

test('core authenticated student pages have no serious automated accessibility violations', async ({ page }) => {
  await loginThroughUI(page);

  for (const path of ['/inbox', '/sections/day-1', '/workbooks']) {
    await page.goto(path);
    await expect(page.locator('body')).not.toContainText('Loading…');
    // Day pages embed YouTube/PhET/etc.; exclude those third-party players the
    // same way the dedicated day-page a11y test does.
    await expectNoSeriousViolations(page, path.includes('/sections/day-'));
  }
});

test('every day page has no serious automated accessibility violations', async ({ page }) => {
  await loginThroughUI(page);

  for (const day of [1, 2, 3, 4, 5]) {
    await page.goto(`/sections/day-${day}`);
    await expect(page.getByRole('heading', { name: new RegExp(`Day ${day}:`) })).toBeVisible();
    await expectNoSeriousViolations(page, true);
  }
});
