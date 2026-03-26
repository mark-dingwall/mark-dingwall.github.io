import { test, expect } from '@playwright/test';
import { PORTFOLIO_PAGES, navigateToPortfolioPage } from '../helpers/pages';
import { scrollToBottom } from '../helpers/scroll';

/**
 * Issue 5 — 500vh runway scroll hijacking
 *
 * Long scroll distance with no visible content movement can feel "stuck" on mobile.
 * Content past runway may feel unreachable.
 * Verify that the tech footer is visible when scrolled to the bottom.
 */

for (const { name, path } of PORTFOLIO_PAGES) {
  test(`${name}: tech footer is reachable by scrolling to bottom`, async ({ page }) => {
    await navigateToPortfolioPage(page, path);
    await scrollToBottom(page);

    const footer = page.locator('.tech-footer');
    const count = await footer.count();
    if (count === 0) {
      test.skip();
      return;
    }

    // Footer should be visible in viewport
    const box = await footer.boundingBox();
    expect(box, `${name}: tech-footer has no bounding box`).toBeTruthy();

    const viewport = page.viewportSize();
    if (!viewport || !box) return;

    // Footer bottom should be within or near the viewport
    expect(box.y, `${name}: tech-footer is above viewport`).toBeLessThan(viewport.height);
  });
}
