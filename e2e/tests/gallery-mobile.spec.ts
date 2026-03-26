import { test, expect } from '@playwright/test';
import { navigateToGallery } from '../helpers/pages';
import { hasHorizontalOverflow } from '../helpers/geometry';

/**
 * Gallery mobile layout tests
 *
 * Verify single-column grid below 768px, card touch targets adequate,
 * all card links functional.
 */

test('gallery: no horizontal overflow', async ({ page }) => {
  await navigateToGallery(page);
  const overflows = await hasHorizontalOverflow(page);
  expect(overflows, 'gallery has horizontal overflow').toBe(false);
});

test('gallery: single-column layout on narrow viewports', async ({ page }) => {
  const viewport = page.viewportSize();
  if (!viewport || viewport.width >= 768) {
    test.skip();
    return;
  }

  await navigateToGallery(page);

  // All cards should have similar left offset (single column)
  const cards = page.locator('.card, .gallery-card, .grid-cell');
  const count = await cards.count();
  if (count < 2) {
    test.skip();
    return;
  }

  const lefts: number[] = [];
  for (let i = 0; i < Math.min(count, 5); i++) {
    const box = await cards.nth(i).boundingBox();
    if (box && box.width > 0) {
      lefts.push(Math.round(box.x));
    }
  }

  // In single-column, all cards should have the same left position (within tolerance)
  if (lefts.length >= 2) {
    const allSameColumn = lefts.every((l) => Math.abs(l - lefts[0]) < 20);
    expect(allSameColumn, `gallery cards not in single column: lefts=${lefts.join(',')}`).toBe(true);
  }
});

test('gallery: card links are functional', async ({ page }) => {
  await navigateToGallery(page);

  // Cards are <a> elements with class "card"
  const links = page.locator('a.card');
  const count = await links.count();
  expect(count, 'no card links found').toBeGreaterThan(0);

  for (let i = 0; i < count; i++) {
    const href = await links.nth(i).getAttribute('href');
    expect(href, `card link[${i}] has no href`).toBeTruthy();
  }
});

test('gallery: card touch targets >= 44px', async ({ page }) => {
  await navigateToGallery(page);

  const cards = page.locator('a.card');
  const count = await cards.count();

  for (let i = 0; i < count; i++) {
    const box = await cards.nth(i).boundingBox();
    if (!box || box.width === 0) continue;
    expect(
      Math.min(box.width, box.height),
      `gallery card[${i}] touch target too small`,
    ).toBeGreaterThanOrEqual(44);
  }
});
