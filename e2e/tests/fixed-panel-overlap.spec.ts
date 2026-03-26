import { test, expect } from '@playwright/test';
import { PORTFOLIO_PAGES, navigateToPortfolioPage } from '../helpers/pages';
import { scrollToProgress } from '../helpers/scroll';
import { rectsOverlap } from '../helpers/geometry';
import { type Page } from '@playwright/test';

/**
 * Issues 4 & 10 — Fixed panels overlap at 375px; z-index stacking obscures back-link
 *
 * Multiple fixed elements (#header-panel, #ranking/#dashboard/#pipeline, .back-link, #progress-bar)
 * compete for limited screen real estate. At mid-scroll, overlapping panels can obscure
 * the back-link so it's not clickable.
 *
 * #header-panel has pointer-events: none, so it never blocks interaction.
 * We skip overlap checks involving non-interactive elements (pointer-events: none).
 */

// Map pages to their fixed interactive panel selectors
const PAGE_PANELS: Record<string, string[]> = {
  jointly: ['#header-panel', '#ranking', '.back-link'],
  oasis: ['#header-panel', '#dashboard', '.back-link'],
  guestflow: ['#header-panel', '#pipeline', '.back-link'],
  mystery: ['#header-panel', '#ranking', '.back-link'],
  bitbrush: ['#header-panel', '#demo-panel', '.back-link'],
};

interface PanelInfo {
  selector: string;
  box: { x: number; y: number; width: number; height: number; right: number; bottom: number };
  interactive: boolean;
}

async function isInteractive(page: Page, selector: string): Promise<boolean> {
  return page.evaluate((sel) => {
    const el = document.querySelector(sel);
    if (!el) return false;
    return getComputedStyle(el).pointerEvents !== 'none';
  }, selector);
}

for (const { name, path } of PORTFOLIO_PAGES) {
  test(`${name}: fixed panels do not overlap at scroll progress 0.8`, async ({ page }) => {
    await navigateToPortfolioPage(page, path);
    await scrollToProgress(page, 0.8);

    const selectors = PAGE_PANELS[name] || [];
    const panels: PanelInfo[] = [];

    for (const sel of selectors) {
      const el = page.locator(sel).first();
      const box = await el.boundingBox();
      if (box && box.width > 0 && box.height > 0) {
        panels.push({
          selector: sel,
          box: {
            x: box.x,
            y: box.y,
            width: box.width,
            height: box.height,
            right: box.x + box.width,
            bottom: box.y + box.height,
          },
          interactive: await isInteractive(page, sel),
        });
      }
    }

    // Pairwise overlap check — skip pairs where one element has pointer-events: none
    for (let i = 0; i < panels.length; i++) {
      for (let j = i + 1; j < panels.length; j++) {
        const a = panels[i];
        const b = panels[j];
        // If either element is non-interactive, visual overlap is acceptable
        if (!a.interactive || !b.interactive) continue;
        expect(
          rectsOverlap(a.box, b.box),
          `${name}: ${a.selector} overlaps ${b.selector}`,
        ).toBe(false);
      }
    }
  });

  test(`${name}: back-link is clickable (not obscured by panels)`, async ({ page }) => {
    await navigateToPortfolioPage(page, path);
    await scrollToProgress(page, 0.5);

    const backLink = page.locator('.back-link');
    const box = await backLink.boundingBox();
    if (!box) {
      test.skip();
      return;
    }

    // Check elementFromPoint at the center of the back-link
    const centerX = box.x + box.width / 2;
    const centerY = box.y + box.height / 2;

    const topElement = await page.evaluate(
      ([x, y]) => {
        const el = document.elementFromPoint(x, y);
        if (!el) return null;
        // Walk up to find if back-link is this element or an ancestor
        let node: Element | null = el;
        while (node) {
          if (node.classList.contains('back-link')) return 'back-link';
          node = node.parentElement;
        }
        return el.tagName + (el.id ? '#' + el.id : '');
      },
      [centerX, centerY] as const,
    );

    expect(topElement, `${name}: elementFromPoint at back-link center should be the back-link`).toBe(
      'back-link',
    );
  });
}
