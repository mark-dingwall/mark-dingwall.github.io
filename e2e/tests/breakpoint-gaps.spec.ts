import { test, expect } from '@playwright/test';
import { PORTFOLIO_PAGES, navigateToPortfolioPage } from '../helpers/pages';
import { scrollToProgress } from '../helpers/scroll';
import { hasHorizontalOverflow } from '../helpers/geometry';

/**
 * Issue 3 — No breakpoint between 400–600px
 *
 * Only breakpoints are 600px and 800px. At 450–550px, desktop layout
 * still applies but viewport is too narrow. Fixed panels can overflow.
 */

const GAP_WIDTHS = [400, 450, 500, 550];

for (const { name, path } of PORTFOLIO_PAGES) {
  for (const width of GAP_WIDTHS) {
    test(`${name}: no overflow at ${width}px viewport width`, async ({ page }) => {
      await page.setViewportSize({ width, height: 800 });
      await navigateToPortfolioPage(page, path);
      await scrollToProgress(page, 0.5);

      // No horizontal overflow
      const overflows = await hasHorizontalOverflow(page);
      expect(overflows, `${name} at ${width}px: horizontal overflow`).toBe(false);

      // Interactive elements visible and properly sized
      const buttons = page.locator('.pref-btn, .flow-btn');
      const count = await buttons.count();
      for (let i = 0; i < count; i++) {
        const btn = buttons.nth(i);
        const box = await btn.boundingBox();
        if (!box || box.width === 0) continue;
        // Buttons should be fully within viewport
        expect(
          box.x + box.width,
          `${name} button[${i}] right edge at ${width}px`,
        ).toBeLessThanOrEqual(width + 1);
      }
    });
  }
}
