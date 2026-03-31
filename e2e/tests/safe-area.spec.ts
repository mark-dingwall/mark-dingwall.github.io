import { test, expect } from '@playwright/test';
import { PORTFOLIO_PAGES, navigateToPortfolioPage } from '../helpers/pages';

/**
 * Issue 8 — Back-link under device notch
 *
 * .nav-btn at top: 16px — no env(safe-area-inset-top).
 * On iPhone 14+ (59px safe area), nav-btn sits under the notch.
 *
 * We test that the CSS uses safe-area-inset by checking the computed top
 * value is at least the known safe-area for the device.
 * Since Playwright doesn't emulate actual safe-area-inset values,
 * we check that the CSS declaration references env(safe-area-inset-top).
 */

for (const { name, path } of PORTFOLIO_PAGES) {
  test(`${name}: .nav-btn CSS accounts for safe-area-inset-top`, async ({ page }) => {
    await navigateToPortfolioPage(page, path);

    // Check if the computed style or any matching CSS rule references safe-area-inset
    const usesSafeArea = await page.evaluate(() => {
      const backLink = document.querySelector('.nav-btn');
      if (!backLink) return false;

      // Check all stylesheets for rules that target .nav-btn and use safe-area
      for (const sheet of document.styleSheets) {
        try {
          for (const rule of sheet.cssRules) {
            if (rule instanceof CSSStyleRule) {
              if (
                rule.selectorText?.includes('.nav-btn') &&
                rule.cssText.includes('safe-area')
              ) {
                return true;
              }
            }
            if (rule instanceof CSSMediaRule) {
              for (const innerRule of rule.cssRules) {
                if (innerRule instanceof CSSStyleRule) {
                  if (
                    innerRule.selectorText?.includes('.nav-btn') &&
                    innerRule.cssText.includes('safe-area')
                  ) {
                    return true;
                  }
                }
              }
            }
          }
        } catch {
          // Cross-origin stylesheet — skip
        }
      }
      return false;
    });

    expect(usesSafeArea, `${name}: .nav-btn does not use env(safe-area-inset-top)`).toBe(true);
  });
}
