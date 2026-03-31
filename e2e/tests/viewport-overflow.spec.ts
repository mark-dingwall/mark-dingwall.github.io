import { test, expect } from '@playwright/test';
import { PORTFOLIO_PAGES, navigateToPortfolioPage } from '../helpers/pages';
import { scrollToProgress, scrollToTechSection } from '../helpers/scroll';
import { hasHorizontalOverflow } from '../helpers/geometry';

/**
 * Issues 6 & 7 — Fixed-width panels overflow viewport; text overflow on narrow screens
 *
 * Ranking panels have max-width: 550px (jointly, mystery) or 520px (oasis),
 * which exceeds viewport between 520–600px where the mobile breakpoint hasn't kicked in.
 * Narrative lines with white-space: nowrap or width: max-content can overflow at 320px.
 */

const SCROLL_POSITIONS = [0.1, 0.5, 0.8];

for (const { name, path } of PORTFOLIO_PAGES) {
  test(`${name}: no horizontal overflow at various scroll positions`, async ({ page }) => {
    await navigateToPortfolioPage(page, path);

    for (const progress of SCROLL_POSITIONS) {
      await scrollToProgress(page, progress);

      const overflows = await hasHorizontalOverflow(page);
      expect(
        overflows,
        `${name} at progress=${progress}: page has horizontal overflow`,
      ).toBe(false);
    }

    // Also check in tech section
    await scrollToTechSection(page);
    const overflows = await hasHorizontalOverflow(page);
    expect(overflows, `${name} at tech section: page has horizontal overflow`).toBe(false);
  });
}

// Specific panel overflow checks
const PANEL_CHECKS: { name: string; path: string; selector: string }[] = [
  { name: 'jointly', path: '/portfolio/jointly/', selector: '#ranking' },
  { name: 'oasis', path: '/portfolio/oasis/', selector: '#dashboard' },
  { name: 'guestflow', path: '/portfolio/guestflow/', selector: '#pipeline' },
];

for (const { name, path, selector } of PANEL_CHECKS) {
  test(`${name}: ${selector} panel does not overflow viewport`, async ({ page }) => {
    await navigateToPortfolioPage(page, path);
    await scrollToProgress(page, 0.8);

    const viewport = page.viewportSize();
    if (!viewport) return;

    const panel = page.locator(selector).first();
    const box = await panel.boundingBox();
    if (!box || box.width === 0) {
      test.skip();
      return;
    }

    expect(box.x + box.width, `${name} ${selector} right edge exceeds viewport`).toBeLessThanOrEqual(
      viewport.width + 1, // 1px tolerance for rounding
    );
    expect(box.x, `${name} ${selector} left edge goes negative`).toBeGreaterThanOrEqual(-1);
  });
}

// Narrative text overflow on narrow screens
// Oasis narrative lines are not in a container — skip it
const PAGES_WITH_NARRATIVE = PORTFOLIO_PAGES.filter((p) =>
  ['jointly', 'mystery', 'guestflow'].includes(p.name),
);

for (const { name, path } of PAGES_WITH_NARRATIVE) {
  test(`${name}: narrative text does not overflow`, async ({ page }) => {
    await navigateToPortfolioPage(page, path);
    await scrollToProgress(page, 0.4);

    const viewport = page.viewportSize();
    if (!viewport) return;

    // Check the narrative container fits within the viewport
    // (overflow: hidden clips internal content, so check the container bounds)
    const narrative = page.locator('#narrative, #narrative-panel').first();
    const box = await narrative.boundingBox();
    if (!box) {
      test.skip();
      return;
    }

    expect(
      box.x + box.width,
      `${name}: narrative right edge exceeds viewport`,
    ).toBeLessThanOrEqual(viewport.width + 1);
    expect(box.x, `${name}: narrative left edge is negative`).toBeGreaterThanOrEqual(-1);
  });
}
